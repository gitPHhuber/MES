const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

const User = sequelize.define("user", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  login: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING, defaultValue: "USER" },
  name: { type: DataTypes.STRING },
  surname: { type: DataTypes.STRING },
  img: { type: DataTypes.STRING },
});

const PC = sequelize.define("PC", {
  id: { type: DataTypes.SMALLINT, primaryKey: true, autoIncrement: true },
  ip: { type: DataTypes.STRING, unique: true, allowNull: false },
  pc_name: { type: DataTypes.STRING, allowNull: false },
  cabinet: { type: DataTypes.STRING },
});

const Session = sequelize.define("session", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  online: { type: DataTypes.BOOLEAN },
  PCId: {                                    // <-- ДОБАВЛЕНО
    type: DataTypes.SMALLINT,
    allowNull: true,
    references: {
      model: 'PCs',
      key: 'id'
    }
  }
});

const AuditLog = sequelize.define("audit_log", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  action: { type: DataTypes.STRING, allowNull: false },
  entity: { type: DataTypes.STRING, allowNull: true },
  entityId: { type: DataTypes.STRING, allowNull: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  metadata: { type: DataTypes.JSON, allowNull: true },
});

// RBAC (Роли и Права)
const Role = sequelize.define("role", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const Ability = sequelize.define("ability", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  description: { type: DataTypes.STRING },
});

const RoleAbility = sequelize.define("role_ability", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
});

module.exports = {
  User,
  PC,
  Session,
  AuditLog,
  Role,
  Ability,
  RoleAbility,
};