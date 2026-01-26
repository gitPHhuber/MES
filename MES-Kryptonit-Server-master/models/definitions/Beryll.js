/**
 * Beryll.js - Модели системы управления серверами Берилл
 * 
 * Обновлено: добавлено поле serialNumberYadro в BeryllServerComponent
 * 
 * Положить в: models/definitions/Beryll.js
 */

const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

// ============================================
// КОНСТАНТЫ
// ============================================

const SERVER_STATUSES = {
  NEW: "NEW",
  IN_WORK: "IN_WORK",
  CLARIFYING: "CLARIFYING",
  DEFECT: "DEFECT",
  DONE: "DONE",
  ARCHIVED: "ARCHIVED"
};

const BATCH_STATUSES = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  CANCELLED: "CANCELLED"
};

const HISTORY_ACTIONS = {
  CREATED: "CREATED",
  TAKEN: "TAKEN",
  RELEASED: "RELEASED",
  STATUS_CHANGED: "STATUS_CHANGED",
  NOTE_ADDED: "NOTE_ADDED",
  CHECKLIST_COMPLETED: "CHECKLIST_COMPLETED",
  BATCH_ASSIGNED: "BATCH_ASSIGNED",
  BATCH_REMOVED: "BATCH_REMOVED",
  DELETED: "DELETED",
  ARCHIVED: "ARCHIVED",
  FILE_UPLOADED: "FILE_UPLOADED",
  SERIAL_ASSIGNED: "SERIAL_ASSIGNED",
  COMPONENTS_FETCHED: "COMPONENTS_FETCHED"
};

const CHECKLIST_GROUPS = {
  PREPARATION: "PREPARATION",
  ASSEMBLY: "ASSEMBLY",
  TESTING: "TESTING",
  BURN_IN: "BURN_IN",
  FINAL: "FINAL"
};

// Константы для дефектов
const DEFECT_CATEGORIES = {
  HARDWARE: "HARDWARE",
  SOFTWARE: "SOFTWARE",
  ASSEMBLY: "ASSEMBLY",
  COMPONENT: "COMPONENT",
  OTHER: "OTHER"
};

const DEFECT_PRIORITIES = {
  LOW: "LOW",
  MEDIUM: "MEDIUM",
  HIGH: "HIGH",
  CRITICAL: "CRITICAL"
};

const DEFECT_STATUSES = {
  NEW: "NEW",
  IN_PROGRESS: "IN_PROGRESS",
  RESOLVED: "RESOLVED",
  WONT_FIX: "WONT_FIX"
};

// ============================================
// КОНСТАНТЫ - КОМПОНЕНТЫ СЕРВЕРОВ
// ============================================

/**
 * Типы компонентов сервера
 */
const COMPONENT_TYPES = {
  CPU: "CPU",                     // Процессор
  RAM: "RAM",                     // Оперативная память
  HDD: "HDD",                     // Жесткий диск
  SSD: "SSD",                     // Твердотельный накопитель
  NVME: "NVME",                   // NVMe накопитель
  MOTHERBOARD: "MOTHERBOARD",     // Материнская плата
  GPU: "GPU",                     // Видеокарта
  NIC: "NIC",                     // Сетевая карта
  RAID: "RAID",                   // RAID контроллер
  PSU: "PSU",                     // Блок питания
  FAN: "FAN",                     // Вентилятор
  MEMORY_MODULE: "MEMORY_MODULE", // Модуль памяти
  BACKPLANE: "BACKPLANE",         // Объединительная плата
  BMC: "BMC",                     // BMC контроллер
  OTHER: "OTHER"                  // Прочее
};

/**
 * Статусы компонентов
 */
const COMPONENT_STATUSES = {
  OK: "OK",                       // Работает нормально
  WARNING: "WARNING",             // Предупреждение
  CRITICAL: "CRITICAL",           // Критическая ошибка
  UNKNOWN: "UNKNOWN",             // Статус неизвестен
  NOT_PRESENT: "NOT_PRESENT",     // Компонент отсутствует
  REPLACED: "REPLACED"            // Компонент заменён
};

