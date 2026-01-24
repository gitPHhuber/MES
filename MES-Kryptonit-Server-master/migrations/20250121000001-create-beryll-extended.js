/**
 * Миграция: Создание расширенных таблиц Beryll
 * 
 * - Стойки (beryll_racks, beryll_rack_units)
 * - Комплекты/Отгрузки (beryll_shipments)
 * - Кластеры (beryll_clusters, beryll_cluster_servers)
 * - Учёт брака (beryll_defect_records, beryll_defect_record_files)
 * - История (beryll_extended_history)
 * 
 * Запуск: npx sequelize-cli db:migrate
 * Откат: npx sequelize-cli db:migrate:undo --name XXXXXX-create-beryll-extended.js
 */

"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // ============================================
      // 1. СТОЙКИ (beryll_racks)
      // ============================================
      await queryInterface.createTable("beryll_racks", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false,
          unique: true
        },
        location: {
          type: Sequelize.STRING(255),
          allowNull: true
        },
        totalUnits: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 42
        },
        networkSubnet: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        gateway: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("ACTIVE", "MAINTENANCE", "DECOMMISSIONED"),
          allowNull: false,
          defaultValue: "ACTIVE"
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {}
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_racks", ["name"], { transaction });
      await queryInterface.addIndex("beryll_racks", ["status"], { transaction });
      await queryInterface.addIndex("beryll_racks", ["location"], { transaction });

      // ============================================
      // 2. ПОЗИЦИИ В СТОЙКАХ (beryll_rack_units)
      // ============================================
      await queryInterface.createTable("beryll_rack_units", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        rackId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "beryll_racks",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        serverId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "beryll_servers",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        unitNumber: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        hostname: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        mgmtMacAddress: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        mgmtIpAddress: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        dataMacAddress: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        dataIpAddress: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        accessLogin: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        accessPassword: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        installedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        installedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_rack_units", ["rackId"], { transaction });
      await queryInterface.addIndex("beryll_rack_units", ["serverId"], { transaction });
      await queryInterface.addIndex("beryll_rack_units", ["rackId", "unitNumber"], { 
        unique: true, 
        transaction,
        name: "beryll_rack_units_rack_unit_unique"
      });
      await queryInterface.addIndex("beryll_rack_units", ["hostname"], { transaction });

      // ============================================
      // 3. КОМПЛЕКТЫ/ОТГРУЗКИ (beryll_shipments)
      // ============================================
      await queryInterface.createTable("beryll_shipments", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(200),
          allowNull: false
        },
        destinationCity: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        destinationAddress: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        contactPerson: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        contactPhone: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        expectedCount: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 80
        },
        status: {
          type: Sequelize.ENUM("FORMING", "READY", "SHIPPED", "IN_TRANSIT", "DELIVERED", "ACCEPTED"),
          allowNull: false,
          defaultValue: "FORMING"
        },
        plannedShipDate: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        actualShipDate: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        deliveredAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        acceptedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        waybillNumber: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        carrier: {
          type: Sequelize.STRING(200),
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {}
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_shipments", ["name"], { transaction });
      await queryInterface.addIndex("beryll_shipments", ["status"], { transaction });
      await queryInterface.addIndex("beryll_shipments", ["destinationCity"], { transaction });
      await queryInterface.addIndex("beryll_shipments", ["plannedShipDate"], { transaction });

      // ============================================
      // 4. КЛАСТЕРЫ (beryll_clusters)
      // ============================================
      await queryInterface.createTable("beryll_clusters", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        name: {
          type: Sequelize.STRING(100),
          allowNull: false
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        shipmentId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "beryll_shipments",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        expectedCount: {
          type: Sequelize.INTEGER,
          allowNull: true,
          defaultValue: 10
        },
        status: {
          type: Sequelize.ENUM("FORMING", "READY", "SHIPPED", "DEPLOYED"),
          allowNull: false,
          defaultValue: "FORMING"
        },
        configVersion: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        createdById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {}
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_clusters", ["name"], { transaction });
      await queryInterface.addIndex("beryll_clusters", ["shipmentId"], { transaction });
      await queryInterface.addIndex("beryll_clusters", ["status"], { transaction });

      // ============================================
      // 5. СВЯЗЬ КЛАСТЕР-СЕРВЕР (beryll_cluster_servers)
      // ============================================
      await queryInterface.createTable("beryll_cluster_servers", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        clusterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "beryll_clusters",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        serverId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "beryll_servers",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        role: {
          type: Sequelize.ENUM("MASTER", "WORKER", "STORAGE", "GATEWAY"),
          allowNull: false,
          defaultValue: "WORKER"
        },
        orderNumber: {
          type: Sequelize.INTEGER,
          allowNull: true
        },
        clusterHostname: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        clusterIpAddress: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        addedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        addedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_cluster_servers", ["clusterId"], { transaction });
      await queryInterface.addIndex("beryll_cluster_servers", ["serverId"], { transaction });
      await queryInterface.addIndex("beryll_cluster_servers", ["clusterId", "serverId"], { 
        unique: true, 
        transaction,
        name: "beryll_cluster_servers_unique"
      });
      await queryInterface.addIndex("beryll_cluster_servers", ["role"], { transaction });

      // ============================================
      // 6. ЗАПИСИ О БРАКЕ (beryll_defect_records)
      // ============================================
      await queryInterface.createTable("beryll_defect_records", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        serverId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "beryll_servers",
            key: "id"
          },
          onDelete: "CASCADE"
        },
        yadroTicketNumber: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        hasSPISI: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        },
        clusterCode: {
          type: Sequelize.STRING(50),
          allowNull: true
        },
        problemDescription: {
          type: Sequelize.TEXT,
          allowNull: false
        },
        detectedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        detectedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        diagnosticianId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        repairPartType: {
          type: Sequelize.ENUM("RAM", "MOTHERBOARD", "CPU", "HDD", "SSD", "PSU", "FAN", "RAID", "NIC", "BACKPLANE", "BMC", "CABLE", "OTHER"),
          allowNull: true
        },
        defectPartSerialYadro: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        defectPartSerialManuf: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        replacementPartSerialYadro: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        replacementPartSerialManuf: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        repairDetails: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        status: {
          type: Sequelize.ENUM("NEW", "DIAGNOSING", "WAITING_PARTS", "REPAIRING", "SENT_TO_YADRO", "RETURNED", "RESOLVED", "REPEATED", "CLOSED"),
          allowNull: false,
          defaultValue: "NEW"
        },
        isRepeatedDefect: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        },
        repeatedDefectReason: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        repeatedDefectDate: {
          type: Sequelize.DATE,
          allowNull: true
        },
        sentToYadroRepair: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        },
        sentToYadroAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        returnedFromYadro: {
          type: Sequelize.BOOLEAN,
          allowNull: true,
          defaultValue: false
        },
        returnedFromYadroAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        substituteServerSerial: {
          type: Sequelize.STRING(100),
          allowNull: true
        },
        resolvedAt: {
          type: Sequelize.DATE,
          allowNull: true
        },
        resolvedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        resolution: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        notes: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true,
          defaultValue: {}
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_defect_records", ["serverId"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["yadroTicketNumber"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["status"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["detectedAt"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["repairPartType"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["diagnosticianId"], { transaction });
      await queryInterface.addIndex("beryll_defect_records", ["isRepeatedDefect"], { transaction });

      // ============================================
      // 7. ФАЙЛЫ ЗАПИСЕЙ О БРАКЕ (beryll_defect_record_files)
      // ============================================
      await queryInterface.createTable("beryll_defect_record_files", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        defectRecordId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: "beryll_defect_records",
            key: "id"
          },
          onDelete: "CASCADE"
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
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_defect_record_files", ["defectRecordId"], { transaction });

      // ============================================
      // 8. ИСТОРИЯ (beryll_extended_history)
      // ============================================
      await queryInterface.createTable("beryll_extended_history", {
        id: {
          type: Sequelize.INTEGER,
          primaryKey: true,
          autoIncrement: true
        },
        entityType: {
          type: Sequelize.ENUM("RACK", "CLUSTER", "SHIPMENT", "DEFECT_RECORD"),
          allowNull: false
        },
        entityId: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        action: {
          type: Sequelize.STRING(50),
          allowNull: false
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: "users",
            key: "id"
          },
          onDelete: "SET NULL"
        },
        comment: {
          type: Sequelize.TEXT,
          allowNull: true
        },
        changes: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        metadata: {
          type: Sequelize.JSONB,
          allowNull: true
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal("CURRENT_TIMESTAMP")
        }
      }, { transaction });

      await queryInterface.addIndex("beryll_extended_history", ["entityType", "entityId"], { transaction });
      await queryInterface.addIndex("beryll_extended_history", ["userId"], { transaction });
      await queryInterface.addIndex("beryll_extended_history", ["createdAt"], { transaction });

      await transaction.commit();
      console.log("✅ Миграция beryll_extended успешно выполнена");
      
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Ошибка миграции:", error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();
    
    try {
      // Удаляем в обратном порядке (зависимости)
      await queryInterface.dropTable("beryll_extended_history", { transaction });
      await queryInterface.dropTable("beryll_defect_record_files", { transaction });
      await queryInterface.dropTable("beryll_defect_records", { transaction });
      await queryInterface.dropTable("beryll_cluster_servers", { transaction });
      await queryInterface.dropTable("beryll_clusters", { transaction });
      await queryInterface.dropTable("beryll_shipments", { transaction });
      await queryInterface.dropTable("beryll_rack_units", { transaction });
      await queryInterface.dropTable("beryll_racks", { transaction });

      // Удаляем ENUM типы
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_racks_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_shipments_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_clusters_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_cluster_servers_role";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_defect_records_repairPartType";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_defect_records_status";', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_beryll_extended_history_entityType";', { transaction });

      await transaction.commit();
      console.log("✅ Откат миграции beryll_extended выполнен");
      
    } catch (error) {
      await transaction.rollback();
      console.error("❌ Ошибка отката:", error);
      throw error;
    }
  }
};
