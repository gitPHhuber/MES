const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const fs = require("fs");
const { Op, fn, col } = require("sequelize");

const ApiError = require("../../../error/ApiError");
const { BeryllServer, BeryllHistory } = require("../../../models/definitions/Beryll");
const { User } = require("../../../models/index");

const execAsync = promisify(exec);

// Настройки пинга
const PING_TIMEOUT = 2;
const CACHE_TTL = 60000; 


let pingCache = new Map();
let lastFullScan = null;


const DEFECT_FILES_DIR = path.join(__dirname, "../../../uploads/beryll/defects");


if (!fs.existsSync(DEFECT_FILES_DIR)) {
  fs.mkdirSync(DEFECT_FILES_DIR, { recursive: true });
}

class DefectMonitoringController {
  

  async pingHost(ipAddress) {
    if (!ipAddress) {
      return { online: false, latency: null, error: "IP не указан" };
    }
    
    try {

      const isWindows = process.platform === 'win32';
      const cmd = isWindows 
        ? `ping -n 1 -w ${PING_TIMEOUT * 1000} ${ipAddress}`
        : `ping -c 1 -W ${PING_TIMEOUT} ${ipAddress}`;
      
      const { stdout } = await execAsync(cmd, { 
        timeout: (PING_TIMEOUT + 1) * 1000 
      });
      
      const latencyMatch = stdout.match(/time[=<](\d+\.?\d*)/);
      return { 
        online: true, 
        latency: latencyMatch ? parseFloat(latencyMatch[1]) : null, 
        error: null 
      };
    } catch (error) {
      return { 
        online: false, 
        latency: null, 
        error: error.message || "Timeout" 
      };
    }
  }
  
