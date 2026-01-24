"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_defect_records_status'
        ) THEN
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'PENDING_DIAGNOSIS';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'DIAGNOSED';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'WAITING_APPROVAL';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'PARTS_RESERVED';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'REPAIRED_LOCALLY';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'IN_YADRO_REPAIR';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'SUBSTITUTE_ISSUED';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'SCRAPPED';
          ALTER TYPE "enum_beryll_defect_records_status" ADD VALUE IF NOT EXISTS 'CANCELLED';
        END IF;
      END$$;
    `);
  },

  async down() {
    // Enum values cannot be easily removed in Postgres without recreating the type.
  }
};
