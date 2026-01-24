/**
 * DefectRecordController.js - Контроллер записей о браке серверов
 */

const ApiError = require("../../../error/ApiError");
const DefectRecordService = require("../services/DefectRecordService");

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

    async updateStatus(req, res, next) {
        try {
            const { id } = req.params;
            const { status, comment } = req.body;
            const userId = req.user?.id;

            if (!status) {
                return next(ApiError.badRequest("status обязателен"));
            }

            const defect = await DefectRecordService.updateStatus(id, userId, status, comment);
            return res.json(defect);
        } catch (error) {
            next(ApiError.badRequest(error.message));
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

    async getAvailableActions(req, res, next) {
        try {
            const { id } = req.params;
            const actions = await DefectRecordService.getAvailableActions(id);
            return res.json(actions);
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