  async pingServer(req, res, next) {
    try {
      const serverId = parseInt(req.params.id);
      
      const server = await BeryllServer.findByPk(serverId, {
        attributes: ["id", "ipAddress", "hostname", "serialNumber", "apkSerialNumber", "status", "batchId"]
      });
      
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      if (!server.ipAddress) {
        return res.json({
          serverId,
          ipAddress: null,
          hostname: server.hostname,
          online: false,
          latency: null,
          error: "IP не указан",
          checkedAt: new Date().toISOString()
        });
      }
      
      const result = await this.pingHost(server.ipAddress);
      
      const cacheEntry = {
        serverId,
        ipAddress: server.ipAddress,
        hostname: server.hostname,
        serialNumber: server.serialNumber,
        apkSerialNumber: server.apkSerialNumber,
        serverStatus: server.status,
        batchId: server.batchId,
        ...result,
        checkedAt: new Date().toISOString()
      };
      pingCache.set(serverId, cacheEntry);
      
      return res.json(cacheEntry);
    } catch (e) {
      console.error("pingServer error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async pingAllServers(req, res, next) {
    try {
      const { batchId, status, forceRefresh } = req.query;
      
      if (forceRefresh !== "true" && lastFullScan && (Date.now() - lastFullScan.getTime() < CACHE_TTL)) {
        return res.json(this.getCachedStatusesData());
      }
      
      const where = { 
        ipAddress: { [Op.ne]: null },
        status: { [Op.notIn]: ["ARCHIVED"] }
      };
      if (batchId) where.batchId = parseInt(batchId);
      if (status) where.status = status;
      
      const servers = await BeryllServer.findAll({
        where,
        attributes: ["id", "ipAddress", "hostname", "serialNumber", "apkSerialNumber", "status", "batchId"]
      });
      
      console.log(`[Monitoring] Пингуем ${servers.length} серверов...`);
      
      const results = [];
      const batchSize = 10;
      
      for (let i = 0; i < servers.length; i += batchSize) {
        const batch = servers.slice(i, i + batchSize);
        const batchResults = await Promise.all(batch.map(async (server) => {
          const pingResult = await this.pingHost(server.ipAddress);
          
          const result = {
            serverId: server.id,
            ipAddress: server.ipAddress,
            hostname: server.hostname,
            serialNumber: server.serialNumber,
            apkSerialNumber: server.apkSerialNumber,
            serverStatus: server.status,
            batchId: server.batchId,
            ...pingResult,
            checkedAt: new Date().toISOString()
          };
          
          pingCache.set(server.id, result);
          return result;
        }));
        results.push(...batchResults);
      }
      
      lastFullScan = new Date();
      const online = results.filter(r => r.online).length;
      
      console.log(`[Monitoring] Завершено: ${online} online, ${results.length - online} offline`);
      
      return res.json({
        total: results.length,
        online,
        offline: results.length - online,
        checkedAt: lastFullScan.toISOString(),
        servers: results
      });
    } catch (e) {
      console.error("pingAllServers error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async getCachedStatus(req, res, next) {
    try {
      return res.json(this.getCachedStatusesData());
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async getMonitoringStats(req, res, next) {
    try {
      const results = Array.from(pingCache.values());
      const online = results.filter(r => r.online).length;
      const offline = results.filter(r => !r.online).length;
      

      const latencies = results.filter(r => r.online && r.latency).map(r => r.latency);
      const avgLatency = latencies.length > 0 
        ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2)
        : null;
      
      return res.json({
        byStatus: {
          ONLINE: online,
          OFFLINE: offline,
          UNKNOWN: 0
        },
        total: results.length,
        online,
        offline,
        unknown: 0,
        staleServers: 0,
        avgLatency,
        lastFullScan: lastFullScan ? lastFullScan.toISOString() : null
      });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async getOnlineServers(req, res, next) {
    try {
      const results = Array.from(pingCache.values()).filter(r => r.online);
      return res.json({ servers: results, total: results.length });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async getOfflineServers(req, res, next) {
    try {
      const results = Array.from(pingCache.values()).filter(r => !r.online);
      return res.json({ servers: results, total: results.length });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async clearCache(req, res, next) {
    try {
      pingCache.clear();
      lastFullScan = null;
      return res.json({ success: true, message: "Кэш очищен" });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  getCachedStatusesData() {
    const results = Array.from(pingCache.values());
    const online = results.filter(r => r.online).length;
    return {
      total: results.length,
      online,
      offline: results.length - online,
      checkedAt: lastFullScan ? lastFullScan.toISOString() : null,
      cached: true,
      servers: results
    };
  }
  
  async getServerDefects(req, res, next) {
    try {
      const { serverId } = req.params;
      const { status, category, limit = 50, offset = 0 } = req.query;
      
      const server = await BeryllServer.findByPk(serverId);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      return res.json({
        count: 0,
        rows: [],
        page: 1,
        totalPages: 0
      });
    } catch (e) {
      console.error("getServerDefects:", e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async getDefectById(req, res, next) {
    try {
      // Заглушка
      return next(ApiError.notFound("Дефект не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async createDefect(req, res, next) {
    try {
      const { serverId } = req.params;
      const { text, defectCategory, priority } = req.body;
      
      if (!text || !text.trim()) {
        return next(ApiError.badRequest("Текст комментария обязателен"));
      }
      
      const server = await BeryllServer.findByPk(serverId);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      await BeryllHistory.create({
        serverId,
        serverIp: server.ipAddress,
        serverHostname: server.hostname,
        userId: req.user?.id,
        action: "NOTE_ADDED",
        comment: `[ДЕФЕКТ/${defectCategory || "OTHER"}] ${text.trim()}`,
        metadata: { defectCategory, priority, isDefect: true }
      });
      
      return res.status(201).json({ 
        success: true, 
        message: "Дефект записан в историю сервера" 
      });
    } catch (e) {
      console.error("createDefect:", e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async updateDefect(req, res, next) {
    try {
      return next(ApiError.notFound("Дефект не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteDefect(req, res, next) {
    try {
      return next(ApiError.notFound("Дефект не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async resolveDefect(req, res, next) {
    try {
      return next(ApiError.notFound("Дефект не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async uploadDefectFile(req, res, next) {
    try {
      if (!req.file) {
        return next(ApiError.badRequest("Файл не загружен"));
      }
      
      return res.json({
        success: true,
        file: {
          id: Date.now(),
          fileName: req.file.filename,
          originalName: req.file.originalname,
          fileSize: req.file.size
        }
      });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async downloadDefectFile(req, res, next) {
    try {
      return next(ApiError.notFound("Файл не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  

  async deleteDefectFile(req, res, next) {
    try {
      return next(ApiError.notFound("Файл не найден"));
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
  
  async getDefectStats(req, res, next) {
    try {
      return res.json({
        total: 0,
        unresolved: 0,
        resolved: 0,
        byCategory: {},
        byStatus: {},
        byPriority: {}
      });
    } catch (e) {
      return next(ApiError.internal(e.message));
    }
  }
}

const controller = new DefectMonitoringController();

module.exports = {
  // Мониторинг
  pingServer: controller.pingServer.bind(controller),
  pingAllServers: controller.pingAllServers.bind(controller),
  getCachedStatus: controller.getCachedStatus.bind(controller),
  getMonitoringStats: controller.getMonitoringStats.bind(controller),
  getOnlineServers: controller.getOnlineServers.bind(controller),
  getOfflineServers: controller.getOfflineServers.bind(controller),
  clearCache: controller.clearCache.bind(controller),
  
  // Дефекты
  getServerDefects: controller.getServerDefects.bind(controller),
  getDefectById: controller.getDefectById.bind(controller),
  createDefect: controller.createDefect.bind(controller),
  updateDefect: controller.updateDefect.bind(controller),
  deleteDefect: controller.deleteDefect.bind(controller),
  resolveDefect: controller.resolveDefect.bind(controller),
  uploadDefectFile: controller.uploadDefectFile.bind(controller),
  downloadDefectFile: controller.downloadDefectFile.bind(controller),
  deleteDefectFile: controller.deleteDefectFile.bind(controller),
  getDefectStats: controller.getDefectStats.bind(controller)
};