/**
 * RankingsController.js
 * Контроллер рейтингов сотрудников с фильтром по проектам
 */

const { WarehouseMovement, User, Team, Section, Project } = require("../models/index");
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
 * Генерирует массив всех дат между start и end
 */
function generateDateRange(startDate, endDate) {
    const dates = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    while (current <= end) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
    }
    return dates;
}

/**
 * Определяет максимальное количество точек для sparkline
 */
function getSparklineLimit(period, totalDays) {
    switch (period) {
        case 'day': return 1;
        case 'week': return 7;
        case 'month': return 31;
        case 'year': return Math.min(totalDays, 365);
        case 'all': return Math.min(totalDays, 365);
        case 'custom': return Math.min(totalDays, 90);
        default: return 14;
    }
}

/**
 * Получить статистику рейтинга
 */
async function getStats(req, res, next) {
    try {
        const { 
            period = 'week', 
            startDate: customStartDate, 
            endDate: customEndDate,
            projectId 
        } = req.query;

        const { startDate, endDate } = calculateDateRange(period, customStartDate, customEndDate);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const parsedProjectId = projectId ? Number(projectId) : null;

        // Генерируем полный диапазон дат для sparkline
        const allDates = generateDateRange(startDate, endDate);
        const sparklineLimit = getSparklineLimit(period, allDates.length);

        console.log(`>>> [Rankings] период=${period}, проект=${parsedProjectId || 'все'}, дней=${allDates.length}, с ${startDateStr} по ${endDateStr}`);

        const warehouseDateCondition = period === 'all' 
            ? { [Op.gte]: startDate }
            : { [Op.gte]: startDate, [Op.lte]: endDate };

        const productionDateCondition = period === 'all'
            ? { [Op.gte]: startDateStr }
            : { [Op.gte]: startDateStr, [Op.lte]: endDateStr };

        // Условие фильтра по проекту для ProductionOutput
        const productionProjectCondition = parsedProjectId 
            ? { projectId: parsedProjectId }
            : {};

        // ========== СКЛАД (без фильтра по проекту - нет связи) ==========
        let warehouseStats = [];
        let warehouseByDay = [];
        
        if (!parsedProjectId) {
            // Статистика склада
            warehouseStats = await WarehouseMovement.findAll({
                attributes: [
                    "performedById",
                    [sequelize.fn("SUM", sequelize.col("goodQty")), "warehouseGood"],
                    [sequelize.fn("SUM", sequelize.col("scrapQty")), "warehouseScrap"],
                    [sequelize.fn("COUNT", sequelize.col("warehouse_movement.id")), "warehouseOps"],
                ],
                where: {
                    performedAt: warehouseDateCondition,
                    performedById: { [Op.ne]: null },
                    goodQty: { [Op.gt]: 0 }
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

            // Склад по дням для sparkline
            warehouseByDay = await WarehouseMovement.findAll({
                attributes: [
                    "performedById",
                    [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
                    [sequelize.fn("SUM", sequelize.col("goodQty")), "good"],
                ],
                where: {
                    performedAt: warehouseDateCondition,
                    performedById: { [Op.ne]: null },
                    goodQty: { [Op.gt]: 0 }
                },
                group: ["performedById", sequelize.fn("DATE", sequelize.col("performedAt"))],
                order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
                raw: true
            });
        }

        // ========== ПРОИЗВОДСТВО (с фильтром по проекту) ==========
        
        // Статистика производства
        const productionStats = await ProductionOutput.findAll({
            attributes: [
                "userId",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "productionGood"],
                [sequelize.fn("COUNT", sequelize.col("id")), "productionOps"],
            ],
            where: {
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED,
                ...productionProjectCondition
            },
            group: ["userId"],
            raw: true
        });

        // Производство по дням для sparkline
        const productionByDay = await ProductionOutput.findAll({
            attributes: [
                "userId",
                "date",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "good"],
            ],
            where: {
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED,
                ...productionProjectCondition
            },
            group: ["userId", "date"],
            order: [["date", "ASC"]],
            raw: true
        });

        // ========== Собираем историю по пользователям для sparkline ==========
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

        // Функция для получения sparkline с заполнением пропущенных дней
        function getSparklineData(userId) {
            const dayMap = userDailyMap.get(userId);
            if (!dayMap || dayMap.size === 0) return [];
            
            // Заполняем пропущенные дни нулями
            const sparkline = allDates.map(date => ({
                date,
                value: dayMap.get(date) || 0
            })).slice(-sparklineLimit);
            
            return sparkline;
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

        // ========== Объединяем данные пользователей ==========
        const productionMap = new Map();
        productionStats.forEach(p => {
            productionMap.set(p.userId, {
                productionGood: Number(p.productionGood) || 0,
                productionOps: Number(p.productionOps) || 0
            });
        });

        // Собираем все userId
        const allUserIds = new Set();
        
        warehouseStats.forEach(item => {
            const user = item.get({ plain: true }).performedBy;
            if (user) allUserIds.add(user.id);
        });
        
        productionStats.forEach(p => {
            allUserIds.add(p.userId);
        });

        // Загружаем пользователей которых нет в warehouseStats
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

        // ========== Формируем итоговый список пользователей ==========
        const usersMap = new Map();

        // Добавляем пользователей со склада
        warehouseStats.forEach(item => {
            const plainItem = item.get({ plain: true });
            const user = plainItem.performedBy;
            if (!user) return;

            const warehouseGood = Number(plainItem.warehouseGood) || 0;
            const warehouseScrap = Number(plainItem.warehouseScrap) || 0;
            const productionData = productionMap.get(user.id) || { productionGood: 0, productionOps: 0 };

            const team = user.production_team || user.Team;
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
                sectionId: section ? section.id : null,
                teamLeadName: lead ? `${lead.surname} ${lead.name[0]}.` : "—",
                
                warehouseOutput: warehouseGood,
                warehouseDefects: warehouseScrap,
                productionOutput: productionData.productionGood,
                
                output: warehouseGood + productionData.productionGood,
                defects: warehouseScrap,
                
                sparkline: getSparklineData(user.id),
                dailyChange: getDailyChange(user.id)
            });
        });

        // Добавляем пользователей только из производства
        additionalUsers.forEach(user => {
            if (usersMap.has(user.id)) return;
            
            const productionData = productionMap.get(user.id) || { productionGood: 0 };
            if (productionData.productionGood === 0) return;

            const team = user.production_team || user.Team;
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
                sectionId: section ? section.id : null,
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

        // Сортируем и добавляем места
        const usersRank = [...usersMap.values()]
            .filter(u => u.output > 0)
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

        // ========== Агрегация по бригадам ==========
        const teamsMap = {};

        usersRank.forEach(u => {
            if (!u.teamId) return;

            if (!teamsMap[u.teamId]) {
                teamsMap[u.teamId] = {
                    id: u.teamId,
                    title: u.teamName,
                    section: u.sectionName,
                    sectionId: u.sectionId,
                    teamLead: u.teamLeadName,
                    totalOutput: 0,
                    warehouseOutput: 0,
                    productionOutput: 0,
                    totalDefects: 0,
                    membersCount: 0,
                    efficiencies: [],
                    sparklineMap: new Map()
                };
            }
            
            const t = teamsMap[u.teamId];
            t.totalOutput += u.output;
            t.warehouseOutput += u.warehouseOutput;
            t.productionOutput += u.productionOutput;
            t.totalDefects += u.defects;
            t.membersCount += 1;
            t.efficiencies.push(u.efficiency);
            
            // Собираем sparkline для бригады
            u.sparkline.forEach(point => {
                if (!t.sparklineMap.has(point.date)) {
                    t.sparklineMap.set(point.date, 0);
                }
                t.sparklineMap.set(point.date, t.sparklineMap.get(point.date) + point.value);
            });
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

            // Формируем sparkline для бригады
            const sparkline = allDates.map(date => ({
                date,
                value: t.sparklineMap.get(date) || 0
            })).slice(-sparklineLimit);

            return {
                id: t.id,
                title: t.title,
                section: t.section,
                sectionId: t.sectionId,
                teamLead: t.teamLead,
                totalOutput: t.totalOutput,
                warehouseOutput: t.warehouseOutput,
                productionOutput: t.productionOutput,
                avgEfficiency: Number(avgEff.toFixed(1)),
                membersCount: t.membersCount,
                progress: progress,
                sparkline
            };
        }).sort((a, b) => b.totalOutput - a.totalOutput);

        // ========== Агрегация по участкам ==========
        const sectionsMap = new Map();
        
        teamsRank.forEach(team => {
            if (!team.sectionId) return;
            
            if (!sectionsMap.has(team.sectionId)) {
                sectionsMap.set(team.sectionId, {
                    id: team.sectionId,
                    title: team.section || `Участок ${team.sectionId}`,
                    totalOutput: 0,
                    teamsCount: 0,
                    membersCount: 0,
                    sparklineMap: new Map()
                });
            }
            
            const section = sectionsMap.get(team.sectionId);
            section.totalOutput += team.totalOutput;
            section.teamsCount++;
            section.membersCount += team.membersCount;
            
            team.sparkline.forEach(point => {
                if (!section.sparklineMap.has(point.date)) {
                    section.sparklineMap.set(point.date, 0);
                }
                section.sparklineMap.set(point.date, section.sparklineMap.get(point.date) + point.value);
            });
        });

        const sectionsRank = Array.from(sectionsMap.values())
            .map(section => ({
                id: section.id,
                title: section.title,
                totalOutput: section.totalOutput,
                teamsCount: section.teamsCount,
                membersCount: section.membersCount,
                avgOutput: section.membersCount > 0 ? Math.round(section.totalOutput / section.membersCount) : 0,
                sparkline: allDates.map(date => ({
                    date,
                    value: section.sparklineMap.get(date) || 0
                })).slice(-sparklineLimit)
            }))
            .sort((a, b) => b.totalOutput - a.totalOutput);

        // ========== Итоги ==========
        const totals = {
            totalOutput: usersRank.reduce((sum, u) => sum + u.output, 0),
            warehouseOutput: usersRank.reduce((sum, u) => sum + u.warehouseOutput, 0),
            productionOutput: usersRank.reduce((sum, u) => sum + u.productionOutput, 0),
            totalDefects: usersRank.reduce((sum, u) => sum + u.defects, 0),
            usersCount: usersRank.length,
            teamsCount: teamsRank.length,
            sectionsCount: sectionsRank.length
        };

        // Название проекта
        let projectName = null;
        if (parsedProjectId) {
            const project = await Project.findByPk(parsedProjectId, { attributes: ["title"] });
            projectName = project?.title || null;
        }

        return res.json({ 
            users: usersRank, 
            teams: teamsRank,
            sections: sectionsRank,
            totals,
            period,
            projectId: parsedProjectId,
            projectName,
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
        const { period = 'week', startDate: customStartDate, endDate: customEndDate, projectId } = req.query;

        const { startDate, endDate } = calculateDateRange(period, customStartDate, customEndDate);
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        const parsedProjectId = projectId ? Number(projectId) : null;

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

        const productionProjectCondition = parsedProjectId 
            ? { projectId: parsedProjectId }
            : {};

        // Склад по дням (без фильтра по проекту)
        let warehouseByDay = [];
        if (!parsedProjectId) {
            warehouseByDay = await WarehouseMovement.findAll({
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
        }

        // Производство по дням (с фильтром по проекту)
        const productionByDay = await ProductionOutput.findAll({
            attributes: [
                "date",
                [sequelize.fn("SUM", sequelize.col("approvedQty")), "good"],
            ],
            where: {
                userId,
                date: productionDateCondition,
                status: OUTPUT_STATUSES.APPROVED,
                ...productionProjectCondition
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
                status: OUTPUT_STATUSES.APPROVED,
                ...productionProjectCondition
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

        // Название проекта
        let projectName = null;
        if (parsedProjectId) {
            const project = await Project.findByPk(parsedProjectId, { attributes: ["title"] });
            projectName = project?.title || null;
        }

        return res.json({
            user: {
                id: user.id,
                name: user.name,
                surname: user.surname,
                avatar: user.img,
                team: user.production_team?.title || user.Team?.title || null,
                section: user.production_team?.production_section?.title || user.Team?.production_section?.title || null
            },
            period,
            projectId: parsedProjectId,
            projectName,
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

module.exports = {
    getStats,
    getUserDetails
};