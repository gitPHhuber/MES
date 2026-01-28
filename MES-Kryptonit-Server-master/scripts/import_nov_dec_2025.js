/**
 * Скрипт импорта выработки за Ноябрь-Декабрь 2025 в MES Kryptonit
 * Источник: Выработка_на_сотрудника_Крылов_Олег_2.xlsx (листы Нояб, Дек)
 * 
 * Использование:
 * 1. Скопировать файл в папку сервера MES: scripts/
 * 2. Запустить: node scripts/import_nov_dec_2025.js
 */

// Загружаем .env файл
require('dotenv').config();

const { Sequelize, DataTypes, Op } = require("sequelize");

// Подключение к БД из переменных окружения
const sequelize = new Sequelize(
    process.env.DB_NAME || 'flight_controller_database',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || '',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false
    }
);

// ============ МОДЕЛИ ============

const User = sequelize.define("user", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    surname: { type: DataTypes.STRING },
}, {
    tableName: "users",
    timestamps: false
});

const OperationType = sequelize.define("operation_type", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING(100), allowNull: false },
    code: { type: DataTypes.STRING(50), allowNull: true },
    description: { type: DataTypes.TEXT, allowNull: true },
    unit: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'шт' },
    normMinutes: { type: DataTypes.FLOAT, allowNull: true },
    sectionId: { type: DataTypes.INTEGER, allowNull: true },
    isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
    sortOrder: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: "operation_types",
    timestamps: true
});

const ProductionOutput = sequelize.define("production_output", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    userId: { type: DataTypes.INTEGER, allowNull: false },
    teamId: { type: DataTypes.INTEGER, allowNull: true },
    sectionId: { type: DataTypes.INTEGER, allowNull: true },
    projectId: { type: DataTypes.INTEGER, allowNull: true },
    taskId: { type: DataTypes.INTEGER, allowNull: true },
    operationTypeId: { type: DataTypes.INTEGER, allowNull: true },
    claimedQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    approvedQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    rejectedQty: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
    status: { type: DataTypes.STRING(20), allowNull: false, defaultValue: 'approved' },
    approvedById: { type: DataTypes.INTEGER, allowNull: true },
    approvedAt: { type: DataTypes.DATE, allowNull: true },
    createdById: { type: DataTypes.INTEGER, allowNull: true },
    comment: { type: DataTypes.TEXT, allowNull: true },
    rejectReason: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: "production_outputs",
    timestamps: true
});

// ============ ДАННЫЕ ДЛЯ ИМПОРТА ============

