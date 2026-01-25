const { BeryllServer, BeryllBatch, BeryllHistory, BeryllServerChecklist, User } = require("../../../models/index");
const { SERVER_STATUSES, HISTORY_ACTIONS } = require("../../../models/definitions/Beryll");
const { Op } = require("sequelize");
const { calculateDuration } = require("../utils/helpers");
const HistoryService = require("./HistoryService");
const ChecklistService = require("./ChecklistService");
const logger = require("../../../services/logger");
const { buildServiceLogContext, sanitizeInput } = require("../../../utils/logging");

class ServerService {
  /**
   * Получить список серверов с фильтрами
   */
  async getServers(filters = {}, context = {}) {
    const logContext = buildServiceLogContext(context, {
      filters: sanitizeInput(filters),
    });
    logger.info("ServerService getServers db start", { ...logContext, step: "db_start" });
    try {
      const { status, search, onlyActive, batchId } = filters;

      const where = {};

      if (status && Object.values(SERVER_STATUSES).includes(status)) {
        where.status = status;
      }

      if (onlyActive === "true") {
        where.leaseActive = true;
      }

      if (batchId) {
        where.batchId = batchId === "null" ? null : parseInt(batchId);
      }

      if (search) {
        where[Op.or] = [
          { ipAddress: { [Op.iLike]: `%${search}%` } },
          { hostname: { [Op.iLike]: `%${search}%` } },
          { serialNumber: { [Op.iLike]: `%${search}%` } },
          { macAddress: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const servers = await BeryllServer.findAll({
        where,
        include: [
          { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
          { model: BeryllBatch, as: "batch", attributes: ["id", "title", "status"] },
        ],
        order: [["updatedAt", "DESC"]],
      });

      logger.info("ServerService getServers db ok", {
        ...logContext,
        step: "db_ok",
        serversCount: servers.length,
      });
      return servers;
    } catch (error) {
      logger.error("ServerService getServers db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Получить сервер по ID
   */
  async getServerById(id, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id });
    logger.info("ServerService getServerById db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id, {
        include: [
          { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
          { model: BeryllBatch, as: "batch" },
          {
            model: BeryllServerChecklist,
            as: "checklists",
            include: [
              { model: require("../../../models/definitions/Beryll").BeryllChecklistTemplate, as: "template" },
              { model: User, as: "completedBy", attributes: ["id", "login", "name", "surname"] },
            ],
          },
          {
            model: BeryllHistory,
            as: "history",
            include: [{ model: User, as: "user", attributes: ["id", "login", "name", "surname"] }],
            order: [["createdAt", "DESC"]],
            limit: 50,
          },
        ],
      });

      logger.info("ServerService getServerById db ok", {
        ...logContext,
        step: "db_ok",
        found: Boolean(server),
      });
      return server;
    } catch (error) {
      logger.error("ServerService getServerById db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Взять сервер в работу
   */
  async takeServer(id, userId, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id, userId });
    logger.info("ServerService takeServer db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id);

      if (!server) {
        throw new Error("Сервер не найден");
      }

      if (server.assignedToId && server.status === SERVER_STATUSES.IN_WORK) {
        throw new Error("Сервер уже взят в работу");
      }

      const previousStatus = server.status;

      await server.update({
        status: SERVER_STATUSES.IN_WORK,
        assignedToId: userId,
        assignedAt: new Date(),
      });

      // Создаём пункты чек-листа для сервера если их нет
      await ChecklistService.initializeServerChecklist(server.id);

      // Логируем
      await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.TAKEN, {
        fromStatus: previousStatus,
        toStatus: SERVER_STATUSES.IN_WORK,
      });

      const updated = await BeryllServer.findByPk(id, {
        include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }],
      });

      logger.info("ServerService takeServer db ok", { ...logContext, step: "db_ok" });
      return updated;
    } catch (error) {
      logger.error("ServerService takeServer db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Освободить сервер
   */
  async releaseServer(id, userId, userRole, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id, userId, userRole });
    logger.info("ServerService releaseServer db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id);

      if (!server) {
        throw new Error("Сервер не найден");
      }

      if (server.assignedToId !== userId && userRole !== "SUPER_ADMIN") {
        throw new Error("Нет прав для освобождения этого сервера");
      }

      const duration = calculateDuration(server.assignedAt);
      const previousStatus = server.status;

      await server.update({
        status: SERVER_STATUSES.NEW,
        assignedToId: null,
        assignedAt: null,
      });

      await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.RELEASED, {
        fromStatus: previousStatus,
        toStatus: SERVER_STATUSES.NEW,
        durationMinutes: duration,
      });

      logger.info("ServerService releaseServer db ok", { ...logContext, step: "db_ok" });
      return server;
    } catch (error) {
      logger.error("ServerService releaseServer db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Обновить статус сервера
   */
  async updateStatus(id, status, notes, userId, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id, status, userId });
    logger.info("ServerService updateStatus db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id);

      if (!server) {
        throw new Error("Сервер не найден");
      }

      const previousStatus = server.status;
      const updateData = { status };

      if (status === SERVER_STATUSES.DONE) {
        updateData.completedAt = new Date();
      }

      if (notes !== undefined) {
        updateData.notes = notes;
      }

      await server.update(updateData);

      const duration =
        status === SERVER_STATUSES.DONE ? calculateDuration(server.assignedAt) : null;

      await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.STATUS_CHANGED, {
        fromStatus: previousStatus,
        toStatus: status,
        comment: notes,
        durationMinutes: duration,
      });

      const updated = await BeryllServer.findByPk(id, {
        include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }],
      });

      logger.info("ServerService updateStatus db ok", { ...logContext, step: "db_ok" });
      return updated;
    } catch (error) {
      logger.error("ServerService updateStatus db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Обновить заметки
   */
  async updateNotes(id, notes, userId, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id, userId });
    logger.info("ServerService updateNotes db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id);

      if (!server) {
        throw new Error("Сервер не найден");
      }

      await server.update({ notes });

      await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.NOTE_ADDED, {
        comment: notes,
      });

      logger.info("ServerService updateNotes db ok", { ...logContext, step: "db_ok" });
      return server;
    } catch (error) {
      logger.error("ServerService updateNotes db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
  
  /**
   * Удалить сервер
   */
  async deleteServer(id, userId, context = {}) {
    const logContext = buildServiceLogContext(context, { serverId: id, userId });
    logger.info("ServerService deleteServer db start", { ...logContext, step: "db_start" });
    try {
      const server = await BeryllServer.findByPk(id);

      if (!server) {
        throw new Error("Сервер не найден");
      }

      // Сохраняем данные для истории
      const serverIp = server.ipAddress;
      const serverHostname = server.hostname;

      // Удаляем связанные чек-листы
      await BeryllServerChecklist.destroy({ where: { serverId: id } });

      // Обновляем историю (обнуляем serverId)
      await BeryllHistory.update({ serverId: null }, { where: { serverId: id } });

      await server.destroy();

      // Логируем удаление
      await HistoryService.logHistory(null, userId, HISTORY_ACTIONS.DELETED, {
        serverIp,
        serverHostname,
        comment: `Удалён сервер ${serverIp}`,
      });

      logger.info("ServerService deleteServer db ok", { ...logContext, step: "db_ok" });
      return { success: true };
    } catch (error) {
      logger.error("ServerService deleteServer db error", {
        ...logContext,
        step: "db_error",
        error: error.message,
      });
      throw error;
    }
  }
}

module.exports = new ServerService();
