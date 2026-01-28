/**
 * RankingsController.js
 * Контроллер рейтингов сотрудников
 * 
 * Поддерживаемые периоды:
 * - day: Сегодня
 * - week: Текущая неделя (с понедельника)
 * - month: Текущий месяц
 * - year: Текущий год
 * - all: За всё время
 * - custom: Кастомный диапазон (требует startDate и endDate)
 */

const { WarehouseMovement, User, Team, Section } = require("../models/index");
const { ProductionOutput, OUTPUT_STATUSES } = require("../models/ProductionOutput");
const { Op } = require("sequelize");
const sequelize = require("../db");
const ApiError = require("../error/ApiError");

/**
 * Вычисляет даты начала и конца для заданного периода
 */
function calculateDateRange(period, customStartDate, customEndDate) {
    let startDate = new Date();
    let endDate = new Date();
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    switch (period) {
        case 'day':
            break;
            
        case 'week':
            const day = startDate.getDay() || 7;
            if (day !== 1) {
                startDate.setHours(-24 * (day - 1));
            }
            break;
            
        case 'month':
            startDate.setDate(1);
            break;
            
        case 'year':
            startDate.setMonth(0, 1);
            break;
            
        case 'all':
            startDate = new Date('2020-01-01');
            break;
            
        case 'custom':
            if (customStartDate) {
                startDate = new Date(customStartDate);
                startDate.setHours(0, 0, 0, 0);
            }
            if (customEndDate) {
                endDate = new Date(customEndDate);
                endDate.setHours(23, 59, 59, 999);
            }
            break;
            
        default:
            const defaultDay = startDate.getDay() || 7;
            if (defaultDay !== 1) {
                startDate.setHours(-24 * (defaultDay - 1));
            }
    }

    return { startDate, endDate };
}

/**
 * Получить статистику рейтинга
 */
