const ApiError = require("../../../error/ApiError");
const ServerService = require("../services/ServerService");
const logger = require("../../../services/logger");
const { buildRequestLogContext } = require("../../../utils/logging");

class ServerController {
  async getServers(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      logger.info("Beryll servers db start", { ...logContext, step: "db_start" });
      const servers = await ServerService.getServers(req.query, logContext);
      logger.info("Beryll servers db ok", {
        ...logContext,
        step: "db_ok",
        serversCount: servers.length,
      });
      return res.json(servers);
    } catch (e) {
      logger.error("Beryll servers db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      return next(ApiError.internal(e.message));
    }
  }
  
  async getServerById(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      logger.info("Beryll server by id db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
      });
      const server = await ServerService.getServerById(id, logContext);
      logger.info("Beryll server by id db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        found: Boolean(server),
      });
      
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      return res.json(server);
    } catch (e) {
      logger.error("Beryll server by id db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      return next(ApiError.internal(e.message));
    }
  }
  
  async takeServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      
      if (!userId) {
        return next(ApiError.unauthorized("Не авторизован"));
      }
      
      logger.info("Beryll take server db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
      });
      const updated = await ServerService.takeServer(id, userId, logContext);
      logger.info("Beryll take server db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(updated);
    } catch (e) {
      logger.error("Beryll take server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message === "Сервер уже взят в работу") {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async releaseServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;

      logger.info("Beryll release server db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
        userRole,
      });
      const server = await ServerService.releaseServer(id, userId, userRole, logContext);
      logger.info("Beryll release server db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(server);
    } catch (e) {
      logger.error("Beryll release server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message.includes("Нет прав")) {
        return next(ApiError.forbidden(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateStatus(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;
      
      const { SERVER_STATUSES } = require("../../models/definitions/Beryll");
      
      if (!status || !Object.values(SERVER_STATUSES).includes(status)) {
        return next(ApiError.badRequest("Некорректный статус"));
      }
      
      logger.info("Beryll server update status db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        status,
      });
      const updated = await ServerService.updateStatus(id, status, notes, userId, logContext);
      logger.info("Beryll server update status db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        status,
      });
      return res.json(updated);
    } catch (e) {
      logger.error("Beryll server update status db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateNotes(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user?.id;

      logger.info("Beryll server update notes db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
      });
      const server = await ServerService.updateNotes(id, notes, userId, logContext);
      logger.info("Beryll server update notes db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
      });
      return res.json(server);
    } catch (e) {
      logger.error("Beryll server update notes db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;

      logger.info("Beryll server delete db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
      });
      const result = await ServerService.deleteServer(id, userId, logContext);
      logger.info("Beryll server delete db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(result);
    } catch (e) {
      logger.error("Beryll server delete db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ServerController();
