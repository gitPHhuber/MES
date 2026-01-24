'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    
    // ============================================
    // 1. Таблица партий (batches)
    // ============================================
    await queryInterface.createTable('beryll_batches', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      supplier: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      deliveryDate: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('ACTIVE', 'COMPLETED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'ACTIVE'
      },
      expectedCount: {
        type: Sequelize.INTEGER,
        allowNull: true,
        defaultValue: 0
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      completedAt: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdById: {
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
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // ============================================
    // 2. Добавляем поля в beryll_servers
    // ============================================
    
    await queryInterface.addColumn('beryll_servers', 'apkSerialNumber', {
      type: Sequelize.STRING(50),
      allowNull: true,
      unique: true
    });
    
    await queryInterface.addColumn('beryll_servers', 'batchId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'beryll_batches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('beryll_servers', 'completedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('beryll_servers', 'archivedAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('beryll_servers', 'archivedById', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'users', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    
    await queryInterface.addColumn('beryll_servers', 'burnInStartAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    await queryInterface.addColumn('beryll_servers', 'burnInEndAt', {
      type: Sequelize.DATE,
      allowNull: true
    });
    
    // Добавляем ARCHIVED в ENUM статусов
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_beryll_servers_status" ADD VALUE IF NOT EXISTS 'ARCHIVED';
    `).catch(() => console.log('ARCHIVED status might already exist'));

    // ============================================
    // 3. Таблица истории операций
    // ============================================
    await queryInterface.createTable('beryll_history', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      serverId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'beryll_servers', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      serverIp: { type: Sequelize.STRING(45), allowNull: true },
      serverHostname: { type: Sequelize.STRING(255), allowNull: true },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      action: {
        type: Sequelize.ENUM(
          'CREATED', 'TAKEN', 'RELEASED', 'STATUS_CHANGED', 'NOTE_ADDED',
          'CHECKLIST_COMPLETED', 'BATCH_ASSIGNED', 'BATCH_REMOVED',
          'DELETED', 'ARCHIVED', 'FILE_UPLOADED', 'SERIAL_ASSIGNED'
        ),
        allowNull: false
      },
      fromStatus: { type: Sequelize.STRING(50), allowNull: true },
      toStatus: { type: Sequelize.STRING(50), allowNull: true },
      checklistItemId: { type: Sequelize.INTEGER, allowNull: true },
      comment: { type: Sequelize.TEXT, allowNull: true },
      metadata: { type: Sequelize.JSONB, allowNull: true },
      durationMinutes: { type: Sequelize.INTEGER, allowNull: true },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('beryll_history', ['serverId']);
    await queryInterface.addIndex('beryll_history', ['userId']);
    await queryInterface.addIndex('beryll_history', ['action']);
    await queryInterface.addIndex('beryll_history', ['createdAt']);

    // ============================================
    // 4. Таблица шаблонов чек-листа
    // ============================================
    await queryInterface.createTable('beryll_checklist_templates', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      groupCode: {
        type: Sequelize.ENUM('VISUAL', 'TESTING', 'QC_PRIMARY', 'BURN_IN', 'QC_FINAL'),
        allowNull: false,
        defaultValue: 'TESTING'
      },
      title: { type: Sequelize.STRING(255), allowNull: false },
      description: { type: Sequelize.TEXT, allowNull: true },
      fileCode: { type: Sequelize.STRING(50), allowNull: true },
      requiresFile: { type: Sequelize.BOOLEAN, defaultValue: false },
      sortOrder: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      isRequired: { type: Sequelize.BOOLEAN, defaultValue: true },
      estimatedMinutes: { type: Sequelize.INTEGER, allowNull: true, defaultValue: 30 },
      isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    // ============================================
    // 5. Таблица выполнения чек-листа
    // ============================================
    await queryInterface.createTable('beryll_server_checklists', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      serverId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'beryll_servers', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      checklistTemplateId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'beryll_checklist_templates', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      completed: { type: Sequelize.BOOLEAN, defaultValue: false },
      completedById: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      completedAt: { type: Sequelize.DATE, allowNull: true },
      notes: { type: Sequelize.TEXT, allowNull: true },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') },
      updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('beryll_server_checklists', ['serverId', 'checklistTemplateId'], {
      unique: true, name: 'beryll_server_checklist_unique'
    });

    // ============================================
    // 6. Таблица файлов чек-листа
    // ============================================
    await queryInterface.createTable('beryll_checklist_files', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      serverChecklistId: {
        type: Sequelize.INTEGER, allowNull: false,
        references: { model: 'beryll_server_checklists', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'CASCADE'
      },
      originalName: { type: Sequelize.STRING(255), allowNull: false },
      fileName: { type: Sequelize.STRING(255), allowNull: false },
      filePath: { type: Sequelize.STRING(500), allowNull: false },
      mimeType: { type: Sequelize.STRING(100), allowNull: true },
      fileSize: { type: Sequelize.INTEGER, allowNull: true },
      uploadedById: {
        type: Sequelize.INTEGER, allowNull: true,
        references: { model: 'users', key: 'id' },
        onUpdate: 'CASCADE', onDelete: 'SET NULL'
      },
      createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') }
    });

    await queryInterface.addIndex('beryll_checklist_files', ['serverChecklistId']);

    // ============================================
    // 7. Начальные данные чек-листа ПО ПАСПОРТУ
    // ============================================
    const now = new Date();
    
    await queryInterface.bulkInsert('beryll_checklist_templates', [
      // ГРУППА 1: Визуальный осмотр
      { groupCode: 'VISUAL', title: 'Визуальный контроль сервера', description: 'Провести визуальный контроль (механические повреждения), при обнаружении сделать фото', fileCode: null, requiresFile: false, sortOrder: 100, isRequired: true, estimatedMinutes: 10, isActive: true, createdAt: now, updatedAt: now },
      
      // ГРУППА 2: Проверка работоспособности
      { groupCode: 'TESTING', title: 'Скрин при включении', description: 'Скриншот при включении сервера', fileCode: 'sn_on2', requiresFile: true, sortOrder: 200, isRequired: true, estimatedMinutes: 5, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Тест RAID (cachevault)', description: 'Проверить RAID контроллер и cachevault', fileCode: 'sn_cachevault2', requiresFile: true, sortOrder: 210, isRequired: true, estimatedMinutes: 15, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Стресс тест 3 (60 мин)', description: 'Провести стресс-тестирование 60 минут', fileCode: 'sn_gtk32', requiresFile: true, sortOrder: 220, isRequired: true, estimatedMinutes: 60, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Тест SSD + скрин RAID', description: 'Протестировать SSD и сделать скриншот RAID', fileCode: 'sn_raid2', requiresFile: true, sortOrder: 230, isRequired: true, estimatedMinutes: 20, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Тест HDD, SSD + проверка файлов', description: 'Тестирование HDD и SSD, проверка наличия файлов', fileCode: null, requiresFile: false, sortOrder: 240, isRequired: true, estimatedMinutes: 30, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Тест модулей памяти (0, 3, 6)', description: 'Тест модулей памяти 0, 3, 6 + скрин', fileCode: 'sn_dimm2', requiresFile: true, sortOrder: 250, isRequired: true, estimatedMinutes: 30, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Тест модулей памяти (11, 12)', description: 'Выявление дефекта, заявка в Ядро, отметка в таблице брака', fileCode: 'sn_dimm2FAIL2', requiresFile: false, sortOrder: 260, isRequired: false, estimatedMinutes: 20, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Проверка результатов тестов', description: 'Проверить наличие результатов всех тестов', fileCode: null, requiresFile: false, sortOrder: 270, isRequired: true, estimatedMinutes: 5, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Выгрузка файлов на общий диск', description: 'Выгрузка файлов тестирования и скриншотов', fileCode: null, requiresFile: false, sortOrder: 280, isRequired: true, estimatedMinutes: 10, isActive: true, createdAt: now, updatedAt: now },
      { groupCode: 'TESTING', title: 'Скрин BIOS, BMC [dts, die]', description: 'Включение сервера + скрин из BIOS, BMC', fileCode: 'sn_Bios2', requiresFile: true, sortOrder: 290, isRequired: true, estimatedMinutes: 10, isActive: true, createdAt: now, updatedAt: now },
      
      // ГРУППА 3: Контрольная (ОТК) - первичная
      { groupCode: 'QC_PRIMARY', title: 'Проверка результатов тестов (ОТК)', description: 'Проверка наличия и правильности результатов всех тестов', fileCode: null, requiresFile: false, sortOrder: 300, isRequired: true, estimatedMinutes: 15, isActive: true, createdAt: now, updatedAt: now },
      
      // ГРУППА 4: Испытательная
      { groupCode: 'BURN_IN', title: 'Технологический прогон', description: 'Установка на технологический прогон (burn-in)', fileCode: null, requiresFile: false, sortOrder: 400, isRequired: true, estimatedMinutes: 1440, isActive: true, createdAt: now, updatedAt: now },
      
      // ГРУППА 5: Контрольная (ОТК) - финальная
      { groupCode: 'QC_FINAL', title: 'Проверка результатов прогона (ОТК)', description: 'Проверить наличие результатов прогона', fileCode: null, requiresFile: false, sortOrder: 500, isRequired: true, estimatedMinutes: 10, isActive: true, createdAt: now, updatedAt: now }
    ]);

    console.log('✅ Migration beryll-extension completed');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('beryll_checklist_files');
    await queryInterface.dropTable('beryll_server_checklists');
    await queryInterface.dropTable('beryll_checklist_templates');
    await queryInterface.dropTable('beryll_history');
    
    await queryInterface.removeColumn('beryll_servers', 'apkSerialNumber');
    await queryInterface.removeColumn('beryll_servers', 'batchId');
    await queryInterface.removeColumn('beryll_servers', 'completedAt');
    await queryInterface.removeColumn('beryll_servers', 'archivedAt');
    await queryInterface.removeColumn('beryll_servers', 'archivedById');
    await queryInterface.removeColumn('beryll_servers', 'burnInStartAt');
    await queryInterface.removeColumn('beryll_servers', 'burnInEndAt');
    
    await queryInterface.dropTable('beryll_batches');
    console.log('✅ Migration beryll-extension reverted');
  }
};