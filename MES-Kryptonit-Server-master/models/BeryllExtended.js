/**
 * BeryllExtended.js
 * 
 * Расширенные модели для APK Beryll:
 * - Стойки (физическое размещение серверов)
 * - Кластеры (логическая группировка ~10 серверов)
 * - Комплекты/Отгрузки (партии ~80 серверов для отправки)
 * - Учёт брака (расширенный журнал дефектов)
 * 
 * Положить в: models/definitions/BeryllExtended.js
 */

const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

// ============================================
// КОНСТАНТЫ
// ============================================

const RACK_STATUSES = {
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  DECOMMISSIONED: "DECOMMISSIONED"
};

const CLUSTER_STATUSES = {
  FORMING: "FORMING",       // Формируется
  READY: "READY",           // Готов к отгрузке
  SHIPPED: "SHIPPED",       // Отгружен
  DEPLOYED: "DEPLOYED"      // Развёрнут у клиента
};

const SHIPMENT_STATUSES = {
  FORMING: "FORMING",       // Формируется
  READY: "READY",           // Готов к отправке
  SHIPPED: "SHIPPED",       // Отправлен
  IN_TRANSIT: "IN_TRANSIT", // В пути
  DELIVERED: "DELIVERED",   // Доставлен
  ACCEPTED: "ACCEPTED"      // Принят клиентом
};

const SERVER_ROLES = {
  MASTER: "MASTER",
  WORKER: "WORKER",
  STORAGE: "STORAGE",
  GATEWAY: "GATEWAY"
};

const REPAIR_PART_TYPES = {
  RAM: "RAM",
  MOTHERBOARD: "MOTHERBOARD",
  CPU: "CPU",
  HDD: "HDD",
  SSD: "SSD",
  PSU: "PSU",
  FAN: "FAN",
  RAID: "RAID",
  NIC: "NIC",
  BACKPLANE: "BACKPLANE",
  BMC: "BMC",
  CABLE: "CABLE",
  OTHER: "OTHER"
};

const DEFECT_RECORD_STATUSES = {
  NEW: "NEW",                   // Новый
  DIAGNOSING: "DIAGNOSING",     // На диагностике
  WAITING_PARTS: "WAITING_PARTS", // Ожидание запчастей
  REPAIRING: "REPAIRING",       // В ремонте
  SENT_TO_YADRO: "SENT_TO_YADRO", // Отправлен в Ядро
  RETURNED: "RETURNED",         // Возвращён из Ядро
  RESOLVED: "RESOLVED",         // Решён
  REPEATED: "REPEATED",         // Повторный брак
  CLOSED: "CLOSED"              // Закрыт
};

// ============================================
// МОДЕЛЬ: Стойка (BeryllRack)
// ============================================
const BeryllRack = sequelize.define("BeryllRack", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Название стойки (BL0206-240001)
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  
  // Описание / Локация (Стеллаж 1, у щитка...)
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Общее количество юнитов
  totalUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 42
  },
  
  // Сетевые настройки стойки
  networkSubnet: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  gateway: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Статус стойки
  status: {
    type: DataTypes.ENUM(...Object.values(RACK_STATUSES)),
    allowNull: false,
    defaultValue: RACK_STATUSES.ACTIVE
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Метаданные (дополнительная информация)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_racks",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["status"] },
    { fields: ["location"] }
  ]
});

// ============================================
// МОДЕЛЬ: Позиция в стойке (BeryllRackUnit)
// ============================================
const BeryllRackUnit = sequelize.define("BeryllRackUnit", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // FK на стойку
  rackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_racks",
      key: "id"
    }
  },
  
  // FK на сервер (опционально - юнит может быть пустым)
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  
  // Номер юнита (1-42)
  unitNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  // Hostname сервера в кластере
  hostname: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Management порт
  mgmtMacAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  mgmtIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Data порт (может быть несколько MAC через \n)
  dataMacAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  dataIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Учётные данные для доступа
  accessLogin: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  accessPassword: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Дата установки
  installedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Кто установил
  installedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_rack_units",
  timestamps: true,
  indexes: [
    { fields: ["rackId"] },
    { fields: ["serverId"] },
    { fields: ["unitNumber"] },
    { unique: true, fields: ["rackId", "unitNumber"] },
    { fields: ["hostname"] }
  ]
});

