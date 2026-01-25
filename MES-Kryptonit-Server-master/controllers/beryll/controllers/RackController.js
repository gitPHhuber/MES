/**
 * RackController.js
 * 
 * Контроллер для работы со стойками и размещением серверов
 * 
 * Положить в: controllers/beryll/controllers/RackController.js
 */

const RackService = require("../services/RackService");
const ApiError = require("../../../error/ApiError");
const logger = require("../../../services/logger");
const { buildRequestLogContext } = require("../../../utils/logging");

class RackController {
  
  // =============================================
  // СТОЙКИ
  // =============================================
  
  /**
   * GET /api/beryll/racks
   */
  async getAllRacks(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { status, search, includeUnits } = req.query;
      logger.info("Beryll racks db start", { ...logContext, step: "db_start" });
      const racks = await RackService.getAllRacks({ 
        status, 
        search, 
        includeUnits: includeUnits === "true" 
      });
      logger.info("Beryll racks db ok", {
        ...logContext,
        step: "db_ok",
        racksCount: racks.length,
      });
      res.json(racks);
    } catch (error) {
      logger.error("Beryll racks db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:id
   */
  async getRackById(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      logger.info("Beryll rack by id db start", {
        ...logContext,
        step: "db_start",
        rackId: id,
      });
      const rack = await RackService.getRackById(id);
      logger.info("Beryll rack by id db ok", {
        ...logContext,
        step: "db_ok",
        rackId: id,
        found: Boolean(rack),
      });
      
      if (!rack) {
        return next(ApiError.notFound("Стойка не найдена"));
      }
      
      res.json(rack);
    } catch (error) {
      logger.error("Beryll rack by id db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks
   */
  async createRack(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const userId = req.user?.id;
      logger.info("Beryll rack create db start", {
        ...logContext,
        step: "db_start",
        userId,
      });
      const rack = await RackService.createRack(req.body, userId);
      logger.info("Beryll rack create db ok", {
        ...logContext,
        step: "db_ok",
        rackId: rack?.id,
      });
      res.status(201).json(rack);
    } catch (error) {
      logger.error("Beryll rack create db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/racks/:id
   */
  async updateRack(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll rack update db start", {
        ...logContext,
        step: "db_start",
        rackId: id,
        userId,
      });
      const rack = await RackService.updateRack(id, req.body, userId);
      logger.info("Beryll rack update db ok", {
        ...logContext,
        step: "db_ok",
        rackId: id,
      });
      res.json(rack);
    } catch (error) {
      logger.error("Beryll rack update db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * DELETE /api/beryll/racks/:id
   */
  async deleteRack(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll rack delete db start", {
        ...logContext,
        step: "db_start",
        rackId: id,
        userId,
      });
      const result = await RackService.deleteRack(id, userId);
      logger.info("Beryll rack delete db ok", {
        ...logContext,
        step: "db_ok",
        rackId: id,
      });
      res.json(result);
    } catch (error) {
      logger.error("Beryll rack delete db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:id/history
   */
  async getRackHistory(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { limit, offset } = req.query;
      logger.info("Beryll rack history db start", {
        ...logContext,
        step: "db_start",
        rackId: id,
      });
      const history = await RackService.getHistory("RACK", id, { limit, offset });
      logger.info("Beryll rack history db ok", {
        ...logContext,
        step: "db_ok",
        rackId: id,
      });
      res.json(history);
    } catch (error) {
      logger.error("Beryll rack history db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
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
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { rackId, unitNumber } = req.params;
      const { BeryllRackUnit } = require("../../../models/definitions/BeryllExtended");
      
      logger.info("Beryll rack unit db start", {
        ...logContext,
        step: "db_start",
        rackId,
        unitNumber,
      });
      const unit = await BeryllRackUnit.findOne({
        where: { rackId, unitNumber }
      });
      
      if (!unit) {
        return next(ApiError.notFound("Юнит не найден"));
      }
      
      const fullUnit = await RackService.getUnitById(unit.id);
      logger.info("Beryll rack unit db ok", {
        ...logContext,
        step: "db_ok",
        unitId: unit.id,
      });
      res.json(fullUnit);
    } catch (error) {
      logger.error("Beryll rack unit db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks/:rackId/units/:unitNumber/install
   */
  async installServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { rackId, unitNumber } = req.params;
      const { serverId, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("serverId обязателен"));
      }
      
      logger.info("Beryll rack install server db start", {
        ...logContext,
        step: "db_start",
        rackId,
        unitNumber,
        serverId,
      });
      const unit = await RackService.installServer(
        parseInt(rackId), 
        parseInt(unitNumber), 
        serverId, 
        data, 
        userId
      );
      logger.info("Beryll rack install server db ok", {
        ...logContext,
        step: "db_ok",
        rackId,
        unitNumber,
        serverId,
      });
      
      res.json(unit);
    } catch (error) {
      logger.error("Beryll rack install server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * POST /api/beryll/racks/:rackId/units/:unitNumber/remove
   */
  async removeServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { rackId, unitNumber } = req.params;
      const userId = req.user?.id;
      
      logger.info("Beryll rack remove server db start", {
        ...logContext,
        step: "db_start",
        rackId,
        unitNumber,
      });
      const result = await RackService.removeServer(
        parseInt(rackId), 
        parseInt(unitNumber), 
        userId
      );
      logger.info("Beryll rack remove server db ok", {
        ...logContext,
        step: "db_ok",
        rackId,
        unitNumber,
      });
      
      res.json(result);
    } catch (error) {
      logger.error("Beryll rack remove server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/rack-units/:unitId
   */
  async updateUnit(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { unitId } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll rack update unit db start", {
        ...logContext,
        step: "db_start",
        unitId,
        userId,
      });
      const unit = await RackService.updateUnit(unitId, req.body, userId);
      logger.info("Beryll rack update unit db ok", {
        ...logContext,
        step: "db_ok",
        unitId,
      });
      res.json(unit);
    } catch (error) {
      logger.error("Beryll rack update unit db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * POST /api/beryll/rack-units/move
   */
  async moveServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { fromRackId, fromUnit, toRackId, toUnit } = req.body;
      const userId = req.user?.id;
      
      if (!fromRackId || !fromUnit || !toRackId || !toUnit) {
        return next(ApiError.badRequest("Необходимо указать все параметры: fromRackId, fromUnit, toRackId, toUnit"));
      }
      
      logger.info("Beryll rack move server db start", {
        ...logContext,
        step: "db_start",
        fromRackId,
        fromUnit,
        toRackId,
        toUnit,
        userId,
      });
      const unit = await RackService.moveServer(fromRackId, fromUnit, toRackId, toUnit, userId);
      logger.info("Beryll rack move server db ok", {
        ...logContext,
        step: "db_ok",
      });
      res.json(unit);
    } catch (error) {
      logger.error("Beryll rack move server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/racks/:rackId/free-units
   */
  async getFreeUnits(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { rackId } = req.params;
      logger.info("Beryll rack free units db start", {
        ...logContext,
        step: "db_start",
        rackId,
      });
      const units = await RackService.getFreeUnits(rackId);
      logger.info("Beryll rack free units db ok", {
        ...logContext,
        step: "db_ok",
        rackId,
        unitsCount: units.length,
      });
      res.json(units);
    } catch (error) {
      logger.error("Beryll rack free units db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/servers/:serverId/rack-location
   */
  async findServerInRacks(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { serverId } = req.params;
      logger.info("Beryll rack find server db start", {
        ...logContext,
        step: "db_start",
        serverId,
      });
      const location = await RackService.findServerInRacks(serverId);
      logger.info("Beryll rack find server db ok", {
        ...logContext,
        step: "db_ok",
        serverId,
        found: Boolean(location),
      });
      res.json(location || { found: false });
    } catch (error) {
      logger.error("Beryll rack find server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new RackController();
