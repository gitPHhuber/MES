/**
 * ComponentModels.js - Модели для учёта компонентов
 * 
 * Включает:
 * - ComponentCatalog - справочник типов компонентов
 * - ComponentInventory - пул запасных компонентов
 * - ComponentHistory - история перемещений
 */

const sequelize = require("../../db");
const { DataTypes, Op } = require("sequelize");

// ============================================
// КОНСТАНТЫ
// ============================================

const COMPONENT_TYPES = {
  CPU: "CPU",
  RAM: "RAM",
  HDD: "HDD",
  SSD: "SSD",
  NVME: "NVME",
  MOTHERBOARD: "MOTHERBOARD",
  GPU: "GPU",
  NIC: "NIC",
  RAID: "RAID",
  PSU: "PSU",
  FAN: "FAN",
  BMC: "BMC",
  BACKPLANE: "BACKPLANE",
  CABLE: "CABLE",
  CHASSIS: "CHASSIS",
  OTHER: "OTHER"
};

const INVENTORY_STATUSES = {
  AVAILABLE: "AVAILABLE",
  RESERVED: "RESERVED",
  IN_USE: "IN_USE",
  IN_REPAIR: "IN_REPAIR",
  DEFECTIVE: "DEFECTIVE",
  SCRAPPED: "SCRAPPED",
  RETURNED: "RETURNED"
};

const COMPONENT_CONDITIONS = {
  NEW: "NEW",
  REFURBISHED: "REFURBISHED",
  USED: "USED",
  DAMAGED: "DAMAGED"
};

const HISTORY_ACTIONS = {
  RECEIVED: "RECEIVED",
  INSTALLED: "INSTALLED",
  REMOVED: "REMOVED",
  REPLACED: "REPLACED",
  SENT_TO_YADRO: "SENT_TO_YADRO",
  RETURNED_FROM_YADRO: "RETURNED_FROM_YADRO",
  TESTED: "TESTED",
  RESERVED: "RESERVED",
  RELEASED: "RELEASED",
  SCRAPPED: "SCRAPPED",
  TRANSFERRED: "TRANSFERRED"
};

// ============================================
// МОДЕЛЬ: Справочник компонентов
// ============================================

const ComponentCatalog = sequelize.define("ComponentCatalog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  type: {
    type: DataTypes.ENUM(...Object.values(COMPONENT_TYPES)),
    allowNull: false
  },
  manufacturer: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(150),
    allowNull: false
  },
  revision: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  partNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  specifications: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  serialNumberPattern: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "component_catalog",
  timestamps: true,
  indexes: [
    { fields: ["type"] },
    { fields: ["manufacturer"] },
    { fields: ["model"] },
    { unique: true, fields: ["type", "manufacturer", "model"], name: "component_catalog_unique" }
  ]
});

// Статические методы
ComponentCatalog.findOrCreateByModel = async function(type, manufacturer, model, revision = null) {
  const [catalog, created] = await this.findOrCreate({
    where: { 
      type, 
      manufacturer: manufacturer || null, 
      model 
    },
    defaults: { 
      revision, 
      isActive: true 
    }
  });
  return catalog;
};

ComponentCatalog.getByType = async function(type) {
  return this.findAll({
    where: { type, isActive: true },
    order: [["manufacturer", "ASC"], ["model", "ASC"]]
  });
};

// ============================================
// МОДЕЛЬ: Инвентарь компонентов
// ============================================

const ComponentInventory = sequelize.define("ComponentInventory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  catalogId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "component_catalog", key: "id" }
  },
  type: {
    type: DataTypes.ENUM(...Object.values(COMPONENT_TYPES)),
    allowNull: false
  },
  serialNumber: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  serialNumberYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  manufacturer: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  model: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(INVENTORY_STATUSES)),
    allowNull: false,
    defaultValue: INVENTORY_STATUSES.AVAILABLE
  },
  condition: {
    type: DataTypes.ENUM(...Object.values(COMPONENT_CONDITIONS)),
    defaultValue: COMPONENT_CONDITIONS.NEW
  },
  location: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  currentServerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  reservedForDefectId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  purchaseDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  warrantyExpires: {
    type: DataTypes.DATE,
    allowNull: true
  },
  lastTestedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "component_inventory",
  timestamps: true,
  indexes: [
    { fields: ["type"] },
    { fields: ["status"] },
    { fields: ["serialNumber"] },
    { fields: ["serialNumberYadro"] },
    { fields: ["currentServerId"] }
  ]
});