// ============================================
// Модель партии (Batch)
// ============================================
const BeryllBatch = sequelize.define("BeryllBatch", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  supplier: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  deliveryDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(BATCH_STATUSES)),
    allowNull: false,
    defaultValue: BATCH_STATUSES.ACTIVE
  },
  expectedCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_batches",
  timestamps: true
});

// ============================================
// Модель сервера
// ============================================
const BeryllServer = sequelize.define("BeryllServer", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  
  // IP адрес из DHCP lease
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  
  // MAC адрес
  macAddress: {
    type: DataTypes.STRING(17),
    allowNull: true
  },
  
  // Hostname из DHCP
  hostname: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Серийный номер сервера (из BIOS/hostname)
  serialNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Серийный номер АПК "Берилл" (BL020...-2500...) - ГЛАВНЫЙ ИДЕНТИФИКАТОР
  apkSerialNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // BMC IP адрес
  bmcAddress: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  
  // Статус работы
  status: {
    type: DataTypes.ENUM(...Object.values(SERVER_STATUSES)),
    allowNull: false,
    defaultValue: SERVER_STATUSES.NEW
  },
  
  // FK на партию
  batchId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_batches",
      key: "id"
    }
  },
  
  // Кто взял в работу (FK на User)
  assignedToId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Когда взял в работу
  assignedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Комментарий/примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // Время начала lease из DHCP
  leaseStart: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Время окончания lease из DHCP
  leaseEnd: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Активен ли lease
  leaseActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  
  // Последняя синхронизация с DHCP
  lastSyncAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Когда завершена работа (статус DONE)
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Когда перенесён в архив
  archivedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Кто перенёс в архив
  archivedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Дата начала испытательного прогона
  burnInStartAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Дата окончания испытательного прогона
  burnInEndAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Поля мониторинга (ping)
  lastPingAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  pingStatus: {
    type: DataTypes.ENUM("ONLINE", "OFFLINE", "UNKNOWN"),
    allowNull: true,
    defaultValue: "UNKNOWN"
  },
  
  pingLatency: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  
  // Последний опрос компонентов
  lastComponentsFetchAt: {
    type: DataTypes.DATE,
    allowNull: true
  }
}, {
  tableName: "beryll_servers",
  timestamps: true
});

// ============================================
// Модель истории операций (Audit Trail)
// ============================================
const BeryllHistory = sequelize.define("BeryllHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  serverIp: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  serverHostname: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  action: {
    type: DataTypes.ENUM(...Object.values(HISTORY_ACTIONS)),
    allowNull: false
  },
  fromStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  toStatus: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  checklistItemId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  durationMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_history",
  timestamps: true,
  updatedAt: false
});

// ============================================
// Модель шаблона чек-листа
// ============================================
const BeryllChecklistTemplate = sequelize.define("BeryllChecklistTemplate", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  groupCode: {
    type: DataTypes.ENUM(...Object.values(CHECKLIST_GROUPS)),
    allowNull: false,
    defaultValue: CHECKLIST_GROUPS.TESTING
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  requiresFile: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  estimatedMinutes: {
    type: DataTypes.INTEGER,
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: "beryll_checklist_templates",
  timestamps: true
});

// ============================================
// Модель выполнения чек-листа сервера
// ============================================
const BeryllServerChecklist = sequelize.define("BeryllServerChecklist", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  checklistTemplateId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_checklist_templates",
      key: "id"
    }
  },
  completed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  completedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  completedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "beryll_server_checklists",
  timestamps: true,
  indexes: [
    { unique: true, fields: ["serverId", "checklistTemplateId"] }
  ]
});

// ============================================
// Модель файлов чек-листа
// ============================================
const BeryllChecklistFile = sequelize.define("BeryllChecklistFile", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverChecklistId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_server_checklists",
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
  tableName: "beryll_checklist_files",
  timestamps: true
});

