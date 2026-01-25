const ApiError = require("../../../error/ApiError");
const HistoryService = require("../services/HistoryService");
const logger = require("../../../services/logger");

class HistoryController {
  async getHistory(req, res, next) {
    try {
      const result = await HistoryService.getHistory(req.query);
      return res.json(result);
    } catch (e) {
      logger.error(e);
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new HistoryController();
