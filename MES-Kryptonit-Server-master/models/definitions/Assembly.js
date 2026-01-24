const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

// Рецепт (Заголовок)
const AssemblyRecipe = sequelize.define("assembly_recipe", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  projectId: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT },
});

// Шаги рецепта
const RecipeStep = sequelize.define("recipe_step", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  recipeId: { type: DataTypes.INTEGER, allowNull: false },
  order: { type: DataTypes.INTEGER, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  description: { type: DataTypes.TEXT },
});


const AssemblyProcess = sequelize.define("assembly_process", {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  boxId: { type: DataTypes.INTEGER, allowNull: false },
  recipeId: { type: DataTypes.INTEGER, allowNull: false },
  

  completedSteps: { 
      type: DataTypes.JSONB, 
      defaultValue: [] 
  }, 
  
  status: { type: DataTypes.STRING, defaultValue: "IN_PROGRESS" }, 
  startTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  endTime: { type: DataTypes.DATE },
});

module.exports = { AssemblyRecipe, RecipeStep, AssemblyProcess };