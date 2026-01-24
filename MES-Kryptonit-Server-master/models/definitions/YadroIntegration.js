/**
 * YadroIntegration.js - Модели для учёта работы с поставщиком Ядро
 */

const sequelize = require("../../db");
const { DataTypes, Op } = require("sequelize");

// ============================================
// КОНСТАНТЫ
// ============================================

const YADRO_REQUEST_TYPES = {
  COMPONENT_REPAIR: "COMPONENT_REPAIR",
  COMPONENT_EXCHANGE: "COMPONENT_EXCHANGE",
  WARRANTY_CLAIM: "WARRANTY_CLAIM",
  CONSULTATION: "CONSULTATION"
};

const YADRO_LOG_STATUSES = {
  SENT: "SENT",
  IN_PROGRESS: "IN_PROGRESS",
  COMPLETED: "COMPLETED",
  RECEIVED: "RECEIVED",
  CLOSED: "CLOSED"
};

const SUBSTITUTE_STATUSES = {
  AVAILABLE: "AVAILABLE",
  IN_USE: "IN_USE",
  MAINTENANCE: "MAINTENANCE",
  RETIRED: "RETIRED"
};

// ============================================
// МОДЕЛЬ: Журнал учёта заявок Ядро
// ============================================

const YadroTicketLog = sequelize.define("YadroTicketLog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  ticketNumber: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  defectRecordId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  requestType: {
    type: DataTypes.ENUM(...Object.values(YADRO_REQUEST_TYPES)),
    defaultValue: YADRO_REQUEST_TYPES.COMPONENT_REPAIR
  },
  status: {
    type: DataTypes.ENUM(...Object.values(YADRO_LOG_STATUSES)),
    defaultValue: YADRO_LOG_STATUSES.SENT
  },
  componentType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  sentComponentSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sentComponentSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  receivedComponentSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  receivedComponentSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  sentAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  receivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  problemDescription: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  yadroResponse: {
    type: DataTypes.TEXT,
    allowNull: true
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
  tableName: "yadro_ticket_log",
  timestamps: true,
  indexes: [
    { fields: ["ticketNumber"] },
    { fields: ["defectRecordId"] },
    { fields: ["serverId"] },
    { fields: ["status"] },
    { fields: ["sentAt"] }
  ]
});

// Методы экземпляра
YadroTicketLog.prototype.markInProgress = async function() {
  this.status = YADRO_LOG_STATUSES.IN_PROGRESS;
  return this.save();
};

YadroTicketLog.prototype.markCompleted = async function(yadroResponse) {
  this.status = YADRO_LOG_STATUSES.COMPLETED;
  if (yadroResponse) this.yadroResponse = yadroResponse;
  return this.save();
};

YadroTicketLog.prototype.markReceived = async function(receivedSerialYadro, receivedSerialManuf, yadroResponse) {
  this.status = YADRO_LOG_STATUSES.RECEIVED;
  this.receivedAt = new Date();
  if (receivedSerialYadro) this.receivedComponentSerialYadro = receivedSerialYadro;
  if (receivedSerialManuf) this.receivedComponentSerialManuf = receivedSerialManuf;
  if (yadroResponse) this.yadroResponse = yadroResponse;
  return this.save();
};

YadroTicketLog.prototype.close = async function(notes) {
  this.status = YADRO_LOG_STATUSES.CLOSED;
  if (notes) this.notes = (this.notes ? this.notes + "\n" : "") + notes;
  return this.save();
};

YadroTicketLog.prototype.getDaysInYadro = function() {
  if (!this.sentAt) return null;
  const endDate = this.receivedAt || new Date();
  return Math.round((endDate - this.sentAt) / (1000 * 60 * 60 * 24));
};

YadroTicketLog.getOpenRequests = async function() {
  return this.findAll({
    where: {
      status: { [Op.notIn]: [YADRO_LOG_STATUSES.CLOSED] }
    },
    order: [["sentAt", "DESC"]]
  });
};

YadroTicketLog.getByDefect = async function(defectRecordId) {
  return this.findAll({
    where: { defectRecordId },
    order: [["createdAt", "DESC"]]
  });
};

YadroTicketLog.getStats = async function(dateFrom, dateTo) {
  const where = {};
  if (dateFrom || dateTo) {
    where.sentAt = {};
    if (dateFrom) where.sentAt[Op.gte] = dateFrom;
    if (dateTo) where.sentAt[Op.lte] = dateTo;
  }
  
  return this.findAll({
    where,
    attributes: [
      "status",
      "requestType",
      "componentType",
      [sequelize.fn("COUNT", sequelize.col("id")), "count"]
    ],
    group: ["status", "requestType", "componentType"],
    raw: true
  });
};

// ============================================
// МОДЕЛЬ: Пул подменных серверов
// ============================================

const SubstituteServerPool = sequelize.define("SubstituteServerPool", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    unique: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(SUBSTITUTE_STATUSES)),
    defaultValue: SUBSTITUTE_STATUSES.AVAILABLE
  },
  currentDefectId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  issuedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  issuedToUserId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  returnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  usageCount: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "substitute_server_pool",
  timestamps: true,
  indexes: [
    { fields: ["serverId"], unique: true },
    { fields: ["status"] },
    { fields: ["currentDefectId"] }
  ]
});

SubstituteServerPool.prototype.issue = async function(defectId, userId) {
  if (this.status !== SUBSTITUTE_STATUSES.AVAILABLE) {
    throw new Error("Сервер недоступен для выдачи");
  }
  this.status = SUBSTITUTE_STATUSES.IN_USE;
  this.currentDefectId = defectId;
  this.issuedAt = new Date();
  this.issuedToUserId = userId;
  this.usageCount += 1;
  this.returnedAt = null;
  return this.save();
};

