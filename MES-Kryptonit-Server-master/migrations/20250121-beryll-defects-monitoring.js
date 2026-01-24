'use strict';

/**
 * Миграция: Комментарии к дефектам + Мониторинг серверов
 * 
 * Запуск: npx sequelize-cli db:migrate
 * Откат: npx sequelize-cli db:migrate:undo
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    
    console.log('🚀 Начинаем миграцию: Дефекты + Мониторинг...');
    
    // ============================================
    // 1. Добавляем поля мониторинга в beryll_servers
    // ============================================
    
    console.log('📊 Добавляем поля мониторинга...');
    
    await queryInterface.addColumn('beryll_servers', 'lastPingAt', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Время последней проверки пинга'
    }).catch(() => console.log('  - lastPingAt уже существует'));
    
    // Создаём ENUM для pingStatus
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_servers_pingStatus') THEN
          CREATE TYPE "enum_beryll_servers_pingStatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');
        END IF;
      END$$;
    `).catch(() => console.log('  - ENUM pingStatus уже существует'));
    
    await queryInterface.addColumn('beryll_servers', 'pingStatus', {
      type: Sequelize.ENUM('ONLINE', 'OFFLINE', 'UNKNOWN'),
      allowNull: true,
      defaultValue: 'UNKNOWN',
      comment: 'Статус пинга'
    }).catch(() => console.log('  - pingStatus уже существует'));
    
    await queryInterface.addColumn('beryll_servers', 'pingLatency', {
      type: Sequelize.FLOAT,
      allowNull: true,
      comment: 'Задержка пинга в мс'
    }).catch(() => console.log('  - pingLatency уже существует'));
    
    // ============================================
    // 2. Создаём таблицу комментариев к дефектам
    // ============================================
    
    console.log('💬 Создаём таблицу beryll_defect_comments...');
    
    await queryInterface.createTable('beryll_defect_comments', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      serverId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'beryll_servers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      text: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      defectCategory: {
        type: Sequelize.ENUM('HARDWARE', 'SOFTWARE', 'ASSEMBLY', 'COMPONENT', 'OTHER'),
        allowNull: true,
        defaultValue: 'OTHER'
      },
      priority: {
        type: Sequelize.ENUM('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'),
        allowNull: true,
        defaultValue: 'MEDIUM'
      },
      status: {
        type: Sequelize.ENUM('NEW', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX'),
        allowNull: false,
        defaultValue: 'NEW'
      },
      resolvedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      resolvedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      resolution: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    // Индексы для комментариев
    await queryInterface.addIndex('beryll_defect_comments', ['serverId']);
    await queryInterface.addIndex('beryll_defect_comments', ['status']);
    await queryInterface.addIndex('beryll_defect_comments', ['defectCategory']);
    await queryInterface.addIndex('beryll_defect_comments', ['priority']);
    await queryInterface.addIndex('beryll_defect_comments', ['createdAt']);
    
    // ============================================
    // 3. Создаём таблицу файлов дефектов
    // ============================================
    
    console.log('📎 Создаём таблицу beryll_defect_files...');
    
    await queryInterface.createTable('beryll_defect_files', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      commentId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'beryll_defect_comments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      originalName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      fileName: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      filePath: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      mimeType: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      fileSize: {
        type: Sequelize.INTEGER,
        allowNull: true
      },
      uploadedById: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });
    
    await queryInterface.addIndex('beryll_defect_files', ['commentId']);
    
    // ============================================
    // 4. Добавляем новые action типы в beryll_history
    // ============================================
    
    console.log('📝 Добавляем новые action типы в историю...');
    
    const newActions = [
      'DEFECT_COMMENT_ADDED',
      'DEFECT_STATUS_CHANGED', 
      'DEFECT_COMMENT_DELETED',
      'DEFECT_FILE_UPLOADED',
      'DEFECT_FILE_DELETED'
    ];
    
    for (const action of newActions) {
      await queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_enum 
            WHERE enumlabel = '${action}' 
            AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_beryll_history_action')
          ) THEN
            ALTER TYPE "enum_beryll_history_action" ADD VALUE '${action}';
          END IF;
        END$$;
      `).catch(e => console.log(`  - ${action}: ${e.message}`));
    }
    
    console.log('✅ Миграция beryll-defects-monitoring завершена!');
  },

  async down(queryInterface, Sequelize) {
    console.log('⏪ Откат миграции: Дефекты + Мониторинг...');
    
    // Удаляем таблицы (в обратном порядке)
    await queryInterface.dropTable('beryll_defect_files').catch(() => {});
    await queryInterface.dropTable('beryll_defect_comments').catch(() => {});
    
    // Удаляем колонки мониторинга
    await queryInterface.removeColumn('beryll_servers', 'lastPingAt').catch(() => {});
    await queryInterface.removeColumn('beryll_servers', 'pingLatency').catch(() => {});
    await queryInterface.removeColumn('beryll_servers', 'pingStatus').catch(() => {});
    
    // ENUM типы не удаляем - это опасно и может сломать другие данные
    // При необходимости удалить вручную через psql
    
    console.log('✅ Откат завершён');
  }
};
