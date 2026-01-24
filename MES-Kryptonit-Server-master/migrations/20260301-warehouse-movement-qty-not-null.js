"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.sequelize.query(
        `UPDATE warehouse_movements
         SET "goodQty" = 0
         WHERE "goodQty" IS NULL`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `UPDATE warehouse_movements
         SET "scrapQty" = 0
         WHERE "scrapQty" IS NULL`,
        { transaction }
      );

      await queryInterface.changeColumn(
        "warehouse_movements",
        "goodQty",
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );

      await queryInterface.changeColumn(
        "warehouse_movements",
        "scrapQty",
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.changeColumn(
        "warehouse_movements",
        "goodQty",
        { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
        { transaction }
      );

      await queryInterface.changeColumn(
        "warehouse_movements",
        "scrapQty",
        { type: Sequelize.INTEGER, allowNull: true, defaultValue: null },
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