// Методы экземпляра
ComponentInventory.prototype.reserve = async function(defectId, userId) {
  if (this.status !== INVENTORY_STATUSES.AVAILABLE) {
    throw new Error(`Компонент ${this.serialNumber} недоступен для резервирования (статус: ${this.status})`);
  }
  
  this.status = INVENTORY_STATUSES.RESERVED;
  this.reservedForDefectId = defectId;
  await this.save();
  
  // Логируем
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.RESERVED,
    relatedDefectId: defectId,
    performedById: userId,
    notes: `Зарезервирован для дефекта #${defectId}`
  });
  
  return this;
};

ComponentInventory.prototype.release = async function(userId, notes = null) {
  this.status = INVENTORY_STATUSES.AVAILABLE;
  this.reservedForDefectId = null;
  await this.save();
  
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.RELEASED,
    performedById: userId,
    notes: notes || "Резервирование снято"
  });
  
  return this;
};

ComponentInventory.prototype.installToServer = async function(serverId, userId, defectId = null) {
  const prevStatus = this.status;
  
  this.status = INVENTORY_STATUSES.IN_USE;
  this.currentServerId = serverId;
  this.reservedForDefectId = null;
  await this.save();
  
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.INSTALLED,
    toServerId: serverId,
    relatedDefectId: defectId,
    performedById: userId,
    notes: `Установлен в сервер ID=${serverId}`
  });
  
  return this;
};

ComponentInventory.prototype.removeFromServer = async function(userId, reason = null, defectId = null) {
  const fromServerId = this.currentServerId;
  
  this.status = reason === "defect" ? INVENTORY_STATUSES.DEFECTIVE : INVENTORY_STATUSES.AVAILABLE;
  this.currentServerId = null;
  await this.save();
  
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.REMOVED,
    fromServerId,
    relatedDefectId: defectId,
    performedById: userId,
    notes: reason || "Извлечён из сервера"
  });
  
  return this;
};

ComponentInventory.prototype.sendToYadro = async function(ticketNumber, userId) {
  this.status = INVENTORY_STATUSES.IN_REPAIR;
  this.metadata = {
    ...this.metadata,
    yadroTicket: ticketNumber,
    sentToYadroAt: new Date().toISOString()
  };
  await this.save();
  
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.SENT_TO_YADRO,
    yadroTicketNumber: ticketNumber,
    performedById: userId,
    notes: `Отправлен на ремонт в Ядро. Заявка: ${ticketNumber}`
  });
  
  return this;
};

ComponentInventory.prototype.returnFromYadro = async function(userId, condition = COMPONENT_CONDITIONS.REFURBISHED) {
  this.status = INVENTORY_STATUSES.RETURNED;
  this.condition = condition;
  this.metadata = {
    ...this.metadata,
    returnedFromYadroAt: new Date().toISOString()
  };
  await this.save();
  
  await ComponentHistory.create({
    inventoryComponentId: this.id,
    action: HISTORY_ACTIONS.RETURNED_FROM_YADRO,
    performedById: userId,
    notes: `Возвращён из Ядро. Состояние: ${condition}`
  });
  
  return this;
};

// Статические методы
ComponentInventory.findAvailable = async function(type, count = 1) {
  return this.findAll({
    where: {
      type,
      status: INVENTORY_STATUSES.AVAILABLE
    },
    order: [
      ["condition", "ASC"], // NEW first
      ["createdAt", "ASC"]
    ],
    limit: count
  });
};

ComponentInventory.findBySerial = async function(serial) {
  return this.findOne({
    where: {
      [Op.or]: [
        { serialNumber: serial },
        { serialNumberYadro: serial }
      ]
    }
  });
};

ComponentInventory.getStats = async function() {
  const stats = await this.findAll({
    attributes: [
      "type",
      "status",
      [sequelize.fn("COUNT", sequelize.col("id")), "count"]
    ],
    group: ["type", "status"],
    raw: true
  });
  
  const result = {};
  for (const row of stats) {
    if (!result[row.type]) {
      result[row.type] = { total: 0 };
    }
    result[row.type][row.status] = parseInt(row.count);
    result[row.type].total += parseInt(row.count);
  }
  
  return result;
};

