"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      // RBAC tables
      await queryInterface.createTable(
        "roles",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          name: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "abilities",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          code: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "users",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          login: { type: Sequelize.STRING, unique: true },
          password: { type: Sequelize.STRING },
          role: { type: Sequelize.STRING, defaultValue: "USER" },
          name: { type: Sequelize.STRING },
          surname: { type: Sequelize.STRING },
          img: { type: Sequelize.STRING },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "roles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "role_abilities",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "roles", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          abilityId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "abilities", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Structure tables
      await queryInterface.createTable(
        "production_sections",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "production_teams",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false },
          productionSectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          teamLeadId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addColumn(
        "users",
        "teamId",
        {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: { model: "production_teams", key: "id" },
          onUpdate: "CASCADE",
          onDelete: "SET NULL",
        },
        { transaction }
      );

      // General tables
      await queryInterface.createTable(
        "sessions",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          online: { type: Sequelize.BOOLEAN },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "audit_logs",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          action: { type: Sequelize.STRING, allowNull: false },
          entity: { type: Sequelize.STRING },
          entityId: { type: Sequelize.STRING },
          description: { type: Sequelize.TEXT },
          metadata: { type: Sequelize.JSON },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "PCs",
        {
          id: { type: Sequelize.SMALLINT, primaryKey: true, autoIncrement: true },
          ip: { type: Sequelize.STRING, allowNull: false, unique: true },
          pc_name: { type: Sequelize.STRING, allowNull: false },
          cabinet: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Production defect categories
      await queryInterface.createTable(
        "category_defects",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "FCs",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          unique_device_id: { type: Sequelize.STRING, allowNull: true },
          firmware: { type: Sequelize.BOOLEAN },
          stand_test: { type: Sequelize.BOOLEAN, allowNull: true },
          sessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "sessions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          categoryDefectId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "category_defects", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("FCs", ["unique_device_id"], {
        unique: true,
        where: { unique_device_id: { [Sequelize.Op.ne]: null } },
        transaction,
      });

      await queryInterface.createTable(
        "category_defect_915s",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "ELRS_915s",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          MAC_address: { type: Sequelize.STRING, allowNull: true },
          firmware: { type: Sequelize.BOOLEAN },
          firmwareVersion: { type: Sequelize.STRING, allowNull: true },
          sessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "sessions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          categoryDefect915Id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "category_defect_915s", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("ELRS_915s", ["MAC_address"], {
        unique: true,
        where: { MAC_address: { [Sequelize.Op.ne]: null } },
        transaction,
      });

      await queryInterface.createTable(
        "category_defect_2_4s",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "ELRS_2_4s",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          MAC_address: { type: Sequelize.STRING, allowNull: true },
          firmware: { type: Sequelize.BOOLEAN },
          sessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "sessions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          categoryDefect24Id: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "category_defect_2_4s", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("ELRS_2_4s", ["MAC_address"], {
        unique: true,
        where: { MAC_address: { [Sequelize.Op.ne]: null } },
        transaction,
      });

      await queryInterface.createTable(
        "category_defect_CoralBs",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.STRING },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "CoralBs",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          serial: { type: Sequelize.STRING, allowNull: true },
          firmware: { type: Sequelize.BOOLEAN },
          SAW_filter: { type: Sequelize.BOOLEAN },
          firmwareVersion: { type: Sequelize.STRING, allowNull: true },
          sessionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "sessions", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          categoryDefectCoralBId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "category_defect_CoralBs", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("CoralBs", ["serial"], {
        unique: true,
        where: { serial: { [Sequelize.Op.ne]: null } },
        transaction,
      });

      // Assembly routes
      await queryInterface.createTable(
        "assembly_routes",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false },
          productName: { type: Sequelize.STRING },
          description: { type: Sequelize.TEXT },
          isActive: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: true },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "assembly_route_steps",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          routeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "assembly_routes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          order: { type: Sequelize.INTEGER, allowNull: false },
          title: { type: Sequelize.STRING, allowNull: false },
          operation: { type: Sequelize.STRING, allowNull: false },
          sectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          teamId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_teams", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          description: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Warehouse tables
      await queryInterface.createTable(
        "supplies",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          supplier: { type: Sequelize.STRING },
          docNumber: { type: Sequelize.STRING },
          status: { type: Sequelize.STRING, defaultValue: "NEW" },
          comment: { type: Sequelize.TEXT },
          expectedDate: { type: Sequelize.DATEONLY },
          receivedAt: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "warehouse_boxes",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          supplyId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "supplies", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          qrCode: { type: Sequelize.STRING, allowNull: false, unique: true },
          shortCode: { type: Sequelize.STRING, allowNull: true, unique: true },
          label: { type: Sequelize.STRING, allowNull: false },
          originType: { type: Sequelize.STRING },
          originId: { type: Sequelize.INTEGER },
          quantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 1 },
          unit: { type: Sequelize.STRING, allowNull: false, defaultValue: "шт" },
          parentBoxId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "warehouse_boxes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          kitNumber: { type: Sequelize.STRING },
          projectName: { type: Sequelize.STRING },
          batchName: { type: Sequelize.STRING },
          status: { type: Sequelize.STRING, allowNull: false, defaultValue: "ON_STOCK" },
          notes: { type: Sequelize.TEXT },
          currentSectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          currentTeamId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_teams", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          acceptedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
          acceptedById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "warehouse_documents",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          boxId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "warehouse_boxes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          number: { type: Sequelize.STRING, allowNull: false },
          type: { type: Sequelize.STRING },
          date: { type: Sequelize.DATEONLY },
          fileUrl: { type: Sequelize.STRING },
          comment: { type: Sequelize.TEXT },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "warehouse_movements",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          boxId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "warehouse_boxes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          documentId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "warehouse_documents", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          fromSectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          fromTeamId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_teams", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          toSectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          toTeamId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_teams", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          operation: { type: Sequelize.STRING, allowNull: false },
          statusAfter: { type: Sequelize.STRING },
          deltaQty: { type: Sequelize.INTEGER, defaultValue: 0 },
          goodQty: { type: Sequelize.INTEGER },
          scrapQty: { type: Sequelize.INTEGER },
          performedById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          performedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
          comment: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "inventory_limits",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          originType: { type: Sequelize.STRING },
          originId: { type: Sequelize.INTEGER },
          label: { type: Sequelize.STRING },
          minQuantity: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Projects
      await queryInterface.createTable(
        "projects",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false, unique: true },
          description: { type: Sequelize.TEXT },
          status: { type: Sequelize.STRING, defaultValue: "ACTIVE" },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Production tasks
      await queryInterface.createTable(
        "production_tasks",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          title: { type: Sequelize.STRING, allowNull: false },
          originType: { type: Sequelize.STRING },
          originId: { type: Sequelize.INTEGER },
          targetQty: { type: Sequelize.INTEGER, allowNull: false },
          unit: { type: Sequelize.STRING, allowNull: false, defaultValue: "шт" },
          dueDate: { type: Sequelize.DATEONLY },
          status: { type: Sequelize.STRING, allowNull: false, defaultValue: "NEW" },
          priority: { type: Sequelize.INTEGER },
          comment: { type: Sequelize.TEXT },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          responsibleId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          sectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          targetSectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          projectId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "projects", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Print history
      await queryInterface.createTable(
        "print_histories",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          template: { type: Sequelize.STRING, allowNull: false },
          labelName: { type: Sequelize.STRING },
          startCode: { type: Sequelize.STRING },
          endCode: { type: Sequelize.STRING },
          quantity: { type: Sequelize.INTEGER },
          params: { type: Sequelize.JSONB },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          createdAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
          updatedAt: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
        },
        { transaction }
      );

      // Assembly recipes
      await queryInterface.createTable(
        "assembly_recipes",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          projectId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "projects", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          title: { type: Sequelize.STRING, allowNull: false },
          description: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "recipe_steps",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          recipeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "assembly_recipes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          order: { type: Sequelize.INTEGER, allowNull: false },
          title: { type: Sequelize.STRING, allowNull: false },
          quantity: { type: Sequelize.INTEGER, defaultValue: 1 },
          description: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.createTable(
        "assembly_processes",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          boxId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "warehouse_boxes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          recipeId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "assembly_recipes", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          completedSteps: { type: Sequelize.JSONB, defaultValue: [] },
          status: { type: Sequelize.STRING, defaultValue: "IN_PROGRESS" },
          startTime: { type: Sequelize.DATE, defaultValue: Sequelize.literal("CURRENT_TIMESTAMP") },
          endTime: { type: Sequelize.DATE },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Production output tables
      await queryInterface.createTable(
        "operation_types",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          name: { type: Sequelize.STRING(100), allowNull: false },
          code: { type: Sequelize.STRING(50) },
          description: { type: Sequelize.TEXT },
          unit: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "шт" },
          normMinutes: { type: Sequelize.FLOAT },
          sectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          isActive: { type: Sequelize.BOOLEAN, defaultValue: true },
          sortOrder: { type: Sequelize.INTEGER, defaultValue: 0 },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("operation_types", ["code"], {
        unique: true,
        where: { code: { [Sequelize.Op.ne]: null } },
        transaction,
      });

      await queryInterface.createTable(
        "production_outputs",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          date: { type: Sequelize.DATEONLY, allowNull: false },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "RESTRICT",
          },
          teamId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_teams", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          sectionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_sections", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          projectId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "projects", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          taskId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "production_tasks", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          operationTypeId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "operation_types", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          claimedQty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          approvedQty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          rejectedQty: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
          status: { type: Sequelize.STRING(20), allowNull: false, defaultValue: "pending" },
          approvedById: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          approvedAt: { type: Sequelize.DATE },
          createdById: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          comment: { type: Sequelize.TEXT },
          rejectReason: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("production_outputs", ["userId", "date"], { transaction });
      await queryInterface.addIndex("production_outputs", ["date"], { transaction });
      await queryInterface.addIndex("production_outputs", ["status"], { transaction });
      await queryInterface.addIndex("production_outputs", ["projectId"], { transaction });
      await queryInterface.addIndex("production_outputs", ["taskId"], { transaction });
      await queryInterface.addIndex("production_outputs", ["teamId"], { transaction });
      await queryInterface.addIndex("production_outputs", ["sectionId"], { transaction });
      await queryInterface.addIndex("production_outputs", ["operationTypeId"], { transaction });

      // Beryll servers
      await queryInterface.createTable(
        "beryll_servers",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          ipAddress: { type: Sequelize.STRING(45) },
          macAddress: { type: Sequelize.STRING(17) },
          hostname: { type: Sequelize.STRING(255) },
          serialNumber: { type: Sequelize.STRING(100) },
          bmcAddress: { type: Sequelize.STRING(45) },
          status: {
            type: Sequelize.ENUM("NEW", "IN_WORK", "CLARIFYING", "DEFECT", "DONE", "ARCHIVED"),
            allowNull: false,
            defaultValue: "NEW",
          },
          assignedToId: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: "users", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "SET NULL",
          },
          assignedAt: { type: Sequelize.DATE },
          notes: { type: Sequelize.TEXT },
          leaseStart: { type: Sequelize.DATE },
          leaseEnd: { type: Sequelize.DATE },
          leaseActive: { type: Sequelize.BOOLEAN, defaultValue: true },
          lastSyncAt: { type: Sequelize.DATE },
          lastComponentsFetchAt: { type: Sequelize.DATE },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      // Beryll components
      await queryInterface.createTable(
        "beryll_server_components",
        {
          id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
          serverId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: "beryll_servers", key: "id" },
            onUpdate: "CASCADE",
            onDelete: "CASCADE",
          },
          componentType: {
            type: Sequelize.ENUM(
              "CPU",
              "RAM",
              "HDD",
              "SSD",
              "NVME",
              "MOTHERBOARD",
              "GPU",
              "NIC",
              "RAID",
              "PSU",
              "FAN",
              "MEMORY_MODULE",
              "BACKPLANE",
              "BMC",
              "OTHER"
            ),
            allowNull: false,
          },
          name: { type: Sequelize.STRING(255), allowNull: false },
          manufacturer: { type: Sequelize.STRING(255) },
          model: { type: Sequelize.STRING(255) },
          serialNumber: { type: Sequelize.STRING(100) },
          partNumber: { type: Sequelize.STRING(100) },
          firmwareVersion: { type: Sequelize.STRING(100) },
          status: {
            type: Sequelize.ENUM("OK", "WARNING", "CRITICAL", "UNKNOWN", "NOT_PRESENT", "REPLACED"),
            allowNull: false,
            defaultValue: "UNKNOWN",
          },
          slot: { type: Sequelize.STRING(50) },
          capacity: { type: Sequelize.BIGINT },
          speed: { type: Sequelize.INTEGER },
          temperature: { type: Sequelize.FLOAT },
          healthPercent: { type: Sequelize.INTEGER },
          metadata: { type: Sequelize.JSONB, defaultValue: {} },
          dataSource: { type: Sequelize.STRING(50), defaultValue: "MANUAL" },
          lastUpdatedAt: { type: Sequelize.DATE },
          notes: { type: Sequelize.TEXT },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
          },
        },
        { transaction }
      );

      await queryInterface.addIndex("beryll_server_components", ["serverId"], { transaction });
      await queryInterface.addIndex("beryll_server_components", ["componentType"], { transaction });
      await queryInterface.addIndex("beryll_server_components", ["status"], { transaction });
      await queryInterface.addIndex(
        "beryll_server_components",
        ["serverId", "componentType", "slot"],
        { unique: true, transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();

    try {
      await queryInterface.dropTable("beryll_server_components", { transaction });
      await queryInterface.dropTable("beryll_servers", { transaction });
      await queryInterface.dropTable("production_outputs", { transaction });
      await queryInterface.dropTable("operation_types", { transaction });
      await queryInterface.dropTable("assembly_processes", { transaction });
      await queryInterface.dropTable("recipe_steps", { transaction });
      await queryInterface.dropTable("assembly_recipes", { transaction });
      await queryInterface.dropTable("print_histories", { transaction });
      await queryInterface.dropTable("production_tasks", { transaction });
      await queryInterface.dropTable("projects", { transaction });
      await queryInterface.dropTable("inventory_limits", { transaction });
      await queryInterface.dropTable("warehouse_movements", { transaction });
      await queryInterface.dropTable("warehouse_documents", { transaction });
      await queryInterface.dropTable("warehouse_boxes", { transaction });
      await queryInterface.dropTable("supplies", { transaction });
      await queryInterface.dropTable("assembly_route_steps", { transaction });
      await queryInterface.dropTable("assembly_routes", { transaction });
      await queryInterface.dropTable("CoralBs", { transaction });
      await queryInterface.dropTable("category_defect_CoralBs", { transaction });
      await queryInterface.dropTable("ELRS_2_4s", { transaction });
      await queryInterface.dropTable("category_defect_2_4s", { transaction });
      await queryInterface.dropTable("ELRS_915s", { transaction });
      await queryInterface.dropTable("category_defect_915s", { transaction });
      await queryInterface.dropTable("FCs", { transaction });
      await queryInterface.dropTable("category_defects", { transaction });
      await queryInterface.dropTable("PCs", { transaction });
      await queryInterface.dropTable("audit_logs", { transaction });
      await queryInterface.dropTable("sessions", { transaction });
      await queryInterface.removeColumn("users", "teamId", { transaction });
      await queryInterface.dropTable("production_teams", { transaction });
      await queryInterface.dropTable("production_sections", { transaction });
      await queryInterface.dropTable("role_abilities", { transaction });
      await queryInterface.dropTable("users", { transaction });
      await queryInterface.dropTable("abilities", { transaction });
      await queryInterface.dropTable("roles", { transaction });

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_beryll_server_components_componentType";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_beryll_server_components_status";',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_beryll_servers_status";',
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },
};
