/**
 * RankingsController.js - РАСШИРЕННАЯ ВЕРСИЯ
 * 
 * Интеграция с ProductionOutput для учёта выработки ДО упаковки
 * 
 * Агрегирует данные из двух источников:
 * 1. WarehouseMovement.goodQty - готовая продукция (коробки)
 * 2. ProductionOutput.approvedQty - операции до упаковки (калибровка, прошивка и т.д.)
 * 
 * ИСПРАВЛЕНИЯ:
 * - Добавлен alias "production_section" при include Section из Team
 */

const { WarehouseMovement, User, Team, Section } = require("../models/index");
const { ProductionOutput, OUTPUT_STATUSES } = require("../models/ProductionOutput");
const { Op } = require("sequelize");
const sequelize = require("../db");
const ApiError = require("../error/ApiError");

class RankingsController {
    
    /**
     * Основной метод получения рейтинга
     * GET /api/warehouse/rankings?period=day|week|month
     */
    async getStats(req, res, next) {
        try {
            const { period } = req.query; // 'day', 'week', 'month'

            // --- 1. Определение периода времени ---
            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (period === 'week') {
                const day = startDate.getDay() || 7;
                if (day !== 1) {
                    startDate.setHours(-24 * (day - 1));
                }
            } else if (period === 'month') {
                startDate.setDate(1);
            }

            const startDateStr = startDate.toISOString().split('T')[0]; // YYYY-MM-DD для ProductionOutput

            console.log(`>>> [Rankings] Запрос статистики с даты: ${startDate.toISOString()}`);

            // --- 2. Статистика со СКЛАДА (WarehouseMovement) ---
            const warehouseStats = await WarehouseMovement.findAll({
                attributes: [
                    "performedById",
                    [sequelize.fn("SUM", sequelize.col("goodQty")), "warehouseGood"],
                    [sequelize.fn("SUM", sequelize.col("scrapQty")), "warehouseScrap"],
                    [sequelize.fn("COUNT", sequelize.col("warehouse_movement.id")), "warehouseOps"],
                ],
                where: {
                    performedAt: { [Op.gte]: startDate },
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
                                    // ИСПРАВЛЕНО: добавлен alias "production_section"
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

            // --- 3. Статистика из ПРОИЗВОДСТВА (ProductionOutput) ---
            const productionStats = await ProductionOutput.findAll({
                attributes: [
                    "userId",
                    [sequelize.fn("SUM", sequelize.col("approvedQty")), "productionGood"],
                    [sequelize.fn("COUNT", sequelize.col("id")), "productionOps"],
                ],
                where: {
                    date: { [Op.gte]: startDateStr },
                    status: OUTPUT_STATUSES.APPROVED // Только подтверждённые!
                },
                group: ["userId"],
                raw: true
            });

            // Преобразуем в Map для быстрого доступа
            const productionMap = new Map();
            productionStats.forEach(p => {
                productionMap.set(p.userId, {
                    productionGood: Number(p.productionGood) || 0,
                    productionOps: Number(p.productionOps) || 0
                });
            });

            // --- 4. Объединение данных по сотрудникам ---
            // Собираем всех уникальных пользователей (из склада + из производства)
            const allUserIds = new Set();
            
            warehouseStats.forEach(item => {
                const user = item.get({ plain: true }).performedBy;
                if (user) allUserIds.add(user.id);
            });
            
            productionStats.forEach(p => {
                allUserIds.add(p.userId);
            });

            // Загружаем данные пользователей, которых нет в складской статистике
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
                                // ИСПРАВЛЕНО: добавлен alias "production_section"
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

            // --- 5. Формирование рейтинга сотрудников ---
            const usersMap = new Map();

            // Добавляем данные из склада
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
                    
                    // Склад
                    warehouseOutput: warehouseGood,
                    warehouseDefects: warehouseScrap,
                    
                    // Производство  
                    productionOutput: productionData.productionGood,
                    
                    // ИТОГО
                    output: warehouseGood + productionData.productionGood,
                    defects: warehouseScrap
                });
            });

            // Добавляем пользователей только из производства
            additionalUsers.forEach(user => {
                if (usersMap.has(user.id)) return;
                
                const productionData = productionMap.get(user.id) || { productionGood: 0 };
                if (productionData.productionGood === 0) return; // Пропускаем если нет данных

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
                    defects: 0
                });
            });

            // Сортируем и добавляем места + эффективность
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

            // --- 6. Агрегация по бригадам ---
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

            const teamsRank = Object.values(teamsMap).map((t) => {
                const avgEff = t.efficiencies.length > 0 
                    ? t.efficiencies.reduce((a, b) => a + b, 0) / t.efficiencies.length 
                    : 0;

                // План выработки на человека
                const PLAN_PER_PERSON = period === 'day' ? 100 : period === 'week' ? 500 : 2000;
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

            // --- 7. Общая статистика ---
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
                startDate: startDate.toISOString()
            });

        } catch (e) {
            console.error("Rankings Error:", e);
            next(ApiError.badRequest("Ошибка при расчете рейтинга: " + e.message));
        }
    }

    /**
     * Детальная статистика пользователя
     * GET /api/warehouse/rankings/user/:userId?period=week
     */
    async getUserDetails(req, res, next) {
        try {
            const { userId } = req.params;
            const { period = 'week' } = req.query;

            let startDate = new Date();
            startDate.setHours(0, 0, 0, 0);

            if (period === 'week') {
                const day = startDate.getDay() || 7;
                if (day !== 1) startDate.setHours(-24 * (day - 1));
            } else if (period === 'month') {
                startDate.setDate(1);
            }

            const startDateStr = startDate.toISOString().split('T')[0];

            // Пользователь
            const user = await User.findByPk(userId, {
                attributes: ["id", "name", "surname", "img"],
                include: [
                    {
                        model: Team,
                        attributes: ["id", "title"],
                        include: [
                            // ИСПРАВЛЕНО: добавлен alias "production_section"
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

            // Склад - по дням
            const warehouseByDay = await WarehouseMovement.findAll({
                attributes: [
                    [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
                    [sequelize.fn("SUM", sequelize.col("goodQty")), "good"],
                    [sequelize.fn("SUM", sequelize.col("scrapQty")), "scrap"],
                ],
                where: {
                    performedById: userId,
                    performedAt: { [Op.gte]: startDate }
                },
                group: [sequelize.fn("DATE", sequelize.col("performedAt"))],
                order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
                raw: true
            });

            // Производство - по дням
            const productionByDay = await ProductionOutput.findAll({
                attributes: [
                    "date",
                    [sequelize.fn("SUM", sequelize.col("approvedQty")), "good"],
                ],
                where: {
                    userId,
                    date: { [Op.gte]: startDateStr },
                    status: OUTPUT_STATUSES.APPROVED
                },
                group: ["date"],
                order: [["date", "ASC"]],
                raw: true
            });

            // Производство - по типам операций
            const productionByOperation = await ProductionOutput.findAll({
                attributes: [
                    "operationTypeId",
                    [sequelize.fn("SUM", sequelize.col("approvedQty")), "total"],
                ],
                where: {
                    userId,
                    date: { [Op.gte]: startDateStr },
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

            // Объединяем данные по дням
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

            // Итоги
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
                    team: user.production_team?.title,
                    section: user.production_team?.production_section?.title
                },
                period,
                startDate: startDate.toISOString(),
                dailyStats,
                byOperation: productionByOperation.map(p => ({
                    operation: p.operationType?.name || "Неизвестно",
                    code: p.operationType?.code,
                    total: Number(p.get("total")) || 0
                })),
                totals
            });

        } catch (e) {
            console.error("User Details Error:", e);
            next(ApiError.badRequest(e.message));
        }
    }
}

module.exports = new RankingsController();