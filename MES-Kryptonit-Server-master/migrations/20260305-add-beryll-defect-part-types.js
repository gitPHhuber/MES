"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_defect_records_repairPartType'
        ) THEN
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'RAM_ECC';
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'THERMAL';
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'PCIE_SLOT';
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'RAM_SOCKET';
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'CPU_SOCKET';
          ALTER TYPE "enum_beryll_defect_records_repairPartType" ADD VALUE IF NOT EXISTS 'CHASSIS';
        END IF;
      END$$;
    `);
  },

  async down() {
    // Enum values cannot be easily removed in Postgres without recreating the type.
  },
};
