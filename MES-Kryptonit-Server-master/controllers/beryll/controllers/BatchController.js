const ApiError = require("../../../error/ApiError");
const BatchService = require("../services/BatchService");
const logger = require("../../../services/logger");

class BatchController {
  async getBatches(req, res, next) {
    try {
      const batches = await BatchService.getBatches(req.query);
      return res.json(batches);
    } catch (e) {
      logger.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getBatchById(req, res, next) {
    try {
      const { id } = req.params;
      const batch = await BatchService.getBatchById(id);
      return res.json(batch);
    } catch (e) {
      logger.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async createBatch(req, res, next) {
    try {
      const userId = req.user?.id;
      const batch = await BatchService.createBatch(req.body, userId);
      return res.json(batch);
    } catch (e) {
      logger.error(e);
      if (e.message === "Название партии обязательно") {
        return next(e);
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateBatch(req, res, next) {
    try {
      const { id } = req.params;
      const batch = await BatchService.updateBatch(id, req.body);
      return res.json(batch);
    } catch (e) {
      logger.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteBatch(req, res, next) {
    try {
      const { id } = req.params;
      const result = await BatchService.deleteBatch(id);
      return res.json(result);
    } catch (e) {
      logger.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async assignServersToBatch(req, res, next) {
    try {
      const { id } = req.params;
      const { serverIds } = req.body;
      const userId = req.user?.id;
      
      const result = await BatchService.assignServersToBatch(id, serverIds, userId);
      return res.json(result);
    } catch (e) {
      logger.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message === "Укажите ID серверов") {
        return next(e);
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async removeServersFromBatch(req, res, next) {
    try {
      const { id } = req.params;
      const { serverIds } = req.body;
      const userId = req.user?.id;
      
      const result = await BatchService.removeServersFromBatch(id, serverIds, userId);
      return res.json(result);
    } catch (e) {
      logger.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new BatchController();
