/**
 * run-migration.js
 * 
 * Запуск: node run-migration.js
 * 
 * Положить в корень проекта MES-Kryptonit-Server-master/
 */

require("dotenv").config();
const { Sequelize } = require("sequelize");

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    dialect: "postgres",
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    logging: console.log
  }
);

async function runMigration() {
  try {
    console.log("🔌 Подключение к базе данных...");
    await sequelize.authenticate();
    console.log("✅ Подключено к:", process.env.DB_NAME);

    console.log("\n🚀 Запуск миграции: Дефекты + Мониторинг\n");

    // ============================================
    // 1. Добавляем поля мониторинга в beryll_servers
    // ============================================
    console.log("📊 Добавляем поля мониторинга в beryll_servers...");

    // lastPingAt
    await sequelize.query(`
      ALTER TABLE beryll_servers 
      ADD COLUMN IF NOT EXISTS "lastPingAt" TIMESTAMP;
    `).catch(e => console.log("  - lastPingAt:", e.message));

    // pingStatus ENUM
    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_servers_pingstatus') THEN
          CREATE TYPE "enum_beryll_servers_pingstatus" AS ENUM ('ONLINE', 'OFFLINE', 'UNKNOWN');
        END IF;
      END$$;
    `).catch(e => console.log("  - ENUM pingStatus:", e.message));

    // pingStatus column
    await sequelize.query(`
      ALTER TABLE beryll_servers 
      ADD COLUMN IF NOT EXISTS "pingStatus" "enum_beryll_servers_pingstatus" DEFAULT 'UNKNOWN';
    `).catch(e => console.log("  - pingStatus:", e.message));

    // pingLatency
    await sequelize.query(`
      ALTER TABLE beryll_servers 
      ADD COLUMN IF NOT EXISTS "pingLatency" FLOAT;
    `).catch(e => console.log("  - pingLatency:", e.message));

    console.log("✅ Поля мониторинга добавлены\n");

    // ============================================
    // 2. Создаём таблицу комментариев к дефектам
    // ============================================
    console.log("💬 Создаём таблицу beryll_defect_comments...");

    await sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_defect_comments_defectcategory') THEN
          CREATE TYPE "enum_beryll_defect_comments_defectcategory" AS ENUM ('HARDWARE', 'SOFTWARE', 'ASSEMBLY', 'COMPONENT', 'OTHER');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_defect_comments_priority') THEN
          CREATE TYPE "enum_beryll_defect_comments_priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_beryll_defect_comments_status') THEN
          CREATE TYPE "enum_beryll_defect_comments_status" AS ENUM ('NEW', 'IN_PROGRESS', 'RESOLVED', 'WONT_FIX');
        END IF;
      END$$;
    `);

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS beryll_defect_comments (
        id SERIAL PRIMARY KEY,
        "serverId" INTEGER NOT NULL REFERENCES beryll_servers(id) ON UPDATE CASCADE ON DELETE CASCADE,
        "userId" INTEGER NOT NULL REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        text TEXT NOT NULL,
        "defectCategory" "enum_beryll_defect_comments_defectcategory" DEFAULT 'OTHER',
        priority "enum_beryll_defect_comments_priority" DEFAULT 'MEDIUM',
        status "enum_beryll_defect_comments_status" NOT NULL DEFAULT 'NEW',
        "resolvedById" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        "resolvedAt" TIMESTAMP,
        resolution TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Индексы
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_comments_server ON beryll_defect_comments("serverId");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_comments_status ON beryll_defect_comments(status);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_comments_category ON beryll_defect_comments("defectCategory");`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_comments_priority ON beryll_defect_comments(priority);`);
    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_comments_created ON beryll_defect_comments("createdAt");`);

    console.log("✅ Таблица beryll_defect_comments создана\n");

    // ============================================
    // 3. Создаём таблицу файлов дефектов
    // ============================================
    console.log("📎 Создаём таблицу beryll_defect_files...");

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS beryll_defect_files (
        id SERIAL PRIMARY KEY,
        "commentId" INTEGER NOT NULL REFERENCES beryll_defect_comments(id) ON UPDATE CASCADE ON DELETE CASCADE,
        "originalName" VARCHAR(255) NOT NULL,
        "fileName" VARCHAR(255) NOT NULL,
        "filePath" VARCHAR(500) NOT NULL,
        "mimeType" VARCHAR(100),
        "fileSize" INTEGER,
        "uploadedById" INTEGER REFERENCES users(id) ON UPDATE CASCADE ON DELETE SET NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await sequelize.query(`CREATE INDEX IF NOT EXISTS idx_defect_files_comment ON beryll_defect_files("commentId");`);

    console.log("✅ Таблица beryll_defect_files создана\n");

    // ============================================
    // 4. Добавляем новые action типы в beryll_history
    // ============================================
    console.log("📝 Добавляем новые action типы в историю...");

    const newActions = [
      'DEFECT_COMMENT_ADDED',
      'DEFECT_STATUS_CHANGED',
      'DEFECT_COMMENT_DELETED',
      'DEFECT_FILE_UPLOADED',
      'DEFECT_FILE_DELETED'
    ];

    for (const action of newActions) {
      await sequelize.query(`
        DO $$
        BEGIN
          ALTER TYPE "enum_beryll_history_action" ADD VALUE IF NOT EXISTS '${action}';
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END$$;
      `).catch(e => console.log(`  - ${action}: уже существует`));
    }

    console.log("✅ Action типы добавлены\n");

    // ============================================
    // 5. Создаём папку для файлов
    // ============================================
    const fs = require("fs");
    const path = require("path");
    const uploadsDir = path.join(__dirname, "uploads/beryll/defects");
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      console.log("📁 Создана папка:", uploadsDir);
    } else {
      console.log("📁 Папка уже существует:", uploadsDir);
    }

    console.log("\n" + "=".repeat(50));
    console.log("✅ МИГРАЦИЯ УСПЕШНО ЗАВЕРШЕНА!");
    console.log("=".repeat(50));
    
    // Показать статус таблиц
    const [tables] = await sequelize.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name LIKE 'beryll%'
      ORDER BY table_name;
    `);
    console.log("\n📋 Таблицы Beryll:");
    tables.forEach(t => console.log("  -", t.table_name));

  } catch (error) {
    console.error("\n❌ ОШИБКА МИГРАЦИИ:", error.message);
    console.error(error);
    process.exit(1);
  } finally {
    await sequelize.close();
    console.log("\n🔌 Соединение закрыто");
  }
}

runMigration();