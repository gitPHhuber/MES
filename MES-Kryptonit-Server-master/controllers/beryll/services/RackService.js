/**
 * RackService.js
 * 
 * Сервис для работы со стойками и размещением серверов
 * 
 * Новые возможности:
 * - Размещение сервера в стойку БЕЗ взятия в работу (placeServerInRack)
 * - Отслеживание кто поставил и кто взял в работу отдельно
 * - Интеграция с DHCP для автоматического определения IP
 * - Фильтрация по статусу сервера
 * 
 * Положить в: controllers/beryll/services/RackService.js
 */

const { Op } = require("sequelize");
const { NodeSSH } = require("node-ssh");

// Импортируем всё из models/index.js
const {
  BeryllRack,
  BeryllRackUnit,
  BeryllExtendedHistory,
  RACK_STATUSES,
  BeryllServer,
  User
} = require("../../../models/index");

const { DHCP_CONFIG } = require("../config/beryll.config");
const { parseDhcpLeases } = require("../utils/dhcpParser");

class RackService {
  
  // =============================================
  // СТОЙКИ
  // =============================================
  
  /**
   * Получить все стойки с расширенной статистикой
   */
  async getAllRacks(options = {}) {
    const { status, search, includeUnits = false } = options;
    
    const where = {};
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { location: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const include = [];
    if (includeUnits) {
      include.push({
        model: BeryllRackUnit,
        as: "units",
        include: [
          { 
            model: BeryllServer, 
            as: "server", 
            attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status", "macAddress", "assignedToId"],
            include: [
              { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }
            ]
          },
          { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] },
          { model: User, as: "placedBy", attributes: ["id", "login", "name", "surname"] }
        ],
        order: [["unitNumber", "ASC"]]
      });
    }
    
    const racks = await BeryllRack.findAll({
      where,
      include,
      order: [["name", "ASC"]]
    });
    
    // Добавляем расширенную статистику
    const result = await Promise.all(racks.map(async (rack) => {
      const rackData = rack.toJSON();
      
      const filledUnits = await BeryllRackUnit.count({
        where: { 
          rackId: rack.id,
          serverId: { [Op.ne]: null }
        }
      });
      
      const totalUnits = await BeryllRackUnit.count({
        where: { rackId: rack.id }
      });
      
      // Считаем серверы в работе
      const unitsInWork = await BeryllRackUnit.count({
        where: { rackId: rack.id },
        include: [{
          model: BeryllServer,
          as: "server",
          where: { status: "IN_WORK" },
          required: true
        }]
      });
      
      // Считаем серверы с браком
      const unitsWithDefect = await BeryllRackUnit.count({
        where: { rackId: rack.id },
        include: [{
          model: BeryllServer,
          as: "server",
          where: { status: "DEFECT" },
          required: true
        }]
      });
      
      return {
        ...rackData,
        filledUnits,
        totalUnitsCount: totalUnits,
        unitsInWork,
        unitsWithDefect,
        occupancyPercent: totalUnits > 0 ? Math.round((filledUnits / totalUnits) * 100) : 0
      };
    }));
    
    return result;
  }
  
  /**
   * Получить стойку по ID с полной информацией
   */
  async getRackById(id) {
    const rack = await BeryllRack.findByPk(id, {
      include: [
        {
          model: BeryllRackUnit,
          as: "units",
          include: [
            { 
              model: BeryllServer, 
              as: "server", 
              attributes: [
                "id", "ipAddress", "apkSerialNumber", "hostname", "status", 
                "macAddress", "assignedToId", "assignedAt", "leaseActive",
                "serialNumber", "notes"
              ],
              include: [
                { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }
              ]
            },
            { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] },
            { model: User, as: "placedBy", attributes: ["id", "login", "name", "surname"] }
          ],
          order: [["unitNumber", "ASC"]]
        }
      ]
    });
    
