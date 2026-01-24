const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

// === Поставки ===
const Supply = sequelize.define("supply", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplier: { type: DataTypes.STRING, allowNull: true },
  docNumber: { type: DataTypes.STRING, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "NEW" },
  comment: { type: DataTypes.TEXT, allowNull: true },
  expectedDate: { type: DataTypes.DATEONLY, allowNull: true },
  receivedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

// === Коробки / LPN ===
const WarehouseBox = sequelize.define("warehouse_box", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  supplyId: { type: DataTypes.INTEGER, allowNull: true },

  // Идентификаторы
  qrCode: { type: DataTypes.STRING, unique: true, allowNull: false },
  shortCode: { type: DataTypes.STRING, unique: true, allowNull: true },

  // Основное
  label: { type: DataTypes.STRING, allowNull: false },

  // Привязка к справочникам / SKU
  originType: { type: DataTypes.STRING, allowNull: true },
  originId: { type: DataTypes.INTEGER, allowNull: true },

  // Количественный учет
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unit: { type: DataTypes.STRING, allowNull: false, defaultValue: "шт" },

  // Иерархия
  parentBoxId: { type: DataTypes.INTEGER, allowNull: true },

  // Метаданные партии
  kitNumber: { type: DataTypes.STRING, allowNull: true },
  projectName: { type: DataTypes.STRING, allowNull: true },
  batchName: { type: DataTypes.STRING, allowNull: true },

  // Статус и заметки
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "ON_STOCK" },
  notes: { type: DataTypes.TEXT, allowNull: true },

  // Локация
  currentSectionId: { type: DataTypes.INTEGER, allowNull: true },
  currentTeamId: { type: DataTypes.INTEGER, allowNull: true },

  acceptedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  acceptedById: { type: DataTypes.INTEGER, allowNull: false },
});

// === Движения ===
const WarehouseMovement = sequelize.define("warehouse_movement", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  boxId: { type: DataTypes.INTEGER, allowNull: false },
  documentId: { type: DataTypes.INTEGER, allowNull: true },

  fromSectionId: { type: DataTypes.INTEGER, allowNull: true },
  fromTeamId: { type: DataTypes.INTEGER, allowNull: true },
  toSectionId: { type: DataTypes.INTEGER, allowNull: true },
  toTeamId: { type: DataTypes.INTEGER, allowNull: true },

  operation: { type: DataTypes.STRING, allowNull: false },
  statusAfter: { type: DataTypes.STRING, allowNull: true },

  deltaQty: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
  goodQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  scrapQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

  performedById: { type: DataTypes.INTEGER, allowNull: false },
  performedAt: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  comment: { type: DataTypes.TEXT, allowNull: true },
});

// === Документы склада ===
const WarehouseDocument = sequelize.define("warehouse_document", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  boxId: { type: DataTypes.INTEGER, allowNull: true },
  number: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.STRING, allowNull: true },
  date: { type: DataTypes.DATEONLY, allowNull: true },
  fileUrl: { type: DataTypes.STRING, allowNull: true },
  comment: { type: DataTypes.TEXT, allowNull: true },
  createdById: { type: DataTypes.INTEGER, allowNull: false },
});

// === Лимиты остатков ===
const InventoryLimit = sequelize.define("inventory_limit", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  originType: { type: DataTypes.STRING, allowNull: true },
  originId: { type: DataTypes.INTEGER, allowNull: true },
  label: { type: DataTypes.STRING, allowNull: true },
  minQuantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
});

// === Производственные задачи ===
const ProductionTask = sequelize.define("production_task", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  
  title: { type: DataTypes.STRING, allowNull: false },
  
  // К чему относится задача (тип и ID объекта)
  originType: { type: DataTypes.STRING, allowNull: true },
  originId: { type: DataTypes.INTEGER, allowNull: true },
  
  targetQty: { type: DataTypes.INTEGER, allowNull: false },
  unit: { type: DataTypes.STRING, allowNull: false, defaultValue: "шт" },
  
  dueDate: { type: DataTypes.DATEONLY, allowNull: true },
  
  status: { type: DataTypes.STRING, allowNull: false, defaultValue: "NEW" },
  priority: { type: DataTypes.INTEGER, allowNull: true },
  
  comment: { type: DataTypes.TEXT, allowNull: true },
  
  createdById: { type: DataTypes.INTEGER, allowNull: false },
  
  // Поля для привязки и управления
  responsibleId: { type: DataTypes.INTEGER, allowNull: true }, // Ответственный сотрудник
  sectionId: { type: DataTypes.INTEGER, allowNull: true },     // Целевой участок
  projectId: { type: DataTypes.INTEGER, allowNull: true },     // Привязка к проекту
});

// === ИСТОРИЯ ПЕЧАТИ (НОВОЕ) ===
const PrintHistory = sequelize.define("print_history", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  template: { type: DataTypes.STRING, allowNull: false }, // "VIDEO_KIT" или "SIMPLE"
  
  labelName: { type: DataTypes.STRING }, // Название изделия для поиска
  startCode: { type: DataTypes.STRING }, // Первый номер в серии
  endCode: { type: DataTypes.STRING },   // Последний номер в серии
  
  quantity: { type: DataTypes.INTEGER }, // Тираж
  
  // JSON со всеми параметрами (дата, контракт, размеры и т.д.), чтобы можно было повторить печать точь-в-точь
  params: { type: DataTypes.JSONB }, 

  createdById: { type: DataTypes.INTEGER, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
});

module.exports = {
  Supply,
  WarehouseBox,
  WarehouseMovement,
  WarehouseDocument,
  InventoryLimit,
  ProductionTask,
  PrintHistory // Экспортируем новую модель
};
