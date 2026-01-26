'use strict';

/**
 * Миграция: добавление поля serialNumberYadro в таблицу beryll_server_components
 * 
 * Файл: migrations/20260126180000-add-serialNumberYadro-to-beryll-components.js
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('beryll_server_components');
        
        // Добавляем serialNumberYadro если его нет
        if (!tableInfo.serialNumberYadro) {
            console.log('➕ Добавляем колонку serialNumberYadro в beryll_server_components...');
            
            await queryInterface.addColumn('beryll_server_components', 'serialNumberYadro', {
                type: Sequelize.STRING(100),
                allowNull: true,
                comment: 'Серийный номер Ядро (внутренний, отдельно от заводского serialNumber)'
            });
            
            // Добавляем индекс для быстрого поиска
            await queryInterface.addIndex('beryll_server_components', ['serialNumberYadro'], {
                name: 'idx_beryll_server_components_serial_yadro'
            });
            
            console.log('✅ Колонка serialNumberYadro добавлена');
        } else {
            console.log('ℹ️ Колонка serialNumberYadro уже существует');
        }
    },

    async down(queryInterface, Sequelize) {
        const tableInfo = await queryInterface.describeTable('beryll_server_components');
        
        if (tableInfo.serialNumberYadro) {
            // Удаляем индекс
            try {
                await queryInterface.removeIndex('beryll_server_components', 'idx_beryll_server_components_serial_yadro');
            } catch (e) {
                console.log('Индекс не найден, пропускаем');
            }
            
            await queryInterface.removeColumn('beryll_server_components', 'serialNumberYadro');
            console.log('✅ Колонка serialNumberYadro удалена');
        }
    }
};