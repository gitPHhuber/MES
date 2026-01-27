/**
 * DefectRecordController.js - Контроллер записей о браке серверов
 * Путь: controllers/beryll/controllers/DefectRecordController.js
 * 
 * Включает:
 * - CRUD операции
 * - Workflow диагностики и ремонта
 * - Работа с файлами (загрузка, скачивание, удаление)
 * - Справочники и статистика
 */

const path = require("path");
const fs = require("fs");
const ApiError = require("../../../error/ApiError");
const DefectRecordService = require("../services/DefectRecordService");

// Директория для хранения файлов дефектов
const DEFECT_FILES_DIR = path.join(__dirname, "../../../static/defect-records");

// Убедимся, что директория существует
if (!fs.existsSync(DEFECT_FILES_DIR)) {
    fs.mkdirSync(DEFECT_FILES_DIR, { recursive: true });
}

class DefectRecordController {
    
    // =========================================
    // CRUD
    // =========================================
    
    async getAll(req, res, next) {
        try {
            const filters = {
                serverId: req.query.serverId,
                status: req.query.status,
                repairPartType: req.query.repairPartType,
                diagnosticianId: req.query.diagnosticianId,
                isRepeatedDefect: req.query.isRepeatedDefect === "true" ? true : 
                                  req.query.isRepeatedDefect === "false" ? false : undefined,
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                search: req.query.search,
                slaBreached: req.query.slaBreached === "true",
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };
            
            const result = await DefectRecordService.getAll(filters);
            return res.json(result);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const defect = await DefectRecordService.getById(id);
            
            if (!defect) {
                return next(ApiError.notFound("Запись о браке не найдена"));
            }
            
            return res.json(defect);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async create(req, res, next) {
        try {
            const userId = req.user?.id;
            const defect = await DefectRecordService.create(req.body, userId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: ДИАГНОСТИКА
    // =========================================
    
    async startDiagnosis(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.startDiagnosis(id, userId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    async completeDiagnosis(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.completeDiagnosis(id, userId, req.body);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: ОЖИДАНИЕ ЗАПЧАСТЕЙ
    // =========================================
    
    async setWaitingParts(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            const { notes } = req.body;
            
            const defect = await DefectRecordService.setWaitingParts(id, userId, notes);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    async reserveComponent(req, res, next) {
        try {
            const { id } = req.params;
            const { inventoryId } = req.body;
            const userId = req.user?.id;
            
            if (!inventoryId) {
                return next(ApiError.badRequest("inventoryId обязателен"));
            }
            
            const defect = await DefectRecordService.reserveReplacementComponent(id, inventoryId, userId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: РЕМОНТ
    // =========================================
    
    async startRepair(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.startRepair(id, userId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    async performReplacement(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.performComponentReplacement(id, userId, req.body);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: ЯДРО
    // =========================================
    
    async sendToYadro(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.sendToYadro(id, userId, req.body);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    async returnFromYadro(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.returnFromYadro(id, userId, req.body);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: ПОДМЕННЫЕ СЕРВЕРЫ
    // =========================================
    
    async issueSubstitute(req, res, next) {
        try {
            const { id } = req.params;
            const { substituteServerId } = req.body;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.issueSubstituteServer(id, userId, substituteServerId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    async returnSubstitute(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.returnSubstituteServer(id, userId);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // WORKFLOW: ЗАКРЫТИЕ
    // =========================================
    
    async resolve(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            const defect = await DefectRecordService.resolve(id, userId, req.body);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
        }
    }
    
    // =========================================
    // ФАЙЛЫ
    // =========================================
    
    /**
     * GET /api/beryll/defect-records/:id/files
     * Получить список файлов записи о браке
     */
    async getFiles(req, res, next) {
        try {
            const { id } = req.params;
            
            // Проверяем существование записи
            const defect = await DefectRecordService.getById(id);
            if (!defect) {
                return next(ApiError.notFound("Запись о браке не найдена"));
            }
            
            const files = await DefectRecordService.getFiles(id);
            return res.json(files);
        } catch (error) {
            console.error("[DefectRecordController] getFiles error:", error);
            next(ApiError.internal(error.message));
        }
    }
    
    /**
     * POST /api/beryll/defect-records/:id/files
     * Загрузить файл к записи о браке
     */
    async uploadFile(req, res, next) {
        try {
            const { id } = req.params;
            const userId = req.user?.id;
            
            // Проверяем существование записи
            const defect = await DefectRecordService.getById(id);
            if (!defect) {
                return next(ApiError.notFound("Запись о браке не найдена"));
            }
            
            // Проверяем наличие файла (express-fileupload)
            if (!req.files || !req.files.file) {
                return next(ApiError.badRequest("Файл не загружен"));
            }
            
            const file = req.files.file;
            
            // Валидация размера (макс 50MB)
            const maxSize = 50 * 1024 * 1024;
            if (file.size > maxSize) {
                return next(ApiError.badRequest("Файл слишком большой (максимум 50MB)"));
            }
            
            // Создаём директорию для записи
            const recordDir = path.join(DEFECT_FILES_DIR, String(id));
            if (!fs.existsSync(recordDir)) {
                fs.mkdirSync(recordDir, { recursive: true });
            }
            
            // Генерируем уникальное имя файла
            const ext = path.extname(file.name);
            const timestamp = Date.now();
            const safeOriginalName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const fileName = `${timestamp}_${safeOriginalName}`;
            const filePath = path.join(recordDir, fileName);
            
            // Сохраняем файл
            await file.mv(filePath);
            
            // Сохраняем запись в БД
            const fileRecord = await DefectRecordService.addFile(id, {
                fileName,
                originalName: file.name,
                filePath: path.join(String(id), fileName),
                mimeType: file.mimetype,
                fileSize: file.size,
                uploadedById: userId
            });
            
            return res.json({
                success: true,
                file: fileRecord
            });
        } catch (error) {
            console.error("[DefectRecordController] uploadFile error:", error);
            next(ApiError.internal(error.message));
        }
    }
    
    /**
     * GET /api/beryll/defect-record-files/:fileId
     * Скачать файл
     */
    async downloadFile(req, res, next) {
        try {
            const { fileId } = req.params;
            
            const fileRecord = await DefectRecordService.getFileById(fileId);
            if (!fileRecord) {
                return next(ApiError.notFound("Файл не найден"));
            }
            
            const fullPath = path.join(DEFECT_FILES_DIR, fileRecord.filePath);
            
            if (!fs.existsSync(fullPath)) {
                return next(ApiError.notFound("Файл не найден на диске"));
            }
            
            // Устанавливаем заголовки для скачивания
            res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(fileRecord.originalName)}"`);
            res.setHeader('Content-Type', fileRecord.mimeType || 'application/octet-stream');
            
            return res.download(fullPath, fileRecord.originalName);
        } catch (error) {
            console.error("[DefectRecordController] downloadFile error:", error);
            next(ApiError.internal(error.message));
        }
    }
    
    /**
     * DELETE /api/beryll/defect-record-files/:fileId
     * Удалить файл
     */
    async deleteFile(req, res, next) {
        try {
            const { fileId } = req.params;
            const userId = req.user?.id;
            
            const fileRecord = await DefectRecordService.getFileById(fileId);
            if (!fileRecord) {
                return next(ApiError.notFound("Файл не найден"));
            }
            
            // Удаляем файл с диска
            const fullPath = path.join(DEFECT_FILES_DIR, fileRecord.filePath);
            if (fs.existsSync(fullPath)) {
                fs.unlinkSync(fullPath);
            }
            
            // Удаляем запись из БД
            await DefectRecordService.deleteFile(fileId, userId);
            
            return res.json({
                success: true,
                message: "Файл удалён"
            });
        } catch (error) {
            console.error("[DefectRecordController] deleteFile error:", error);
            next(ApiError.internal(error.message));
        }
    }
    
    // =========================================
    // СПРАВОЧНИКИ
    // =========================================
    
    async getRepairPartTypes(req, res, next) {
        try {
            const types = DefectRecordService.getRepairPartTypes();
            return res.json(types);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async getStatuses(req, res, next) {
        try {
            const statuses = DefectRecordService.getStatuses();
            return res.json(statuses);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    // =========================================
    // СТАТИСТИКА
    // =========================================
    
    async getStats(req, res, next) {
        try {
            const filters = {
                dateFrom: req.query.dateFrom,
                dateTo: req.query.dateTo,
                serverId: req.query.serverId
            };
            
            const stats = await DefectRecordService.getStats(filters);
            return res.json(stats);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
}

module.exports = new DefectRecordController();