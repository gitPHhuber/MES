const ApiError = require("../../../error/ApiError");
const ArchiveService = require("../services/ArchiveService");
const logger = require("../../../services/logger");
const { buildRequestLogContext } = require("../../../utils/logging");

class ArchiveController {
  async getArchivedServers(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      logger.info("Beryll archive list db start", { ...logContext, step: "db_start" });
      const result = await ArchiveService.getArchivedServers(req.query);
      logger.info("Beryll archive list db ok", {
        ...logContext,
        step: "db_ok",
        rowsCount: result?.rows?.length || result?.length || 0,
      });
      return res.json(result);
    } catch (e) {
      logger.error("Beryll archive list db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      return next(ApiError.internal(e.message));
    }
  }
  
  async archiveServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user.id;
      
      logger.info("Beryll archive server db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
      });
      const result = await ArchiveService.archiveServer(id, userId);
      logger.info("Beryll archive server db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(result);
    } catch (e) {
      logger.error("Beryll archive server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message.includes("завершённые") || e.message.includes("серийный номер")) {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async unarchiveServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      
      logger.info("Beryll unarchive server db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
      });
      const updated = await ArchiveService.unarchiveServer(id, userId);
      logger.info("Beryll unarchive server db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(updated);
    } catch (e) {
      logger.error("Beryll unarchive server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message === "Сервер не находится в архиве") {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateApkSerialNumber(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { apkSerialNumber } = req.body;
      const userId = req.user.id;
      
      logger.info("Beryll archive update apk db start", {
        ...logContext,
        step: "db_start",
        serverId: id,
        userId,
      });
      const result = await ArchiveService.updateApkSerialNumber(id, apkSerialNumber, userId);
      logger.info("Beryll archive update apk db ok", {
        ...logContext,
        step: "db_ok",
        serverId: id,
        userId,
      });
      return res.json(result);
    } catch (e) {
      logger.error("Beryll archive update apk db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message.includes("Укажите") || e.message.includes("присвоен")) {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ArchiveController();
