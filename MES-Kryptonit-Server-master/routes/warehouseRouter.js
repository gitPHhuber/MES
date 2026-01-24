require("dotenv").config();
const express = require("express");
const sequelize = require("./db");
const models = require("./models/index");
const cors = require("cors");
const fileUpload = require("express-fileupload");
const router = require("./routes/index");
const errorHandler = require("./middleware/ErrorHandlingMiddleware");
const path = require("path");
const KeycloakSyncService = require("./services/KeycloakSyncService");

// Импорт роутера для Beryll Extended
const beryllExtendedRouter = require("./routes/beryllExtendedRouter");

const { initChecklistTemplates } = require("./controllers/beryll");
const { scheduleReleaseExpiredReservations } = require("./jobs/releaseExpiredReservations");

const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json());

const corsOptions = {
  origin: "*",
  credentials: true,
  optionSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.static(path.resolve(__dirname, "static")));
app.use(fileUpload({}));

// Основной роутер
app.use("/api", router);

// Роутер для Beryll Extended
// Примечание: он монтируется также на /api/beryll, дополняя основной роутер
app.use("/api/beryll", beryllExtendedRouter);

// Обработка ошибок, последний Middleware
app.use(errorHandler);

const initInitialData = async () => {
  try {
    console.log(">>> [RBAC] Начинаем инициализацию ролей и прав...");

    // 1. Создаем список прав (Slugs) согласно ТЗ
    const permissions = [
      // Система
      { code: "rbac.manage", description: "Управление ролями и матрицей прав" },
      { code: "users.manage", description: "Назначение ролей пользователям" },
      
      // Склад
      { code: "warehouse.view", description: "Просмотр остатков" },
      { code: "warehouse.manage", description: "Приемка, создание коробок, перемещение" },
      { code: "labels.print", description: "Печать этикеток" },
      
      // Сборка
      { code: "assembly.execute", description: "Работа в сборочном терминале" },
      { code: "recipe.manage", description: "Создание и редактирование техкарт" },
      
      // Устройства (Прошивка)
      { code: "firmware.flash", description: "Прошивка плат (FC, ELRS, Coral)" },
      { code: "devices.view", description: "Просмотр списка устройств" },
      
      // Качество (ОТК)
      { code: "defect.manage", description: "Управление справочниками брака" },
      { code: "defect.report", description: "Фиксация брака" },
      
      // Аналитика
      { code: "analytics.view", description: "Просмотр дашбордов и рейтингов" },

      // --- ДОБАВЛЕНО: Права для модуля Берилл ---
      { code: "beryll.view", description: "Просмотр серверов АПК Берилл" },
      { code: "beryll.work", description: "Взятие в работу и настройка серверов" },
      { code: "beryll.manage", description: "Управление модулем (Синхронизация DHCP)" },

      // --- ДОБАВЛЕНО: Управление ролями ---
      { code: "roles.view", description: "Просмотр списка ролей" },
      { code: "roles.manage", description: "Создание, изменение и удаление ролей" },
    ];

    // Upsert прав
    for (const p of permissions) {
      await models.Ability.findOrCreate({ where: { code: p.code }, defaults: p });
    }

    // 2. Создаем Роли
    const rolesData = {
      SUPER_ADMIN: "Полный доступ (DevOps/Admin)",
      PRODUCTION_CHIEF: "Нач. производства",
      TECHNOLOGIST: "Технолог",
      WAREHOUSE_MASTER: "Кладовщик",
      ASSEMBLER: "Сборщик",
      QC_ENGINEER: "Инженер ОТК",
      FIRMWARE_OPERATOR: "Прошивальщик"
    };

    for (const [name, desc] of Object.entries(rolesData)) {
      await models.Role.findOrCreate({ 
        where: { name }, 
        defaults: { description: desc } 
      });
    }

    // 3. Матрица доступа (Связываем Роли и Права)
    const assign = async (roleName, slugs) => {
      const role = await models.Role.findOne({ where: { name: roleName } });
      if (!role) return;
      
      let abilities;
      if (slugs === '*') {
        // Даем все права
        abilities = await models.Ability.findAll();
      } else {
        abilities = await models.Ability.findAll({ where: { code: slugs } });
      }
      
      if (abilities.length) {
        await role.setAbilities(abilities);
      }
    };

    // --- Конфигурация матрицы ---
    
    await assign("SUPER_ADMIN", '*');

    await assign("PRODUCTION_CHIEF", [
      "analytics.view", "users.manage", "defect.manage", 
      "warehouse.view", "devices.view", "recipe.manage",
      "beryll.view"
    ]);

    await assign("TECHNOLOGIST", [
      "recipe.manage", "firmware.flash", "devices.view",
      "defect.manage",
      "beryll.view", "beryll.work", "beryll.manage"
    ]);

    await assign("WAREHOUSE_MASTER", [
      "warehouse.view", "warehouse.manage", "labels.print"
    ]);

    await assign("ASSEMBLER", [
      "assembly.execute"
    ]);

    await assign("QC_ENGINEER", [
      "defect.report", "devices.view", "warehouse.view"
    ]);

    await assign("FIRMWARE_OPERATOR", [
      "firmware.flash", "devices.view",
      "beryll.view", "beryll.work"
    ]);

    console.log(">>> [RBAC] Инициализация завершена успешно.");
  } catch (e) {
    console.error(">>> [RBAC] Ошибка инициализации:", e);
  }
};

const start = async () => {
  try {
    // Подключаемся к базе, миграции выполняются отдельно (deploy/CI или вручную)
    await sequelize.authenticate();
    
    // Инициализация прав доступа
    await initInitialData();

    // Инициализация шаблонов чек-листов для Берилл
    console.log(">>> [Beryll] Инициализация шаблонов чек-листов...");
    await initChecklistTemplates();
    console.log(">>> [Beryll] Шаблоны чек-листов инициализированы");

    // Запуск джоба для очистки просроченных резервов (MOD-005)
    scheduleReleaseExpiredReservations();

    // Auto-sync ролей с Keycloak (MOD-008)
    if (process.env.KEYCLOAK_AUTO_SYNC !== "false") {
      console.log("🔄 Auto-syncing roles from Keycloak...");
      try {
        await KeycloakSyncService.syncRolesFromKeycloak();
      } catch (error) {
        console.error("⚠️ [Keycloak] Auto-sync failed:", error.message);
      }
    }

    app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
  } catch (e) {
    console.log(e);
  }
};

start();