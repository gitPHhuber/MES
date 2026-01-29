/**
 * Сидер: Права доступа для новых функций
 *
 * Добавляет abilities для управления компонентами, дефектами, интеграции с Ядро
 *
 * ВАЖНО: в таблице public.abilities используется поле `code` (а не `name`)
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Новые права
    const abilities = [
      // Компоненты
      {
        code: "beryll_component_view",
        description: "Просмотр инвентаря компонентов",
        createdAt: now,
        updatedAt: now,
      },
      {
        code: "beryll_component_manage",
        description:
          "Управление инвентарём компонентов (добавление, перемещение, списание)",
        createdAt: now,
        updatedAt: now,
      },

      // Дефекты
      {
        code: "beryll_defect_view",
        description: "Просмотр записей о браке",
        createdAt: now,
        updatedAt: now,
      },
      {
        code: "beryll_defect_create",
        description: "Создание записей о браке",
        createdAt: now,
        updatedAt: now,
      },
      {
        code: "beryll_defect_manage",
        description:
          "Полное управление записями о браке (workflow, ремонт)",
        createdAt: now,
        updatedAt: now,
      },

      // Ядро интеграция
      {
        code: "beryll_yadro_view",
        description: "Просмотр заявок в Ядро",
        createdAt: now,
        updatedAt: now,
      },
      {
        code: "beryll_yadro_manage",
        description: "Управление заявками в Ядро",
        createdAt: now,
        updatedAt: now,
      },

      // Подменные серверы
      {
        code: "beryll_substitute_view",
        description: "Просмотр пула подменных серверов",
        createdAt: now,
        updatedAt: now,
      },
      {
        code: "beryll_substitute_manage",
        description: "Управление подменными серверами",
        createdAt: now,
        updatedAt: now,
      },

      // Администрирование
      {
        code: "beryll_admin",
        description: "Администрирование Beryll (SLA, справочники, настройки)",
        createdAt: now,
        updatedAt: now,
      },
    ];

    // Проверяем существующие abilities
    const existingAbilities = await queryInterface.sequelize.query(
      `SELECT code FROM abilities WHERE code LIKE 'beryll_%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    const existingCodes = new Set(existingAbilities.map((a) => a.code));
    const newAbilities = abilities.filter((a) => !existingCodes.has(a.code));

    if (newAbilities.length > 0) {
      await queryInterface.bulkInsert("abilities", newAbilities);
      console.log(`✅ Added ${newAbilities.length} new abilities`);
    } else {
      console.log("ℹ️ All abilities already exist");
    }

    // Привязываем к роли admin (если есть)
    const adminRole = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (adminRole.length > 0) {
      const adminRoleId = adminRole[0].id;

      const insertedAbilities = await queryInterface.sequelize.query(
        `SELECT id, code FROM abilities WHERE code LIKE 'beryll_%'`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const existingRoleAbilities = await queryInterface.sequelize.query(
        `SELECT "abilityId" FROM role_abilities WHERE "roleId" = ${adminRoleId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const existingAbilityIds = new Set(
        existingRoleAbilities.map((ra) => ra.abilityId)
      );

      const roleAbilities = insertedAbilities
        .filter((a) => !existingAbilityIds.has(a.id))
        .map((ability) => ({
          roleId: adminRoleId,
          abilityId: ability.id,
          createdAt: now,
          updatedAt: now,
        }));

      if (roleAbilities.length > 0) {
        await queryInterface.bulkInsert("role_abilities", roleAbilities);
        console.log(
          `✅ Linked ${roleAbilities.length} abilities to admin role`
        );
      }
    }

    // Привязываем к роли technologist (если есть)
    const techRole = await queryInterface.sequelize.query(
      `SELECT id FROM roles WHERE name IN ('technologist', 'technolog', 'технолог') LIMIT 1`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (techRole.length > 0) {
      const techRoleId = techRole[0].id;

      const techAbilities = await queryInterface.sequelize.query(
        `SELECT id FROM abilities WHERE code IN (
          'beryll_component_view', 
          'beryll_defect_view', 
          'beryll_defect_create',
          'beryll_defect_manage',
          'beryll_yadro_view',
          'beryll_substitute_view'
        )`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const existingTechAbilities = await queryInterface.sequelize.query(
        `SELECT "abilityId" FROM role_abilities WHERE "roleId" = ${techRoleId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      const existingTechAbilityIds = new Set(
        existingTechAbilities.map((ra) => ra.abilityId)
      );

      const techRoleAbilities = techAbilities
        .filter((a) => !existingTechAbilityIds.has(a.id))
        .map((ability) => ({
          roleId: techRoleId,
          abilityId: ability.id,
          createdAt: now,
          updatedAt: now,
        }));

      if (techRoleAbilities.length > 0) {
        await queryInterface.bulkInsert("role_abilities", techRoleAbilities);
        console.log(
          `✅ Linked ${techRoleAbilities.length} abilities to technologist role`
        );
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Удаляем связи
    await queryInterface.sequelize.query(`
      DELETE FROM role_abilities 
      WHERE "abilityId" IN (
        SELECT id FROM abilities WHERE code LIKE 'beryll_%'
      )
    `);

    // Удаляем права
    await queryInterface.bulkDelete("abilities", {
      code: {
        [Sequelize.Op.like]: "beryll_%",
      },
    });
  },
};
