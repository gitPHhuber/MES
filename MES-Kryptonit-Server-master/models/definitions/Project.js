const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

const Project = sequelize.define("project", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.TEXT, allowNull: true },
  status: { type: DataTypes.STRING, defaultValue: "ACTIVE" },
  createdById: { type: DataTypes.INTEGER, allowNull: false },
});

module.exports = { Project };