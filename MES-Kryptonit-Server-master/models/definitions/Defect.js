const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

// ========================================
// КАТЕГОРИИ ДЕФЕКТОВ (справочник)
// ========================================
const DefectCategory = sequelize.define("defect_category", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  
  code: { 
    type: DataTypes.STRING(50), 
    allowNull: false
  },
  title: { 
    type: DataTypes.STRING(200), 
    allowNull: false
  },
  description: { 
    type: DataTypes.TEXT
  },
  
  severity: { 
    type: DataTypes.ENUM("CRITICAL", "MAJOR", "MINOR"),
    defaultValue: "MAJOR"
  },
  
  applicableTypes: { 
    type: DataTypes.JSON, 
    defaultValue: []
  },
  
  isActive: { 
    type: DataTypes.BOOLEAN, 
    defaultValue: true 
  }
}, {
  indexes: [
    { unique: true, fields: ["code"] }
  ]
});

// ========================================
// РЕГИСТРАЦИЯ БРАКА (основная таблица)
// ========================================
const BoardDefect = sequelize.define("board_defect", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  
  boardType: { 
    type: DataTypes.STRING(50), 
    allowNull: false
  },
  boardId: { 
    type: DataTypes.INTEGER, 
    allowNull: true
  },
  serialNumber: { 
    type: DataTypes.STRING(100),
    allowNull: true
  },
  
  categoryId: { 
    type: DataTypes.INTEGER, 
    allowNull: false
  },
  description: { 
    type: DataTypes.TEXT
  },
  
  detectedById: { 
    type: DataTypes.INTEGER, 
    allowNull: false
  },
  detectedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW
  },
  
  status: { 
    type: DataTypes.ENUM(
      "OPEN",
      "IN_REPAIR",
      "REPAIRED",
      "VERIFIED",
      "SCRAPPED",
      "RETURNED",
      "CLOSED"
    ),
    defaultValue: "OPEN"
  },
  
  closedById: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  closedAt: { 
    type: DataTypes.DATE,
    allowNull: true
  },
  finalResult: { 
    type: DataTypes.ENUM("FIXED", "SCRAPPED", "RETURNED_TO_SUPPLIER", "FALSE_POSITIVE"),
    allowNull: true
  },
  
  totalRepairMinutes: { 
    type: DataTypes.INTEGER,
    defaultValue: 0
  }
});

// ========================================
// ИСТОРИЯ РЕМОНТА (действия)
// ========================================
const RepairAction = sequelize.define("repair_action", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  
  boardDefectId: { 
    type: DataTypes.INTEGER, 
    allowNull: false
  },
  
  actionType: { 
    type: DataTypes.ENUM(
      "DIAGNOSIS",
      "SOLDER",
      "REPLACE",
      "FLASH",
      "TEST",
      "CLEAN",
      "CLONE_DISK",
      "CABLE_REPLACE",
      "OTHER"
    ),
    allowNull: false
  },
  
  performedById: { 
    type: DataTypes.INTEGER, 
    allowNull: false
  },
  performedAt: { 
    type: DataTypes.DATE, 
    defaultValue: DataTypes.NOW 
  },
  
  description: { 
    type: DataTypes.TEXT, 
    allowNull: false
  },
  timeSpentMinutes: { 
    type: DataTypes.INTEGER,
    allowNull: true
  },
  
  result: { 
    type: DataTypes.ENUM("SUCCESS", "PARTIAL", "FAILED", "PENDING"),
    defaultValue: "PENDING"
  }
});

// ========================================
// СВЯЗИ (Associations)
// ========================================
const setupDefectAssociations = (models) => {
  const { User } = models;
  
  DefectCategory.hasMany(BoardDefect, { 
    foreignKey: "categoryId", 
    as: "defects" 
  });
  BoardDefect.belongsTo(DefectCategory, { 
    foreignKey: "categoryId", 
    as: "category" 
  });
  
  BoardDefect.belongsTo(User, { 
    foreignKey: "detectedById", 
    as: "detectedBy" 
  });
  
  BoardDefect.belongsTo(User, { 
    foreignKey: "closedById", 
    as: "closedBy" 
  });
  
  BoardDefect.hasMany(RepairAction, { 
    foreignKey: "boardDefectId", 
    as: "repairs" 
  });
  RepairAction.belongsTo(BoardDefect, { 
    foreignKey: "boardDefectId", 
    as: "defect" 
  });
  
  RepairAction.belongsTo(User, { 
    foreignKey: "performedById", 
    as: "performedBy" 
  });
};

const BOARD_TYPES = {
  FC: "FC",
  ELRS_915: "ELRS_915",
  ELRS_2_4: "ELRS_2_4",
  CORAL_B: "CORAL_B",
  SMARAGD: "SMARAGD"
};

const DEFECT_STATUSES = {
  OPEN: "OPEN",
  IN_REPAIR: "IN_REPAIR",
  REPAIRED: "REPAIRED",
  VERIFIED: "VERIFIED",
  SCRAPPED: "SCRAPPED",
  RETURNED: "RETURNED",
  CLOSED: "CLOSED"
};

const ACTION_TYPES = {
  DIAGNOSIS: "DIAGNOSIS",
  SOLDER: "SOLDER",
  REPLACE: "REPLACE",
  FLASH: "FLASH",
  TEST: "TEST",
  CLEAN: "CLEAN",
  CLONE_DISK: "CLONE_DISK",
  CABLE_REPLACE: "CABLE_REPLACE",
  OTHER: "OTHER"
};

module.exports = {
  DefectCategory,
  BoardDefect,
  RepairAction,
  setupDefectAssociations,
  BOARD_TYPES,
  DEFECT_STATUSES,
  ACTION_TYPES
};