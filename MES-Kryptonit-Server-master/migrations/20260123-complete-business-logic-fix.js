/**
 * Миграция: Полное исправление бизнес-логики MES Kryptonit
 * 
 * Закрывает:
 * 1. Связь дефектов с компонентами
 * 2. История перемещения компонентов
 * 3. Справочник типов компонентов
 * 4. Связь стоек с кластерами
 * 5. Связь повторного брака
 * 6. Учёт подменных серверов
 * 7. Пул запасных компонентов
 * 8. SLA-метрики
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ============================================
      // 1. СПРАВОЧНИК ТИПОВ КОМПОНЕНТОВ
      // ============================================
      await queryInterface.createTable("component_catalog", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        type: {
          type: Sequelize.ENUM(
            "CPU", "RAM", "HDD", "SSD", "NVME", "MOTHERBOARD", 
            "GPU", "NIC", "RAID", "PSU", "FAN", "BMC", 
            "BACKPLANE", "CABLE", "CHASSIS", "OTHER"
          ),
          allowNull: false
        },
        manufacturer: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        model: {
          type: Sequelize.STRING(150),
          allowNull: false
        },
        revision: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        partNumber: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        specifications: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {},
          comment: "capacity, speed, cores, etc."
        },
        serialNumberPattern: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "Regex pattern for validation"
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("component_catalog", ["type"], { transaction });
      await queryInterface.addIndex("component_catalog", ["manufacturer"], { transaction });
      await queryInterface.addIndex("component_catalog", ["model"], { transaction });
      await queryInterface.addIndex("component_catalog", ["type", "manufacturer", "model"], { 
        unique: true, 
        transaction,
        name: "component_catalog_unique_type_manuf_model"
      });

      // ============================================
      // 2. ПУЛ ЗАПАСНЫХ КОМПОНЕНТОВ (INVENTORY)
      // ============================================
      await queryInterface.createTable("component_inventory", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        catalogId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "component_catalog", key: "id" },
          onDelete: "SET NULL"
        },
        type: {
          type: Sequelize.ENUM(
            "CPU", "RAM", "HDD", "SSD", "NVME", "MOTHERBOARD", 
            "GPU", "NIC", "RAID", "PSU", "FAN", "BMC", 
            "BACKPLANE", "CABLE", "CHASSIS", "OTHER"
          ),
          allowNull: false
        },
        serialNumber: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        serialNumberYadro: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        manufacturer: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        model: {
          type: Sequelize.STRING(150),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM(
            "AVAILABLE",      // Доступен для использования
            "RESERVED",       // Зарезервирован под ремонт
            "IN_USE",         // Установлен в сервер
            "IN_REPAIR",      // Отправлен на ремонт в Ядро
            "DEFECTIVE",      // Неисправен, ожидает решения
            "SCRAPPED",       // Списан
            "RETURNED"        // Возвращён из ремонта
          ),
          allowNull: false,
          defaultValue: "AVAILABLE"
        },
        condition: {
          type: Sequelize.ENUM("NEW", "REFURBISHED", "USED", "DAMAGED"),
          defaultValue: "NEW"
        },
        location: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "Физическое расположение на складе"
        },
        currentServerId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_servers", key: "id" },
          onDelete: "SET NULL"
        },
        reservedForDefectId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_defect_records", key: "id" },
          onDelete: "SET NULL"
        },
        purchaseDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        warrantyExpires: {
          type: Sequelize.DATE,
          allowNull: true
        },
        lastTestedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("component_inventory", ["type"], { transaction });
      await queryInterface.addIndex("component_inventory", ["status"], { transaction });
      await queryInterface.addIndex("component_inventory", ["serialNumber"], { transaction });
      await queryInterface.addIndex("component_inventory", ["serialNumberYadro"], { transaction });
      await queryInterface.addIndex("component_inventory", ["currentServerId"], { transaction });

      // ============================================
      // 3. ИСТОРИЯ ПЕРЕМЕЩЕНИЯ КОМПОНЕНТОВ
      // ============================================
      await queryInterface.createTable("component_history", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        // Может ссылаться на компонент сервера ИЛИ на инвентарь
        serverComponentId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_server_components", key: "id" },
          onDelete: "SET NULL"
        },
        inventoryComponentId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "component_inventory", key: "id" },
          onDelete: "SET NULL"
        },
        action: {
          type: Sequelize.ENUM(
            "RECEIVED",           // Получен на склад
            "INSTALLED",          // Установлен в сервер
            "REMOVED",            // Извлечён из сервера
            "REPLACED",           // Заменён (старый извлечён, новый установлен)
            "SENT_TO_YADRO",      // Отправлен на ремонт в Ядро
            "RETURNED_FROM_YADRO", // Возвращён из Ядро
            "TESTED",             // Протестирован
            "RESERVED",           // Зарезервирован
            "RELEASED",           // Снято резервирование
            "SCRAPPED",           // Списан
            "TRANSFERRED"         // Перемещён между серверами
          ),
          allowNull: false
        },
        fromServerId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_servers", key: "id" },
          onDelete: "SET NULL"
        },
        toServerId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_servers", key: "id" },
          onDelete: "SET NULL"
        },
        fromLocation: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        toLocation: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        relatedDefectId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_defect_records", key: "id" },
          onDelete: "SET NULL"
        },
        yadroTicketNumber: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        performedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL"
        },
        performedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        metadata: {
          type: Sequelize.JSONB,
          defaultValue: {}
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("component_history", ["serverComponentId"], { transaction });
      await queryInterface.addIndex("component_history", ["inventoryComponentId"], { transaction });
      await queryInterface.addIndex("component_history", ["action"], { transaction });
      await queryInterface.addIndex("component_history", ["relatedDefectId"], { transaction });
      await queryInterface.addIndex("component_history", ["performedAt"], { transaction });

      // ============================================
      // 4. ОБНОВЛЕНИЕ beryll_defect_records
      // ============================================
      
      // Связь с компонентами
      await queryInterface.addColumn("beryll_defect_records", "defectComponentId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "beryll_server_components", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "replacementComponentId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "beryll_server_components", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // Связь с инвентарём
      await queryInterface.addColumn("beryll_defect_records", "defectInventoryId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "component_inventory", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "replacementInventoryId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "component_inventory", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // Связь с предыдущим дефектом (для повторного брака)
      await queryInterface.addColumn("beryll_defect_records", "previousDefectId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "beryll_defect_records", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // FK на подменный сервер вместо текста
      await queryInterface.addColumn("beryll_defect_records", "substituteServerId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "beryll_servers", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // SLA метрики
      await queryInterface.addColumn("beryll_defect_records", "slaDeadline", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "diagnosisStartedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "diagnosisCompletedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "repairStartedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "repairCompletedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await queryInterface.addColumn("beryll_defect_records", "totalDowntimeMinutes", {
        type: Sequelize.INTEGER,
        allowNull: true
      }, { transaction });

      await queryInterface.addIndex("beryll_defect_records", ["defectComponentId"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["previousDefectId"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["substituteServerId"], { transaction });

      // ============================================
      // 5. СВЯЗЬ СТОЕК С КЛАСТЕРАМИ
      // ============================================
      await queryInterface.createTable("beryll_cluster_racks", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        clusterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "beryll_clusters", key: "id" },
          onDelete: "CASCADE"
        },
        rackId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "beryll_racks", key: "id" },
          onDelete: "CASCADE"
        },
        isPrimary: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          comment: "Основная стойка кластера"
        },
        unitRangeStart: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Начальный юнит в стойке"
        },
        unitRangeEnd: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: "Конечный юнит в стойке"
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        assignedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        assignedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_cluster_racks", ["clusterId"], { transaction });
      await queryInterface.addIndex("beryll_cluster_racks", ["rackId"], { transaction });
      await queryInterface.addIndex("beryll_cluster_racks", ["clusterId", "rackId"], { 
        unique: true, 
        transaction 
      });

      // ============================================
      // 6. ПУЛ ПОДМЕННЫХ СЕРВЕРОВ
      // ============================================
      await queryInterface.createTable("substitute_server_pool", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        serverId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "beryll_servers", key: "id" },
          onDelete: "CASCADE",
          unique: true
        },
        status: {
          type: Sequelize.ENUM("AVAILABLE", "IN_USE", "MAINTENANCE", "RETIRED"),
          defaultValue: "AVAILABLE"
        },
        currentDefectId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_defect_records", key: "id" },
          onDelete: "SET NULL"
        },
        issuedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        issuedToUserId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL"
        },
        returnedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        usageCount: {
          type: Sequelize.INTEGER,
          defaultValue: 0
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("substitute_server_pool", ["status"], { transaction });
      await queryInterface.addIndex("substitute_server_pool", ["currentDefectId"], { transaction });

      // ============================================
      // 7. ЖУРНАЛ УЧЁТА ЗАЯВОК ЯДРО (номера присваивает поставщик)
      // ============================================
      await queryInterface.createTable("yadro_ticket_log", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        ticketNumber: {
          type: Sequelize.STRING(50),
          allowNull: false,
          comment: "Номер заявки от поставщика Ядро (INC...)"
        },
        defectRecordId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_defect_records", key: "id" },
          onDelete: "SET NULL"
        },
        serverId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "beryll_servers", key: "id" },
          onDelete: "SET NULL"
        },
        requestType: {
          type: Sequelize.ENUM("COMPONENT_REPAIR", "COMPONENT_EXCHANGE", "WARRANTY_CLAIM", "CONSULTATION"),
          defaultValue: "COMPONENT_REPAIR",
          comment: "Тип обращения (для отчётности)"
        },
        status: {
          type: Sequelize.ENUM("SENT", "IN_PROGRESS", "COMPLETED", "RECEIVED", "CLOSED"),
          defaultValue: "SENT",
          comment: "Статус для внутреннего учёта"
        },
        componentType: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        sentComponentSerialYadro: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "S/N отправленного компонента (Ядро)"
        },
        sentComponentSerialManuf: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "S/N отправленного компонента (производитель)"
        },
        receivedComponentSerialYadro: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "S/N полученного компонента (Ядро)"
        },
        receivedComponentSerialManuf: {
          type: Sequelize.STRING(100),
          allowNull: true,
          comment: "S/N полученного компонента (производитель)"
        },
        sentAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Дата отправки в Ядро"
        },
        receivedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: "Дата получения обратно"
        },
        problemDescription: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Описание проблемы"
        },
        yadroResponse: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: "Ответ/резолюция от Ядро"
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "users", key: "id" },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("yadro_ticket_log", ["ticketNumber"], { transaction });
      await queryInterface.addIndex("yadro_ticket_log", ["defectRecordId"], { transaction });
      await queryInterface.addIndex("yadro_ticket_log", ["serverId"], { transaction });
      await queryInterface.addIndex("yadro_ticket_log", ["status"], { transaction });

      // ============================================
      // 8. ОБНОВЛЕНИЕ beryll_server_components
      // ============================================
      
      // Связь со справочником
      await queryInterface.addColumn("beryll_server_components", "catalogId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "component_catalog", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // Связь с инвентарём (откуда пришёл компонент)
      await queryInterface.addColumn("beryll_server_components", "inventoryId", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "component_inventory", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // Дата установки
      await queryInterface.addColumn("beryll_server_components", "installedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      // Кем установлен
      await queryInterface.addColumn("beryll_server_components", "installedById", {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: "users", key: "id" },
        onDelete: "SET NULL"
      }, { transaction });

      // ============================================
      // 9. СПРАВОЧНИК СОТРУДНИКОВ (АЛИАСЫ)
      // ============================================
      await queryInterface.createTable("user_aliases", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: { model: "users", key: "id" },
          onDelete: "CASCADE"
        },
        alias: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: "Костюков И.И., Трусов А.М."
        },
        source: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: "excel_import, manual, etc."
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("user_aliases", ["alias"], { transaction });
      await queryInterface.addIndex("user_aliases", ["userId"], { transaction });
      await queryInterface.addIndex("user_aliases", ["alias", "userId"], { 
        unique: true, 
        transaction 
      });

      // ============================================
      // 10. SLA КОНФИГУРАЦИЯ
      // ============================================
      await queryInterface.createTable("sla_config", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        defectType: {
          type: Sequelize.STRING(50),
          allowNull: true,
          comment: "RAM, MOTHERBOARD, etc. NULL = default"
        },
        priority: {
          type: Sequelize.STRING(20),
          allowNull: true,
          comment: "LOW, MEDIUM, HIGH, CRITICAL. NULL = default"
        },
        maxDiagnosisHours: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 24
        },
        maxRepairHours: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 72
        },
        maxTotalHours: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 168,
          comment: "7 days default"
        },
        escalationAfterHours: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 48
        },
        isActive: {
          type: Sequelize.BOOLEAN,
          defaultValue: true
        },
        createdAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      // ============================================
      // 11. ОБНОВЛЕНИЕ beryll_servers - пул подмены
      // ============================================
      await queryInterface.addColumn("beryll_servers", "isSubstitutePool", {
        type: Sequelize.BOOLEAN,
        defaultValue: false
      }, { transaction });

      await queryInterface.addColumn("beryll_servers", "substitutePoolAddedAt", {
        type: Sequelize.DATE,
        allowNull: true
      }, { transaction });

      await transaction.commit();
      console.log("✅ Migration 20260123-complete-business-logic-fix completed successfully");

    } catch (error) {
      await transaction.rollback();
      console.error("❌ Migration failed:", error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Удаляем в обратном порядке
      await queryInterface.removeColumn("beryll_servers", "substitutePoolAddedAt", { transaction });
      await queryInterface.removeColumn("beryll_servers", "isSubstitutePool", { transaction });
      
      await queryInterface.dropTable("sla_config", { transaction });
      await queryInterface.dropTable("user_aliases", { transaction });
      
      await queryInterface.removeColumn("beryll_server_components", "installedById", { transaction });
      await queryInterface.removeColumn("beryll_server_components", "installedAt", { transaction });
      await queryInterface.removeColumn("beryll_server_components", "inventoryId", { transaction });
      await queryInterface.removeColumn("beryll_server_components", "catalogId", { transaction });
      
      await queryInterface.dropTable("yadro_ticket_log", { transaction });
      await queryInterface.dropTable("substitute_server_pool", { transaction });
      await queryInterface.dropTable("beryll_cluster_racks", { transaction });
      
      await queryInterface.removeColumn("beryll_defect_records", "totalDowntimeMinutes", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "repairCompletedAt", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "repairStartedAt", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "diagnosisCompletedAt", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "diagnosisStartedAt", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "slaDeadline", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "substituteServerId", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "previousDefectId", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "replacementInventoryId", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "defectInventoryId", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "replacementComponentId", { transaction });
      await queryInterface.removeColumn("beryll_defect_records", "defectComponentId", { transaction });
      
      await queryInterface.dropTable("component_history", { transaction });
      await queryInterface.dropTable("component_inventory", { transaction });
      await queryInterface.dropTable("component_catalog", { transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
