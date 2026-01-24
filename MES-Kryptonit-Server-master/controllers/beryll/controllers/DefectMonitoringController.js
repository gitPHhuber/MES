/**
 * DefectMonitoringController.js
 * 
 * Положить в: controllers/beryll/controllers/DefectMonitoringController.js
 */

const ApiError = require("../../../error/ApiError");
const DefectMonitoringService = require("../services/DefectMonitoringService");

class DefectMonitoringController {
  
  // =============================================
  // КОММЕНТАРИИ К ДЕФЕКТАМ
  // =============================================
  
  async getServerDefects(req, res, next) {
    try {
      const { serverId } = req.params;
      const { status, category, limit, offset } = req.query;
      const result = await DefectMonitoringService.getCommentsByServer(serverId, { status, category, limit, offset });
      return res.json(result);
    } catch (e) {
      console.error("getServerDefects:", e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getDefectById(req, res, next) {
    try {
      const comment = await DefectMonitoringService.getCommentById(req.params.id);
      return res.json(comment);
    } catch (e) {
      if (e.message === "Комментарий не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async createDefect(req, res, next) {
    try {
      const { serverId } = req.params;
      const { text, defectCategory, priority } = req.body;
      if (!text || !text.trim()) return next(ApiError.badRequest("Текст комментария обязателен"));
      
      const comment = await DefectMonitoringService.createComment(serverId, req.user?.id, { text: text.trim(), defectCategory, priority });
      return res.status(201).json(comment);
    } catch (e) {
      if (e.message === "Сервер не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateDefect(req, res, next) {
    try {
      const comment = await DefectMonitoringService.updateComment(req.params.id, req.user?.id, req.body);
      return res.json(comment);
    } catch (e) {
      if (e.message === "Комментарий не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteDefect(req, res, next) {
    try {
      const result = await DefectMonitoringService.deleteComment(req.params.id, req.user?.id);
      return res.json(result);
    } catch (e) {
      if (e.message === "Комментарий не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async resolveDefect(req, res, next) {
    try {
      const { resolution, status = "RESOLVED" } = req.body;
      const comment = await DefectMonitoringService.updateComment(req.params.id, req.user?.id, { status, resolution });
      return res.json(comment);
    } catch (e) {
      if (e.message === "Комментарий не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async uploadDefectFile(req, res, next) {
    try {
      if (!req.files || !req.files.file) return next(ApiError.badRequest("Файл не загружен"));
      const file = req.files.file;
      if (file.size > 10 * 1024 * 1024) return next(ApiError.badRequest("Файл слишком большой (макс 10MB)"));
      
      const result = await DefectMonitoringService.uploadFile(req.params.id, file, req.user?.id);
      return res.json(result);
    } catch (e) {
      if (e.message === "Комментарий не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async downloadDefectFile(req, res, next) {
    try {
      const file = await DefectMonitoringService.getFileForDownload(req.params.fileId);
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(file.originalName)}"`);
      if (file.mimeType) res.setHeader("Content-Type", file.mimeType);
      return res.sendFile(file.fullPath);
    } catch (e) {
      if (e.message.includes("не найден")) return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteDefectFile(req, res, next) {
    try {
      const result = await DefectMonitoringService.deleteFile(req.params.fileId, req.user?.id);
      return res.json(result);
    } catch (e) {
      if (e.message === "Файл не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async getDefectStats(req, res, next) {
    try {
      const stats = await DefectMonitoringService.getDefectStats(req.query);
      return res.json(stats);
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  // =============================================
  // МОНИТОРИНГ
  // =============================================
  
  async pingServer(req, res, next) {
    try {
      const result = await DefectMonitoringService.pingServer(req.params.serverId);
      return res.json(result);
    } catch (e) {
      if (e.message === "Сервер не найден") return next(ApiError.notFound(e.message));
      return next(ApiError.internal(e.message));
    }
  }
  
  async pingAllServers(req, res, next) {
    try {
      const { batchId, status, forceRefresh } = req.query;
      const result = await DefectMonitoringService.pingAllServers({
        batchId: batchId ? parseInt(batchId) : null, status, forceRefresh: forceRefresh === "true"
      });
      return res.json(result);
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async getCachedStatus(req, res, next) {
    try {
      return res.json(DefectMonitoringService.getCachedStatuses());
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async getMonitoringStats(req, res, next) {
    try {
      return res.json(await DefectMonitoringService.getMonitoringStats());
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async getOnlineServers(req, res, next) {
    try {
      const result = await DefectMonitoringService.getServersByPingStatus("ONLINE", req.query);
      return res.json(result);
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async getOfflineServers(req, res, next) {
    try {
      const result = await DefectMonitoringService.getServersByPingStatus("OFFLINE", req.query);
      return res.json(result);
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async clearCache(req, res, next) {
    try {
      DefectMonitoringService.clearCache();
      return res.json({ success: true, message: "Кэш очищен" });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new DefectMonitoringController();
