/**
 * ExcelImportService.js - Сервис импорта данных из Excel
 * 
 * Поддерживает импорт из:
 * - Состав_серверов.xlsx - компоненты серверов
 * - Брак_серверов.xlsm - записи о браке
 */

const XLSX = require("xlsx");
const path = require("path");
const fs = require("fs");
const { sequelize } = require("../../models/index");

class ExcelImportService {
    
    // =========================================
    // ИМПОРТ КОМПОНЕНТОВ СЕРВЕРОВ
    // =========================================
    
    /**
     * Парсинг файла "Состав_серверов.xlsx"
     * Структура: Серийный номер сервера, затем 12×HDD, 12×RAM, 4×SSD, 2×PSU с двойными серийниками
     */
    async importServerComponents(filePath, options = {}) {
        const { dryRun = false, skipExisting = true } = options;
        
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const results = {
            servers: [],
            components: [],
            errors: [],
            skipped: []
        };
        
        const { 
            BeryllServer, 
            BeryllServerComponent, 
            ComponentInventory,
            ComponentCatalog 
        } = require("../../models/index");
        
        // Пропускаем заголовки (первые 2 строки)
        for (let i = 2; i < data.length; i++) {
            const row = data[i];
            if (!row || !row[0]) continue;
            
            try {
                const serverSerial = String(row[0]).trim();
                
                // Ищем или создаём сервер
                let server = await BeryllServer.findOne({
                    where: { apkSerialNumber: serverSerial }
                });
                
                if (!server) {
                    if (!dryRun) {
                        server = await BeryllServer.create({
                            apkSerialNumber: serverSerial,
                            status: "NEW"
                        });
                    }
                    results.servers.push({ serial: serverSerial, action: "created" });
                } else {
                    results.servers.push({ serial: serverSerial, action: "exists" });
                }
                
                // Парсим компоненты
                // Колонки: 1-12 HDD (Yadro S/N), 13-24 RAM (Yadro S/N), 25-28 SSD (Yadro S/N), 
                //          29-30 PSU1 (Yadro, Manuf), 31-32 PSU2 (Yadro, Manuf)
                
                const components = [];
                
                // HDD (12 штук, колонки 1-12)
                for (let j = 1; j <= 12; j++) {
                    const serialYadro = row[j] ? String(row[j]).trim() : null;
                    if (serialYadro) {
                        components.push({
                            type: "HDD",
                            serialNumberYadro: serialYadro,
                            serialNumber: serialYadro, // Для HDD используем Yadro S/N как основной
                            slot: `HDD_${j}`
                        });
                    }
                }
                
                // RAM (12 штук, колонки 13-24)
                for (let j = 13; j <= 24; j++) {
                    const serialYadro = row[j] ? String(row[j]).trim() : null;
                    if (serialYadro) {
                        components.push({
                            type: "RAM",
                            serialNumberYadro: serialYadro,
                            serialNumber: serialYadro,
                            slot: `DIMM_${j - 12}`
                        });
                    }
                }
                
                // SSD (4 штуки, колонки 25-28)
                for (let j = 25; j <= 28; j++) {
                    const serialYadro = row[j] ? String(row[j]).trim() : null;
                    if (serialYadro) {
                        components.push({
                            type: "SSD",
                            serialNumberYadro: serialYadro,
                            serialNumber: serialYadro,
                            slot: `SSD_${j - 24}`
                        });
                    }
                }
                
                // PSU1 (колонки 29-30: Yadro S/N, Manufacturer S/N)
                const psu1Yadro = row[29] ? String(row[29]).trim() : null;
                const psu1Manuf = row[30] ? String(row[30]).trim() : null;
                if (psu1Yadro || psu1Manuf) {
                    components.push({
                        type: "PSU",
                        serialNumberYadro: psu1Yadro,
                        serialNumber: psu1Manuf || psu1Yadro,
                        slot: "PSU_1"
                    });
                }
                
                // PSU2 (колонки 31-32: Yadro S/N, Manufacturer S/N)
                const psu2Yadro = row[31] ? String(row[31]).trim() : null;
                const psu2Manuf = row[32] ? String(row[32]).trim() : null;
                if (psu2Yadro || psu2Manuf) {
                    components.push({
                        type: "PSU",
                        serialNumberYadro: psu2Yadro,
                        serialNumber: psu2Manuf || psu2Yadro,
                        slot: "PSU_2"
                    });
                }
                
                // Сохраняем компоненты
                for (const comp of components) {
                    try {
                        // Проверяем дубликаты
                        const existingInventory = await ComponentInventory.findOne({
                            where: { 
                                serialNumber: comp.serialNumber 
                            }
                        });
                        
                        if (existingInventory) {
                            if (skipExisting) {
                                results.skipped.push({
                                    server: serverSerial,
                                    component: comp,
                                    reason: "duplicate"
                                });
                                continue;
                            }
                        }
                        
                        if (!dryRun) {
                            // Создаём запись в inventory
                            const inventoryRecord = await ComponentInventory.create({
                                type: comp.type,
                                serialNumber: comp.serialNumber,
                                serialNumberYadro: comp.serialNumberYadro,
                                status: "IN_USE",
                                condition: "NEW",
                                currentServerId: server?.id
                            });
                            
                            // Создаём запись о компоненте сервера
                            if (server) {
                                await BeryllServerComponent.create({
                                    serverId: server.id,
                                    type: comp.type,
                                    serialNumberYadro: comp.serialNumberYadro,
                                    serialNumberManuf: comp.serialNumber !== comp.serialNumberYadro ? comp.serialNumber : null,
                                    slot: comp.slot,
                                    inventoryId: inventoryRecord.id,
                                    installedAt: new Date()
                                });
                            }
                        }
                        
                        results.components.push({
                            server: serverSerial,
                            type: comp.type,
                            serial: comp.serialNumber,
                            action: "created"
                        });
                        
                    } catch (compError) {
                        results.errors.push({
                            server: serverSerial,
                            component: comp,
                            error: compError.message
                        });
                    }
                }
                
            } catch (rowError) {
                results.errors.push({
                    row: i + 1,
                    error: rowError.message
                });
            }
        }
        
        return results;
    }
    
