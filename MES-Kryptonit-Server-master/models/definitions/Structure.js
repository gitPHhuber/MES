const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

const Section = sequelize.define("production_section", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false, unique: true },
  description: { type: DataTypes.STRING },
  managerId: { 
    type: DataTypes.INTEGER, 
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
});

const Team = sequelize.define("production_team", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  sectionId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    field: "productionSectionId",
  },
  teamLeadId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'users',
      key: 'id'
    }
  },
});

module.exports = {
  Section,
  Team,
};