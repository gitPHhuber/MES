/**
 * ComponentInventoryController.js - Контроллер инвентаря компонентов
 */

const ApiError = require("../../../error/ApiError");
const ComponentInventoryService = require("../services/ComponentInventoryService");

class ComponentInventoryController {
    
    // =========================================
    // СПРАВОЧНИК
    // =========================================
    
    async getCatalog(req, res, next) {
        try {
            const { type } = req.query;
            
            if (type) {
                const catalog = await ComponentInventoryService.getCatalogByType(type);
                return res.json(catalog);
            }
            
            // Все типы
            const { ComponentCatalog } = require("../../../models/index");
            const catalog = await ComponentCatalog.findAll({
                where: { isActive: true },
                order: [["type", "ASC"], ["manufacturer", "ASC"], ["model", "ASC"]]
            });
            
            return res.json(catalog);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async createCatalogEntry(req, res, next) {
        try {
            const { catalog, created } = await ComponentInventoryService.getOrCreateCatalogEntry(req.body);
            return res.json({ catalog, created });
        } catch (error) {
            next(error);
        }
    }
    
    async updateCatalogEntry(req, res, next) {
        try {
            const { id } = req.params;
            const catalog = await ComponentInventoryService.updateCatalogEntry(id, req.body);
            return res.json(catalog);
        } catch (error) {
            next(error);
        }
    }
    
    // =========================================
    // ИНВЕНТАРЬ - CRUD
    // =========================================
    
    async getAll(req, res, next) {
        try {
            const filters = {
                type: req.query.type,
                status: req.query.status,
                condition: req.query.condition,
                manufacturer: req.query.manufacturer,
                model: req.query.model,
                search: req.query.search,
                serverId: req.query.serverId,
                location: req.query.location,
                warrantyExpired: req.query.warrantyExpired === "true" ? true : 
                                 req.query.warrantyExpired === "false" ? false : undefined,
                limit: parseInt(req.query.limit) || 50,
                offset: parseInt(req.query.offset) || 0
            };
            
            const result = await ComponentInventoryService.getAll(filters);
            return res.json(result);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async getById(req, res, next) {
        try {
            const { id } = req.params;
            const component = await ComponentInventoryService.getById(id);
            
            if (!component) {
                return next(ApiError.notFound("Компонент не найден"));
            }
            
            return res.json(component);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async getBySerial(req, res, next) {
        try {
            const { serial } = req.params;
            const component = await ComponentInventoryService.getBySerial(serial);
            
            if (!component) {
                return next(ApiError.notFound("Компонент не найден"));
            }
            
            return res.json(component);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async create(req, res, next) {
        try {
            const userId = req.user?.id;
            const component = await ComponentInventoryService.addToInventory(req.body, userId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async bulkCreate(req, res, next) {
        try {
            const userId = req.user?.id;
            const { items } = req.body;
            
            if (!Array.isArray(items) || items.length === 0) {
                return next(ApiError.badRequest("Массив items обязателен"));
            }
            
            const results = await ComponentInventoryService.bulkAddToInventory(items, userId);
            return res.json(results);
        } catch (error) {
            next(error);
        }
    }
    
    async getAvailableByType(req, res, next) {
        try {
            const { type } = req.params;
            const count = parseInt(req.query.count) || 10;
            
            const components = await ComponentInventoryService.getAvailableByType(type, count);
            return res.json(components);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    // =========================================
    // ОПЕРАЦИИ
    // =========================================
    
    async reserve(req, res, next) {
        try {
            const { id } = req.params;
            const { defectId } = req.body;
            const userId = req.user?.id;
            
            if (!defectId) {
                return next(ApiError.badRequest("defectId обязателен"));
            }
            
            const component = await ComponentInventoryService.reserve(id, defectId, userId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async release(req, res, next) {
        try {
            const { id } = req.params;
            const { notes } = req.body;
            const userId = req.user?.id;
            
            const component = await ComponentInventoryService.release(id, userId, notes);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async installToServer(req, res, next) {
        try {
            const { id } = req.params;
            const { serverId, defectId } = req.body;
            const userId = req.user?.id;
            
            if (!serverId) {
                return next(ApiError.badRequest("serverId обязателен"));
            }
            
            const component = await ComponentInventoryService.installToServer(id, serverId, userId, defectId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async removeFromServer(req, res, next) {
        try {
            const { id } = req.params;
            const { reason, defectId } = req.body;
            const userId = req.user?.id;
            
            const component = await ComponentInventoryService.removeFromServer(id, userId, reason, defectId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async sendToYadro(req, res, next) {
        try {
            const { id } = req.params;
            const { ticketNumber } = req.body;
            const userId = req.user?.id;
            
            if (!ticketNumber) {
                return next(ApiError.badRequest("ticketNumber обязателен"));
            }
            
            const component = await ComponentInventoryService.sendToYadro(id, ticketNumber, userId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async returnFromYadro(req, res, next) {
        try {
            const { id } = req.params;
            const { condition } = req.body;
            const userId = req.user?.id;
            
            const component = await ComponentInventoryService.returnFromYadro(id, userId, condition);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async scrap(req, res, next) {
        try {
            const { id } = req.params;
            const { reason } = req.body;
            const userId = req.user?.id;
            
            const component = await ComponentInventoryService.scrap(id, userId, reason);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async updateLocation(req, res, next) {
        try {
            const { id } = req.params;
            const { location } = req.body;
            const userId = req.user?.id;
            
            if (!location) {
                return next(ApiError.badRequest("location обязателен"));
            }
            
            const component = await ComponentInventoryService.updateLocation(id, location, userId);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    async markTested(req, res, next) {
        try {
            const { id } = req.params;
            const { passed, notes } = req.body;
            const userId = req.user?.id;
            
            if (passed === undefined) {
                return next(ApiError.badRequest("passed обязателен"));
            }
            
            const component = await ComponentInventoryService.markTested(id, userId, passed, notes);
            return res.json(component);
        } catch (error) {
            next(error);
        }
    }
    
    // =========================================
    // ИСТОРИЯ
    // =========================================
    
    async getHistory(req, res, next) {
        try {
            const { id } = req.params;
            const history = await ComponentInventoryService.getHistory(id);
            return res.json(history);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    // =========================================
    // СТАТИСТИКА
    // =========================================
    
    async getStats(req, res, next) {
        try {
            const stats = await ComponentInventoryService.getStats();
            return res.json(stats);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
    
    async getWarrantyExpiring(req, res, next) {
        try {
            const days = parseInt(req.query.days) || 30;
            const components = await ComponentInventoryService.getWarrantyExpiring(days);
            return res.json(components);
        } catch (error) {
            next(ApiError.internal(error.message));
        }
    }
}

module.exports = new ComponentInventoryController();
