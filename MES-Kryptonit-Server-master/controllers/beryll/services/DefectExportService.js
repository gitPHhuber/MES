/**
 * DefectExportService.js
 * 
 * Сервис экспорта записей о браке (дефектов) в Excel
 * Формирует таблицу со всеми инцидентами по структуре:
 * - Заявка из Ядра
 * - Серийный номер сервера
 * - Номер в составе АПК Берилл (кластер)
 * - Вид комплектующего
 * - Проделанные шаги (история workflow)
 * - Комментарий
 * - Ответственный
 * 
 * Положить в: MES-Kryptonit-Server-master/services/beryll/DefectExportService.js
 */

const ExcelJS = require("exceljs");
const path = require("path");
const fs = require("fs");
const { Op } = require("sequelize");

// Статусы для отображения в истории
const STATUS_LABELS = {
    NEW: "Новая",
    DIAGNOSING: "Диагностика",
    WAITING_PARTS: "Ожидание запчастей",
    REPAIRING: "Ремонт",
    SENT_TO_YADRO: "Отправлено в Ядро",
    RETURNED: "Возврат из Ядро",
    RESOLVED: "Решено",
    REPEATED: "Повторный брак",
    CLOSED: "Закрыто"
};

// Типы деталей для отображения
const PART_TYPE_LABELS = {
    RAM: "ОЗУ",
    HDD: "HDD",
    SSD: "SSD",
    MOTHERBOARD: "Материнская плата",
    CPU: "Процессор",
    PSU: "Блок питания",
    FAN: "Вентилятор",
    NIC: "Сетевая карта",
    RAID: "RAID контроллер",
    GPU: "Видеокарта",
    OTHER: "Прочее"
};

