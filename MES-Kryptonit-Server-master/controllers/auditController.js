const { AuditLog, User } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");
const logger = require("../services/logger");
const { buildRequestLogContext } = require("../utils/logging");

class AuditController {
  async getLogs(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
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

      logger.info("Audit logs db start", { ...logContext, step: "db_start" });
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

      logger.info("Audit logs db ok", {
        ...logContext,
        step: "db_ok",
        logsCount: logs?.rows?.length || 0,
      });
      return res.json(logs);
    } catch (e) {
      logger.error("Audit logs db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new AuditController();
