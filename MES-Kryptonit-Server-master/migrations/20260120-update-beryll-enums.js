"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_history_action'
        ) THEN
          ALTER TYPE "enum_beryll_history_action" ADD VALUE IF NOT EXISTS 'COMPONENTS_FETCHED';
        END IF;
      END$$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_checklist_templates_groupCode'
        ) THEN
          ALTER TYPE "enum_beryll_checklist_templates_groupCode" ADD VALUE IF NOT EXISTS 'PREPARATION';
          ALTER TYPE "enum_beryll_checklist_templates_groupCode" ADD VALUE IF NOT EXISTS 'ASSEMBLY';
          ALTER TYPE "enum_beryll_checklist_templates_groupCode" ADD VALUE IF NOT EXISTS 'FINAL';
        END IF;
      END$$;
    `);
  },

  async down() {
    // Enum values cannot be easily removed in Postgres without recreating the type.
  },
};