class DefectExportService {
    /**
     * Экспорт всех дефектов в Excel
     * @param {Object} options - Параметры фильтрации
     * @returns {Buffer} - Excel файл в виде буфера
     */
    static async exportToExcel(options = {}) {
        const {
            status,
            dateFrom,
            dateTo,
            serverId,
            search
        } = options;
        
        // Получаем модели
        const {
            BeryllDefectRecord,
            BeryllServer,
            BeryllCluster,
            User,
            UserAlias
        } = require("../../models/index");
        
        // Формируем условия фильтрации
        const where = {};
        
        if (status) {
            where.status = status;
        }
        
        if (dateFrom || dateTo) {
            where.detectedAt = {};
            if (dateFrom) where.detectedAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.detectedAt[Op.lte] = new Date(dateTo);
        }
        
        if (serverId) {
            where.serverId = serverId;
        }
        
        if (search) {
            where[Op.or] = [
                { yadroTicketNumber: { [Op.iLike]: `%${search}%` } },
                { problemDescription: { [Op.iLike]: `%${search}%` } },
                { notes: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        // Получаем записи
        const records = await BeryllDefectRecord.findAll({
            where,
            include: [
                {
                    model: BeryllServer,
                    as: "server",
                    include: [
                        {
                            model: BeryllCluster,
                            as: "cluster",
                            required: false
                        }
                    ]
                },
                { model: User, as: "detectedBy", attributes: ["id", "name", "surname"] },
                { model: User, as: "diagnostician", attributes: ["id", "name", "surname"] },
                { model: User, as: "resolvedBy", attributes: ["id", "name", "surname"] },
                { 
                    model: BeryllServer, 
                    as: "substituteServer", 
                    attributes: ["id", "apkSerialNumber", "hostname"],
                    required: false 
                }
            ],
            order: [["detectedAt", "DESC"]]
        });
        
        // Создаем Excel файл
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "MES Kryptonit";
        workbook.created = new Date();
        
        const sheet = workbook.addWorksheet("Брак серверов", {
            pageSetup: {
                paperSize: 9, // A4
                orientation: "landscape"
            }
        });
        
        // Определяем колонки
        sheet.columns = [
            { header: "№", key: "num", width: 5 },
            { header: "Номер заявки в Ядре", key: "yadroTicket", width: 18 },
            { header: "Серийный номер сервера", key: "serverSerial", width: 20 },
            { header: "Наличие СПиСИ", key: "hasSPISI", width: 12 },
            { header: "Кластер", key: "cluster", width: 15 },
            { header: "Заявленная проблема", key: "problem", width: 45 },
            { header: "Дата обнаруж.", key: "detectedAt", width: 14 },
            { header: "Занимался диагностикой", key: "diagnostician", width: 22 },
            { header: "Детали ремонта", key: "partType", width: 18 },
            { header: "s/n yadro (брак)", key: "defectSnYadro", width: 22 },
            { header: "s/n плашки (брак)", key: "defectSnManuf", width: 18 },
            { header: "s/n yadro (замена)", key: "replacementSnYadro", width: 22 },
            { header: "s/n плашки (замена)", key: "replacementSnManuf", width: 18 },
            { header: "Примечания", key: "notes", width: 35 },
            { header: "Повторно забракован", key: "repeated", width: 20 },
            { header: "Сервер для подмены", key: "substitute", width: 18 },
            { header: "Отправка в Ядро", key: "sentToYadro", width: 14 },
            { header: "Возврат из Ядро", key: "returnedFromYadro", width: 14 },
            { header: "Статус", key: "status", width: 15 },
            { header: "Проделанные шаги", key: "steps", width: 50 },
            { header: "Ответственный", key: "responsible", width: 20 }
        ];
        
        // Стили для заголовков
        const headerStyle = {
            font: { bold: true, color: { argb: "FFFFFFFF" }, size: 11 },
            fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } },
            alignment: { horizontal: "center", vertical: "middle", wrapText: true },
            border: {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            }
        };
        
        // Применяем стили к заголовкам
        sheet.getRow(1).height = 35;
        sheet.getRow(1).eachCell((cell) => {
            cell.font = headerStyle.font;
            cell.fill = headerStyle.fill;
            cell.alignment = headerStyle.alignment;
            cell.border = headerStyle.border;
        });
        
        // Добавляем данные
        let rowNum = 1;
        for (const record of records) {
            // Формируем историю шагов
            const steps = this.buildStepsHistory(record);
            
            // Определяем ответственного
            const responsible = this.getResponsiblePerson(record);
            
            const row = sheet.addRow({
                num: rowNum++,
                yadroTicket: record.yadroTicketNumber || "",
                serverSerial: record.server?.apkSerialNumber || "",
                hasSPISI: record.hasSPISI ? "Да" : "Нет",
                cluster: record.clusterCode || record.server?.cluster?.code || "",
                problem: record.problemDescription || "",
                detectedAt: record.detectedAt ? new Date(record.detectedAt) : "",
                diagnostician: this.formatUserName(record.diagnostician),
                partType: PART_TYPE_LABELS[record.repairPartType] || record.repairPartType || "",
                defectSnYadro: record.defectPartSerialYadro || "",
                defectSnManuf: record.defectPartSerialManuf || "",
                replacementSnYadro: record.replacementPartSerialYadro || "",
                replacementSnManuf: record.replacementPartSerialManuf || "",
                notes: record.notes || "",
                repeated: record.isRepeatedDefect ? 
                    `Да: ${record.repeatedDefectReason || "причина не указана"}` : "",
                substitute: record.substituteServer?.apkSerialNumber || 
                    record.substituteServerSerial || "",
                sentToYadro: record.sentToYadroAt ? new Date(record.sentToYadroAt) : "",
                returnedFromYadro: record.returnedFromYadroAt ? new Date(record.returnedFromYadroAt) : "",
                status: STATUS_LABELS[record.status] || record.status,
                steps: steps,
                responsible: responsible
            });
            
            // Стили для строк данных
            const rowStyle = {
                alignment: { vertical: "middle", wrapText: true },
                border: {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                }
            };
            
            row.eachCell((cell) => {
                cell.alignment = rowStyle.alignment;
                cell.border = rowStyle.border;
            });
            
            // Форматирование дат
            const dateColumns = ["detectedAt", "sentToYadro", "returnedFromYadro"];
            dateColumns.forEach(col => {
                const cell = row.getCell(col);
                if (cell.value instanceof Date) {
                    cell.numFmt = "DD.MM.YYYY";
                }
            });
            
            // Выделение повторного брака красным
            if (record.isRepeatedDefect) {
                row.getCell("repeated").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFF0000" }
                };
                row.getCell("repeated").font = { color: { argb: "FFFFFFFF" } };
            }
            
            // Выделение критичных статусов
            if (record.status === "SENT_TO_YADRO") {
                row.getCell("status").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFC000" }
                };
            }
        }
        