const IMPORT_DATA = [
  // ===== НОЯБРЬ 2025 (12 записей) =====
  {"employee": "Зеленова Анастасия", "date": "2025-11-01", "quantity": 175, "month_name": "Ноябрь 2025"},
  {"employee": "Зеленова Анастасия", "date": "2025-11-05", "quantity": 180, "month_name": "Ноябрь 2025"},
  {"employee": "Морозов Денис", "date": "2025-11-01", "quantity": 60, "month_name": "Ноябрь 2025"},
  {"employee": "Морозов Денис", "date": "2025-11-05", "quantity": 180, "month_name": "Ноябрь 2025"},
  {"employee": "Крылов Олег", "date": "2025-11-01", "quantity": 50, "month_name": "Ноябрь 2025"},
  {"employee": "Крылов Олег", "date": "2025-11-05", "quantity": 210, "month_name": "Ноябрь 2025"},
  {"employee": "Тарасов Алексей", "date": "2025-11-01", "quantity": 200, "month_name": "Ноябрь 2025"},
  {"employee": "Тарасов Алексей", "date": "2025-11-05", "quantity": 260, "month_name": "Ноябрь 2025"},
  {"employee": "Саприна Елена", "date": "2025-11-01", "quantity": 120, "month_name": "Ноябрь 2025"},
  {"employee": "Саприна Елена", "date": "2025-11-05", "quantity": 120, "month_name": "Ноябрь 2025"},
  {"employee": "Сысоев Иван", "date": "2025-11-01", "quantity": 170, "month_name": "Ноябрь 2025"},
  {"employee": "Сысоев Иван", "date": "2025-11-05", "quantity": 200, "month_name": "Ноябрь 2025"},
  
  // ===== ДЕКАБРЬ 2025 (21 запись) =====
  {"employee": "Зеленова Анастасия", "date": "2025-12-01", "quantity": 20, "month_name": "Декабрь 2025"},
  {"employee": "Морозов Денис", "date": "2025-12-01", "quantity": 60, "month_name": "Декабрь 2025"},
  {"employee": "Крылов Олег", "date": "2025-12-01", "quantity": 20, "month_name": "Декабрь 2025"},
  {"employee": "Мишин Игорь", "date": "2025-12-01", "quantity": 240, "month_name": "Декабрь 2025"},
  {"employee": "Саприна Елена", "date": "2025-12-01", "quantity": 140, "month_name": "Декабрь 2025"},
  {"employee": "Саприна Елена", "date": "2025-12-12", "quantity": 100, "month_name": "Декабрь 2025"},
  {"employee": "Ишин Алексей", "date": "2025-12-01", "quantity": 260, "month_name": "Декабрь 2025"},
  {"employee": "Ишин Алексей", "date": "2025-12-02", "quantity": 240, "month_name": "Декабрь 2025"},
  {"employee": "Кирсанов Олег (практ.)", "date": "2025-12-01", "quantity": 120, "month_name": "Декабрь 2025"},
  {"employee": "Кирсанов Олег (практ.)", "date": "2025-12-02", "quantity": 120, "month_name": "Декабрь 2025"},
  {"employee": "Овсянников Андрей (практ.)", "date": "2025-12-01", "quantity": 140, "month_name": "Декабрь 2025"},
  {"employee": "Овсянников Андрей (практ.)", "date": "2025-12-02", "quantity": 120, "month_name": "Декабрь 2025"},
  {"employee": "Богомолов Александр", "date": "2025-12-01", "quantity": 220, "month_name": "Декабрь 2025"},
  {"employee": "Богомолов Александр", "date": "2025-12-02", "quantity": 100, "month_name": "Декабрь 2025"},
  {"employee": "Зиатдинов Артур", "date": "2025-12-01", "quantity": 160, "month_name": "Декабрь 2025"},
  {"employee": "Зиатдинов Артур", "date": "2025-12-11", "quantity": 60, "month_name": "Декабрь 2025"},
  {"employee": "Зиатдинов Артур", "date": "2025-12-12", "quantity": 140, "month_name": "Декабрь 2025"},
  {"employee": "Владислав Дроган", "date": "2025-12-01", "quantity": 300, "month_name": "Декабрь 2025"},
  {"employee": "Владислав Дроган", "date": "2025-12-02", "quantity": 120, "month_name": "Декабрь 2025"},
  {"employee": "Саутин Дмитрий", "date": "2025-12-01", "quantity": 280, "month_name": "Декабрь 2025"},
  {"employee": "Саутин Дмитрий", "date": "2025-12-02", "quantity": 240, "month_name": "Декабрь 2025"},
];

// ============ МАППИНГ СОТРУДНИКОВ (из Keycloak) ============

const NAME_VARIANTS = {
  // Ноябрь
  "Зеленова Анастасия": ["Зеленова", "Анастасия"],
  "Морозов Денис": ["Морозов", "Денис"],
  "Крылов Олег": ["Крылов", "Олег"],
  "Тарасов Алексей": ["Тарасов", "Алексей"],
  "Саприна Елена": ["Саприна", "Елена"],
  "Сысоев Иван": ["Сысоев", "Иван"],
  // Декабрь (дополнительные)
  "Мишин Игорь": ["Мишин", "Игорь"],
  "Ишин Алексей": ["Ишин", "Алексей"],
  "Богомолов Александр": ["Богомолов", "Александр"],
  "Зиатдинов Артур": ["Зиатдинов", "Артур"],
  "Владислав Дроган": ["Дроган", "Владислав"],
  "Саутин Дмитрий": ["Саутин", "Дмитрий"],
  // Практиканты - раскомментировать если добавлены в систему
  // "Кирсанов Олег (практ.)": ["Кирсанов", "Олег"],
  // "Овсянников Андрей (практ.)": ["Овсянников", "Андрей"],
};

// ============ ФУНКЦИИ ============

