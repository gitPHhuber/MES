/**
 * DefectMonitoringService.js
 * 
 * Положить в: controllers/beryll/services/DefectMonitoringService.js
 */

const path = require("path");
const fs = require("fs");
const { exec } = require("child_process");
const { promisify } = require("util");
const { Op, fn, col } = require("sequelize");

const execAsync = promisify(exec);

// Модели
const { 
  BeryllServer, BeryllHistory, BeryllDefectComment, BeryllDefectFile,
  HISTORY_ACTIONS, DEFECT_STATUSES 
} = require("../../../models/definitions/Beryll");
const { User } = require("../../../models/index");
const sequelize = require("../../../db");

// Директория файлов
const DEFECT_FILES_DIR = path.join(__dirname, "../../../../uploads/beryll/defects");

// Кэш мониторинга
let pingCache = new Map();
let lastFullScan = null;
const PING_TIMEOUT = 2;
const CACHE_TTL = 60000;

class DefectMonitoringService {
  
  // =============================================
  // КОММЕНТАРИИ К ДЕФЕКТАМ
  // =============================================
  
  /**
   * Получить комментарии сервера
   */
  async getCommentsByServer(serverId, options = {}) {
    const { status, category, limit = 50, offset = 0 } = options;
    const where = { serverId };
    if (status) where.status = status;
    if (category) where.defectCategory = category;
    
    const comments = await BeryllDefectComment.findAndCountAll({
      where,
      include: [
        { model: User, as: "author", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "resolvedBy", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllDefectFile, as: "files", include: [
          { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
        ]}
      ],
      order: [["createdAt", "DESC"]],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    return { count: comments.count, rows: comments.rows, page: Math.floor(offset / limit) + 1, totalPages: Math.ceil(comments.count / limit) };
  }
  
  /**
   * Получить комментарий по ID
   */
  async getCommentById(commentId) {
    const comment = await BeryllDefectComment.findByPk(commentId, {
      include: [
        { model: User, as: "author", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "resolvedBy", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllServer, as: "server", attributes: ["id", "ipAddress", "hostname", "serialNumber", "apkSerialNumber"] },
        { model: BeryllDefectFile, as: "files", include: [
          { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
        ]}
      ]
    });
    if (!comment) throw new Error("Комментарий не найден");
    return comment;
  }
  
  /**
   * Создать комментарий
   */
  async createComment(serverId, userId, data) {
    const { text, defectCategory, priority } = data;
    const server = await BeryllServer.findByPk(serverId);
    if (!server) throw new Error("Сервер не найден");
    
    const comment = await BeryllDefectComment.create({
      serverId, userId, text,
      defectCategory: defectCategory || "OTHER",
      priority: priority || "MEDIUM",
      status: "NEW"
    });
    
    await BeryllHistory.create({
      serverId, serverIp: server.ipAddress, serverHostname: server.hostname, userId,
      action: "DEFECT_COMMENT_ADDED",
      comment: `Добавлен комментарий: ${text.substring(0, 100)}`,
      metadata: { commentId: comment.id, defectCategory, priority }
    });
    
    return this.getCommentById(comment.id);
  }
  
  /**
   * Обновить комментарий
   */
  async updateComment(commentId, userId, data) {
    const { text, defectCategory, priority, status, resolution } = data;
    const comment = await BeryllDefectComment.findByPk(commentId);
    if (!comment) throw new Error("Комментарий не найден");
    
    const updateData = {};
    if (text !== undefined) updateData.text = text;
    if (defectCategory !== undefined) updateData.defectCategory = defectCategory;
    if (priority !== undefined) updateData.priority = priority;
    
    if (status !== undefined) {
      updateData.status = status;
      if (status === "RESOLVED" || status === "WONT_FIX") {
        updateData.resolvedById = userId;
        updateData.resolvedAt = new Date();
        if (resolution) updateData.resolution = resolution;
      }
    }
    
    const oldStatus = comment.status;
    await comment.update(updateData);
    
    if (status && status !== oldStatus) {
      const server = await BeryllServer.findByPk(comment.serverId);
      await BeryllHistory.create({
        serverId: comment.serverId, serverIp: server?.ipAddress, serverHostname: server?.hostname, userId,
        action: "DEFECT_STATUS_CHANGED",
        comment: `Статус дефекта: ${oldStatus} → ${status}`,
        metadata: { commentId, fromStatus: oldStatus, toStatus: status, resolution }
      });
    }
    
    return this.getCommentById(commentId);
  }
  
  /**
   * Удалить комментарий
   */
  async deleteComment(commentId, userId) {
    const comment = await BeryllDefectComment.findByPk(commentId, {
      include: [{ model: BeryllDefectFile, as: "files" }]
    });
    if (!comment) throw new Error("Комментарий не найден");
    
    // Удаляем файлы с диска
    for (const file of comment.files || []) {
      const fullPath = path.join(DEFECT_FILES_DIR, file.filePath);
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    }
    
    const server = await BeryllServer.findByPk(comment.serverId);
    await BeryllHistory.create({
      serverId: comment.serverId, serverIp: server?.ipAddress, serverHostname: server?.hostname, userId,
      action: "DEFECT_COMMENT_DELETED",
      comment: `Удалён комментарий`,
      metadata: { commentId, deletedText: comment.text.substring(0, 100) }
    });
    
    await comment.destroy();
    return { success: true, message: "Комментарий удалён" };
  }
  
  /**
   * Загрузить файл
   */
  async uploadFile(commentId, file, userId) {
    const comment = await BeryllDefectComment.findByPk(commentId, {
      include: [{ model: BeryllServer, as: "server" }]
    });
    if (!comment) throw new Error("Комментарий не найден");
    
    const serverSerial = comment.server?.apkSerialNumber || comment.server?.serialNumber || `server_${comment.serverId}`;
    const serverDir = path.join(DEFECT_FILES_DIR, serverSerial);
    if (!fs.existsSync(serverDir)) fs.mkdirSync(serverDir, { recursive: true });
    
    const ext = path.extname(file.name);
    const fileName = `defect_${commentId}_${Date.now()}${ext}`;
    const filePath = path.join(serverDir, fileName);
    
    await file.mv(filePath);
    
    const fileRecord = await BeryllDefectFile.create({
      commentId, originalName: file.name, fileName,
      filePath: path.join(serverSerial, fileName),
      mimeType: file.mimetype, fileSize: file.size, uploadedById: userId
    });
    
    await BeryllHistory.create({
      serverId: comment.serverId, serverIp: comment.server?.ipAddress, serverHostname: comment.server?.hostname, userId,
      action: "DEFECT_FILE_UPLOADED",
      comment: `Загружен файл: ${file.name}`,
      metadata: { commentId, fileId: fileRecord.id, fileName: file.name }
    });
    
    return { success: true, file: { id: fileRecord.id, fileName, originalName: file.name, fileSize: file.size } };
  }
  
  /**
   * Получить файл для скачивания
   */
  async getFileForDownload(fileId) {
    const file = await BeryllDefectFile.findByPk(fileId);
    if (!file) throw new Error("Файл не найден");
    
    const fullPath = path.join(DEFECT_FILES_DIR, file.filePath);
    if (!fs.existsSync(fullPath)) throw new Error("Файл не найден на диске");
    
    return { fullPath, originalName: file.originalName, mimeType: file.mimeType };
  }
  
  /**
   * Удалить файл
   */
  async deleteFile(fileId, userId) {
    const file = await BeryllDefectFile.findByPk(fileId, {
      include: [{ model: BeryllDefectComment, as: "comment", include: [{ model: BeryllServer, as: "server" }] }]
    });
    if (!file) throw new Error("Файл не найден");
    
    const fullPath = path.join(DEFECT_FILES_DIR, file.filePath);
    if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath);
    
    await BeryllHistory.create({
      serverId: file.comment?.serverId, serverIp: file.comment?.server?.ipAddress, serverHostname: file.comment?.server?.hostname, userId,
      action: "DEFECT_FILE_DELETED",
      comment: `Удалён файл: ${file.originalName}`,
      metadata: { fileId, commentId: file.commentId, fileName: file.originalName }
    });
    
    await file.destroy();
    return { success: true, message: "Файл удалён" };
  }
  
  /**
   * Статистика дефектов
   */
  async getDefectStats(options = {}) {
    const { serverId, batchId, dateFrom, dateTo } = options;
    const where = {};
    
    if (serverId) where.serverId = serverId;
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
      if (dateTo) where.createdAt[Op.lte] = new Date(dateTo);
    }
    if (batchId) {
      const servers = await BeryllServer.findAll({ where: { batchId }, attributes: ["id"] });
      where.serverId = { [Op.in]: servers.map(s => s.id) };
    }
    
    const [byCategory, byStatus, byPriority, total, unresolved] = await Promise.all([
      BeryllDefectComment.findAll({ where, attributes: ["defectCategory", [fn("COUNT", col("id")), "count"]], group: ["defectCategory"], raw: true }),
      BeryllDefectComment.findAll({ where, attributes: ["status", [fn("COUNT", col("id")), "count"]], group: ["status"], raw: true }),
      BeryllDefectComment.findAll({ where, attributes: ["priority", [fn("COUNT", col("id")), "count"]], group: ["priority"], raw: true }),
      BeryllDefectComment.count({ where }),
      BeryllDefectComment.count({ where: { ...where, status: { [Op.in]: ["NEW", "IN_PROGRESS"] } } })
    ]);
    
    return {
      total, unresolved, resolved: total - unresolved,
      byCategory: byCategory.reduce((acc, i) => { acc[i.defectCategory] = parseInt(i.count); return acc; }, {}),
      byStatus: byStatus.reduce((acc, i) => { acc[i.status] = parseInt(i.count); return acc; }, {}),
      byPriority: byPriority.reduce((acc, i) => { acc[i.priority] = parseInt(i.count); return acc; }, {})
    };
  }
  
  // =============================================
  // МОНИТОРИНГ (PING)
  // =============================================
  
  /**
   * Пинг одного IP
   */
  async pingHost(ipAddress) {
    if (!ipAddress) return { online: false, latency: null, error: "IP не указан" };
    
    try {
      const { stdout } = await execAsync(`ping -c 1 -W ${PING_TIMEOUT} ${ipAddress}`, { timeout: (PING_TIMEOUT + 1) * 1000 });
      const latencyMatch = stdout.match(/time[=<](\d+\.?\d*)/);
      return { online: true, latency: latencyMatch ? parseFloat(latencyMatch[1]) : null, error: null };
    } catch (error) {
      return { online: false, latency: null, error: error.message || "Timeout" };
    }
  }
  
  /**
   * Пинг одного сервера
   */
  async pingServer(serverId) {
    const server = await BeryllServer.findByPk(serverId);
    if (!server) throw new Error("Сервер не найден");
    if (!server.ipAddress) return { serverId, ipAddress: null, online: false, latency: null, error: "IP не указан", checkedAt: new Date() };
    
    const result = await this.pingHost(server.ipAddress);
    
    await server.update({
      lastPingAt: new Date(),
      pingStatus: result.online ? "ONLINE" : "OFFLINE",
      pingLatency: result.latency
    });
    
    pingCache.set(serverId, { ...result, serverId, ipAddress: server.ipAddress, hostname: server.hostname, checkedAt: new Date() });
    
    return { serverId, ipAddress: server.ipAddress, hostname: server.hostname, serialNumber: server.serialNumber, apkSerialNumber: server.apkSerialNumber, ...result, checkedAt: new Date() };
  }
  
  /**
   * Массовый пинг
   */
  async pingAllServers(options = {}) {
    const { batchId, status, forceRefresh = false } = options;
    
    if (!forceRefresh && lastFullScan && (Date.now() - lastFullScan.getTime() < CACHE_TTL)) {
      return this.getCachedStatuses();
    }
    
    const where = { ipAddress: { [Op.ne]: null }, status: { [Op.notIn]: ["ARCHIVED"] } };
    if (batchId) where.batchId = batchId;
    if (status) where.status = status;
    
    const servers = await BeryllServer.findAll({
      where, attributes: ["id", "ipAddress", "hostname", "serialNumber", "apkSerialNumber", "status", "batchId"]
    });
    
    console.log(`[Monitoring] Пингуем ${servers.length} серверов...`);
    const results = [];
    const batchSize = 10;
    
    for (let i = 0; i < servers.length; i += batchSize) {
      const batch = servers.slice(i, i + batchSize);
      const batchResults = await Promise.all(batch.map(async (server) => {
        const pingResult = await this.pingHost(server.ipAddress);
        await server.update({ lastPingAt: new Date(), pingStatus: pingResult.online ? "ONLINE" : "OFFLINE", pingLatency: pingResult.latency });
        
        const result = {
          serverId: server.id, ipAddress: server.ipAddress, hostname: server.hostname,
          serialNumber: server.serialNumber, apkSerialNumber: server.apkSerialNumber,
          serverStatus: server.status, batchId: server.batchId, ...pingResult, checkedAt: new Date()
        };
        pingCache.set(server.id, result);
        return result;
      }));
      results.push(...batchResults);
    }
    
    lastFullScan = new Date();
    const online = results.filter(r => r.online).length;
    console.log(`[Monitoring] Завершено: ${online} online, ${results.length - online} offline`);
    
    return { total: results.length, online, offline: results.length - online, checkedAt: lastFullScan, servers: results };
  }
  
  /**
   * Статусы из кэша
   */
  getCachedStatuses() {
    const results = Array.from(pingCache.values());
    const online = results.filter(r => r.online).length;
    return { total: results.length, online, offline: results.length - online, checkedAt: lastFullScan, cached: true, servers: results };
  }
  
  /**
   * Статистика мониторинга
   */
  async getMonitoringStats() {
    const stats = await BeryllServer.findAll({
      where: { ipAddress: { [Op.ne]: null }, status: { [Op.notIn]: ["ARCHIVED"] } },
      attributes: ["pingStatus", [fn("COUNT", col("id")), "count"]],
      group: ["pingStatus"], raw: true
    });
    
    const byPingStatus = stats.reduce((acc, i) => { acc[i.pingStatus || "UNKNOWN"] = parseInt(i.count); return acc; }, {});
    
    const staleThreshold = new Date(Date.now() - 5 * 60 * 1000);
    const staleServers = await BeryllServer.count({
      where: {
        ipAddress: { [Op.ne]: null }, status: { [Op.notIn]: ["ARCHIVED"] },
        [Op.or]: [{ lastPingAt: null }, { lastPingAt: { [Op.lt]: staleThreshold } }]
      }
    });
    
    const avgLatency = await BeryllServer.findOne({
      where: { pingStatus: "ONLINE", pingLatency: { [Op.ne]: null } },
      attributes: [[fn("AVG", col("pingLatency")), "avgLatency"]], raw: true
    });
    
    return {
      byStatus: byPingStatus, total: Object.values(byPingStatus).reduce((a, b) => a + b, 0),
      online: byPingStatus.ONLINE || 0, offline: byPingStatus.OFFLINE || 0, unknown: byPingStatus.UNKNOWN || 0,
      staleServers, avgLatency: avgLatency?.avgLatency ? parseFloat(avgLatency.avgLatency).toFixed(2) : null, lastFullScan
    };
  }
  
  /**
   * Серверы по статусу пинга
   */
  async getServersByPingStatus(pingStatus, options = {}) {
    const { batchId, limit = 50, offset = 0 } = options;
    const where = { status: { [Op.notIn]: ["ARCHIVED"] } };
    
    if (pingStatus === "ONLINE") where.pingStatus = "ONLINE";
    else if (pingStatus === "OFFLINE") where.pingStatus = "OFFLINE";
    else if (pingStatus === "UNKNOWN") where[Op.or] = [{ pingStatus: null }, { pingStatus: "UNKNOWN" }];
    
    if (batchId) where.batchId = batchId;
    
    const servers = await BeryllServer.findAndCountAll({
      where, include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }],
      order: [["lastPingAt", "DESC"]], limit: parseInt(limit), offset: parseInt(offset)
    });
    
    return { count: servers.count, rows: servers.rows, page: Math.floor(offset / limit) + 1, totalPages: Math.ceil(servers.count / limit) };
  }
  
  clearCache() { pingCache.clear(); lastFullScan = null; console.log("[Monitoring] Кэш очищен"); }
}

module.exports = new DefectMonitoringService();
