"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "sessions",
        "pcId",
        {
          type: Sequelize.SMALLINT,
          allowNull: true,
          references: { model: "PCs", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction }
      );

      await queryInterface.addIndex(
        "sessions",
        ["pcId"],
        { name: "sessions_pcId_idx", transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  down: async (queryInterface) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.removeIndex("sessions", "sessions_pcId_idx", { transaction });
      await queryInterface.removeColumn("sessions", "pcId", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