// ============================================
// Модель комментариев к дефектам
// ============================================
const BeryllDefectComment = sequelize.define("BeryllDefectComment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  defectCategory: {
    type: DataTypes.ENUM(...Object.values(DEFECT_CATEGORIES)),
    allowNull: true,
    defaultValue: DEFECT_CATEGORIES.OTHER
  },
  priority: {
    type: DataTypes.ENUM(...Object.values(DEFECT_PRIORITIES)),
    allowNull: true,
    defaultValue: DEFECT_PRIORITIES.MEDIUM
  },
  status: {
    type: DataTypes.ENUM(...Object.values(DEFECT_STATUSES)),
    allowNull: false,
    defaultValue: DEFECT_STATUSES.NEW
  },
  resolvedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: "beryll_defect_comments",
  timestamps: true
});

// ============================================
// Модель файлов дефектов
// ============================================
const BeryllDefectFile = sequelize.define("BeryllDefectFile", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  commentId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_defect_comments",
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
  tableName: "beryll_defect_files",
  timestamps: true
});

// ============================================
// Модель компонентов сервера (ОБНОВЛЕНО: добавлено serialNumberYadro)
// ============================================
const BeryllServerComponent = sequelize.define("BeryllServerComponent", {
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
  
  // Тип компонента
  componentType: {
    type: DataTypes.ENUM(...Object.values(COMPONENT_TYPES)),
    allowNull: false
  },
  
  // Название компонента (например, "Intel Xeon E-2388G")
  name: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  
  // Производитель
  manufacturer: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Модель
  model: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  
  // Серийный номер компонента (заводской)
  serialNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // ===============================
  // НОВОЕ ПОЛЕ: Серийный номер Ядро
  // ===============================
  serialNumberYadro: {
    type: DataTypes.STRING(100),
    allowNull: true,
    comment: "Серийный номер в системе Ядро (внутренний)"
  },
  
  // Part Number
  partNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Версия firmware
  firmwareVersion: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  // Статус компонента
  status: {
    type: DataTypes.ENUM(...Object.values(COMPONENT_STATUSES)),
    allowNull: false,
    defaultValue: COMPONENT_STATUSES.UNKNOWN
  },
  
  // Слот/позиция (например, "DIMM_A1", "CPU0", "Disk Bay 1")
  slot: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  
  // Ёмкость/размер (для дисков и RAM, в байтах)
  capacity: {
    type: DataTypes.BIGINT,
    allowNull: true
  },
  
  // Скорость (MHz для RAM, RPM для HDD, GT/s для CPU)
  speed: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Температура (°C)
  temperature: {
    type: DataTypes.FLOAT,
    allowNull: true
  },
  
  // Здоровье компонента (0-100%)
  healthPercent: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Дополнительные данные (JSON)
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  
  // Источник данных (REDFISH, IPMI, SMART, MANUAL)
  dataSource: {
    type: DataTypes.STRING(50),
    allowNull: true,
    defaultValue: "MANUAL"
  },
  
  // Время последнего обновления данных компонента
  lastUpdatedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  
  // Примечания
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  
  // ===============================
  // Дополнительные поля для связи с инвентарём
  // ===============================
  
  // FK на каталог компонентов (если есть)
  catalogId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // FK на инвентарь (если компонент отслеживается)
  inventoryId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  // Кто установил компонент
  installedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_server_components",
  timestamps: true,
  indexes: [
    { fields: ["serverId"] },
    { fields: ["componentType"] },
    { fields: ["status"] },
    { fields: ["serialNumberYadro"] },  // НОВЫЙ ИНДЕКС
    { fields: ["serverId", "componentType", "slot"], unique: true }
  ]
});

