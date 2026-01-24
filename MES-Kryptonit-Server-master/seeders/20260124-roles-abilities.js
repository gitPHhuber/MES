/**
 * Seeder: Adds role management abilities.
 */
"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    const abilities = [
      { code: "roles.view", description: "Просмотр списка ролей", createdAt: now, updatedAt: now },
      { code: "roles.manage", description: "Создание, изменение и удаление ролей", createdAt: now, updatedAt: now },
    ];

    const existing = await queryInterface.sequelize.query(
      `SELECT code FROM abilities WHERE code IN ('roles.view', 'roles.manage')`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    const existingCodes = new Set(existing.map((row) => row.code));
    const newAbilities = abilities.filter((ability) => !existingCodes.has(ability.code));

    if (newAbilities.length) {
      await queryInterface.bulkInsert("abilities", newAbilities);
    }

    const adminRole = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'SUPER_ADMIN' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (adminRole.length) {
      const adminRoleId = adminRole[0].id;
      const abilityRows = await queryInterface.sequelize.query(
        `SELECT id FROM abilities WHERE code IN ('roles.view', 'roles.manage')`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const existingLinks = await queryInterface.sequelize.query(
        `SELECT "abilityId" FROM role_abilities WHERE "roleId" = ${adminRoleId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      const existingAbilityIds = new Set(existingLinks.map((row) => row.abilityId));

      const roleAbilities = abilityRows
        .filter((ability) => !existingAbilityIds.has(ability.id))
        .map((ability) => ({
          roleId: adminRoleId,
          abilityId: ability.id,
          createdAt: now,
          updatedAt: now,
        }));

      if (roleAbilities.length) {
        await queryInterface.bulkInsert("role_abilities", roleAbilities);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`
      DELETE FROM role_abilities
      WHERE "abilityId" IN (
        SELECT id FROM abilities WHERE code IN ('roles.view', 'roles.manage')
      )
    `);

    await queryInterface.bulkDelete("abilities", {
      code: {
        [Sequelize.Op.in]: ["roles.view", "roles.manage"],
      },
    });
  },
};