async function getStats(req, res, next) {
    try {
        const { period = 'week', startDate: customStartDate, endDate: customEndDate } = req.query;

        const { startDate, endDate } = calculateDateRange(period, customStartDate, customEndDate);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        console.log(`>>> [Rankings] Запрос статистики: период=${period}, с ${startDate.toISOString()} по ${endDate.toISOString()}`);

        const warehouseDateCondition = period === 'all' 
            ? { [Op.gte]: startDate }
            : { [Op.gte]: startDate, [Op.lte]: endDate };

        // Статистика склада
        const warehouseStats = await WarehouseMovement.findAll({
            attributes: [
                "performedById",
                [sequelize.fn("SUM", sequelize.col("goodQty")), "warehouseGood"],
                [sequelize.fn("SUM", sequelize.col("scrapQty")), "warehouseScrap"],
                [sequelize.fn("COUNT", sequelize.col("warehouse_movement.id")), "warehouseOps"],
            ],
            where: {
                performedAt: warehouseDateCondition,
                performedById: { [Op.ne]: null }
            },
            include: [
                {
                    model: User,
                    as: "performedBy",
                    attributes: ["id", "name", "surname", "img"],
                    include: [
                        {
                            model: Team,
                            attributes: ["id", "title"],
                            include: [
                                { 
                                    model: Section, 
                                    as: "production_section",
                                    attributes: ["id", "title"] 
                                },
                                { 
                                    model: User, 
                                    as: "teamLead", 
                                    attributes: ["id", "name", "surname"] 
                                }
                            ]
                        }
                    ]
                }
            ],
            group: [
                "performedById", 
                "performedBy.id", 
                "performedBy.production_team.id",
                "performedBy.production_team.production_section.id",
                "performedBy.production_team.teamLead.id"
            ],
            raw: false
        });

        const productionDateCondition = period === 'all'
            ? { [Op.gte]: startDateStr }
            : { [Op.gte]: startDateStr, [Op.lte]: endDateStr };

        // Статистика производства
        const productionStats = await ProductionOutput.findAll({
            attributes: [
                "userId",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "productionGood"],
                [sequelize.fn("COUNT", sequelize.col("id")), "productionOps"],
            ],
            where: {
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED
            },
            group: ["userId"],
            raw: true
        });

        // ========== Данные по дням для спарклайна ==========
        
        // Склад по дням
        const warehouseByDay = await WarehouseMovement.findAll({
            attributes: [
                "performedById",
                [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
                [sequelize.fn("SUM", sequelize.col("goodQty")), "good"],
            ],
            where: {
                performedAt: warehouseDateCondition,
                performedById: { [Op.ne]: null }
            },
            group: ["performedById", sequelize.fn("DATE", sequelize.col("performedAt"))],
            order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
            raw: true
        });

        // Производство по дням
        const productionByDay = await ProductionOutput.findAll({
            attributes: [
                "userId",
                "date",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "good"],
            ],
            where: {
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED
            },
            group: ["userId", "date"],
            order: [["date", "ASC"]],
            raw: true
        });

        // Собираем историю по пользователям
        const userDailyMap = new Map();

        warehouseByDay.forEach(row => {
            const userId = row.performedById;
            const date = row.date;
            const good = Number(row.good) || 0;
            
            if (!userDailyMap.has(userId)) {
                userDailyMap.set(userId, new Map());
            }
            const dayMap = userDailyMap.get(userId);
            dayMap.set(date, (dayMap.get(date) || 0) + good);
        });

        productionByDay.forEach(row => {
            const userId = row.userId;
            const date = row.date;
            const good = Number(row.good) || 0;
            
            if (!userDailyMap.has(userId)) {
                userDailyMap.set(userId, new Map());
            }
            const dayMap = userDailyMap.get(userId);
            dayMap.set(date, (dayMap.get(date) || 0) + good);
        });

        // Преобразуем в массив для спарклайна (последние 14 дней)
        function getSparklineData(userId) {
            const dayMap = userDailyMap.get(userId);
            if (!dayMap || dayMap.size === 0) return [];
            
            const entries = [...dayMap.entries()]
                .sort((a, b) => a[0].localeCompare(b[0]))
                .slice(-14);
            
            return entries.map(([date, value]) => ({ date, value }));
        }

        // Вычисляем изменение (последний день vs предпоследний)
        function getDailyChange(userId) {
            const dayMap = userDailyMap.get(userId);
            if (!dayMap || dayMap.size < 2) return { change: 0, percent: 0, today: 0, yesterday: 0 };
            
            const entries = [...dayMap.entries()].sort((a, b) => a[0].localeCompare(b[0]));
            const today = entries[entries.length - 1]?.[1] || 0;
            const yesterday = entries[entries.length - 2]?.[1] || 0;
            
            const change = today - yesterday;
            const percent = yesterday > 0 ? Math.round((change / yesterday) * 100) : (today > 0 ? 100 : 0);
            
            return { change, percent, today, yesterday };
        }

        // ========== Конец блока спарклайна ==========

        const productionMap = new Map();
        productionStats.forEach(p => {
            productionMap.set(p.userId, {
                productionGood: Number(p.productionGood) || 0,
                productionOps: Number(p.productionOps) || 0
            });
        });

        const allUserIds = new Set();
        
        warehouseStats.forEach(item => {
            const user = item.get({ plain: true }).performedBy;
            if (user) allUserIds.add(user.id);
        });
        
        productionStats.forEach(p => {
            allUserIds.add(p.userId);
        });

        const missingUserIds = [...allUserIds].filter(
            id => !warehouseStats.some(ws => ws.performedBy?.id === id)
        );
        
        let additionalUsers = [];
        if (missingUserIds.length > 0) {
            additionalUsers = await User.findAll({
                where: { id: missingUserIds },
                attributes: ["id", "name", "surname", "img"],
                include: [
                    {
                        model: Team,
                        attributes: ["id", "title"],
                        include: [
                            { 
                                model: Section, 
                                as: "production_section",
                                attributes: ["id", "title"] 
                            },
                            { 
                                model: User, 
                                as: "teamLead", 
                                attributes: ["id", "name", "surname"] 
                            }
                        ]
                    }
                ]
            });
        }

        const usersMap = new Map();

        warehouseStats.forEach(item => {
            const plainItem = item.get({ plain: true });
            const user = plainItem.performedBy;
            if (!user) return;

            const warehouseGood = Number(plainItem.warehouseGood) || 0;
            const warehouseScrap = Number(plainItem.warehouseScrap) || 0;
            const productionData = productionMap.get(user.id) || { productionGood: 0, productionOps: 0 };

            const team = user.production_team || user.team;
            const section = team ? (team.production_section || team.section) : null;
            const lead = team ? team.teamLead : null;

            usersMap.set(user.id, {
                id: user.id,
                name: user.name,
                surname: user.surname,
                avatar: user.img,
                teamName: team ? team.title : "Без бригады",
                teamId: team ? team.id : null,
                sectionName: section ? section.title : "Не распределен",
                teamLeadName: lead ? `${lead.surname} ${lead.name[0]}.` : "—",
                
                warehouseOutput: warehouseGood,
                warehouseDefects: warehouseScrap,
                productionOutput: productionData.productionGood,
                
                output: warehouseGood + productionData.productionGood,
                defects: warehouseScrap,
                
                // Поля для спарклайна
                sparkline: getSparklineData(user.id),
                dailyChange: getDailyChange(user.id)
            });
        });

        additionalUsers.forEach(user => {
            if (usersMap.has(user.id)) return;
            
            const productionData = productionMap.get(user.id) || { productionGood: 0 };
            if (productionData.productionGood === 0) return;

            const team = user.production_team;
            const section = team ? team.production_section : null;
            const lead = team ? team.teamLead : null;

            usersMap.set(user.id, {
                id: user.id,
                name: user.name,
                surname: user.surname,
                avatar: user.img,
                teamName: team ? team.title : "Без бригады",
                teamId: team ? team.id : null,
                sectionName: section ? section.title : "Не распределен",
                teamLeadName: lead ? `${lead.surname} ${lead.name[0]}.` : "—",
                
                warehouseOutput: 0,
                warehouseDefects: 0,
                productionOutput: productionData.productionGood,
                
                output: productionData.productionGood,
                defects: 0,
                
                sparkline: getSparklineData(user.id),
                dailyChange: getDailyChange(user.id)
            });
        });

        const usersRank = [...usersMap.values()]
            .sort((a, b) => b.output - a.output)
            .map((u, index) => {
                const total = u.output + u.defects;
                const efficiency = total > 0 ? ((u.output / total) * 100).toFixed(1) : 100;
                
                return {
                    ...u,
                    efficiency: Number(efficiency),
                    place: index + 1
                };
            });

        const teamsMap = {};

        usersRank.forEach(u => {
            if (!u.teamId) return;

            if (!teamsMap[u.teamId]) {
                teamsMap[u.teamId] = {
                    id: u.teamId,
                    title: u.teamName,
                    section: u.sectionName,
                    teamLead: u.teamLeadName,
                    totalOutput: 0,
                    warehouseOutput: 0,
                    productionOutput: 0,
                    totalDefects: 0,
                    membersCount: 0,
                    efficiencies: []
                };
            }
            
            const t = teamsMap[u.teamId];
            t.totalOutput += u.output;
            t.warehouseOutput += u.warehouseOutput;
            t.productionOutput += u.productionOutput;
            t.totalDefects += u.defects;
            t.membersCount += 1;
            t.efficiencies.push(u.efficiency);
        });

        function getPlanPerPerson(period) {
            switch (period) {
                case 'day': return 100;
                case 'week': return 500;
                case 'month': return 2000;
                case 'year': return 24000;
                case 'all': return 50000;
                case 'custom': return 1000;
                default: return 500;
            }
        }

        const teamsRank = Object.values(teamsMap).map((t) => {
            const avgEff = t.efficiencies.length > 0 
                ? t.efficiencies.reduce((a, b) => a + b, 0) / t.efficiencies.length 
                : 0;

            const PLAN_PER_PERSON = getPlanPerPerson(period);
            const totalPlan = t.membersCount * PLAN_PER_PERSON;
            const progress = totalPlan > 0 ? Math.min(100, Math.round((t.totalOutput / totalPlan) * 100)) : 0;

            return {
                id: t.id,
                title: t.title,
                section: t.section,
                teamLead: t.teamLead,
                totalOutput: t.totalOutput,
                warehouseOutput: t.warehouseOutput,
                productionOutput: t.productionOutput,
                avgEfficiency: Number(avgEff.toFixed(1)),
                membersCount: t.membersCount,
                progress: progress
            };
        }).sort((a, b) => b.totalOutput - a.totalOutput);

        const totals = {
            totalOutput: usersRank.reduce((sum, u) => sum + u.output, 0),
            warehouseOutput: usersRank.reduce((sum, u) => sum + u.warehouseOutput, 0),
            productionOutput: usersRank.reduce((sum, u) => sum + u.productionOutput, 0),
            totalDefects: usersRank.reduce((sum, u) => sum + u.defects, 0),
            usersCount: usersRank.length,
            teamsCount: teamsRank.length
        };

        return res.json({ 
            users: usersRank, 
            teams: teamsRank,
            totals,
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
        });

    } catch (e) {
        console.error("Rankings Error:", e);
        next(ApiError.badRequest("Ошибка при расчете рейтинга: " + e.message));
    }
}

