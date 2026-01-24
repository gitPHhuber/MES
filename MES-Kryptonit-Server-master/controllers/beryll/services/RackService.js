/**
 * RackService.js
 * 
 * Сервис для работы со стойками и размещением серверов
 * 
 * Положить в: controllers/beryll/services/RackService.js
 */

const { Op } = require("sequelize");
// Импортируем всё из models/index.js (после интеграции там будут все модели)
const {
  BeryllRack,
  BeryllRackUnit,
  BeryllExtendedHistory,
  RACK_STATUSES,
  BeryllServer,
  User
} = require("../../../models/index");

class RackService {
  
  // =============================================
  // СТОЙКИ
  // =============================================
  
  /**
   * Получить все стойки
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
          { model: BeryllServer, as: "server", attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"] }
        ],
        order: [["unitNumber", "ASC"]]
      });
    }
    
    const racks = await BeryllRack.findAll({
      where,
      include,
      order: [["name", "ASC"]]
    });
    
    // Добавляем статистику по заполненности
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
      
      return {
        ...rackData,
        filledUnits,
        totalUnitsCount: totalUnits,
        occupancyPercent: totalUnits > 0 ? Math.round((filledUnits / totalUnits) * 100) : 0
      };
    }));
    
    return result;
  }
  
  /**
   * Получить стойку по ID
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
              attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status", "macAddress"] 
            },
            {
              model: User,
              as: "installedBy",
              attributes: ["id", "login", "name", "surname"]
            }
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
   * Получить юнит по ID
   */
  async getUnitById(unitId) {
    return BeryllRackUnit.findByPk(unitId, {
      include: [
        { model: BeryllRack, as: "rack" },
        { model: BeryllServer, as: "server" },
        { model: User, as: "installedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  /**
   * Установить сервер в юнит
   */
  async installServer(rackId, unitNumber, serverId, data, userId) {
    const unit = await BeryllRackUnit.findOne({
      where: { rackId, unitNumber }
    });
    
    if (!unit) throw new Error("Юнит не найден");
    
    if (unit.serverId) {
      throw new Error(`Юнит ${unitNumber} уже занят`);
    }
    
    // Проверяем, что сервер не установлен в другую стойку
    const existingInstallation = await BeryllRackUnit.findOne({
      where: { serverId }
    });
    
    if (existingInstallation) {
      throw new Error(`Сервер уже установлен в стойку (Rack ID: ${existingInstallation.rackId}, Unit: ${existingInstallation.unitNumber})`);
    }
    
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
      installedById: userId
    });
    
    await this.logHistory("RACK", rackId, "SERVER_INSTALLED", userId, 
      `Сервер ${serverId} установлен в юнит ${unitNumber}`, 
      { serverId, unitNumber }
    );
    
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
      installedById: null
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
      installedAt: new Date(),
      installedById: userId
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
      installedById: null
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
        { model: BeryllRack, as: "rack" }
      ]
    });
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
