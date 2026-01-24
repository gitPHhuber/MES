const ApiError = require("../../../error/ApiError");
const BatchService = require("../services/BatchService");

class BatchController {
  async getBatches(req, res, next) {
    try {
      const batches = await BatchService.getBatches(req.query);
      return res.json(batches);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getBatchById(req, res, next) {
    try {
      const { id } = req.params;
      const batch = await BatchService.getBatchById(id);
      return res.json(batch);
    } catch (e) {
      console.error(e);
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
      console.error(e);
      if (e.message === "Название партии обязательно") {
        return next(ApiError.badRequest(e.message));
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
      console.error(e);
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
      console.error(e);
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
      console.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message === "Укажите ID серверов") {
        return next(ApiError.badRequest(e.message));
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
      console.error(e);
      if (e.message === "Партия не найдена") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new BatchController();
