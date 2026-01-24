/**
 * Миграция: Комплектующие серверов Beryll
 * 
 * Запуск: node run-migration-components.js
 */

require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST || "localhost",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log("🔌 Подключение к базе данных...");
    await sequelize.authenticate();
    console.log(`✅ Подключено к: ${process.env.DB_NAME}\n`);

    console.log("🚀 Запуск миграции: Комплектующие серверов\n");

    // 1. Создаём ENUM для типов комплектующих
    console.log("📦 Создаём ENUM типов комплектующих...");
    await sequelize.query(`
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

    // 2. Создаём ENUM для статусов
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_component_status') THEN
          CREATE TYPE "enum_beryll_component_status" AS ENUM (
            'OK', 'WARNING', 'CRITICAL', 'UNKNOWN'
          );
        END IF;
      END$$;
    `);
    console.log("✅ ENUM типы созданы\n");

    // 3. Создаём таблицу комплектующих
    console.log("💾 Создаём таблицу beryll_server_components...");
    await sequelize.query(`
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

    // 4. Индексы
    console.log("📇 Создаём индексы...");
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_components_server ON beryll_server_components("serverId");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_components_type ON beryll_server_components("componentType");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_components_serial ON beryll_server_components("serialNumber");`);
    console.log("✅ Таблица beryll_server_components создана\n");

    // 5. Добавляем action тип в историю
    console.log("📝 Добавляем action тип COMPONENTS_FETCHED...");
    await sequelize.query(`
      DO $$
      BEGIN
        ALTER TYPE "enum_beryll_history_action" ADD VALUE IF NOT EXISTS 'COMPONENTS_FETCHED';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END$$;
    `);
    console.log("✅ Action тип добавлен\n");

    // 6. Добавляем поле bmcAddress в beryll_servers (опционально)
    console.log("🔧 Добавляем поле bmcAddress в beryll_servers...");
    await sequelize.query(`
      ALTER TABLE beryll_servers 
      ADD COLUMN IF NOT EXISTS "bmcAddress" VARCHAR(255);
    `);
    await sequelize.query(`
      ALTER TABLE beryll_servers 
      ADD COLUMN IF NOT EXISTS "lastComponentsFetchAt" TIMESTAMP;
    `);
    console.log("✅ Поля добавлены\n");

    console.log("==================================================");
    console.log("✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!");
    console.log("==================================================\n");

    // Показать созданные таблицы
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'beryll%'
      ORDER BY table_name;
    `);
    console.log("📋 Таблицы Beryll:");
    tables.forEach(t => console.log(`  - ${t.table_name}`));

  } catch (error) {
    console.error("❌ Ошибка миграции:", error.message);
    console.error(error);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Соединение закрыто");
  }
}

runMigration();
