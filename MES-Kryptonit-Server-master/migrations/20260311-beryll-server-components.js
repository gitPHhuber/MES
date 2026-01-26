'use strict';

/**
 * Миграция: Комплектующие серверов Beryll
 * (бывший run-migration-components.js, адаптировано под sequelize-cli)
 */

module.exports = {
  async up(queryInterface, Sequelize) {
    // В идеале — в транзакции. Но CREATE TYPE/ALTER TYPE иногда конфликтуют с транзакциями
    // в зависимости от версии/условий. Поэтому делаем без общей транзакции, но запросы idempotent.

    // 1) ENUM типов комплектующих
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_component_type') THEN
          CREATE TYPE "enum_beryll_component_type" AS ENUM (
            'CPU', 'RAM', 'SSD', 'HDD', 'NVME',
            'NIC', 'MOTHERBOARD', 'PSU', 'GPU',
            'RAID', 'BMC', 'OTHER'
          );
        END IF;
      END$$;
    `);

    // 2) ENUM статусов
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_component_status') THEN
          CREATE TYPE "enum_beryll_component_status" AS ENUM (
            'OK', 'WARNING', 'CRITICAL', 'UNKNOWN'
          );
        END IF;
      END$$;
    `);

    // 3) Таблица комплектующих
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS beryll_server_components (
        id SERIAL PRIMARY KEY,
        "serverId" INTEGER NOT NULL REFERENCES beryll_servers(id) ON UPDATE CASCADE ON DELETE CASCADE,

        -- Тип и идентификация
        "componentType" "enum_beryll_component_type" NOT NULL,
        "slot" VARCHAR(50),

        -- Производитель и модель
        "manufacturer" VARCHAR(255),
        "model" VARCHAR(255),
        "serialNumber" VARCHAR(255),
        "partNumber" VARCHAR(255),

        -- Характеристики (общие)
        "capacity" VARCHAR(50),
        "capacityBytes" BIGINT,

        -- Для CPU
        "cores" INTEGER,
        "threads" INTEGER,
        "speedMHz" INTEGER,
        "architecture" VARCHAR(50),

        -- Для RAM
        "memoryType" VARCHAR(50),
        "speedMT" INTEGER,
        "rank" INTEGER,

        -- Для дисков
        "mediaType" VARCHAR(50),
        "interface" VARCHAR(50),
        "firmwareVersion" VARCHAR(100),

        -- Для NIC
        "macAddress" VARCHAR(17),
        "linkSpeed" VARCHAR(50),

        -- Статус и здоровье
        "status" "enum_beryll_component_status" DEFAULT 'UNKNOWN',
        "health" VARCHAR(50),
        "healthRollup" VARCHAR(50),

        -- Все данные из BMC (JSON)
        "rawData" JSONB,

        -- Мета
        "fetchedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "fetchedById" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 4) Индексы
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_components_server
      ON beryll_server_components("serverId");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_components_type
      ON beryll_server_components("componentType");
    `);
    await queryInterface.sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_components_serial
      ON beryll_server_components("serialNumber");
    `);

    // 5) Добавляем action тип в историю — но только если сам enum существует
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_history_action') THEN
          ALTER TYPE "enum_beryll_history_action" ADD VALUE IF NOT EXISTS 'COMPONENTS_FETCHED';
        END IF;
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);

    // 6) Добавляем поля в beryll_servers
    await queryInterface.sequelize.query(`
      ALTER TABLE beryll_servers
      ADD COLUMN IF NOT EXISTS "bmcAddress" VARCHAR(255);
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE beryll_servers
      ADD COLUMN IF NOT EXISTS "lastComponentsFetchAt" TIMESTAMP;
    `);
  },

  async down(queryInterface, Sequelize) {
    // Осторожный откат: удаляем таблицу и колонки.
    // Значение enum_beryll_history_action удалить корректно нельзя (Postgres не поддерживает DROP VALUE).
    // Типы enum удаляем только если ты уверен, что больше нигде не используются.

    await queryInterface.sequelize.query(`
      ALTER TABLE beryll_servers
      DROP COLUMN IF EXISTS "lastComponentsFetchAt";
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE beryll_servers
      DROP COLUMN IF EXISTS "bmcAddress";
    `);

    await queryInterface.sequelize.query(`
      DROP TABLE IF EXISTS beryll_server_components;
    `);

    // Если эти enum-ы используются ТОЛЬКО в этой таблице — можно удалить.
    // Если есть шанс, что они пригодятся ещё где-то — лучше оставить.
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_component_status') THEN
          DROP TYPE "enum_beryll_component_status";
        END IF;
      END$$;
    `);

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_component_type') THEN
          DROP TYPE "enum_beryll_component_type";
        END IF;
      END$$;
    `);
  }
};

