/**
 * Migration: Extend roles table for Keycloak synchronization.
 */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.addColumn(
        "roles",
        "priority",
        {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 100,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "roles",
        "keycloak_id",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "roles",
        "keycloak_name",
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "roles",
        "is_active",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "roles",
        "is_system",
        {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "roles",
        "synced_at",
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addIndex("roles", ["keycloak_id"], {
        unique: true,
        name: "roles_keycloak_id_unique",
        transaction,
      });

      await queryInterface.addIndex("roles", ["priority", "is_active"], {
        name: "roles_priority_active_idx",
        transaction,
      });

      await queryInterface.sequelize.query(
        `
        UPDATE roles SET priority = 1 WHERE name = 'SUPER_ADMIN';
        UPDATE roles SET priority = 10 WHERE name = 'PRODUCTION_CHIEF';
        UPDATE roles SET priority = 20 WHERE name = 'TECHNOLOGIST';
        UPDATE roles SET priority = 30 WHERE name = 'WAREHOUSE_MASTER';
        UPDATE roles SET priority = 40 WHERE name = 'QC_ENGINEER';
        UPDATE roles SET priority = 50 WHERE name = 'FIRMWARE_OPERATOR';
        UPDATE roles SET priority = 60 WHERE name = 'ASSEMBLER';
        `,
        { transaction }
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
      await queryInterface.removeIndex("roles", "roles_priority_active_idx", {
        transaction,
      });
      await queryInterface.removeIndex("roles", "roles_keycloak_id_unique", {
        transaction,
      });
      await queryInterface.removeColumn("roles", "synced_at", { transaction });
      await queryInterface.removeColumn("roles", "is_system", { transaction });
      await queryInterface.removeColumn("roles", "is_active", { transaction });
      await queryInterface.removeColumn("roles", "keycloak_name", { transaction });
      await queryInterface.removeColumn("roles", "keycloak_id", { transaction });
      await queryInterface.removeColumn("roles", "priority", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
