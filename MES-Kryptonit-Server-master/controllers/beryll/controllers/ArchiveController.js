const ApiError = require("../../../error/ApiError");
const ArchiveService = require("../services/ArchiveService");

class ArchiveController {
  async getArchivedServers(req, res, next) {
    try {
      const result = await ArchiveService.getArchivedServers(req.query);
      return res.json(result);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async archiveServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      
      const result = await ArchiveService.archiveServer(id, userId);
      return res.json(result);
    } catch (e) {
      console.error(e);
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
      const { id } = req.params;
      const userId = req.user?.id;
      
      const updated = await ArchiveService.unarchiveServer(id, userId);
      return res.json(updated);
    } catch (e) {
      console.error(e);
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
      const { id } = req.params;
      const { apkSerialNumber } = req.body;
      const userId = req.user.id;
      
      const result = await ArchiveService.updateApkSerialNumber(id, apkSerialNumber, userId);
      return res.json(result);
    } catch (e) {
      console.error(e);
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
