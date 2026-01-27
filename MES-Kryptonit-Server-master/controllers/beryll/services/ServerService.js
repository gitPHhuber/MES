const { BeryllServer, BeryllBatch, BeryllHistory, BeryllServerChecklist, User } = require("../../../models/index");
const { SERVER_STATUSES, HISTORY_ACTIONS, BeryllChecklistTemplate, BeryllChecklistFile } = require("../../../models/definitions/Beryll");
const { Op } = require("sequelize");
const { calculateDuration } = require("../utils/helpers");
const HistoryService = require("./HistoryService");
const ChecklistService = require("./ChecklistService");

class ServerService {
  /**
   * Получить список серверов с фильтрами
   */
  async getServers(filters = {}) {
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
        { macAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const servers = await BeryllServer.findAll({
      where,
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllBatch, as: "batch", attributes: ["id", "title", "status"] }
      ],
      order: [["updatedAt", "DESC"]]
    });
    
    return servers;
  }
  
  /**
   * Получить сервер по ID
   */
  async getServerById(id) {
    const server = await BeryllServer.findByPk(id, {
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllBatch, as: "batch" },
        {
          model: BeryllServerChecklist,
          as: "checklists",
          include: [
            { model: BeryllChecklistTemplate, as: "template" },
            { model: User, as: "completedBy", attributes: ["id", "login", "name", "surname"] },
            // ✅ Добавлено: загружаем файлы для каждого пункта чек-листа
            { 
              model: BeryllChecklistFile, 
              as: "files",
              include: [
                { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
              ]
            }
          ]
        },
        {
          model: BeryllHistory,
          as: "history",
          include: [{ model: User, as: "user", attributes: ["id", "login", "name", "surname"] }],
          order: [["createdAt", "DESC"]],
          limit: 50
        }
      ]
    });
    
    return server;
  }
  
  /**
   * Взять сервер в работу
   */
  async takeServer(id, userId) {
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
      assignedAt: new Date()
    });
    
    // Создаём пункты чек-листа для сервера если их нет
    await ChecklistService.initializeServerChecklist(server.id);
    
    // Логируем
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.TAKEN, {
      fromStatus: previousStatus,
      toStatus: SERVER_STATUSES.IN_WORK
    });
    
    const updated = await BeryllServer.findByPk(id, {
      include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }]
    });
    
    return updated;
  }
  
  /**
   * Освободить сервер
   */
  async releaseServer(id, userId, userRole) {
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
      assignedAt: null
    });
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.RELEASED, {
      fromStatus: previousStatus,
      toStatus: SERVER_STATUSES.NEW,
      durationMinutes: duration
    });
    
    return server;
  }
  
  /**
   * Обновить статус сервера
   */
  async updateStatus(id, status, notes, userId) {
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
    
    const duration = status === SERVER_STATUSES.DONE
      ? calculateDuration(server.assignedAt)
      : null;
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.STATUS_CHANGED, {
      fromStatus: previousStatus,
      toStatus: status,
      comment: notes,
      durationMinutes: duration
    });
    
    const updated = await BeryllServer.findByPk(id, {
      include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }]
    });
    
    return updated;
  }
  
  /**
   * Обновить заметки
   */
  async updateNotes(id, notes, userId) {
    const server = await BeryllServer.findByPk(id);
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    await server.update({ notes });
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.NOTE_ADDED, {
      comment: notes
    });
    
    return server;
  }
  
  /**
   * Удалить сервер
   */
  async deleteServer(id, userId) {
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
    await BeryllHistory.update(
      { serverId: null },
      { where: { serverId: id } }
    );
    
    await server.destroy();
    
    // Логируем удаление
    await HistoryService.logHistory(null, userId, HISTORY_ACTIONS.DELETED, {
      serverIp,
      serverHostname,
      comment: `Удалён сервер ${serverIp}`
    });
    
    return { success: true };
  }
}

module.exports = new ServerService();