// ============================================
// МОДЕЛЬ: Комплект/Отгрузка (BeryllShipment)
// ============================================
const BeryllShipment = sequelize.define("BeryllShipment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Название комплекта / номер отгрузки
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  
  // Город назначения
  destinationCity: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Полный адрес доставки
  destinationAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Контактное лицо получателя
  contactPerson: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Телефон получателя
  contactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Ожидаемое количество серверов
  expectedCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 80
  },
  
  // Статус
  status: {
    type: DataTypes.ENUM(...Object.values(SHIPMENT_STATUSES)),
    allowNull: false,
    defaultValue: SHIPMENT_STATUSES.FORMING
  },
  
  // Даты
  plannedShipDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  actualShipDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Номер ТТН / накладной
  waybillNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Транспортная компания
  carrier: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Кто создал
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Метаданные
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_shipments",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["status"] },
    { fields: ["destinationCity"] },
    { fields: ["plannedShipDate"] }
  ]
});

// ============================================
// МОДЕЛЬ: Кластер (BeryllCluster)
// ============================================
const BeryllCluster = sequelize.define("BeryllCluster", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Название кластера (cl1, cl2, production-cluster-01...)
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  
  // Описание
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // FK на комплект/отгрузку (опционально)
  shipmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_shipments",
      key: "id"
    }
  },
  
  // Ожидаемое количество серверов
  expectedCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 10
  },
  
  // Статус
  status: {
    type: DataTypes.ENUM(...Object.values(CLUSTER_STATUSES)),
    allowNull: false,
    defaultValue: CLUSTER_STATUSES.FORMING
  },
  
  // Версия конфигурации кластера
  configVersion: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Кто создал
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Метаданные
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_clusters",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["shipmentId"] },
    { fields: ["status"] }
  ]
});

// ============================================
// МОДЕЛЬ: Связь Кластер-Сервер (BeryllClusterServer)
// ============================================
const BeryllClusterServer = sequelize.define("BeryllClusterServer", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // FK на кластер
  clusterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_clusters",
      key: "id"
    }
  },
  
  // FK на сервер
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  
  // Роль сервера в кластере
  role: {
    type: DataTypes.ENUM(...Object.values(SERVER_ROLES)),
    allowNull: false,
    defaultValue: SERVER_ROLES.WORKER
  },
  
  // Порядковый номер в кластере
  orderNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Hostname в кластере (может отличаться от основного)
  clusterHostname: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // IP в кластерной сети
  clusterIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Дата добавления в кластер
  addedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  
  // Кто добавил
  addedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_cluster_servers",
  timestamps: true,
  indexes: [
    { fields: ["clusterId"] },
    { fields: ["serverId"] },
    { unique: true, fields: ["clusterId", "serverId"] },
    { fields: ["role"] }
  ]
});

// ============================================
// МОДЕЛЬ: Запись о браке (BeryllDefectRecord)
// ============================================
const BeryllDefectRecord = sequelize.define("BeryllDefectRecord", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // FK на сервер
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  
  // Номер заявки в системе Ядро (INC553187)
  yadroTicketNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Наличие СПиСИ
  hasSPISI: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  // Код кластера (240008)
  clusterCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Описание проблемы
  problemDescription: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  
  // Дата обнаружения
  detectedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  
  // Кто обнаружил
  detectedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Кто занимался диагностикой
  diagnosticianId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Тип детали для ремонта
  repairPartType: {
    type: DataTypes.ENUM(...Object.values(REPAIR_PART_TYPES)),
    allowNull: true
  },
  
  // S/N бракованной детали (Ядро)
  defectPartSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // S/N бракованной детали (производитель)
  defectPartSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // S/N замены (Ядро)
  replacementPartSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // S/N замены (производитель)
  replacementPartSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Детали ремонта (текстовое описание)
  repairDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Статус записи
  status: {
    type: DataTypes.ENUM(...Object.values(DEFECT_RECORD_STATUSES)),
    allowNull: false,
    defaultValue: DEFECT_RECORD_STATUSES.NEW
  },
  
  // Повторный брак?
  isRepeatedDefect: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  // Причина повторного брака
  repeatedDefectReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Дата повторного брака
  repeatedDefectDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Отправлен в Ядро на ремонт
  sentToYadroRepair: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  // Дата отправки в Ядро
  sentToYadroAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Возвращён из Ядро
  returnedFromYadro: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  
  // Дата возврата из Ядро
  returnedFromYadroAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // S/N подменного сервера
  substituteServerSerial: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Дата завершения ремонта
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Кто закрыл запись
  resolvedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Резолюция
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Метаданные
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_defect_records",
  timestamps: true,
  indexes: [
    { fields: ["serverId"] },
    { fields: ["yadroTicketNumber"] },
    { fields: ["status"] },
    { fields: ["detectedAt"] },
    { fields: ["repairPartType"] },
    { fields: ["diagnosticianId"] },
    { fields: ["isRepeatedDefect"] }
  ]
});

