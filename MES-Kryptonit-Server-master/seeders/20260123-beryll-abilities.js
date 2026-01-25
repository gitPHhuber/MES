/**
 * Сидер: Права доступа для новых функций
 * 
 * Добавляет ability для базового доступа к модулю Beryll
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    // Новые права
    const abilities = [
      {
        code: "beryll.view",
        description: "Просмотр данных модуля Beryll",
        createdAt: now,
        updatedAt: now
      },
      {
        code: "beryll.work",
        description: "Рабочие операции в модуле Beryll",
        createdAt: now,
        updatedAt: now
      },
      {
        code: "beryll.manage",
        description: "Администрирование и управление модулем Beryll",
        createdAt: now,
        updatedAt: now
      }
    ];
    
    // Проверяем существующие abilities
    const existingAbilities = await queryInterface.sequelize.query(
      `SELECT code FROM abilities WHERE code LIKE 'beryll.%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );
    
    const existingCodes = new Set(existingAbilities.map(a => a.code));
    const newAbilities = abilities.filter(a => !existingCodes.has(a.code));
    
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
        `SELECT id, code FROM abilities WHERE code LIKE 'beryll.%'`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const existingRoleAbilities = await queryInterface.sequelize.query(
        `SELECT "abilityId" FROM role_abilities WHERE "roleId" = ${adminRoleId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const existingAbilityIds = new Set(existingRoleAbilities.map(ra => ra.abilityId));
      
      const roleAbilities = insertedAbilities
        .filter(a => !existingAbilityIds.has(a.id))
        .map(ability => ({
          roleId: adminRoleId,
          abilityId: ability.id,
          createdAt: now,
          updatedAt: now
        }));
      
      if (roleAbilities.length > 0) {
        await queryInterface.bulkInsert("role_abilities", roleAbilities);
        console.log(`✅ Linked ${roleAbilities.length} abilities to admin role`);
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
          'beryll.view',
          'beryll.work',
          'beryll.manage'
        )`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const existingTechAbilities = await queryInterface.sequelize.query(
        `SELECT "abilityId" FROM role_abilities WHERE "roleId" = ${techRoleId}`,
        { type: Sequelize.QueryTypes.SELECT }
      );
      
      const existingTechAbilityIds = new Set(existingTechAbilities.map(ra => ra.abilityId));
      
      const techRoleAbilities = techAbilities
        .filter(a => !existingTechAbilityIds.has(a.id))
        .map(ability => ({
          roleId: techRoleId,
          abilityId: ability.id,
          createdAt: now,
          updatedAt: now
        }));
      
      if (techRoleAbilities.length > 0) {
        await queryInterface.bulkInsert("role_abilities", techRoleAbilities);
        console.log(`✅ Linked ${techRoleAbilities.length} abilities to technologist role`);
      }
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Удаляем связи
    await queryInterface.sequelize.query(`
      DELETE FROM role_abilities 
      WHERE "abilityId" IN (
        SELECT id FROM abilities WHERE code LIKE 'beryll.%'
      )
    `);
    
    // Удаляем права
    await queryInterface.bulkDelete("abilities", {
      code: {
        [Sequelize.Op.like]: "beryll.%"
      }
    });
  }
};
