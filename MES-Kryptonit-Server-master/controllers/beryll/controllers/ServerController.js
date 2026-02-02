const ApiError = require("../../../error/ApiError");
const ServerService = require("../services/ServerService");

class ServerController {
  async getServers(req, res, next) {
    try {
      const servers = await ServerService.getServers(req.query);
      return res.json(servers);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getServerById(req, res, next) {
    try {
      const { id } = req.params;
      const server = await ServerService.getServerById(id);
      
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      return res.json(server);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async takeServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role; 
      
      if (!userId) {
        return next(ApiError.unauthorized("Не авторизован"));
      }
      
      const updated = await ServerService.takeServer(id, userId, userRole);
      return res.json(updated);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message === "Сервер уже взят в работу" || 
          e.message === "Сервер уже взят в работу другим пользователем" ||
          e.message === "Сервер назначен другому исполнителю" ||
          e.message.includes("Нельзя взять")) {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async releaseServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      const server = await ServerService.releaseServer(id, userId, userRole);
      return res.json(server);
    } catch (e) {
      console.error(e);
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
      const { id } = req.params;
      const { status, notes } = req.body;
      const userId = req.user?.id;
      
      const { SERVER_STATUSES } = require("../../../models/definitions/Beryll");
      
      if (!status || !Object.values(SERVER_STATUSES).includes(status)) {
        return next(ApiError.badRequest("Некорректный статус"));
      }
      
      const updated = await ServerService.updateStatus(id, status, notes, userId);
      return res.json(updated);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateNotes(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;
      const userId = req.user?.id;
      
      const server = await ServerService.updateNotes(id, notes, userId);
      return res.json(server);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const result = await ServerService.deleteServer(id, userId);
      return res.json(result);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ServerController();