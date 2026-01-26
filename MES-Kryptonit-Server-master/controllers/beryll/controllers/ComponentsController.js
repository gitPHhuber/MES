/**
 * ComponentsController.js
 * 
 * Контроллер для работы с комплектующими серверов Beryll
 * 
 * Положить в: controllers/beryll/controllers/ComponentsController.js
 */

const { BeryllServer, BeryllServerComponent, BeryllHistory } = require("../../../models/index");
const OpenBMCService = require("../services/OpenBMCService");
const ApiError = require("../../../error/ApiError");
const logger = require("../../../services/logger");

/**
 * Сформировать имя компонента из данных BMC
 */
function generateComponentName(comp) {
  if (comp.name) return comp.name;
  if (comp.model) return comp.model;
  if (comp.manufacturer) return `${comp.manufacturer} ${comp.componentType}`;
  if (comp.slot) return `${comp.componentType} ${comp.slot}`;
  return comp.componentType || "Unknown Component";
}

/**
 * Форматировать байты в человекочитаемый формат
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

class ComponentsController {

  /**
   * Проверить доступность BMC сервера
   * GET /api/beryll/servers/:id/bmc/check
   */
  async checkBMC(req, res, next) {
    try {
      const { id } = req.params;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const bmcAddress = server.bmcAddress || server.ipAddress;
      if (!bmcAddress) {
        return next(ApiError.badRequest("IP адрес сервера не указан"));
      }
      
      const result = await OpenBMCService.checkConnection(bmcAddress);
      
      res.json({
        serverId: server.id,
        bmcAddress,
        ...result
      });
    } catch (error) {
      logger.error("[ComponentsController] checkBMC error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Выгрузить комплектующие с BMC
   * POST /api/beryll/servers/:id/components/fetch
   */
  async fetchComponents(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const bmcAddress = server.bmcAddress || server.ipAddress;
      if (!bmcAddress) {
        return next(ApiError.badRequest("IP адрес сервера не указан"));
      }
      
      // Получаем все комплектующие с BMC
      const components = await OpenBMCService.getAllComponents(bmcAddress);
      
      if (components.length === 0) {
        return next(ApiError.badRequest("Не удалось получить данные с BMC. Проверьте доступность."));
      }
      
      // Удаляем старые записи комплектующих
      await BeryllServerComponent.destroy({ where: { serverId: id } });
      
      // Сохраняем новые
      const savedComponents = [];
      for (const comp of components) {
        const name = generateComponentName(comp);
        
        // Собираем дополнительные данные в metadata
        const metadata = {
          cores: comp.cores,
          threads: comp.threads,
          architecture: comp.architecture,
          memoryType: comp.memoryType,
          rank: comp.rank,
          mediaType: comp.mediaType,
          interface: comp.interface,
          macAddress: comp.macAddress,
          linkSpeed: comp.linkSpeed,
          health: comp.health,
          fetchedById: userId
        };
        
        // Убираем undefined значения из metadata
        Object.keys(metadata).forEach(key => {
          if (metadata[key] === undefined || metadata[key] === null) {
            delete metadata[key];
          }
        });

        const saved = await BeryllServerComponent.create({
          serverId: id,
          componentType: comp.componentType,
          name: name,
          slot: comp.slot,
          manufacturer: comp.manufacturer,
          model: comp.model,
          serialNumber: comp.serialNumber,
          partNumber: comp.partNumber,
          firmwareVersion: comp.firmwareVersion,
          status: comp.status || "UNKNOWN",
          capacity: comp.capacityBytes || null,
          speed: comp.speedMHz || comp.speedMT || comp.speed || null,
          healthPercent: typeof comp.health === "number" ? comp.health : null,
          metadata: Object.keys(metadata).length > 0 ? metadata : null,
          dataSource: "REDFISH",
          lastUpdatedAt: new Date()
        });
        savedComponents.push(saved);
      }
      
      // Обновляем время последней выгрузки
      await server.update({ lastComponentsFetchAt: new Date() });
      
      // Записываем в историю
      await BeryllHistory.create({
        serverId: id,
        serverIp: server.ipAddress,
        serverHostname: server.hostname,
        userId,
        action: "COMPONENTS_FETCHED",
        comment: `Выгружено ${savedComponents.length} комплектующих с BMC`,
        metadata: {
          componentsCount: savedComponents.length,
          types: [...new Set(savedComponents.map(c => c.componentType))]
        }
      });
      
      res.json({
        success: true,
        message: `Выгружено ${savedComponents.length} комплектующих`,
        components: savedComponents
      });
    } catch (error) {
      logger.error("[ComponentsController] fetchComponents error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Получить комплектующие сервера
   * GET /api/beryll/servers/:id/components
   */
  async getComponents(req, res, next) {
    try {
      const { id } = req.params;
      
      const server = await BeryllServer.findByPk(id, {
        attributes: ["id", "ipAddress", "hostname", "apkSerialNumber", "lastComponentsFetchAt"]
      });
      
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const components = await BeryllServerComponent.findAll({
        where: { serverId: id },
        order: [
          ["componentType", "ASC"],
          ["slot", "ASC"]
        ]
      });
      
      // Группируем по типам
      const grouped = {
        CPU: components.filter(c => c.componentType === "CPU"),
        RAM: components.filter(c => c.componentType === "RAM"),
        storage: components.filter(c => ["SSD", "HDD", "NVME"].includes(c.componentType)),
        NIC: components.filter(c => c.componentType === "NIC"),
        other: components.filter(c => ["MOTHERBOARD", "BMC", "PSU", "GPU", "RAID", "OTHER"].includes(c.componentType))
      };
      
      // Суммарная информация (capacity хранится в байтах как BIGINT)
      const totalRAMBytes = grouped.RAM.reduce((sum, r) => {
        const cap = parseInt(r.capacity) || 0;
        return sum + cap;
      }, 0);
      
      const totalStorageBytes = grouped.storage.reduce((sum, s) => {
        const cap = parseInt(s.capacity) || 0;
        return sum + cap;
      }, 0);
      
      const summary = {
        totalRAMBytes,
        totalStorageBytes,
        totalRAM: formatBytes(totalRAMBytes),
        totalStorage: formatBytes(totalStorageBytes),
        cpuCores: grouped.CPU.reduce((sum, c) => sum + (c.metadata?.cores || 0), 0),
        cpuThreads: grouped.CPU.reduce((sum, c) => sum + (c.metadata?.threads || 0), 0),
        totalComponents: components.length
      };
      
      res.json({
        server: {
          id: server.id,
          ipAddress: server.ipAddress,
          hostname: server.hostname,
          apkSerialNumber: server.apkSerialNumber,
          lastComponentsFetchAt: server.lastComponentsFetchAt
        },
        summary,
        grouped,
        components
      });
    } catch (error) {
      logger.error("[ComponentsController] getComponents error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Получить один компонент
   * GET /api/beryll/components/:id
   */
  async getComponentById(req, res, next) {
    try {
      const { id } = req.params;
      
      const component = await BeryllServerComponent.findByPk(id, {
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "ipAddress", "apkSerialNumber"] }
        ]
      });
      
      if (!component) {
        return next(ApiError.notFound("Компонент не найден"));
      }
      
      res.json(component);
    } catch (error) {
      logger.error("[ComponentsController] getComponentById error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Удалить все комплектующие сервера
   * DELETE /api/beryll/servers/:id/components
   */
  async deleteComponents(req, res, next) {
    try {
      const { id } = req.params;
      
      const deleted = await BeryllServerComponent.destroy({ where: { serverId: id } });
      
      await BeryllServer.update(
        { lastComponentsFetchAt: null },
        { where: { id } }
      );
      
      res.json({
        success: true,
        message: `Удалено ${deleted} компонентов`
      });
    } catch (error) {
      logger.error("[ComponentsController] deleteComponents error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Обновить адрес BMC
   * PUT /api/beryll/servers/:id/bmc-address
   */
  async updateBMCAddress(req, res, next) {
    try {
      const { id } = req.params;
      const { bmcAddress } = req.body;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      await server.update({ bmcAddress });
      
      res.json({
        success: true,
        bmcAddress: server.bmcAddress
      });
    } catch (error) {
      logger.error("[ComponentsController] updateBMCAddress error:", error);
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ComponentsController();