'use strict';

/**
 * Миграция: Добавление managerId в Section и teamLeadId в Team
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    console.log('🚀 Добавляем поля managerId и teamLeadId...');

    // 1. Добавляем managerId в production_section
    await queryInterface.addColumn('production_section', 'managerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }).then(() => console.log('✅ managerId добавлен в production_section'))
      .catch(() => console.log('⚠️ managerId уже существует в production_section'));

    // 2. Добавляем teamLeadId в production_team
    await queryInterface.addColumn('production_team', 'teamLeadId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    }).then(() => console.log('✅ teamLeadId добавлен в production_team'))
      .catch(() => console.log('⚠️ teamLeadId уже существует в production_team'));

    console.log('🎉 Миграция завершена!');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('production_section', 'managerId')
      .catch(() => console.log('managerId не найден'));
    
    await queryInterface.removeColumn('production_team', 'teamLeadId')
      .catch(() => console.log('teamLeadId не найден'));
  }
};