async function findOrCreateOperationType() {
    let opType = await OperationType.findOne({
        where: { code: "THERMAL_CALIBRATION" }
    });

    if (!opType) {
        opType = await OperationType.create({
            name: "Тепловизор калибровка",
            code: "THERMAL_CALIBRATION",
            description: "Калибровка тепловизоров (импорт из Excel)",
            unit: "шт",
            isActive: true
        });
        console.log(`✅ Создан тип операции: ${opType.name} (ID: ${opType.id})`);
    } else {
        console.log(`ℹ️  Тип операции уже существует: ${opType.name} (ID: ${opType.id})`);
    }

    return opType;
}

async function findUserByName(fullName) {
    const variants = NAME_VARIANTS[fullName];
    if (!variants) {
        return null;
    }

    const [surname, name] = variants;

    // Поиск по точному совпадению
    let user = await User.findOne({
        where: { surname, name }
    });

    if (!user) {
        // Поиск без учёта регистра
        user = await User.findOne({
            where: {
                [Op.and]: [
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('surname')),
                        surname.toLowerCase()
                    ),
                    sequelize.where(
                        sequelize.fn('LOWER', sequelize.col('name')),
                        name.toLowerCase()
                    )
                ]
            }
        });
    }

    return user;
}

async function importData() {
    try {
        // Проверяем подключение
        await sequelize.authenticate();
        console.log("📦 Подключение к БД установлено");
        console.log(`   База: ${process.env.DB_NAME || 'flight_controller_database'}`);
        console.log(`   Хост: ${process.env.DB_HOST || 'localhost'}\n`);

        // Создаём/находим тип операции
        const operationType = await findOrCreateOperationType();
        const operationTypeId = operationType.id;

        // Статистика
        const stats = {
            total: IMPORT_DATA.length,
            success: 0,
            skipped: 0,
            userNotFound: [],
            duplicates: 0,
            byMonth: {}
        };

        // Кэш пользователей
        const userCache = new Map();

        console.log("\n🔄 Начинаем импорт Ноябрь-Декабрь 2025...\n");

        for (const record of IMPORT_DATA) {
            const { employee, date, quantity, month_name } = record;

            // Получаем пользователя из кэша или ищем в БД
            let userId = userCache.get(employee);
            
            if (userId === undefined) {
                const user = await findUserByName(employee);
                if (user) {
                    userId = user.id;
                    userCache.set(employee, userId);
                    console.log(`👤 Найден: ${employee} -> ID ${userId}`);
                } else {
                    userCache.set(employee, null);
                    if (!stats.userNotFound.includes(employee)) {
                        stats.userNotFound.push(employee);
                        console.log(`❌ Не найден: ${employee}`);
                    }
                }
            }

            if (!userId) {
                stats.skipped++;
                continue;
            }

            // Проверяем дубликаты
            const existing = await ProductionOutput.findOne({
                where: {
                    userId,
                    date,
                    operationTypeId,
                    claimedQty: quantity
                }
            });

            if (existing) {
                stats.duplicates++;
                continue;
            }

            // Создаём запись
            await ProductionOutput.create({
                date,
                userId,
                operationTypeId,
                claimedQty: quantity,
                approvedQty: quantity,
                status: 'approved',
                comment: `Импорт из Excel (${month_name})`
            });

            stats.success++;
            stats.byMonth[month_name] = (stats.byMonth[month_name] || 0) + 1;
        }

        // Результаты
        console.log("\n" + "=".repeat(50));
        console.log("📊 РЕЗУЛЬТАТЫ ИМПОРТА:");
        console.log("=".repeat(50));
        console.log(`✅ Успешно импортировано: ${stats.success}`);
        console.log(`⏭️  Пропущено: ${stats.skipped}`);
        console.log(`🔄 Дубликаты: ${stats.duplicates}`);
        
        console.log(`\n📅 По месяцам:`);
        for (const [month, count] of Object.entries(stats.byMonth)) {
            console.log(`   ${month}: ${count} записей`);
        }
        
        if (stats.userNotFound.length > 0) {
            console.log(`\n⚠️  Не найдены пользователи (${stats.userNotFound.length}):`);
            stats.userNotFound.forEach(name => console.log(`   - ${name}`));
        }

        console.log("\n✨ Импорт завершён!");

    } catch (error) {
        console.error("❌ Ошибка импорта:", error);
    } finally {
        await sequelize.close();
    }
}

// Запуск
importData();