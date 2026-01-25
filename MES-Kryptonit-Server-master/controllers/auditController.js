const { AuditLog, User } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");

class AuditController {
  async getLogs(req, res, next) {
    try {
      let { page, limit, action, entity, userId, dateFrom, dateTo } = req.query;

      page = Number(page) || 1;
      limit = Number(limit) || 50;
      const offset = page * limit - limit;

      const where = {};

      if (action) {
        where.action = { [Op.like]: `%${action}%` };
      }

      if (entity) {
        where.entity = entity;
      }

      if (userId) {
        const parsedUserId = Number(userId);
        if (!Number.isNaN(parsedUserId)) {
          where.userId = parsedUserId;
        }
      }

      if (dateFrom || dateTo) {
        where.createdAt = {};
        if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
        if (dateTo) {
          const to = new Date(dateTo);
          to.setDate(to.getDate() + 1);
          where.createdAt[Op.lt] = to;
        }
      }

      const logs = await AuditLog.findAndCountAll({
        where,
        include: [
          {
            model: User,
            as: "User",
            attributes: ["id", "login", "name", "surname"],
            required: false,
          },
        ],
        order: [["createdAt", "DESC"]],
        limit,
        offset,
      });

      return res.json(logs);
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new AuditController();