    return rack;
  }
  
  /**
   * Создать стойку
   */
  async createRack(data, userId) {
    const rack = await BeryllRack.create({
      name: data.name,
      location: data.location,
      totalUnits: data.totalUnits || 42,
      networkSubnet: data.networkSubnet,
      gateway: data.gateway,
      status: data.status || RACK_STATUSES.ACTIVE,
      notes: data.notes,
      metadata: data.metadata || {}
    });
    
    // Создаём пустые юниты
    const units = [];
    for (let i = 1; i <= rack.totalUnits; i++) {
      units.push({
        rackId: rack.id,
        unitNumber: i,
        serverId: null
      });
    }
    await BeryllRackUnit.bulkCreate(units);
    
    // Логируем
    await this.logHistory("RACK", rack.id, "CREATED", userId, `Создана стойка ${rack.name}`);
    
    return this.getRackById(rack.id);
  }
  
  /**
   * Обновить стойку
   */
  async updateRack(id, data, userId) {
    const rack = await BeryllRack.findByPk(id);
    if (!rack) throw new Error("Стойка не найдена");
    
    const oldData = rack.toJSON();
    
    await rack.update({
      name: data.name !== undefined ? data.name : rack.name,
      location: data.location !== undefined ? data.location : rack.location,
      networkSubnet: data.networkSubnet !== undefined ? data.networkSubnet : rack.networkSubnet,
      gateway: data.gateway !== undefined ? data.gateway : rack.gateway,
      status: data.status !== undefined ? data.status : rack.status,
      notes: data.notes !== undefined ? data.notes : rack.notes,
      metadata: data.metadata !== undefined ? data.metadata : rack.metadata
    });
    
    // Логируем изменения
    const changes = {};
    Object.keys(data).forEach(key => {
      if (oldData[key] !== data[key]) {
        changes[key] = { from: oldData[key], to: data[key] };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      await this.logHistory("RACK", id, "UPDATED", userId, `Обновлена стойка ${rack.name}`, changes);
    }
    
    return this.getRackById(id);
  }
  
  /**
   * Удалить стойку
   */
  async deleteRack(id, userId) {
    const rack = await BeryllRack.findByPk(id);
    if (!rack) throw new Error("Стойка не найдена");
    
    // Проверяем, есть ли серверы в стойке
    const serversInRack = await BeryllRackUnit.count({
      where: { 
        rackId: id,
        serverId: { [Op.ne]: null }
      }
    });
    
    if (serversInRack > 0) {
      throw new Error(`В стойке находится ${serversInRack} серверов. Сначала извлеките их.`);
    }
    
    await this.logHistory("RACK", id, "DELETED", userId, `Удалена стойка ${rack.name}`);
    
    await rack.destroy();
    
    return { success: true, message: "Стойка удалена" };
  }
  
  // =============================================
  // ЮНИТЫ (ПОЗИЦИИ В СТОЙКЕ)
  // =============================================
  
  /**
   * Получить юнит по ID с полной информацией
   */
  async getUnitById(unitId) {
    return BeryllRackUnit.findByPk(unitId, {
      include: [
        { model: BeryllRack, as: "rack" },
        { 
          model: BeryllServer, 
          as: "server",
          include: [
            { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }
          ]
        },
        { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "placedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  /**
   * Получить юнит по номеру в стойке
   */
  async getUnitByNumber(rackId, unitNumber) {
    return BeryllRackUnit.findOne({
      where: { rackId, unitNumber },
      include: [
        { model: BeryllRack, as: "rack" },
        { 
          model: BeryllServer, 
          as: "server",
          include: [
            { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }
          ]
        },
        { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "placedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  /**
   * НОВЫЙ МЕТОД: Разместить сервер в стойку БЕЗ взятия в работу
   * Просто физическое размещение сервера
   */
  async placeServerInRack(rackId, unitNumber, serverId, userId) {
    const unit = await BeryllRackUnit.findOne({
      where: { rackId, unitNumber }
    });
    
    if (!unit) throw new Error("Юнит не найден");
    if (unit.serverId) throw new Error(`Юнит ${unitNumber} уже занят`);
    
    // Проверяем что сервер не установлен в другую стойку
    const existingInstallation = await BeryllRackUnit.findOne({
      where: { serverId }
    });
    
    if (existingInstallation) {
      throw new Error(`Сервер уже установлен в стойку (Rack ID: ${existingInstallation.rackId}, Unit: ${existingInstallation.unitNumber})`);
    }
    
    // Размещаем сервер (только физически, без взятия в работу)
    await unit.update({
      serverId,
      placedById: userId,
      placedAt: new Date()
      // НЕ устанавливаем installedById и installedAt - это будет при взятии в работу
    });
    
    await this.logHistory("RACK", rackId, "SERVER_PLACED", userId, 
      `Сервер ${serverId} размещён в юнит ${unitNumber} (без взятия в работу)`, 
      { serverId, unitNumber, action: "PLACED" }
    );
    
    return this.getUnitById(unit.id);
  }
  
  /**
   * Установить сервер в юнит И взять в работу
   */
  async installServer(rackId, unitNumber, serverId, data, userId) {
    const unit = await BeryllRackUnit.findOne({
      where: { rackId, unitNumber }
    });
    
    if (!unit) throw new Error("Юнит не найден");
    
    // Если юнит занят другим сервером
    if (unit.serverId && unit.serverId !== serverId) {
      throw new Error(`Юнит ${unitNumber} уже занят`);
    }
    
    // Проверяем что сервер не установлен в другую стойку
    if (!unit.serverId) {
      const existingInstallation = await BeryllRackUnit.findOne({
        where: { serverId }
      });
      
      if (existingInstallation) {
        throw new Error(`Сервер уже установлен в стойку (Rack ID: ${existingInstallation.rackId}, Unit: ${existingInstallation.unitNumber})`);
      }
    }
    
    const wasAlreadyPlaced = unit.serverId === serverId;
    
    await unit.update({
      serverId,
      hostname: data.hostname,
      mgmtMacAddress: data.mgmtMacAddress,
      mgmtIpAddress: data.mgmtIpAddress,
      dataMacAddress: data.dataMacAddress,
      dataIpAddress: data.dataIpAddress,
      accessLogin: data.accessLogin,
      accessPassword: data.accessPassword,
      notes: data.notes,
      installedAt: new Date(),
      installedById: userId,
      // Если сервер ещё не был размещён, сохраняем кто его поставил
      placedById: unit.placedById || userId,
      placedAt: unit.placedAt || new Date()
    });
    
    const action = wasAlreadyPlaced ? "SERVER_TAKEN_TO_WORK" : "SERVER_INSTALLED";
    const comment = wasAlreadyPlaced 
      ? `Сервер ${serverId} взят в работу в юните ${unitNumber}`
      : `Сервер ${serverId} установлен в юнит ${unitNumber}`;
    
    await this.logHistory("RACK", rackId, action, userId, comment, { serverId, unitNumber });
    
    return this.getUnitById(unit.id);
  }
  
  /**
   * Извлечь сервер из юнита
   */
  async removeServer(rackId, unitNumber, userId) {
    const unit = await BeryllRackUnit.findOne({
      where: { rackId, unitNumber }
    });
    
    if (!unit) throw new Error("Юнит не найден");
    if (!unit.serverId) throw new Error("Юнит пуст");
    
    const oldServerId = unit.serverId;
    
    await unit.update({
      serverId: null,
      hostname: null,
      mgmtMacAddress: null,
      mgmtIpAddress: null,
      dataMacAddress: null,
      dataIpAddress: null,
      accessLogin: null,
      accessPassword: null,
      installedAt: null,
      installedById: null,
      placedById: null,
      placedAt: null,
      dhcpIpAddress: null,
      dhcpMacAddress: null,
      dhcpHostname: null,
      dhcpLeaseActive: false,
      dhcpLastSync: null
    });
    
    await this.logHistory("RACK", rackId, "SERVER_REMOVED", userId, 
      `Сервер ${oldServerId} извлечён из юнита ${unitNumber}`, 
      { serverId: oldServerId, unitNumber }
    );
    
    return { success: true, message: "Сервер извлечён" };
  }
  
  /**
   * Обновить данные юнита
   */
  async updateUnit(unitId, data, userId) {
    const unit = await BeryllRackUnit.findByPk(unitId);
    if (!unit) throw new Error("Юнит не найден");
    
    await unit.update({
      hostname: data.hostname !== undefined ? data.hostname : unit.hostname,
      mgmtMacAddress: data.mgmtMacAddress !== undefined ? data.mgmtMacAddress : unit.mgmtMacAddress,
      mgmtIpAddress: data.mgmtIpAddress !== undefined ? data.mgmtIpAddress : unit.mgmtIpAddress,
      dataMacAddress: data.dataMacAddress !== undefined ? data.dataMacAddress : unit.dataMacAddress,
      dataIpAddress: data.dataIpAddress !== undefined ? data.dataIpAddress : unit.dataIpAddress,
      accessLogin: data.accessLogin !== undefined ? data.accessLogin : unit.accessLogin,
      accessPassword: data.accessPassword !== undefined ? data.accessPassword : unit.accessPassword,
      notes: data.notes !== undefined ? data.notes : unit.notes
    });
    
    await this.logHistory("RACK", unit.rackId, "UNIT_UPDATED", userId, 
      `Обновлён юнит ${unit.unitNumber}`
    );
    
    return this.getUnitById(unitId);
  }
  
  /**
   * Переместить сервер между юнитами
   */
  async moveServer(fromRackId, fromUnit, toRackId, toUnit, userId) {
    const sourceUnit = await BeryllRackUnit.findOne({
      where: { rackId: fromRackId, unitNumber: fromUnit }
    });
    
    if (!sourceUnit || !sourceUnit.serverId) {
      throw new Error("Исходный юнит пуст или не найден");
    }
    
    const targetUnit = await BeryllRackUnit.findOne({
      where: { rackId: toRackId, unitNumber: toUnit }
    });
    
    if (!targetUnit) throw new Error("Целевой юнит не найден");
    if (targetUnit.serverId) throw new Error("Целевой юнит занят");
    
    // Копируем данные
    const serverData = {
      serverId: sourceUnit.serverId,
      hostname: sourceUnit.hostname,
      mgmtMacAddress: sourceUnit.mgmtMacAddress,
      mgmtIpAddress: sourceUnit.mgmtIpAddress,
      dataMacAddress: sourceUnit.dataMacAddress,
      dataIpAddress: sourceUnit.dataIpAddress,
      accessLogin: sourceUnit.accessLogin,
      accessPassword: sourceUnit.accessPassword,
      notes: sourceUnit.notes,
      installedAt: sourceUnit.installedAt,
      installedById: sourceUnit.installedById,
      placedById: sourceUnit.placedById,
      placedAt: sourceUnit.placedAt,
      dhcpIpAddress: sourceUnit.dhcpIpAddress,
      dhcpMacAddress: sourceUnit.dhcpMacAddress,
      dhcpHostname: sourceUnit.dhcpHostname,
      dhcpLeaseActive: sourceUnit.dhcpLeaseActive,
      dhcpLastSync: sourceUnit.dhcpLastSync
    };
    
    // Очищаем исходный юнит
    await sourceUnit.update({
      serverId: null,
      hostname: null,
      mgmtMacAddress: null,
      mgmtIpAddress: null,
      dataMacAddress: null,
      dataIpAddress: null,
      accessLogin: null,
      accessPassword: null,
      installedAt: null,
      installedById: null,
      placedById: null,
      placedAt: null,
      dhcpIpAddress: null,
      dhcpMacAddress: null,
      dhcpHostname: null,
      dhcpLeaseActive: false,
      dhcpLastSync: null
    });
    
    // Заполняем целевой юнит
    await targetUnit.update(serverData);
    
    await this.logHistory("RACK", toRackId, "SERVER_MOVED", userId, 
      `Сервер ${serverData.serverId} перемещён из ${fromRackId}:${fromUnit} в ${toRackId}:${toUnit}`,
      { serverId: serverData.serverId, from: { rackId: fromRackId, unit: fromUnit }, to: { rackId: toRackId, unit: toUnit } }
    );
    
    return this.getUnitById(targetUnit.id);
  }
  
  /**
   * Найти свободные юниты в стойке
   */
  async getFreeUnits(rackId) {
    return BeryllRackUnit.findAll({
      where: { 
        rackId,
        serverId: null
      },
      order: [["unitNumber", "ASC"]]
    });
  }
  
  /**
   * Найти сервер по стойкам
   */
  async findServerInRacks(serverId) {
    return BeryllRackUnit.findOne({
      where: { serverId },
      include: [
        { model: BeryllRack, as: "rack" },
        { model: User, as: "placedBy", attributes: ["id", "login", "name", "surname"] },
        { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  /**
   * НОВЫЙ МЕТОД: Получить юниты по статусу сервера
   */
  async getUnitsByServerStatus(rackId, status) {
    const where = { rackId };
    
    const serverWhere = status ? { status } : { id: { [Op.ne]: null } };
    
    return BeryllRackUnit.findAll({
      where,
      include: [{
        model: BeryllServer,
        as: "server",
        where: serverWhere,
        required: true,
        include: [
          { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }
        ]
      }, {
        model: User,
        as: "placedBy",
        attributes: ["id", "login", "name", "surname"]
      }, {
        model: User,
        as: "installedBy",
        attributes: ["id", "login", "name", "surname"]
      }],
      order: [["unitNumber", "ASC"]]
    });
  }
  
  /**
   * НОВЫЙ МЕТОД: Получить сводку по стойке
   */
  async getRackSummary(rackId) {
    const rack = await BeryllRack.findByPk(rackId);
    if (!rack) throw new Error("Стойка не найдена");
    
    // Статистика по статусам серверов
    const units = await BeryllRackUnit.findAll({
      where: { 
        rackId,
        serverId: { [Op.ne]: null }
      },
      include: [{
        model: BeryllServer,
        as: "server",
        attributes: ["status"],
        required: true
      }]
    });
    
    const byStatus = {};
    units.forEach(unit => {
      const status = unit.server?.status || "UNKNOWN";
      byStatus[status] = (byStatus[status] || 0) + 1;
    });
    
    // Кто разместил серверы (уникальные пользователи)
    const placedByUnits = await BeryllRackUnit.findAll({
      where: { 
        rackId,
        placedById: { [Op.ne]: null }
      },
      include: [{
        model: User,
        as: "placedBy",
        attributes: ["id", "login", "name", "surname"]
      }],
      attributes: ["placedById"]
    });
    
    // Уникальные пользователи
    const uniquePlacedBy = [];
    const seenIds = new Set();
    placedByUnits.forEach(unit => {
      if (unit.placedBy && !seenIds.has(unit.placedBy.id)) {
        seenIds.add(unit.placedBy.id);
        uniquePlacedBy.push(unit.placedBy);
      }
    });
    
    // Серверы в работе
    const serversInWork = byStatus["IN_WORK"] || 0;
    
    return {
      rackId,
      rackName: rack.name,
      totalUnits: rack.totalUnits,
      filledUnits: units.length,
      byStatus,
      placedByUsers: uniquePlacedBy,
      serversInWork,
      serversWithDefect: byStatus["DEFECT"] || 0
    };
  }
  
  // =============================================
  // DHCP ИНТЕГРАЦИЯ
  // =============================================
  
  /**
   * НОВЫЙ МЕТОД: Синхронизировать IP-адреса с DHCP для стойки
   */
  async syncRackWithDhcp(rackId, userId) {
    const rack = await BeryllRack.findByPk(rackId, {
      include: [{
        model: BeryllRackUnit,
        as: "units",
        where: { serverId: { [Op.ne]: null } },
        required: false,
        include: [{ model: BeryllServer, as: "server" }]
      }]
    });
    
    if (!rack) throw new Error("Стойка не найдена");
    
    const unitsWithServers = rack.units?.filter(u => u.serverId) || [];
    
    if (unitsWithServers.length === 0) {
      return { success: true, message: "Нет серверов для синхронизации", synced: 0, total: 0 };
    }
    
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: DHCP_CONFIG.host,
        username: DHCP_CONFIG.username,
        password: DHCP_CONFIG.password,
        readyTimeout: 10000
      });
      
      const result = await ssh.execCommand(`cat ${DHCP_CONFIG.leaseFile}`);
      
      if (result.stderr && !result.stdout) {
        throw new Error(`SSH Error: ${result.stderr}`);
      }
      
      const leases = parseDhcpLeases(result.stdout);
      const syncTime = new Date();
      let syncedCount = 0;
      
      for (const unit of unitsWithServers) {
        if (!unit.server) continue;
        
        // Ищем lease по MAC адресу сервера или юнита
        const serverMac = unit.server.macAddress?.toUpperCase();
        const unitMac = unit.mgmtMacAddress?.toUpperCase();
        
        const matchingLease = leases.find(lease => {
          const leaseMac = lease.macAddress?.toUpperCase();
          return leaseMac === serverMac || leaseMac === unitMac;
        });
        
        if (matchingLease) {
          await unit.update({
            dhcpIpAddress: matchingLease.ipAddress,
            dhcpMacAddress: matchingLease.macAddress,
            dhcpHostname: matchingLease.hostname,
            dhcpLeaseActive: matchingLease.leaseActive,
            dhcpLastSync: syncTime
          });
          syncedCount++;
        } else {
          // Обновляем время синхронизации даже если lease не найден
          await unit.update({
            dhcpLeaseActive: false,
            dhcpLastSync: syncTime
          });
        }
      }
      
      ssh.dispose();
      
      await this.logHistory("RACK", rackId, "DHCP_SYNC", userId, 
        `Синхронизация с DHCP: обновлено ${syncedCount} серверов`,
        { synced: syncedCount, total: unitsWithServers.length }
      );
      
      return { 
        success: true, 
        message: `Синхронизировано ${syncedCount} из ${unitsWithServers.length} серверов`,
        synced: syncedCount,
        total: unitsWithServers.length
      };
      
    } catch (error) {
      ssh.dispose();
      console.error("[RackService] DHCP Sync Error:", error);
      throw new Error(`Ошибка синхронизации с DHCP: ${error.message}`);
    }
  }
  
  /**
   * НОВЫЙ МЕТОД: Поиск IP по MAC в DHCP
   */
  async findIpByMac(macAddress) {
    if (!macAddress) {
      throw new Error("MAC адрес не указан");
    }
    
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: DHCP_CONFIG.host,
        username: DHCP_CONFIG.username,
        password: DHCP_CONFIG.password,
        readyTimeout: 10000
      });
      
      const result = await ssh.execCommand(`cat ${DHCP_CONFIG.leaseFile}`);
      ssh.dispose();
      
      if (result.stderr && !result.stdout) {
        throw new Error(`SSH Error: ${result.stderr}`);
      }
      
      const leases = parseDhcpLeases(result.stdout);
      const normalizedMac = macAddress.toUpperCase().replace(/-/g, ":");
      
      const matchingLease = leases.find(lease => 
        lease.macAddress?.toUpperCase() === normalizedMac
      );
      
      if (matchingLease) {
        return {
          found: true,
          ipAddress: matchingLease.ipAddress,
          hostname: matchingLease.hostname,
          leaseActive: matchingLease.leaseActive,
          leaseStart: matchingLease.leaseStart,
          leaseEnd: matchingLease.leaseEnd
        };
      }
      
      return { found: false };
      
    } catch (error) {
      ssh.dispose();
      console.error("[RackService] Find IP Error:", error);
      throw new Error(`Ошибка поиска IP: ${error.message}`);
    }
  }
  
  // =============================================
  // ИСТОРИЯ
  // =============================================
  
  async logHistory(entityType, entityId, action, userId, comment, changes = null) {
    return BeryllExtendedHistory.create({
      entityType,
      entityId,
      action,
      userId,
      comment,
      changes
    });
  }
  
  async getHistory(entityType, entityId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return BeryllExtendedHistory.findAndCountAll({
      where: { entityType, entityId },
      include: [
        { model: User, as: "user", attributes: ["id", "login", "name", "surname"] }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });
  }
}

module.exports = new RackService();