const { BeryllServer, BeryllBatch, BeryllHistory, User } = require("../../../models/index");
const { SERVER_STATUSES, BATCH_STATUSES, HISTORY_ACTIONS } = require("../../../models/definitions/Beryll");
const { Op, fn, col, literal } = require("sequelize");

class StatsService {
  /**
   * Базовая статистика
   */
  async getStats() {
    const total = await BeryllServer.count();
    const active = await BeryllServer.count({ where: { leaseActive: true } });
    
    const byStatus = await BeryllServer.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    
    const byStatusMap = {};
    Object.values(SERVER_STATUSES).forEach(s => byStatusMap[s] = 0);
    byStatus.forEach(s => {
      byStatusMap[s.status] = parseInt(s.count);
    });
    
    return { total, active, byStatus: byStatusMap };
  }
  
  /**
   * Расширенная аналитика
   */
  async getAnalytics(filters = {}) {
    const { dateFrom, dateTo } = filters;
    
    const dateFilter = {};
    if (dateFrom) dateFilter[Op.gte] = new Date(dateFrom);
    if (dateTo) dateFilter[Op.lte] = new Date(dateTo);
    
    // Общая статистика
    const totalServers = await BeryllServer.count();
    const activeServers = await BeryllServer.count({ where: { leaseActive: true } });
    
    const byStatus = await BeryllServer.findAll({
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    
    // Динамика завершения за последние 7 дней
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const dailyCompleted = await BeryllHistory.findAll({
      attributes: [
        [fn("DATE", col("createdAt")), "date"],
        [fn("COUNT", col("id")), "count"]
      ],
      where: {
        action: HISTORY_ACTIONS.STATUS_CHANGED,
        toStatus: SERVER_STATUSES.DONE,
        createdAt: { [Op.gte]: sevenDaysAgo }
      },
      group: [fn("DATE", col("createdAt"))],
      order: [[fn("DATE", col("createdAt")), "ASC"]],
      raw: true
    });
    
    // Топ исполнителей
    const topPerformers = await BeryllHistory.findAll({
      attributes: [
        "userId",
        [fn("COUNT", col("BeryllHistory.id")), "completedCount"],
        [fn("AVG", col("durationMinutes")), "avgDuration"]
      ],
      where: {
        action: HISTORY_ACTIONS.STATUS_CHANGED,
        toStatus: SERVER_STATUSES.DONE,
        ...(Object.keys(dateFilter).length && { createdAt: dateFilter })
      },
      include: [{
        model: User,
        as: "user",
        attributes: ["id", "login", "name", "surname"]
      }],
      group: ["userId", "user.id"],
      order: [[fn("COUNT", col("BeryllHistory.id")), "DESC"]],
      limit: 10,
      raw: true,
      nest: true
    });
    
    // Среднее время обработки
    const avgProcessingTime = await BeryllHistory.findOne({
      attributes: [[fn("AVG", col("durationMinutes")), "avgMinutes"]],
      where: {
        action: HISTORY_ACTIONS.STATUS_CHANGED,
        toStatus: SERVER_STATUSES.DONE,
        durationMinutes: { [Op.not]: null }
      },
      raw: true
    });
    
    // Статистика по партиям
    const batchStats = await BeryllBatch.findAll({
      attributes: [
        "id",
        "title",
        "status",
        [literal(`(SELECT COUNT(*) FROM beryll_servers WHERE "batchId" = "BeryllBatch"."id")`), "serverCount"],
        [literal(`(SELECT COUNT(*) FROM beryll_servers WHERE "batchId" = "BeryllBatch"."id" AND status = 'DONE')`), "completedCount"]
      ],
      where: { status: BATCH_STATUSES.ACTIVE },
      raw: true
    });
    
    return {
      overview: {
        totalServers,
        activeServers,
        byStatus: byStatus.reduce((acc, s) => {
          acc[s.status] = parseInt(s.count);
          return acc;
        }, {})
      },
      dailyCompleted,
      topPerformers,
      avgProcessingTime: avgProcessingTime?.avgMinutes
        ? Math.round(avgProcessingTime.avgMinutes)
        : null,
      activeBatches: batchStats
    };
  }
}

module.exports = new StatsService();
