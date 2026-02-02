
const RackService = require("../services/RackService");
const ApiError = require("../../../error/ApiError");

class RackController {
  

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
  

  async getRackHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      
      const history = await RackService.getHistory("RACK", id, {
        limit: parseInt(limit) || 50,
        offset: parseInt(offset) || 0
      });
      
      res.json(history);
    } catch (error) {
      console.error("[RackController] getRackHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getRackSummary(req, res, next) {
    try {
      const { rackId } = req.params;
      const summary = await RackService.getRackSummary(parseInt(rackId));
      res.json(summary);
    } catch (error) {
      console.error("[RackController] getRackSummary error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

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
  
  async getUnit(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const unit = await RackService.getUnitByNumber(parseInt(rackId), parseInt(unitNumber));
      
      if (!unit) {
        return next(ApiError.notFound("Юнит не найден"));
      }
      
      res.json(unit);
    } catch (error) {
      console.error("[RackController] getUnit error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getUnitsByStatus(req, res, next) {
    try {
      const { rackId } = req.params;
      const { status } = req.query;
      
      const units = await RackService.getUnitsByServerStatus(parseInt(rackId), status);
      res.json(units);
    } catch (error) {
      console.error("[RackController] getUnitsByStatus error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async placeServer(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const { serverId } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("Необходимо указать serverId"));
      }
      
      const unit = await RackService.placeServerInRack(
        parseInt(rackId), 
        parseInt(unitNumber), 
        serverId, 
        userId
      );
      
      res.json(unit);
    } catch (error) {
      console.error("[RackController] placeServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async installServer(req, res, next) {
    try {
      const { rackId, unitNumber } = req.params;
      const { serverId, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("Необходимо указать serverId"));
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
  
  async syncWithDhcp(req, res, next) {
    try {
      const { rackId } = req.params;
      const userId = req.user?.id;
      
      const result = await RackService.syncRackWithDhcp(parseInt(rackId), userId);
      res.json(result);
    } catch (error) {
      console.error("[RackController] syncWithDhcp error:", error);
      next(ApiError.internal(`Ошибка синхронизации с DHCP: ${error.message}`));
    }
  }
  
  async findIpByMac(req, res, next) {
    try {
      const { mac } = req.params;
      
      if (!mac) {
        return next(ApiError.badRequest("Необходимо указать MAC адрес"));
      }
      
      const result = await RackService.findIpByMac(mac);
      res.json(result);
    } catch (error) {
      console.error("[RackController] findIpByMac error:", error);
      next(ApiError.internal(`Ошибка поиска IP: ${error.message}`));
    }
  }
  
  async createServer(req, res, next) {
    try {
      const userId = req.user?.id;
      const server = await RackService.createServerManually(req.body, userId);
      res.status(201).json(server);
    } catch (error) {
      console.error("[RackController] createServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
  async createAndPlaceServer(req, res, next) {
    try {
      const userId = req.user?.id;
      const server = await RackService.createAndPlaceServer(req.body, userId);
      res.status(201).json(server);
    } catch (error) {
      console.error("[RackController] createAndPlaceServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async findServerInDhcp(req, res, next) {
    try {
      const { serial } = req.params;
      
      if (!serial) {
        return next(ApiError.badRequest("Необходимо указать серийный номер"));
      }
      
      const result = await RackService.findServerInDhcp(serial);
      res.json(result);
    } catch (error) {
      console.error("[RackController] findServerInDhcp error:", error);
      next(ApiError.internal(`Ошибка поиска в DHCP: ${error.message}`));
    }
  }
}

module.exports = new RackController();