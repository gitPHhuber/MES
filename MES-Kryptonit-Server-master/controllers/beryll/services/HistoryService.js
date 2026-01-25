const { BeryllHistory, BeryllServer, User } = require("../../../models/index");
const { HISTORY_ACTIONS } = require("../../../models/definitions/Beryll");
const { Op, fn, col } = require("sequelize");
const logger = require("../../../services/logger");

class HistoryService {
  /**
   * Записывает событие в историю
   */
  async logHistory(serverId, userId, action, options = {}) {
    try {
      const server = serverId ? await BeryllServer.findByPk(serverId) : null;
      
      await BeryllHistory.create({
        serverId,
        serverIp: server?.ipAddress || options.serverIp,
        serverHostname: server?.hostname || options.serverHostname,
        userId,
        action,
        fromStatus: options.fromStatus,
        toStatus: options.toStatus,
        checklistItemId: options.checklistItemId,
        comment: options.comment,
        metadata: options.metadata,
        durationMinutes: options.durationMinutes
      });
    } catch (e) {
      logger.error("Error logging history:", e);
    }
  }
  
  /**
   * Получить историю с фильтрами
   */
  async getHistory(filters = {}) {
    const { serverId, userId, action, dateFrom, dateTo, page = 1, limit = 50 } = filters;
    
    const where = {};
    
    if (serverId) where.serverId = serverId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    const { count, rows } = await BeryllHistory.findAndCountAll({
      where,
      include: [
        { model: User, as: "user", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllServer, as: "server", attributes: ["id", "ipAddress", "hostname"] }
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset
    });
    
    return {
      count,
      rows,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    };
  }
}

module.exports = new HistoryService();
