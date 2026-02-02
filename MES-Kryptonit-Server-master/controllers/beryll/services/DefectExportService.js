
const ExcelJS = require("exceljs");
const { Op } = require("sequelize");

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
    BACKPLANE: "Backplane",
    BMC: "BMC модуль",
    CABLE: "Кабель",
    GPU: "Видеокарта",
    OTHER: "Прочее"
};


function formatUserName(user) {
    if (!user) return "";
    
    const surname = user.surname || "";
    const name = user.name || "";
    
    if (surname && name) {
        return `${surname} ${name.charAt(0)}.`;
    }
    
    return surname || name || "";
}


function formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    return d.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function buildStepsHistory(record) {
    const steps = [];
    
    if (record.detectedAt) {
        steps.push(`${formatDate(record.detectedAt)}: Обнаружен дефект`);
    }
    
    if (record.diagnosisStartedAt) {
        steps.push(`${formatDate(record.diagnosisStartedAt)}: Начата диагностика`);
    }
    
    if (record.diagnosisCompletedAt) {
        steps.push(`${formatDate(record.diagnosisCompletedAt)}: Диагностика завершена`);
    }
    
    if (record.repairStartedAt) {
        steps.push(`${formatDate(record.repairStartedAt)}: Начат ремонт`);
    }
    
    if (record.sentToYadroAt) {
        steps.push(`${formatDate(record.sentToYadroAt)}: Отправлено в Ядро`);
    }
    
    if (record.returnedFromYadroAt) {
        steps.push(`${formatDate(record.returnedFromYadroAt)}: Возврат из Ядро`);
    }
    
    if (record.repairCompletedAt) {
        steps.push(`${formatDate(record.repairCompletedAt)}: Ремонт завершен`);
    }
    
    if (record.resolvedAt) {
        steps.push(`${formatDate(record.resolvedAt)}: Решено`);
    }
    
    if (record.repairDetails) {
        steps.push(`Детали ремонта: ${record.repairDetails}`);
    }
    
    if (record.resolution) {
        steps.push(`Резолюция: ${record.resolution}`);
    }
    
    return steps.join("\n");
}


function getResponsiblePerson(record) {
    if (record.diagnostician) {
        return formatUserName(record.diagnostician);
    }
    if (record.resolvedBy) {
        return formatUserName(record.resolvedBy);
    }
    if (record.detectedBy) {
        return formatUserName(record.detectedBy);
    }
    return "";
}


function applyHeaderStyle(sheet) {
    sheet.getRow(1).height = 30;
    sheet.getRow(1).eachCell((cell) => {
        cell.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 11 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF4472C4" } };
        cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
        cell.border = {
            top: { style: "thin" },
            left: { style: "thin" },
            bottom: { style: "thin" },
            right: { style: "thin" }
        };
    });
}


