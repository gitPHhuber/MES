/**
 * RackController.js
 * 
 * Контроллер для работы со стойками и размещением серверов
 * 
 * Новые endpoints:
 * - POST /racks/:rackId/units/:unitNumber/place - Разместить сервер БЕЗ взятия в работу
 * - POST /racks/:rackId/sync-dhcp - Синхронизировать IP с DHCP
 * - GET /racks/:rackId/summary - Получить сводку по стойке
 * - GET /racks/:rackId/units-by-status - Юниты по статусу
 * - GET /dhcp/find-ip/:mac - Найти IP по MAC адресу
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
   * Получить все стойки
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
   * Получить стойку по ID
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
   * Создать стойку
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
   * Обновить стойку
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
   * Удалить стойку
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
   * Получить историю стойки
   * GET /api/beryll/racks/:id/history
   */
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
  
  /**
   * НОВЫЙ: Получить сводку по стойке
   * GET /api/beryll/racks/:rackId/summary
   */
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
  
  // =============================================
  // ЮНИТЫ
  // =============================================
  
  /**
   * Получить свободные юниты в стойке
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
   * Получить юнит по номеру
   * GET /api/beryll/racks/:rackId/units/:unitNumber
   */
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
  
  /**
   * НОВЫЙ: Получить юниты по статусу сервера
   * GET /api/beryll/racks/:rackId/units-by-status?status=IN_WORK
   */
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
  
  /**
   * НОВЫЙ: Разместить сервер в стойку БЕЗ взятия в работу
   * POST /api/beryll/racks/:rackId/units/:unitNumber/place
   * Body: { serverId: number }
   */
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
  
  /**
   * Установить сервер и взять в работу
   * POST /api/beryll/racks/:rackId/units/:unitNumber/install
   */
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
  
  /**
   * Извлечь сервер из стойки
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
   * Обновить данные юнита
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
   * Переместить сервер между юнитами/стойками
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
   * Найти сервер в стойках
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
  
  // =============================================
  // DHCP ИНТЕГРАЦИЯ
  // =============================================
  
  /**
   * НОВЫЙ: Синхронизировать стойку с DHCP
   * POST /api/beryll/racks/:rackId/sync-dhcp
   */
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
  
  /**
   * НОВЫЙ: Найти IP по MAC адресу в DHCP
   * GET /api/beryll/dhcp/find-ip/:mac
   */
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
  
  // =============================================
  // РУЧНОЕ СОЗДАНИЕ СЕРВЕРОВ
  // =============================================
  
  /**
   * Создать сервер вручную
   * POST /api/beryll/servers/create
   * 
   * Body: {
   *   apkSerialNumber: string,  // Серийный номер АПК (обязательный)
   *   serialNumber?: string,    // Серийный номер сервера
   *   macAddress?: string,      // MAC адрес
   *   hostname?: string,        // Hostname  
   *   batchId?: number,         // ID партии
   *   notes?: string,           // Примечания
   *   searchDhcp?: boolean      // Искать ли в DHCP (default: true)
   * }
   */
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
  
  /**
   * Создать сервер и сразу разместить в стойку
   * POST /api/beryll/servers/create-and-place
   * 
   * Body: {
   *   apkSerialNumber: string,
   *   serialNumber?: string,
   *   macAddress?: string,
   *   hostname?: string,
   *   batchId?: number,
   *   notes?: string,
   *   searchDhcp?: boolean,
   *   rackId?: number,          // ID стойки для размещения
   *   unitNumber?: number       // Номер юнита
   * }
   */
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
  
  /**
   * Поиск сервера в DHCP по серийнику
   * GET /api/beryll/dhcp/find-server/:serial
   */
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