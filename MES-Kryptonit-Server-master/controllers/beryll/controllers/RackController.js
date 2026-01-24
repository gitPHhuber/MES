/**
 * RackController.js
 * 
 * Контроллер для работы со стойками и размещением серверов
 * 
 * Положить в: controllers/beryll/controllers/RackController.js
 */

const RackService = require("../services/RackService");
const ApiError = require("../../../error/ApiError");

class RackController {
  
  // =============================================
  // СТОЙКИ
  // =============================================
  
  /**
   * GET /api/beryll/racks
   */
  async getAllRacks(req, res, next) {
    try {
      const { status, search, includeUnits } = req.query;
      const racks = await RackService.getAllRacks({ 
        status, 
        search, 
        includeUnits: includeUnits === "true" 
      });
      res.json(racks);
    } catch (error) {
      console.error("[RackController] getAllRacks error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:id
   */
  async getRackById(req, res, next) {
    try {
      const { id } = req.params;
      const rack = await RackService.getRackById(id);
      
      if (!rack) {
        return next(ApiError.notFound("Стойка не найдена"));
      }
      
      res.json(rack);
    } catch (error) {
      console.error("[RackController] getRackById error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks
   */
  async createRack(req, res, next) {
    try {
      const userId = req.user?.id;
      const rack = await RackService.createRack(req.body, userId);
      res.status(201).json(rack);
    } catch (error) {
      console.error("[RackController] createRack error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/racks/:id
   */
  async updateRack(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const rack = await RackService.updateRack(id, req.body, userId);
      res.json(rack);
    } catch (error) {
      console.error("[RackController] updateRack error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * DELETE /api/beryll/racks/:id
   */
  async deleteRack(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await RackService.deleteRack(id, userId);
      res.json(result);
    } catch (error) {
      console.error("[RackController] deleteRack error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:id/history
   */
  async getRackHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const history = await RackService.getHistory("RACK", id, { limit, offset });
      res.json(history);
    } catch (error) {
      console.error("[RackController] getRackHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  // =============================================
  // ЮНИТЫ
  // =============================================
  
  /**
   * GET /api/beryll/racks/:rackId/units/:unitNumber
   */
  async getUnit(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const { BeryllRackUnit } = require("../../../models/definitions/BeryllExtended");
      
      const unit = await BeryllRackUnit.findOne({
        where: { rackId, unitNumber }
      });
      
      if (!unit) {
        return next(ApiError.notFound("Юнит не найден"));
      }
      
      const fullUnit = await RackService.getUnitById(unit.id);
      res.json(fullUnit);
    } catch (error) {
      console.error("[RackController] getUnit error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks/:rackId/units/:unitNumber/install
   */
  async installServer(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const { serverId, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("serverId обязателен"));
      }
      
      const unit = await RackService.installServer(
        parseInt(rackId), 
        parseInt(unitNumber), 
        serverId, 
        data, 
        userId
      );
      
      res.json(unit);
    } catch (error) {
      console.error("[RackController] installServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks/:rackId/units/:unitNumber/remove
   */
  async removeServer(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const userId = req.user?.id;
      
      const result = await RackService.removeServer(
        parseInt(rackId), 
        parseInt(unitNumber), 
        userId
      );
      
      res.json(result);
    } catch (error) {
      console.error("[RackController] removeServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/rack-units/:unitId
   */
  async updateUnit(req, res, next) {
    try {
      const { unitId } = req.params;
      const userId = req.user?.id;
      const unit = await RackService.updateUnit(unitId, req.body, userId);
      res.json(unit);
    } catch (error) {
      console.error("[RackController] updateUnit error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * POST /api/beryll/rack-units/move
   */
  async moveServer(req, res, next) {
    try {
      const { fromRackId, fromUnit, toRackId, toUnit } = req.body;
      const userId = req.user?.id;
      
      if (!fromRackId || !fromUnit || !toRackId || !toUnit) {
        return next(ApiError.badRequest("Необходимо указать все параметры: fromRackId, fromUnit, toRackId, toUnit"));
      }
      
      const unit = await RackService.moveServer(fromRackId, fromUnit, toRackId, toUnit, userId);
      res.json(unit);
    } catch (error) {
      console.error("[RackController] moveServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:rackId/free-units
   */
  async getFreeUnits(req, res, next) {
    try {
      const { rackId } = req.params;
      const units = await RackService.getFreeUnits(rackId);
      res.json(units);
    } catch (error) {
      console.error("[RackController] getFreeUnits error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/servers/:serverId/rack-location
   */
  async findServerInRacks(req, res, next) {
    try {
      const { serverId } = req.params;
      const location = await RackService.findServerInRacks(serverId);
      res.json(location || { found: false });
    } catch (error) {
      console.error("[RackController] findServerInRacks error:", error);
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new RackController();