    // =========================================
    // ИМПОРТ ЗАПИСЕЙ О БРАКЕ
    // =========================================
    
    /**
     * Парсинг файла "Брак_серверов.xlsm"
     */
    async importDefectRecords(filePath, options = {}) {
        const { dryRun = false } = options;
        
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        const results = {
            records: [],
            errors: [],
            skipped: []
        };
        
        const { 
            BeryllServer, 
            BeryllDefectRecord,
            UserAlias,
            User
        } = require("../../models/index");
        
        // Определяем индексы колонок на основе заголовков
        const headers = data[0];
        const colIndex = this.findColumnIndexes(headers, {
            ticketNumber: ["№ заявки", "заявка", "ticket"],
            serverSerial: ["S/N сервер", "серийный", "server"],
            clusterCode: ["кластер", "cluster"],
            defectDate: ["дата", "date"],
            problemDescription: ["описание", "проблема", "description"],
            partType: ["тип детали", "деталь", "part"],
            defectSerial: ["S/N браковой", "браковая"],
            replacementSerial: ["S/N замена", "замена"],
            status: ["статус", "status"],
            diagnostician: ["диагностик", "исполнитель"]
        });
        
        // Пропускаем заголовки
        for (let i = 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.every(cell => !cell)) continue;
            
            try {
                const ticketNumber = this.getCellValue(row, colIndex.ticketNumber);
                const serverSerial = this.getCellValue(row, colIndex.serverSerial);
                
                if (!serverSerial) {
                    results.skipped.push({ row: i + 1, reason: "no server serial" });
                    continue;
                }
                
                // Ищем сервер
                const server = await BeryllServer.findOne({
                    where: { apkSerialNumber: serverSerial }
                });
                
                if (!server) {
                    results.errors.push({ row: i + 1, error: `Server not found: ${serverSerial}` });
                    continue;
                }
                
                // Проверяем дубликаты по номеру заявки
                if (ticketNumber) {
                    const existing = await BeryllDefectRecord.findOne({
                        where: { yadroTicketNumber: ticketNumber }
                    });
                    
                    if (existing) {
                        results.skipped.push({ row: i + 1, reason: "duplicate ticket" });
                        continue;
                    }
                }
                
                // Парсим дату
                let detectedAt = new Date();
                const dateValue = this.getCellValue(row, colIndex.defectDate);
                if (dateValue) {
                    if (typeof dateValue === "number") {
                        // Excel serial date
                        detectedAt = this.excelDateToJS(dateValue);
                    } else {
                        detectedAt = new Date(dateValue);
                    }
                }
                
                // Ищем диагностика по алиасу
                let diagnosticianId = null;
                const diagnosticianName = this.getCellValue(row, colIndex.diagnostician);
                if (diagnosticianName) {
                    const user = await UserAlias.findUserByAlias(diagnosticianName);
                    if (user) {
                        diagnosticianId = user.id;
                    }
                }
                
                // Маппинг типа детали
                const partTypeRaw = this.getCellValue(row, colIndex.partType);
                const repairPartType = this.mapPartType(partTypeRaw);
                
                // Маппинг статуса
                const statusRaw = this.getCellValue(row, colIndex.status);
                const status = this.mapStatus(statusRaw);
                
                if (!dryRun) {
                    const record = await BeryllDefectRecord.create({
                        serverId: server.id,
                        yadroTicketNumber: ticketNumber || null,
                        clusterCode: this.getCellValue(row, colIndex.clusterCode) || null,
                        detectedAt,
                        problemDescription: this.getCellValue(row, colIndex.problemDescription) || null,
                        repairPartType,
                        defectPartSerialYadro: this.getCellValue(row, colIndex.defectSerial) || null,
                        replacementPartSerialYadro: this.getCellValue(row, colIndex.replacementSerial) || null,
                        status,
                        diagnosticianId
                    });
                    
                    results.records.push({
                        id: record.id,
                        ticketNumber,
                        server: serverSerial
                    });
                } else {
                    results.records.push({
                        ticketNumber,
                        server: serverSerial,
                        dryRun: true
                    });
                }
                
            } catch (rowError) {
                results.errors.push({
                    row: i + 1,
                    error: rowError.message
                });
            }
        }
        
