const { BeryllServer, BeryllServerComponent, BeryllHistory } = require("../../../models");
const OpenBMCService = require("../services/OpenBMCService");
const ApiError = require("../../../error/ApiError");
const { Op } = require("sequelize");

/**
 * Сформировать имя компонента из данных BMC
 */
function generateComponentName(comp) {
  const parts = [];
  if (comp.manufacturer) parts.push(comp.manufacturer);
  if (comp.model) parts.push(comp.model);
  if (parts.length === 0 && comp.name) parts.push(comp.name);
  return parts.join(" ") || `${comp.componentType} Component`;
}

/**
 * Сравнить компоненты из БД и BMC
 */
function compareComponents(dbComponents, bmcComponents) {
  const result = {
    missingInBmc: [],
    newInBmc: [],
    mismatches: [],
    matched: []
  };

  const bmcBySerial = new Map();
  const bmcBySlotType = new Map();
  
  for (const bmcComp of bmcComponents) {
    if (bmcComp.serialNumber) {
      bmcBySerial.set(bmcComp.serialNumber, bmcComp);
    }
    const slotTypeKey = `${bmcComp.componentType}:${bmcComp.slot || 'default'}`;
    bmcBySlotType.set(slotTypeKey, bmcComp);
  }

  const dbBySerial = new Map();
  const processedBmcSerials = new Set();

  for (const dbComp of dbComponents) {
    if (dbComp.serialNumber) {
      dbBySerial.set(dbComp.serialNumber, dbComp);
    }
  }

  for (const dbComp of dbComponents) {
    const serialNumber = dbComp.serialNumber;
    
    if (serialNumber && bmcBySerial.has(serialNumber)) {
      const bmcComp = bmcBySerial.get(serialNumber);
      processedBmcSerials.add(serialNumber);
      
      const differences = [];
      
      if (dbComp.model !== bmcComp.model && bmcComp.model) {
        differences.push({ field: 'model', db: dbComp.model, bmc: bmcComp.model });
      }
      if (dbComp.firmwareVersion !== bmcComp.firmwareVersion && bmcComp.firmwareVersion) {
        differences.push({ field: 'firmwareVersion', db: dbComp.firmwareVersion, bmc: bmcComp.firmwareVersion });
      }
      if (dbComp.status !== bmcComp.status && bmcComp.status) {
        differences.push({ field: 'status', db: dbComp.status, bmc: bmcComp.status });
      }
      if (dbComp.slot !== bmcComp.slot && bmcComp.slot) {
        differences.push({ field: 'slot', db: dbComp.slot, bmc: bmcComp.slot });
      }
      
      if (differences.length > 0) {
        result.mismatches.push({
          dbComponent: dbComp,
          bmcComponent: bmcComp,
          differences
        });
      } else {
        result.matched.push({
          dbComponent: dbComp,
          bmcComponent: bmcComp
        });
      }
    } else {
      const isManual = dbComp.dataSource === 'MANUAL' || dbComp.dataSource === 'REPLACEMENT';
      
      result.missingInBmc.push({
        dbComponent: dbComp,
        isManual,
        reason: isManual 
          ? 'Добавлен вручную, не найден в BMC' 
          : 'Компонент удалён или заменён физически'
      });
    }
  }

  for (const bmcComp of bmcComponents) {
    const serialNumber = bmcComp.serialNumber;
    
    if (serialNumber && !processedBmcSerials.has(serialNumber) && !dbBySerial.has(serialNumber)) {
      result.newInBmc.push({
        bmcComponent: bmcComp,
        reason: 'Новый компонент, обнаружен в BMC'
      });
    }
  }

  return result;
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
        success: result.success,
        redfishVersion: result.version,
        bmcAddress,
        error: result.error
      });
    } catch (error) {
      console.error("[ComponentsController] checkBMC error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Сравнить компоненты с BMC (без сохранения)
   * GET /api/beryll/servers/:id/components/compare
   */
  async compareWithBMC(req, res, next) {
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
      
      const dbComponents = await BeryllServerComponent.findAll({
        where: { serverId: id },
        raw: true
      });
      
      const bmcComponents = await OpenBMCService.getAllComponents(bmcAddress);
      
      if (bmcComponents.length === 0) {
        return next(ApiError.badRequest("Не удалось получить данные с BMC"));
      }
      
      const comparison = compareComponents(dbComponents, bmcComponents);
      
      res.json({
        success: true,
        hasDiscrepancies: comparison.missingInBmc.length > 0 || 
                          comparison.newInBmc.length > 0 || 
                          comparison.mismatches.length > 0,
        summary: {
          total: {
            inDb: dbComponents.length,
            inBmc: bmcComponents.length
          },
          matched: comparison.matched.length,
          missingInBmc: comparison.missingInBmc.length,
          newInBmc: comparison.newInBmc.length,
          mismatches: comparison.mismatches.length
        },
        details: comparison
      });
    } catch (error) {
      console.error("[ComponentsController] compareWithBMC error:", error);
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
      const { 
        mode = 'compare',
        preserveManual = true
      } = req.body;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const bmcAddress = server.bmcAddress || server.ipAddress;
      if (!bmcAddress) {
        return next(ApiError.badRequest("IP адрес сервера не указан"));
      }
      
      const dbComponents = await BeryllServerComponent.findAll({
        where: { serverId: id }
      });
      
      const bmcComponents = await OpenBMCService.getAllComponents(bmcAddress);
      
      if (bmcComponents.length === 0) {
        return next(ApiError.badRequest("Не удалось получить данные с BMC. Проверьте доступность."));
      }
      
      const comparison = compareComponents(
        dbComponents.map(c => c.get({ plain: true })), 
        bmcComponents
      );
      
      const hasDiscrepancies = comparison.missingInBmc.length > 0 || 
                               comparison.newInBmc.length > 0 || 
                               comparison.mismatches.length > 0;
      
      if (mode === 'compare') {
        return res.json({
          success: true,
          mode: 'compare',
          hasDiscrepancies,
          summary: {
            total: {
              inDb: dbComponents.length,
              inBmc: bmcComponents.length
            },
            matched: comparison.matched.length,
            missingInBmc: comparison.missingInBmc.length,
            newInBmc: comparison.newInBmc.length,
            mismatches: comparison.mismatches.length
          },
          details: comparison,
          message: hasDiscrepancies 
            ? 'Обнаружены расхождения. Выберите режим: force (перезаписать всё) или merge (слить данные)' 
            : 'Расхождений не обнаружено'
        });
      }
      
      if (mode === 'force') {
        const manualComponents = preserveManual 
          ? dbComponents.filter(c => c.dataSource === 'MANUAL' || c.dataSource === 'REPLACEMENT')
          : [];
        
        if (preserveManual && manualComponents.length > 0) {
          const manualIds = manualComponents.map(c => c.id);
          await BeryllServerComponent.destroy({ 
            where: { 
              serverId: id,
              id: { [Op.notIn]: manualIds }
            } 
          });
        } else {
          await BeryllServerComponent.destroy({ where: { serverId: id } });
        }
        
        const savedComponents = [];
        for (const comp of bmcComponents) {
          const name = generateComponentName(comp);
          
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
        
        await server.update({ lastComponentsFetchAt: new Date() });
        
        await BeryllHistory.create({
          serverId: id,
          serverIp: server.ipAddress,
          serverHostname: server.hostname,
          userId,
          action: "COMPONENTS_FETCHED",
          comment: `Выгружено ${savedComponents.length} комплектующих с BMC (режим: force)`,
          metadata: {
            mode: 'force',
            preserveManual,
            manualPreserved: manualComponents.length,
            componentsCount: savedComponents.length,
            discrepancies: {
              missingInBmc: comparison.missingInBmc.length,
              newInBmc: comparison.newInBmc.length,
              mismatches: comparison.mismatches.length
            }
          }
        });
        
        return res.json({
          success: true,
          mode: 'force',
          message: `Выгружено ${savedComponents.length} комплектующих`,
          manualPreserved: manualComponents.length,
          components: savedComponents
        });
      }
      
      if (mode === 'merge') {
        const actions = {
          updated: [],
          added: [],
          preserved: [],
          flaggedForReview: []
        };
        
        for (const mismatch of comparison.mismatches) {
          const dbComp = dbComponents.find(c => c.id === mismatch.dbComponent.id);
          if (dbComp) {
            const updateData = {};
            for (const diff of mismatch.differences) {
              updateData[diff.field] = diff.bmc;
            }
            updateData.lastUpdatedAt = new Date();
            updateData.dataSource = 'REDFISH';
            
            await dbComp.update(updateData);
            actions.updated.push({
              id: dbComp.id,
              serialNumber: dbComp.serialNumber,
              changes: mismatch.differences
            });
          }
        }
        
        for (const newComp of comparison.newInBmc) {
          const comp = newComp.bmcComponent;
          const name = generateComponentName(comp);
          
          const metadata = {
            cores: comp.cores,
            threads: comp.threads,
            architecture: comp.architecture,
            memoryType: comp.memoryType,
            health: comp.health,
            fetchedById: userId
          };
          
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
          actions.added.push(saved);
        }
        
        for (const missing of comparison.missingInBmc) {
          const dbComp = dbComponents.find(c => c.id === missing.dbComponent.id);
          if (dbComp) {
            if (missing.isManual) {
              await dbComp.update({ 
                bmcDiscrepancy: true,
                bmcDiscrepancyReason: 'NOT_FOUND_IN_BMC',
                lastUpdatedAt: new Date()
              });
              actions.flaggedForReview.push({
                id: dbComp.id,
                serialNumber: dbComp.serialNumber,
                reason: missing.reason
              });
            } else {
              await dbComp.update({ 
                bmcDiscrepancy: true,
                bmcDiscrepancyReason: 'REMOVED_FROM_BMC',
                lastUpdatedAt: new Date()
              });
              actions.flaggedForReview.push({
                id: dbComp.id,
                serialNumber: dbComp.serialNumber,
                reason: 'Компонент не найден в BMC - возможно удалён'
              });
            }
          }
        }
        
        await server.update({ lastComponentsFetchAt: new Date() });
        
        await BeryllHistory.create({
          serverId: id,
          serverIp: server.ipAddress,
          serverHostname: server.hostname,
          userId,
          action: "COMPONENTS_MERGED",
          comment: `Слияние: обновлено ${actions.updated.length}, добавлено ${actions.added.length}, помечено ${actions.flaggedForReview.length}`,
          metadata: {
            mode: 'merge',
            updated: actions.updated.length,
            added: actions.added.length,
            flaggedForReview: actions.flaggedForReview.length
          }
        });
        
        return res.json({
          success: true,
          mode: 'merge',
          message: 'Слияние завершено',
          actions
        });
      }
      
      return next(ApiError.badRequest("Неизвестный режим. Используйте: compare, force, merge"));
      
    } catch (error) {
      console.error("[ComponentsController] fetchComponents error:", error);
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
      
      res.json({
        server: {
          id: server.id,
          ipAddress: server.ipAddress,
          hostname: server.hostname,
          apkSerialNumber: server.apkSerialNumber,
          lastComponentsFetchAt: server.lastComponentsFetchAt
        },
        components,
        discrepancyCount: components.filter(c => c.bmcDiscrepancy).length
      });
    } catch (error) {
      console.error("[ComponentsController] getComponents error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Получить компонент по ID
   * GET /api/beryll/components/:id
   */
  async getComponentById(req, res, next) {
    try {
      const { id } = req.params;
      
      const component = await BeryllServerComponent.findByPk(id, {
        include: [
          { 
            model: BeryllServer, 
            as: "server", 
            attributes: ["id", "ipAddress", "apkSerialNumber", "hostname"] 
          }
        ]
      });
      
      if (!component) {
        return next(ApiError.notFound("Компонент не найден"));
      }
      
      res.json(component);
    } catch (error) {
      console.error("[ComponentsController] getComponentById error:", error);
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
      const userId = req.user?.id;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const deleted = await BeryllServerComponent.destroy({ where: { serverId: id } });
      
      await BeryllServer.update(
        { lastComponentsFetchAt: null },
        { where: { id } }
      );
      
      // Записываем в историю
      if (deleted > 0) {
        await BeryllHistory.create({
          serverId: id,
          serverIp: server.ipAddress,
          serverHostname: server.hostname,
          userId,
          action: "COMPONENTS_DELETED",
          comment: `Удалено ${deleted} компонентов`,
          metadata: { deletedCount: deleted }
        });
      }
      
      res.json({
        success: true,
        message: `Удалено ${deleted} компонентов`
      });
    } catch (error) {
      console.error("[ComponentsController] deleteComponents error:", error);
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
      const userId = req.user?.id;
      
      const server = await BeryllServer.findByPk(id);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }
      
      const oldAddress = server.bmcAddress;
      await server.update({ bmcAddress });
      
      // Записываем в историю
      await BeryllHistory.create({
        serverId: id,
        serverIp: server.ipAddress,
        serverHostname: server.hostname,
        userId,
        action: "BMC_ADDRESS_UPDATED",
        comment: `BMC адрес изменён: ${oldAddress || 'не задан'} → ${bmcAddress || 'очищен'}`,
        metadata: { oldAddress, newAddress: bmcAddress }
      });
      
      res.json({
        success: true,
        bmcAddress: server.bmcAddress
      });
    } catch (error) {
      console.error("[ComponentsController] updateBMCAddress error:", error);
      next(ApiError.internal(error.message));
    }
  }

  /**
   * Сбросить флаг расхождения с BMC
   * PUT /api/beryll/servers/:serverId/components/:componentId/resolve-discrepancy
   */
  async resolveDiscrepancy(req, res, next) {
    try {
      const { serverId, componentId } = req.params;
      const { resolution } = req.body;
      const userId = req.user?.id;
      
      const component = await BeryllServerComponent.findOne({
        where: { id: componentId, serverId }
      });
      
      if (!component) {
        return next(ApiError.notFound("Компонент не найден"));
      }
      
      if (resolution === 'delete') {
        await component.destroy();
        
        await BeryllHistory.create({
          serverId,
          userId,
          action: "COMPONENT_DELETED",
          comment: `Компонент ${component.serialNumber || component.name} удалён при разрешении расхождения`,
          metadata: { componentId, serialNumber: component.serialNumber }
        });
        
        return res.json({ success: true, action: 'deleted' });
      }
      
      await component.update({
        bmcDiscrepancy: false,
        bmcDiscrepancyReason: null,
        lastUpdatedAt: new Date()
      });
      
      await BeryllHistory.create({
        serverId,
        userId,
        action: "DISCREPANCY_RESOLVED",
        comment: `Расхождение для ${component.serialNumber || component.name} разрешено (оставлен)`,
        metadata: { componentId, serialNumber: component.serialNumber }
      });
      
      return res.json({ success: true, action: 'kept', component });
      
    } catch (error) {
      console.error("[ComponentsController] resolveDiscrepancy error:", error);
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ComponentsController();