/**
 * Получить детальную статистику пользователя
 */
async function getUserDetails(req, res, next) {
    try {
        const { userId } = req.params;
        const { period = 'week', startDate: customStartDate, endDate: customEndDate } = req.query;

        const { startDate, endDate } = calculateDateRange(period, customStartDate, customEndDate);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];

        const user = await User.findByPk(userId, {
            attributes: ["id", "name", "surname", "img"],
            include: [
                {
                    model: Team,
                    attributes: ["id", "title"],
                    include: [
                        { 
                            model: Section, 
                            as: "production_section",
                            attributes: ["id", "title"] 
                        }
                    ]
                }
            ]
        });

        if (!user) {
            return next(ApiError.notFound("Пользователь не найден"));
        }

        const warehouseDateCondition = period === 'all'
            ? { [Op.gte]: startDate }
            : { [Op.gte]: startDate, [Op.lte]: endDate };

        const productionDateCondition = period === 'all'
            ? { [Op.gte]: startDateStr }
            : { [Op.gte]: startDateStr, [Op.lte]: endDateStr };

        const warehouseByDay = await WarehouseMovement.findAll({
            attributes: [
                [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
                [sequelize.fn("SUM", sequelize.col("goodQty")), "good"],
                [sequelize.fn("SUM", sequelize.col("scrapQty")), "scrap"],
            ],
            where: {
                performedById: userId,
                performedAt: warehouseDateCondition
            },
            group: [sequelize.fn("DATE", sequelize.col("performedAt"))],
            order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
            raw: true
        });

        const productionByDay = await ProductionOutput.findAll({
            attributes: [
                "date",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "good"],
            ],
            where: {
                userId,
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED
            },
            group: ["date"],
            order: [["date", "ASC"]],
            raw: true
        });

        const productionByOperation = await ProductionOutput.findAll({
            attributes: [
                "operationTypeId",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "total"],
            ],
            where: {
                userId,
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED
            },
            include: [
                { 
                    model: require("../models/ProductionOutput").OperationType, 
                    as: "operationType",
                    attributes: ["name", "code"] 
                }
            ],
            group: ["operationTypeId", "operationType.id"],
            raw: false
        });

        const daysMap = new Map();
        
        warehouseByDay.forEach(d => {
            const dateKey = d.date;
            if (!daysMap.has(dateKey)) {
                daysMap.set(dateKey, { date: dateKey, warehouse: 0, production: 0, total: 0 });
            }
            const day = daysMap.get(dateKey);
            day.warehouse = Number(d.good) || 0;
            day.total = day.warehouse + day.production;
        });

        productionByDay.forEach(d => {
            const dateKey = d.date;
            if (!daysMap.has(dateKey)) {
                daysMap.set(dateKey, { date: dateKey, warehouse: 0, production: 0, total: 0 });
            }
            const day = daysMap.get(dateKey);
            day.production = Number(d.good) || 0;
            day.total = day.warehouse + day.production;
        });

        const dailyStats = [...daysMap.values()].sort((a, b) => a.date.localeCompare(b.date));

        const totals = {
            warehouse: dailyStats.reduce((sum, d) => sum + d.warehouse, 0),
            production: dailyStats.reduce((sum, d) => sum + d.production, 0),
            total: dailyStats.reduce((sum, d) => sum + d.total, 0)
        };

        return res.json({
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                avatar: user.img,
                team: user.production_team?.title || null,
                section: user.production_team?.production_section?.title || null
            },
            period,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            dailyStats,
            byOperation: productionByOperation.map(op => ({
                operation: op.operationType?.name || "Неизвестно",
                code: op.operationType?.code || "",
                total: Number(op.dataValues.total) || 0
            })),
            totals
        });

    } catch (e) {
        console.error("User Details Error:", e);
        next(ApiError.badRequest("Ошибка получения детальной статистики: " + e.message));
    }
}

// Экспорт как объект с функциями
module.exports = {
    getStats,
    getUserDetails
};