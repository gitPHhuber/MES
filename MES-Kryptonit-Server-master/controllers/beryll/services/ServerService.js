const { BeryllServer, BeryllBatch, BeryllHistory, BeryllServerChecklist, User } = require("../../../models/index");
const { SERVER_STATUSES, HISTORY_ACTIONS, BeryllChecklistTemplate, BeryllChecklistFile } = require("../../../models/definitions/Beryll");
const { Op } = require("sequelize");
const { calculateDuration } = require("../utils/helpers");
const HistoryService = require("./HistoryService");
const ChecklistService = require("./ChecklistService");

class ServerService {
  /**
   * Получить список серверов с фильтрами
   * 
   * ДОБАВЛЕНО: параметр assignedToId для фильтра "Мои серверы"
   */
  async getServers(filters = {}) {
    const { status, search, onlyActive, batchId, assignedToId } = filters;
    
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
    
    // Фильтр по исполнителю (для функционала "Мои серверы")
    if (assignedToId) {
      where.assignedToId = parseInt(assignedToId);
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
   * 
   * ОБНОВЛЕНО:
   * - Можно взять из статусов: NEW, CLARIFYING, DEFECT
   * - SUPER_ADMIN может забрать сервер у другого пользователя
   * - Добавлен параметр userRole
   * 
   * @param {number} id - ID сервера
   * @param {number} userId - ID пользователя
   * @param {string} userRole - Роль пользователя (для проверки SUPER_ADMIN)
   */
  async takeServer(id, userId, userRole) {
    const server = await BeryllServer.findByPk(id);
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    // Разрешённые статусы для взятия в работу
    const allowedStatuses = [
      SERVER_STATUSES.NEW, 
      SERVER_STATUSES.CLARIFYING, 
      SERVER_STATUSES.DEFECT
    ];
    
    // Проверка: сервер уже в работе у другого пользователя
    if (server.assignedToId && server.status === SERVER_STATUSES.IN_WORK) {
      // SUPER_ADMIN может забрать сервер у другого пользователя
      if (server.assignedToId !== userId && userRole !== "SUPER_ADMIN") {
        throw new Error("Сервер уже взят в работу другим пользователем");
      }
    }
    
    // Если сервер в CLARIFYING или DEFECT и назначен другому - только суперадмин может взять
    if (server.assignedToId && server.assignedToId !== userId) {
      if (userRole !== "SUPER_ADMIN") {
        throw new Error("Сервер назначен другому исполнителю");
      }
    }
    
    // Проверка допустимого статуса (кроме IN_WORK - его уже проверили выше)
    if (!allowedStatuses.includes(server.status) && server.status !== SERVER_STATUSES.IN_WORK) {
      throw new Error(`Нельзя взять сервер из статуса "${server.status}"`);
    }
    
    const previousStatus = server.status;
    const previousAssignee = server.assignedToId;
    
    // Определяем тип действия для логирования
    const isReturning = server.assignedToId === userId && 
      (server.status === SERVER_STATUSES.CLARIFYING || server.status === SERVER_STATUSES.DEFECT);
    const isTakingFromOther = server.assignedToId && server.assignedToId !== userId;
    
    await server.update({
      status: SERVER_STATUSES.IN_WORK,
      assignedToId: userId,
      // Если возвращаем свой сервер - сохраняем время начала работы
      assignedAt: isReturning ? server.assignedAt : new Date()
    });
    
    // Создаём пункты чек-листа для сервера если их нет
    await ChecklistService.initializeServerChecklist(server.id);
    
    // Формируем комментарий для истории
    let comment = null;
    if (isReturning) {
      comment = `Возвращён в работу из статуса "${previousStatus}"`;
    } else if (isTakingFromOther) {
      comment = `Сервер переназначен администратором с пользователя ID:${previousAssignee}`;
    }
    
    // Логируем
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.TAKEN, {
      fromStatus: previousStatus,
      toStatus: SERVER_STATUSES.IN_WORK,
      comment
    });
    
    const updated = await BeryllServer.findByPk(id, {
      include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }]
    });
    
    return updated;
  }
  
  /**
   * Освободить сервер
   * SUPER_ADMIN может освободить любой сервер
   * 
   * @param {number} id - ID сервера
   * @param {number} userId - ID пользователя
   * @param {string} userRole - Роль пользователя (для проверки SUPER_ADMIN)
   */
  async releaseServer(id, userId, userRole) {
    const server = await BeryllServer.findByPk(id);
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    // SUPER_ADMIN может освободить любой сервер
    if (server.assignedToId !== userId && userRole !== "SUPER_ADMIN") {
      throw new Error("Нет прав для освобождения этого сервера");
    }
    
    const duration = calculateDuration(server.assignedAt);
    const previousStatus = server.status;
    const previousAssignee = server.assignedToId;
    
    await server.update({
      status: SERVER_STATUSES.NEW,
      assignedToId: null,
      assignedAt: null
    });
    
    // Если суперадмин отпускает чужой сервер - добавляем комментарий
    const comment = (userRole === "SUPER_ADMIN" && previousAssignee !== userId) 
      ? "Сервер снят с исполнителя администратором" 
      : undefined;
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.RELEASED, {
      fromStatus: previousStatus,
      toStatus: SERVER_STATUSES.NEW,
      durationMinutes: duration,
      comment
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