// ============================================
// МОДЕЛЬ: История компонентов
// ============================================

const ComponentHistory = sequelize.define("ComponentHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverComponentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  inventoryComponentId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM(...Object.values(HISTORY_ACTIONS)),
    allowNull: false
  },
  fromServerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  toServerId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  fromLocation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  toLocation: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  relatedDefectId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  yadroTicketNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  performedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  performedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  metadata: {
    type: DataTypes.JSONB,
    defaultValue: {}
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "component_history",
  timestamps: true,
  updatedAt: false,
  indexes: [
    { fields: ["serverComponentId"] },
    { fields: ["inventoryComponentId"] },
    { fields: ["action"] },
    { fields: ["relatedDefectId"] },
    { fields: ["performedAt"] }
  ]
});

// Статические методы
ComponentHistory.getComponentHistory = async function(componentId, isInventory = false) {
  const where = isInventory 
    ? { inventoryComponentId: componentId }
    : { serverComponentId: componentId };
    
  return this.findAll({
    where,
    order: [["performedAt", "DESC"]],
    include: [
      { model: require("./General").User, as: "performedBy", attributes: ["id", "name", "surname"] }
    ]
  });
};

ComponentHistory.getServerComponentChanges = async function(serverId, dateFrom = null) {
  const where = {
    [Op.or]: [
      { fromServerId: serverId },
      { toServerId: serverId }
    ]
  };
  
  if (dateFrom) {
    where.performedAt = { [Op.gte]: dateFrom };
  }
  
  return this.findAll({
    where,
    order: [["performedAt", "DESC"]]
  });
};

// ============================================
// СВЯЗИ
// ============================================

function setupComponentAssociations(models) {
  const { User, BeryllServer, BeryllDefectRecord, BeryllServerComponent } = models;
  
  // ComponentCatalog
  ComponentCatalog.hasMany(ComponentInventory, { foreignKey: "catalogId", as: "inventoryItems" });
  ComponentInventory.belongsTo(ComponentCatalog, { foreignKey: "catalogId", as: "catalog" });
  
  // ComponentInventory
  ComponentInventory.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });
  ComponentInventory.belongsTo(BeryllServer, { foreignKey: "currentServerId", as: "currentServer" });
  ComponentInventory.belongsTo(BeryllDefectRecord, { foreignKey: "reservedForDefectId", as: "reservedForDefect" });
  
  ComponentInventory.hasMany(ComponentHistory, { foreignKey: "inventoryComponentId", as: "history" });
  ComponentHistory.belongsTo(ComponentInventory, { foreignKey: "inventoryComponentId", as: "inventoryComponent" });
  
  // ComponentHistory
  ComponentHistory.belongsTo(User, { foreignKey: "performedById", as: "performedBy" });
  ComponentHistory.belongsTo(BeryllServer, { foreignKey: "fromServerId", as: "fromServer" });
  ComponentHistory.belongsTo(BeryllServer, { foreignKey: "toServerId", as: "toServer" });
  ComponentHistory.belongsTo(BeryllDefectRecord, { foreignKey: "relatedDefectId", as: "relatedDefect" });
  
  // BeryllServerComponent связь с каталогом и инвентарём
  if (BeryllServerComponent) {
    BeryllServerComponent.belongsTo(ComponentCatalog, { foreignKey: "catalogId", as: "catalogEntry" });
    BeryllServerComponent.belongsTo(ComponentInventory, { foreignKey: "inventoryId", as: "inventorySource" });
    BeryllServerComponent.belongsTo(User, { foreignKey: "installedById", as: "installedBy" });
    
    ComponentHistory.belongsTo(BeryllServerComponent, { foreignKey: "serverComponentId", as: "serverComponent" });
    BeryllServerComponent.hasMany(ComponentHistory, { foreignKey: "serverComponentId", as: "history" });
  }
}

module.exports = {
  ComponentCatalog,
  ComponentInventory,
  ComponentHistory,
  setupComponentAssociations,
  COMPONENT_TYPES,
  INVENTORY_STATUSES,
  COMPONENT_CONDITIONS,
  HISTORY_ACTIONS
};