        return results;
    }
    
    // =========================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // =========================================
    
    findColumnIndexes(headers, mappings) {
        const indexes = {};
        
        for (const [key, searchTerms] of Object.entries(mappings)) {
            indexes[key] = null;
            
            for (let i = 0; i < headers.length; i++) {
                const header = String(headers[i] || "").toLowerCase().trim();
                
                for (const term of searchTerms) {
                    if (header.includes(term.toLowerCase())) {
                        indexes[key] = i;
                        break;
                    }
                }
                
                if (indexes[key] !== null) break;
            }
        }
        
        return indexes;
    }
    
    getCellValue(row, index) {
        if (index === null || index === undefined) return null;
        const value = row[index];
        if (value === null || value === undefined) return null;
        return String(value).trim();
    }
    
    excelDateToJS(excelDate) {
        // Excel хранит даты как количество дней с 1900-01-01
        // Корректируем на ошибку Excel с 1900 високосным годом
        const msPerDay = 24 * 60 * 60 * 1000;
        const excelEpoch = new Date(1899, 11, 30);
        return new Date(excelEpoch.getTime() + excelDate * msPerDay);
    }
    
    mapPartType(raw) {
        if (!raw) return null;
        
        const normalized = raw.toLowerCase().trim();
        
        const mappings = {
            "мп": "MOTHERBOARD",
            "материнская": "MOTHERBOARD",
            "motherboard": "MOTHERBOARD",
            "оперативная": "RAM",
            "ram": "RAM",
            "память": "RAM",
            "dimm": "RAM",
            "hdd": "HDD",
            "жёсткий": "HDD",
            "жесткий": "HDD",
            "диск": "HDD",
            "ssd": "SSD",
            "твердотельный": "SSD",
            "nvme": "SSD",
            "бп": "PSU",
            "блок питания": "PSU",
            "psu": "PSU",
            "вентилятор": "FAN",
            "fan": "FAN",
            "кулер": "FAN",
            "сеть": "NIC",
            "сетевая": "NIC",
            "nic": "NIC",
            "ethernet": "NIC",
            "raid": "RAID",
            "контроллер": "RAID",
            "bmc": "BMC",
            "backplane": "BACKPLANE",
            "процессор": "CPU",
            "cpu": "CPU"
        };
        
        for (const [keyword, type] of Object.entries(mappings)) {
            if (normalized.includes(keyword)) {
                return type;
            }
        }
        
        return null;
    }
    
    mapStatus(raw) {
        if (!raw) return "NEW";
        
        const normalized = raw.toLowerCase().trim();
        
        const mappings = {
            "новый": "NEW",
            "new": "NEW",
            "диагностика": "DIAGNOSING",
            "diagnosing": "DIAGNOSING",
            "ожидание": "WAITING_PARTS",
            "waiting": "WAITING_PARTS",
            "ремонт": "REPAIRING",
            "repair": "REPAIRING",
            "отправлен": "SENT_TO_YADRO",
            "ядро": "SENT_TO_YADRO",
            "возврат": "RETURNED",
            "returned": "RETURNED",
            "решён": "RESOLVED",
            "решен": "RESOLVED",
            "resolved": "RESOLVED",
            "закрыт": "CLOSED",
            "closed": "CLOSED"
        };
        
        for (const [keyword, status] of Object.entries(mappings)) {
            if (normalized.includes(keyword)) {
                return status;
            }
        }
        
        return "NEW";
    }
}

module.exports = new ExcelImportService();