// ============================================
// Настройка связей
// ============================================
const setupAssociations = (User) => {
  // --- Batch -> User (кто создал) ---
  BeryllBatch.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });

  // --- Server -> Batch ---
  BeryllServer.belongsTo(BeryllBatch, { as: "batch", foreignKey: "batchId" });
  BeryllBatch.hasMany(BeryllServer, { as: "servers", foreignKey: "batchId" });

  // --- Server -> User (исполнитель) ---
  BeryllServer.belongsTo(User, { as: "assignedTo", foreignKey: "assignedToId" });
  
  // --- Server -> User (кто архивировал) ---
  BeryllServer.belongsTo(User, { as: "archivedBy", foreignKey: "archivedById" });

  // --- Server <-> History ---
  BeryllServer.hasMany(BeryllHistory, { as: "history", foreignKey: "serverId" });
  BeryllHistory.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  
  // --- History -> User ---
  BeryllHistory.belongsTo(User, { as: "user", foreignKey: "userId" });

  // --- Server <-> ServerChecklist ---
  BeryllServer.hasMany(BeryllServerChecklist, { as: "checklists", foreignKey: "serverId" });
  BeryllServerChecklist.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });

  // --- ServerChecklist -> ChecklistTemplate ---
  BeryllServerChecklist.belongsTo(BeryllChecklistTemplate, { as: "template", foreignKey: "checklistTemplateId" });
  BeryllChecklistTemplate.hasMany(BeryllServerChecklist, { as: "serverChecklists", foreignKey: "checklistTemplateId" });

  // --- ServerChecklist -> User (кто выполнил) ---
  BeryllServerChecklist.belongsTo(User, { as: "completedBy", foreignKey: "completedById" });

  // --- ServerChecklist <-> ChecklistFile ---
  BeryllServerChecklist.hasMany(BeryllChecklistFile, { as: "files", foreignKey: "serverChecklistId" });
  BeryllChecklistFile.belongsTo(BeryllServerChecklist, { as: "checklist", foreignKey: "serverChecklistId" });
  
  // --- ChecklistFile -> User (кто загрузил) ---
  BeryllChecklistFile.belongsTo(User, { as: "uploadedBy", foreignKey: "uploadedById" });

  // --- Дефекты (Связи) ---
  BeryllDefectComment.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  BeryllServer.hasMany(BeryllDefectComment, { as: "defectComments", foreignKey: "serverId" });
  BeryllDefectComment.belongsTo(User, { as: "author", foreignKey: "userId" });
  BeryllDefectComment.belongsTo(User, { as: "resolvedBy", foreignKey: "resolvedById" });
  BeryllDefectComment.hasMany(BeryllDefectFile, { as: "files", foreignKey: "commentId", onDelete: "CASCADE" });
  BeryllDefectFile.belongsTo(BeryllDefectComment, { as: "comment", foreignKey: "commentId" });
  BeryllDefectFile.belongsTo(User, { as: "uploadedBy", foreignKey: "uploadedById" });

  // --- Компоненты серверов ---
  BeryllServer.hasMany(BeryllServerComponent, { as: "components", foreignKey: "serverId", onDelete: "CASCADE" });
  BeryllServerComponent.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  
  // ПРИМЕЧАНИЕ: связь installedBy определена в ComponentModels.js, не дублировать!
};

// ============================================
// Экспорт
// ============================================
module.exports = {
  // Модели
  BeryllServer,
  BeryllBatch,
  BeryllHistory,
  BeryllChecklistTemplate,
  BeryllServerChecklist,
  BeryllChecklistFile,
  BeryllDefectComment,
  BeryllDefectFile,
  BeryllServerComponent,
  
  // Константы статусов
  SERVER_STATUSES,
  BATCH_STATUSES,
  HISTORY_ACTIONS,
  CHECKLIST_GROUPS,
  
  // Константы дефектов
  DEFECT_CATEGORIES,
  DEFECT_PRIORITIES,
  DEFECT_STATUSES,
  
  // Константы компонентов
  COMPONENT_TYPES,
  COMPONENT_STATUSES,
  
  // Функция настройки связей
  setupAssociations
};