// ============================================
// МОДЕЛЬ: Файлы к записям о браке
// ============================================
const BeryllDefectRecordFile = sequelize.define("BeryllDefectRecordFile", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  defectRecordId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_defect_records",
      key: "id"
    }
  },
  
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  uploadedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_defect_record_files",
  timestamps: true,
  indexes: [
    { fields: ["defectRecordId"] }
  ]
});

// ============================================
// МОДЕЛЬ: История изменений стоек/кластеров
// ============================================
const BeryllExtendedHistory = sequelize.define("BeryllExtendedHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // Тип сущности
  entityType: {
    type: DataTypes.ENUM("RACK", "CLUSTER", "SHIPMENT", "DEFECT_RECORD"),
    allowNull: false
  },
  
  // ID сущности
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  // Действие
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  
  // Кто выполнил
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Комментарий
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Изменения (JSON: { field: { from, to } })
  changes: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  
  // Метаданные
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: "beryll_extended_history",
  timestamps: true,
  indexes: [
    { fields: ["entityType", "entityId"] },
    { fields: ["userId"] },
    { fields: ["createdAt"] }
  ]
});

// ============================================
// НАСТРОЙКА СВЯЗЕЙ
// ============================================
const setupExtendedAssociations = (models) => {
  const { User, BeryllServer } = models;
  
  // --- Стойки ---
  BeryllRack.hasMany(BeryllRackUnit, { as: "units", foreignKey: "rackId", onDelete: "CASCADE" });
  BeryllRackUnit.belongsTo(BeryllRack, { as: "rack", foreignKey: "rackId" });
  
  BeryllRackUnit.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllRackUnit, { as: "rackUnits", foreignKey: "serverId" });
  }
  
  BeryllRackUnit.belongsTo(User, { as: "installedBy", foreignKey: "installedById" });
  
  // --- Комплекты/Отгрузки ---
  BeryllShipment.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  BeryllShipment.hasMany(BeryllCluster, { as: "clusters", foreignKey: "shipmentId" });
  
  // --- Кластеры ---
  BeryllCluster.belongsTo(BeryllShipment, { as: "shipment", foreignKey: "shipmentId" });
  BeryllCluster.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  BeryllCluster.hasMany(BeryllClusterServer, { as: "clusterServers", foreignKey: "clusterId", onDelete: "CASCADE" });
  
  // --- Связь кластер-сервер ---
  BeryllClusterServer.belongsTo(BeryllCluster, { as: "cluster", foreignKey: "clusterId" });
  BeryllClusterServer.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  BeryllClusterServer.belongsTo(User, { as: "addedBy", foreignKey: "addedById" });
  
  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllClusterServer, { as: "clusterMemberships", foreignKey: "serverId" });
  }
  
  // --- Записи о браке ---
  BeryllDefectRecord.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  BeryllDefectRecord.belongsTo(User, { as: "detectedBy", foreignKey: "detectedById" });
  BeryllDefectRecord.belongsTo(User, { as: "diagnostician", foreignKey: "diagnosticianId" });
  BeryllDefectRecord.belongsTo(User, { as: "resolvedBy", foreignKey: "resolvedById" });
  BeryllDefectRecord.hasMany(BeryllDefectRecordFile, { as: "files", foreignKey: "defectRecordId", onDelete: "CASCADE" });
  
  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllDefectRecord, { as: "defectRecords", foreignKey: "serverId" });
  }
  
  // --- Файлы записей о браке ---
  BeryllDefectRecordFile.belongsTo(BeryllDefectRecord, { as: "defectRecord", foreignKey: "defectRecordId" });
  BeryllDefectRecordFile.belongsTo(User, { as: "uploadedBy", foreignKey: "uploadedById" });
  
  // --- История ---
  BeryllExtendedHistory.belongsTo(User, { as: "user", foreignKey: "userId" });
};

// ============================================
// ЭКСПОРТ
// ============================================
module.exports = {
  // Модели
  BeryllRack,
  BeryllRackUnit,
  BeryllShipment,
  BeryllCluster,
  BeryllClusterServer,
  BeryllDefectRecord,
  BeryllDefectRecordFile,
  BeryllExtendedHistory,
  
  // Константы
  RACK_STATUSES,
  CLUSTER_STATUSES,
  SHIPMENT_STATUSES,
  SERVER_ROLES,
  REPAIR_PART_TYPES,
  DEFECT_RECORD_STATUSES,
  
  // Функция настройки связей
  setupExtendedAssociations
};