SubstituteServerPool.prototype.return = async function() {
  this.status = SUBSTITUTE_STATUSES.AVAILABLE;
  this.currentDefectId = null;
  this.returnedAt = new Date();
  this.issuedToUserId = null;
  return this.save();
};

SubstituteServerPool.prototype.setMaintenance = async function(notes) {
  this.status = SUBSTITUTE_STATUSES.MAINTENANCE;
  if (notes) this.notes = notes;
  return this.save();
};

SubstituteServerPool.getAvailable = async function() {
  return this.findAll({
    where: { status: SUBSTITUTE_STATUSES.AVAILABLE },
    order: [["usageCount", "ASC"]]
  });
};

SubstituteServerPool.findAvailableOne = async function() {
  return this.findOne({
    where: { status: SUBSTITUTE_STATUSES.AVAILABLE },
    order: [["usageCount", "ASC"]]
  });
};

SubstituteServerPool.getStats = async function() {
  const all = await this.findAll();
  return {
    total: all.length,
    available: all.filter(s => s.status === SUBSTITUTE_STATUSES.AVAILABLE).length,
    inUse: all.filter(s => s.status === SUBSTITUTE_STATUSES.IN_USE).length,
    maintenance: all.filter(s => s.status === SUBSTITUTE_STATUSES.MAINTENANCE).length,
    avgUsageCount: all.length > 0 ? all.reduce((sum, s) => sum + s.usageCount, 0) / all.length : 0
  };
};

// ============================================
// МОДЕЛЬ: Конфигурация SLA
// ============================================

const SlaConfig = sequelize.define("SlaConfig", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  defectType: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: true
  },
  maxDiagnosisHours: {
    type: DataTypes.INTEGER,
    defaultValue: 24
  },
  maxRepairHours: {
    type: DataTypes.INTEGER,
    defaultValue: 72
  },
  maxTotalHours: {
    type: DataTypes.INTEGER,
    defaultValue: 168
  },
  escalationAfterHours: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: "sla_config",
  timestamps: true,
  indexes: [
    { fields: ["defectType", "priority"] },
    { fields: ["isActive"] }
  ]
});

SlaConfig.getForDefect = async function(defectType, priority) {
  let config = await this.findOne({
    where: { defectType, priority, isActive: true }
  });
  
  if (!config && defectType) {
    config = await this.findOne({
      where: { defectType, priority: null, isActive: true }
    });
  }
  
  if (!config && priority) {
    config = await this.findOne({
      where: { defectType: null, priority, isActive: true }
    });
  }
  
  if (!config) {
    config = await this.findOne({
      where: { defectType: null, priority: null, isActive: true }
    });
  }
  
  return config;
};

SlaConfig.calculateDeadline = async function(defectType, priority, startDate = new Date()) {
  const config = await this.getForDefect(defectType, priority);
  if (!config) return null;
  
  const deadline = new Date(startDate);
  deadline.setHours(deadline.getHours() + config.maxTotalHours);
  return deadline;
};

// ============================================
// МОДЕЛЬ: Алиасы пользователей
// ============================================

const UserAlias = sequelize.define("UserAlias", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  alias: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  source: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: "user_aliases",
  timestamps: true,
  indexes: [
    { fields: ["alias"] },
    { fields: ["userId"] },
    { fields: ["isActive"] }
  ]
});

UserAlias.findUserByAlias = async function(alias) {
  const normalizedAlias = alias.trim().toLowerCase();
  
  const record = await this.findOne({
    where: {
      isActive: true,
      [Op.or]: [
        sequelize.where(sequelize.fn("LOWER", sequelize.col("alias")), normalizedAlias),
        sequelize.where(
          sequelize.fn("LOWER", sequelize.fn("REPLACE", sequelize.col("alias"), " ", "")),
          normalizedAlias.replace(/\s/g, "")
        )
      ]
    }
  });
  
  if (record) {
    const User = sequelize.models.User;
    if (User) {
      return User.findByPk(record.userId);
    }
  }
  
  return null;
};

UserAlias.generateAliasesFromUser = async function(user) {
  const aliases = [];
  const name = user.name || "";
  const surname = user.surname || "";
  const patronymic = user.patronymic || "";
  
  if (surname && name) {
    aliases.push(`${surname} ${name}`);
    aliases.push(`${surname} ${name[0]}.`);
    
    if (patronymic) {
      aliases.push(`${surname} ${name} ${patronymic}`);
      aliases.push(`${surname} ${name[0]}.${patronymic[0]}.`);
      aliases.push(`${surname} ${name[0]}. ${patronymic[0]}.`);
    }
  }
  
  const created = [];
  for (const alias of aliases) {
    const existing = await this.findOne({
      where: { userId: user.id, alias }
    });
    
    if (!existing) {
      const record = await this.create({
        userId: user.id,
        alias,
        source: "auto_generated",
        isActive: true
      });
      created.push(record);
    }
  }
  
  return created;
};

// ============================================
// МОДЕЛЬ: Связь кластеров со стойками
// ============================================

const BeryllClusterRack = sequelize.define("BeryllClusterRack", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clusterId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  rackId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  unitStart: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  unitEnd: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "beryll_cluster_racks",
  timestamps: true,
  indexes: [
    { fields: ["clusterId"] },
    { fields: ["rackId"] },
    { fields: ["clusterId", "rackId"], unique: true }
  ]
});

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
  YadroTicketLog,
  SubstituteServerPool,
  SlaConfig,
  UserAlias,
  BeryllClusterRack,
  YADRO_REQUEST_TYPES,
  YADRO_LOG_STATUSES,
  SUBSTITUTE_STATUSES
};