const DefectExportService = {
    
    /**
     * Экспорт всех дефектов в Excel
     * @param {Object} options - Параметры фильтрации
     * @returns {Buffer} - Excel файл в виде буфера
     */
    exportToExcel: async function(options = {}) {
        const {
            status,
            dateFrom,
            dateTo,
            serverId,
            search
        } = options;
        
        const {
            BeryllDefectRecord,
            BeryllServer,
            User
        } = require("../../../models/index");
        

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
                { notes: { [Op.iLike]: `%${search}%` } },
                { serverSerial: { [Op.iLike]: `%${search}%` } }
            ];
        }
        

        const records = await BeryllDefectRecord.findAll({
            where,
            include: [
                {
                    model: BeryllServer,
                    as: "server",
                    attributes: ["id", "apkSerialNumber", "hostname"],
                    required: false
                },
                { 
                    model: User, 
                    as: "detectedBy", 
                    attributes: ["id", "name", "surname"],
                    required: false 
                },
                { 
                    model: User, 
                    as: "diagnostician", 
                    attributes: ["id", "name", "surname"],
                    required: false 
                },
                { 
                    model: User, 
                    as: "resolvedBy", 
                    attributes: ["id", "name", "surname"],
                    required: false 
                }

            ],
            order: [["detectedAt", "DESC"]]
        });
        

        const workbook = new ExcelJS.Workbook();
        workbook.creator = "MES Kryptonit";
        workbook.created = new Date();
        
        const sheet = workbook.addWorksheet("Брак серверов", {
            pageSetup: {
                paperSize: 9,
                orientation: "landscape"
            }
        });
        
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
        

        applyHeaderStyle(sheet);
        
        let rowNum = 1;
        for (const record of records) {
            const steps = buildStepsHistory(record);
            const responsible = getResponsiblePerson(record);
            
            const serverSerialValue = record.serverSerial || record.server?.apkSerialNumber || "";
            
            const row = sheet.addRow({
                num: rowNum++,
                yadroTicket: record.yadroTicketNumber || "",
                serverSerial: serverSerialValue,
                hasSPISI: record.hasSPISI ? "Да" : "Нет",
                cluster: record.clusterCode || "",
                problem: record.problemDescription || "",
                detectedAt: record.detectedAt ? new Date(record.detectedAt) : "",
                diagnostician: formatUserName(record.diagnostician),
                partType: PART_TYPE_LABELS[record.repairPartType] || record.repairPartType || "",
                defectSnYadro: record.defectPartSerialYadro || "",
                defectSnManuf: record.defectPartSerialManuf || "",
                replacementSnYadro: record.replacementPartSerialYadro || "",
                replacementSnManuf: record.replacementPartSerialManuf || "",
                notes: record.notes || "",
                repeated: record.isRepeatedDefect ? 
                    `Да: ${record.repeatedDefectReason || "причина не указана"}` : "",
                substitute: record.substituteServerSerial || "",
                sentToYadro: record.sentToYadroAt ? new Date(record.sentToYadroAt) : "",
                returnedFromYadro: record.returnedFromYadroAt ? new Date(record.returnedFromYadroAt) : "",
                status: STATUS_LABELS[record.status] || record.status,
                steps: steps,
                responsible: responsible
            });
            

            row.eachCell((cell) => {
                cell.alignment = { vertical: "middle", wrapText: true };
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });
            

            ["detectedAt", "sentToYadro", "returnedFromYadro"].forEach(col => {
                const cell = row.getCell(col);
                if (cell.value instanceof Date) {
                    cell.numFmt = "DD.MM.YYYY";
                }
            });
            
            if (record.isRepeatedDefect) {
                row.getCell("repeated").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFF0000" }
                };
                row.getCell("repeated").font = { color: { argb: "FFFFFFFF" } };
            }
            
            if (record.status === "SENT_TO_YADRO") {
                row.getCell("status").fill = {
                    type: "pattern",
                    pattern: "solid",
                    fgColor: { argb: "FFFFC000" }
                };
            }
        }

        sheet.autoFilter = {
            from: { row: 1, column: 1 },
            to: { row: records.length + 1, column: sheet.columns.length }
        };
        
        sheet.views = [{ state: "frozen", ySplit: 1 }];
        
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    },
    
    exportStatsToExcel: async function(options = {}) {
        const { BeryllDefectRecord, User } = require("../../../models/index");
        const { Sequelize } = require("sequelize");
        
        const workbook = new ExcelJS.Workbook();
        workbook.creator = "MES Kryptonit";
        workbook.created = new Date();
        
        const summarySheet = workbook.addWorksheet("Сводка по статусам");
        
        const statusStats = await BeryllDefectRecord.findAll({
            attributes: [
                "status",
                [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
            ],
            group: ["status"],
            order: [[Sequelize.fn("COUNT", Sequelize.col("id")), "DESC"]]
        });
        
        summarySheet.columns = [
            { header: "Статус", key: "status", width: 25 },
            { header: "Количество", key: "count", width: 15 }
        ];
        
        applyHeaderStyle(summarySheet);
        
        let totalCount = 0;
        statusStats.forEach(stat => {
            const count = parseInt(stat.dataValues.count);
            totalCount += count;
            const row = summarySheet.addRow({
                status: STATUS_LABELS[stat.status] || stat.status,
                count: count
            });
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });
        });
        
        const totalRow = summarySheet.addRow({ status: "ИТОГО", count: totalCount });
        totalRow.font = { bold: true };
        totalRow.eachCell(cell => {
            cell.border = {
                top: { style: "thin" },
                left: { style: "thin" },
                bottom: { style: "thin" },
                right: { style: "thin" }
            };
            cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2EFDA" } };
        });
        
        const partTypeSheet = workbook.addWorksheet("По типам деталей");
        
        const partTypeStats = await BeryllDefectRecord.findAll({
            attributes: [
                "repairPartType",
                [Sequelize.fn("COUNT", Sequelize.col("id")), "count"]
            ],
            where: {
                repairPartType: { [Op.ne]: null }
            },
            group: ["repairPartType"],
            order: [[Sequelize.fn("COUNT", Sequelize.col("id")), "DESC"]]
        });
        
        partTypeSheet.columns = [
            { header: "Тип детали", key: "partType", width: 25 },
            { header: "Количество", key: "count", width: 15 }
        ];
        
        applyHeaderStyle(partTypeSheet);
        
        partTypeStats.forEach(stat => {
            const row = partTypeSheet.addRow({
                partType: PART_TYPE_LABELS[stat.repairPartType] || stat.repairPartType,
                count: parseInt(stat.dataValues.count)
            });
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });
        });
        
        const diagnosticianSheet = workbook.addWorksheet("По диагностам");
        
        const diagnosticianStats = await BeryllDefectRecord.findAll({
            attributes: [
                "diagnosticianId",
                [Sequelize.fn("COUNT", Sequelize.col("BeryllDefectRecord.id")), "count"]
            ],
            include: [{
                model: User,
                as: "diagnostician",
                attributes: ["name", "surname"],
                required: true
            }],
            where: {
                diagnosticianId: { [Op.ne]: null }
            },
            group: ["diagnosticianId", "diagnostician.id", "diagnostician.name", "diagnostician.surname"],
            order: [[Sequelize.fn("COUNT", Sequelize.col("BeryllDefectRecord.id")), "DESC"]]
        });
        
        diagnosticianSheet.columns = [
            { header: "Диагност", key: "name", width: 30 },
            { header: "Количество дефектов", key: "count", width: 20 }
        ];
        
        applyHeaderStyle(diagnosticianSheet);
        
        diagnosticianStats.forEach(stat => {
            const row = diagnosticianSheet.addRow({
                name: formatUserName(stat.diagnostician),
                count: parseInt(stat.dataValues.count)
            });
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });
        });
        
        const repeatedSheet = workbook.addWorksheet("Повторный брак");
        
        const repeatedStats = await BeryllDefectRecord.findAll({
            attributes: [
                [Sequelize.fn("COUNT", Sequelize.col("id")), "total"],
                [Sequelize.fn("SUM", Sequelize.literal("CASE WHEN \"isRepeatedDefect\" = true THEN 1 ELSE 0 END")), "repeated"]
            ]
        });
        
        repeatedSheet.columns = [
            { header: "Показатель", key: "metric", width: 30 },
            { header: "Значение", key: "value", width: 15 }
        ];
        
        applyHeaderStyle(repeatedSheet);
        
        const total = parseInt(repeatedStats[0]?.dataValues?.total || 0);
        const repeated = parseInt(repeatedStats[0]?.dataValues?.repeated || 0);
        const percent = total > 0 ? ((repeated / total) * 100).toFixed(1) : 0;
        
        [
            { metric: "Всего дефектов", value: total },
            { metric: "Повторный брак", value: repeated },
            { metric: "Процент повторного брака", value: `${percent}%` }
        ].forEach(item => {
            const row = repeatedSheet.addRow(item);
            row.eachCell(cell => {
                cell.border = {
                    top: { style: "thin" },
                    left: { style: "thin" },
                    bottom: { style: "thin" },
                    right: { style: "thin" }
                };
            });
        });
        
        const buffer = await workbook.xlsx.writeBuffer();
        return buffer;
    }
};

module.exports = DefectExportService;