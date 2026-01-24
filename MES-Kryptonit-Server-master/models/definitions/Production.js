const sequelize = require("../../db");
const { DataTypes, Op } = require("sequelize");

// --- Flight Controller (FC) ---
const CategoryDefect = sequelize.define("category_defect", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const FC = sequelize.define("FC", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    unique_device_id: { type: DataTypes.STRING, allowNull: true },
    firmware: { type: DataTypes.BOOLEAN },
    stand_test: { type: DataTypes.BOOLEAN, allowNull: true },
}, {
    indexes: [{ unique: true, fields: ["unique_device_id"], where: { unique_device_id: { [Op.ne]: null } } }]
});

// --- ELRS 915 ---
const CategoryDefect915 = sequelize.define("category_defect_915", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const ELRS915 = sequelize.define("ELRS_915", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    MAC_address: { type: DataTypes.STRING, allowNull: true },
    firmware: { type: DataTypes.BOOLEAN },
    firmwareVersion: { type: DataTypes.STRING, allowNull: true },
}, {
    indexes: [{ unique: true, fields: ["MAC_address"], where: { MAC_address: { [Op.ne]: null } } }]
});

// --- ELRS 2.4 ---
const CategoryDefect2_4 = sequelize.define("category_defect_2_4", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const ELRS2_4 = sequelize.define("ELRS_2_4", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    MAC_address: { type: DataTypes.STRING, allowNull: true },
    firmware: { type: DataTypes.BOOLEAN },
}, {
    indexes: [{ unique: true, fields: ["MAC_address"], where: { MAC_address: { [Op.ne]: null } } }]
});

// --- Coral B ---
const CategoryDefect_CoralB = sequelize.define("category_defect_CoralB", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const CoralB = sequelize.define("CoralB", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    serial: { type: DataTypes.STRING, allowNull: true },
    firmware: { type: DataTypes.BOOLEAN },
    SAW_filter: { type: DataTypes.BOOLEAN },
    firmwareVersion: { type: DataTypes.STRING, allowNull: true },
}, {
    indexes: [{ unique: true, fields: ["serial"], where: { serial: { [Op.ne]: null } } }]
});

// --- Сборка (Assembly) ---
const AssemblyRoute = sequelize.define("assembly_route", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  productName: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  isActive: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  createdById: { type: DataTypes.INTEGER, allowNull: false },
});

const AssemblyRouteStep = sequelize.define("assembly_route_step", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  routeId: { type: DataTypes.INTEGER, allowNull: false },
  order: { type: DataTypes.INTEGER, allowNull: false }, 
  title: { type: DataTypes.STRING, allowNull: false }, 
  operation: { type: DataTypes.STRING, allowNull: false }, 
  sectionId: { type: DataTypes.INTEGER, allowNull: true }, 
  teamId: { type: DataTypes.INTEGER, allowNull: true }, 
  description: { type: DataTypes.TEXT, allowNull: true },
});

module.exports = {
  FC, CategoryDefect,
  ELRS915, CategoryDefect915,
  ELRS2_4, CategoryDefect2_4,
  CoralB, CategoryDefect_CoralB,
  AssemblyRoute, AssemblyRouteStep
};