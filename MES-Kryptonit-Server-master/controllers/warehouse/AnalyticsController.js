const { Op } = require("sequelize");
const { WarehouseBox, WarehouseMovement } = require("../../models/index");
const sequelize = require("../../db");
const ApiError = require("../../error/ApiError");
const logger = require("../../services/logger");

class AnalyticsController {
  async getDashboardStats(req, res, next) {
    try {
      const stockStats = await WarehouseBox.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItems"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalBoxes"],
        ],
        where: { status: "ON_STOCK" },
      });

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const movementsToday = await WarehouseMovement.findAll({
        attributes: [
          "operation",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
          [sequelize.fn("SUM", sequelize.col("deltaQty")), "sumDelta"],
          [sequelize.fn("SUM", sequelize.col("scrapQty")), "sumScrap"],
        ],
        where: {
          performedAt: { [Op.gte]: todayStart },
        },
        group: ["operation"],
      });

      const lastWeekStart = new Date();
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      const activityChart = await WarehouseMovement.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
          [sequelize.fn("COUNT", sequelize.col("id")), "count"],
        ],
        where: {
          performedAt: { [Op.gte]: lastWeekStart },
        },
        group: [sequelize.fn("DATE", sequelize.col("performedAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
      });

      res.json({
        stock: stockStats,
        today: movementsToday,
        chart: activityChart,
      });
    } catch (e) {
      logger.error("Analytics Error", { error: e });
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new AnalyticsController();
