const ApiError = require("../../error/ApiError");
const ExcelImportService = require("../../services/ExcelImportService");
const path = require("path");
const fs = require("fs");

const UPLOADS_DIR = path.join(__dirname, "../../../uploads/imports");

class ImportController {
    
    async importServerComponents(req, res, next) {
        try {
            if (!req.files || !req.files.file) {
                return next(ApiError.badRequest("Файл не загружен"));
            }
            
            const file = req.files.file;
            const dryRun = req.body.dryRun === "true";
            const skipExisting = req.body.skipExisting !== "false";
            

            const ext = path.extname(file.name).toLowerCase();
            if (![".xlsx", ".xls", ".xlsm"].includes(ext)) {
                return next(ApiError.badRequest("Неподдерживаемый формат файла. Используйте .xlsx, .xls или .xlsm"));
            }
            

            if (!fs.existsSync(UPLOADS_DIR)) {
                fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            }
            
            const tempPath = path.join(UPLOADS_DIR, `${Date.now()}_${file.name}`);
            await file.mv(tempPath);
            
            try {
 
                const results = await ExcelImportService.importServerComponents(tempPath, {
                    dryRun,
                    skipExisting
                });
                
                fs.unlinkSync(tempPath);
                
                return res.json({
                    success: true,
                    dryRun,
                    summary: {
                        serversCreated: results.servers.filter(s => s.action === "created").length,
                        serversExisting: results.servers.filter(s => s.action === "exists").length,
                        componentsCreated: results.components.length,
                        skipped: results.skipped.length,
                        errors: results.errors.length
                    },
                    details: results
                });
                
            } catch (importError) {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                throw importError;
            }
            
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async importDefectRecords(req, res, next) {
        try {
            if (!req.files || !req.files.file) {
                return next(ApiError.badRequest("Файл не загружен"));
            }
            
            const file = req.files.file;
            const dryRun = req.body.dryRun === "true";
            
            const ext = path.extname(file.name).toLowerCase();
            if (![".xlsx", ".xls", ".xlsm"].includes(ext)) {
                return next(ApiError.badRequest("Неподдерживаемый формат файла. Используйте .xlsx, .xls или .xlsm"));
            }
            
            if (!fs.existsSync(UPLOADS_DIR)) {
                fs.mkdirSync(UPLOADS_DIR, { recursive: true });
            }
            
            const tempPath = path.join(UPLOADS_DIR, `${Date.now()}_${file.name}`);
            await file.mv(tempPath);
            
            try {

                const results = await ExcelImportService.importDefectRecords(tempPath, {
                    dryRun
                });
                

                fs.unlinkSync(tempPath);
                
                return res.json({
                    success: true,
                    dryRun,
                    summary: {
                        recordsCreated: results.records.length,
                        skipped: results.skipped.length,
                        errors: results.errors.length
                    },
                    details: results
                });
                
            } catch (importError) {
                if (fs.existsSync(tempPath)) {
                    fs.unlinkSync(tempPath);
                }
                throw importError;
            }
            
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    

    async downloadServerComponentsTemplate(req, res, next) {
        try {
            const XLSX = require("xlsx");
            

            const headers = [
                "S/N сервера",
                ...Array.from({ length: 12 }, (_, i) => `HDD_${i + 1} (Yadro S/N)`),
                ...Array.from({ length: 12 }, (_, i) => `RAM_${i + 1} (Yadro S/N)`),
                ...Array.from({ length: 4 }, (_, i) => `SSD_${i + 1} (Yadro S/N)`),
                "PSU_1 (Yadro S/N)", "PSU_1 (Manuf S/N)",
                "PSU_2 (Yadro S/N)", "PSU_2 (Manuf S/N)"
            ];
            
            const exampleRow = [
                "APK12345678",
                "Y1P6A0GN2E02B", "Y1P6A0GN2E02C", "", "", "", "", "", "", "", "", "", "",
                "Y1RAM001", "Y1RAM002", "", "", "", "", "", "", "", "", "", "",
                "Y1SSD001", "", "", "",
                "Y1PSU001", "MANUF001",
                "Y1PSU002", "MANUF002"
            ];
            
            const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Компоненты серверов");
            
            const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
            
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=template_server_components.xlsx");
            res.send(buffer);
            
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    

    async downloadDefectRecordsTemplate(req, res, next) {
        try {
            const XLSX = require("xlsx");
            
            const headers = [
                "№ заявки",
                "S/N сервер",
                "Кластер",
                "Дата обнаружения",
                "Описание проблемы",
                "Тип детали",
                "S/N браковой детали",
                "S/N замены",
                "Статус",
                "Диагностик"
            ];
            
            const exampleRow = [
                "INC123456",
                "APK12345678",
                "cl1-master1",
                "2025-01-15",
                "Сбой HDD в слоте 3",
                "HDD",
                "Y1P6A0GN2E02B",
                "Y1P6A0GN2E02C",
                "Решён",
                "Иванов И.И."
            ];
            
            const ws = XLSX.utils.aoa_to_sheet([headers, exampleRow]);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Записи о браке");
            
            const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
            
            res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
            res.setHeader("Content-Disposition", "attachment; filename=template_defect_records.xlsx");
            res.send(buffer);
            
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
}

module.exports = new ImportController();
