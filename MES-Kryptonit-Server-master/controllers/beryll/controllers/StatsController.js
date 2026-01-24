const ApiError = require("../../../error/ApiError");
const StatsService = require("../services/StatsService");

class StatsController {
  async getStats(req, res, next) {
    try {
      const stats = await StatsService.getStats();
      return res.json(stats);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getAnalytics(req, res, next) {
    try {
      const analytics = await StatsService.getAnalytics(req.query);
      return res.json(analytics);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new StatsController();
