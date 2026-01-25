'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('production_sections', 'managerId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });

    await queryInterface.addIndex(
      'production_sections',
      ['managerId'],
      { name: 'production_sections_managerId_idx' }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeIndex(
      'production_sections',
      'production_sections_managerId_idx'
    );
    await queryInterface.removeColumn('production_sections', 'managerId');
  },
};
