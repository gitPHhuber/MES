"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "warehouse_boxes",
        "reserved_qty",
        { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
        { transaction }
      );

      await queryInterface.addColumn(
        "warehouse_boxes",
        "reserved_by_id",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "warehouse_boxes",
        "reserved_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );

      await queryInterface.addColumn(
        "warehouse_boxes",
        "reservation_expires_at",
        { type: Sequelize.DATE, allowNull: true },
        { transaction }
      );

      await queryInterface.addIndex(
        "warehouse_boxes",
        ["reservation_expires_at"],
        { name: "warehouse_boxes_reservation_expires_at_idx", transaction }
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
      await queryInterface.removeIndex(
        "warehouse_boxes",
        "warehouse_boxes_reservation_expires_at_idx",
        { transaction }
      );

      await queryInterface.removeColumn("warehouse_boxes", "reservation_expires_at", { transaction });
      await queryInterface.removeColumn("warehouse_boxes", "reserved_at", { transaction });
      await queryInterface.removeColumn("warehouse_boxes", "reserved_by_id", { transaction });
      await queryInterface.removeColumn("warehouse_boxes", "reserved_qty", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
