const { BeryllServer, BeryllBatch, BeryllHistory, User } = require("../../../models/index");
const { SERVER_STATUSES, HISTORY_ACTIONS } = require("../../../models/definitions/Beryll");
const { Op } = require("sequelize");
const HistoryService = require("./HistoryService");

class ArchiveService {
  /**
   * Получение списка архивных серверов
   */
  async getArchivedServers(filters = {}) {
    const { search, batchId, page = 1, limit = 50 } = filters;
    
    const where = { status: SERVER_STATUSES.ARCHIVED };
    
    if (search) {
      where[Op.or] = [
        { apkSerialNumber: { [Op.iLike]: `%${search}%` } },
        { serialNumber: { [Op.iLike]: `%${search}%` } },
        { hostname: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    if (batchId) {
      where.batchId = batchId === "null" ? null : parseInt(batchId);
    }
    
    const { count, rows } = await BeryllServer.findAndCountAll({
      where,
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "archivedBy", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllBatch, as: "batch", attributes: ["id", "title"] }
      ],
      order: [["archivedAt", "DESC"]],
      limit: parseInt(limit),
      offset: (parseInt(page) - 1) * parseInt(limit)
    });
    
    return {
      servers: rows,
      total: count,
      page: parseInt(page),
      totalPages: Math.ceil(count / parseInt(limit))
    };
  }
  
  /**
   * Перенос сервера в архив
   */
  async archiveServer(id, userId) {
    const server = await BeryllServer.findByPk(id);
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    // Проверяем что сервер завершён
    if (server.status !== SERVER_STATUSES.DONE) {
      throw new Error("Можно архивировать только завершённые серверы");
    }
    
    // Проверяем что есть серийный номер
    if (!server.apkSerialNumber) {
      throw new Error("Перед архивацией необходимо присвоить серийный номер АПК");
    }
    
    const oldStatus = server.status;
    
    await server.update({
      status: SERVER_STATUSES.ARCHIVED,
      archivedAt: new Date(),
      archivedById: userId,
      leaseActive: false
    });
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.ARCHIVED, {
      fromStatus: oldStatus,
      toStatus: SERVER_STATUSES.ARCHIVED,
      comment: `Сервер ${server.apkSerialNumber} перенесён в архив`
    });
    
    return { success: true, message: "Сервер перенесён в архив" };
  }
  
  /**
   * Разархивация сервера (возврат из архива)
   */
  async unarchiveServer(id, userId) {
    const server = await BeryllServer.findByPk(id);
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    if (!server.archivedAt) {
      throw new Error("Сервер не находится в архиве");
    }
    
    await server.update({
      archivedAt: null,
      archivedById: null,
      status: SERVER_STATUSES.DONE // Возвращаем в статус "Готово"
    });
    
    // Логируем
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.STATUS_CHANGED, {
      fromStatus: "ARCHIVED",
      toStatus: SERVER_STATUSES.DONE,
      comment: "Извлечён из архива"
    });
    
    const updated = await BeryllServer.findByPk(id, {
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "archivedBy", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllBatch, as: "batch" }
      ]
    });
    
    return updated;
  }
  
  /**
   * Присвоение серийного номера АПК
   */
  async updateApkSerialNumber(id, apkSerialNumber, userId) {
    if (!apkSerialNumber || !apkSerialNumber.trim()) {
      throw new Error("Укажите серийный номер АПК");
    }
    
    const server = await BeryllServer.findByPk(id);
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    // Проверка уникальности
    const existing = await BeryllServer.findOne({
      where: {
        apkSerialNumber: apkSerialNumber.trim(),
        id: { [Op.ne]: id }
      }
    });
    
    if (existing) {
      throw new Error("Этот серийный номер уже присвоен другому серверу");
    }
    
    const oldSerial = server.apkSerialNumber;
    
    await server.update({ apkSerialNumber: apkSerialNumber.trim() });
    
    await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.SERIAL_ASSIGNED, {
      comment: oldSerial 
        ? `Серийный номер изменён с ${oldSerial} на ${apkSerialNumber.trim()}`
        : `Присвоен серийный номер ${apkSerialNumber.trim()}`,
      metadata: { oldSerial, newSerial: apkSerialNumber.trim() }
    });
    
    return { success: true, apkSerialNumber: apkSerialNumber.trim() };
  }
}

module.exports = new ArchiveService();