        // Автофильтр
        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: records.length + 1, column: sheet.columns.length }
        };
        
        // Закрепление заголовков
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        
        // Генерируем буфер
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
    
    /**
     * Формирование истории шагов по записи
     */
    static buildStepsHistory(record) {
        const steps = [];
        
        if (record.detectedAt) {
            steps.push(`${this.formatDate(record.detectedAt)}: Обнаружен дефект`);
        }
        
        if (record.diagnosisStartedAt) {
            steps.push(`${this.formatDate(record.diagnosisStartedAt)}: Начата диагностика`);
        }
        
        if (record.diagnosisCompletedAt) {
            steps.push(`${this.formatDate(record.diagnosisCompletedAt)}: Диагностика завершена`);
        }
        
        if (record.repairStartedAt) {
            steps.push(`${this.formatDate(record.repairStartedAt)}: Начат ремонт`);
        }
        
        if (record.sentToYadroAt) {
            steps.push(`${this.formatDate(record.sentToYadroAt)}: Отправлено в Ядро`);
        }
        
        if (record.returnedFromYadroAt) {
            steps.push(`${this.formatDate(record.returnedFromYadroAt)}: Возврат из Ядро`);
        }
        
        if (record.repairCompletedAt) {
            steps.push(`${this.formatDate(record.repairCompletedAt)}: Ремонт завершен`);
        }
        
        if (record.resolvedAt) {
            steps.push(`${this.formatDate(record.resolvedAt)}: Решено`);
        }
        
        if (record.repairDetails) {
            steps.push(`Детали ремонта: ${record.repairDetails}`);
        }
        
        if (record.resolution) {
            steps.push(`Резолюция: ${record.resolution}`);
        }
        
        return steps.join("\n");
    }
    
    /**
     * Определение ответственного лица
     */
    static getResponsiblePerson(record) {
        // Приоритет: diagnostician > resolvedBy > detectedBy
        if (record.diagnostician) {
            return this.formatUserName(record.diagnostician);
        }
        if (record.resolvedBy) {
            return this.formatUserName(record.resolvedBy);
        }
        if (record.detectedBy) {
            return this.formatUserName(record.detectedBy);
        }
        return "";
    }
    
    /**
     * Форматирование имени пользователя
     */
    static formatUserName(user) {
        if (!user) return "";
        
        const surname = user.surname || "";
        const name = user.name || "";
        
        if (surname && name) {
            // Формат: "Фамилия И."
            return `${surname} ${name.charAt(0)}.`;
        }
        
        return surname || name || "";
    }
    
    /**
     * Форматирование даты
     */
    static formatDate(date) {
        if (!date) return "";
        const d = new Date(date);
        return d.toLocaleDateString("ru-RU", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        });
    }
    
    /**
     * Экспорт статистики по дефектам
     */
    static async exportStatsToExcel(options = {}) {
        const { BeryllDefectRecord, BeryllServer, User } = require("../../models/index");
        const { Sequelize } = require("sequelize");
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "MES Kryptonit";
        
        // Лист 1: Сводка по статусам
        const summarySheet = workbook.addWorksheet("Сводка");
        
        const statusStats = await BeryllDefectRecord.findAll({
            attributes: [
                "status",
                [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
            ],
            group: ["status"]
        });
        
        summarySheet.columns = [
            { header: "Статус", key: "status", width: 25 },
            { header: "Количество", key: "count", width: 15 }
        ];
        
        statusStats.forEach(stat => {
            summarySheet.addRow({
                status: STATUS_LABELS[stat.status] || stat.status,
                count: parseInt(stat.dataValues.count)
            });
        });
        
        // Лист 2: Сводка по типам деталей
        const partTypeSheet = workbook.addWorksheet("По типам деталей");
        
        const partTypeStats = await BeryllDefectRecord.findAll({
            attributes: [
                "repairPartType",
                [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
            ],
            where: {
                repairPartType: { [Op.ne]: null }
            },
            group: ["repairPartType"]
        });
        
        partTypeSheet.columns = [
            { header: "Тип детали", key: "partType", width: 25 },
            { header: "Количество", key: "count", width: 15 }
        ];
        
        partTypeStats.forEach(stat => {
            partTypeSheet.addRow({
                partType: PART_TYPE_LABELS[stat.repairPartType] || stat.repairPartType,
                count: parseInt(stat.dataValues.count)
            });
        });
        
        // Лист 3: Сводка по диагностам
        const diagnosticianSheet = workbook.addWorksheet("По диагностам");
        
        const diagnosticianStats = await BeryllDefectRecord.findAll({
            attributes: [
                "diagnosticianId",
                [Sequelize.fn("COUNT", Sequelize.col("BeryllDefectRecord.id")), "count"]
            ],
            include: [{
                model: User,
                as: "diagnostician",
                attributes: ["name", "surname"]
            }],
            where: {
                diagnosticianId: { [Op.ne]: null }
            },
            group: ["diagnosticianId", "diagnostician.id", "diagnostician.name", "diagnostician.surname"]
        });
        
        diagnosticianSheet.columns = [
            { header: "Диагност", key: "name", width: 30 },
            { header: "Количество дефектов", key: "count", width: 20 }
        ];
        
        diagnosticianStats.forEach(stat => {
            diagnosticianSheet.addRow({
                name: this.formatUserName(stat.diagnostician),
                count: parseInt(stat.dataValues.count)
            });
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
}

module.exports = DefectExportService;