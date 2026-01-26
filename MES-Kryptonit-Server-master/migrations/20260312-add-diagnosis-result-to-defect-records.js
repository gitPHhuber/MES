'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('beryll_defect_records', 'diagnosisResult', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Результат диагностики дефекта'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('beryll_defect_records', 'diagnosisResult');
  }
};
