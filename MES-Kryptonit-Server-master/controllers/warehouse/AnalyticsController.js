/**
 * AnalyticsController.js
 * ИСПРАВЛЕНО: график заполняет пропущенные дни нулями
 */

const { Op } = require("sequelize");
const { WarehouseBox, WarehouseMovement, User, Team } = require("../../models/index");
const { ProductionOutput, OUTPUT_STATUSES } = require("../../models/ProductionOutput");
const sequelize = require("../../db");
const ApiError = require("../../error/ApiError");

let BoardDefect = null;
let DefectCategory = null;
try {
  const defectModels = require("../../models/definitions/Defect");
  BoardDefect = defectModels.BoardDefect;
  DefectCategory = defectModels.DefectCategory;
} catch (e) {
  console.log("[Analytics] Модели дефектов не найдены");
}

function calculateDateRange(period, customStartDate, customEndDate) {
  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  
  startDate.setHours(0, 0, 0, 0);
  endDate.setHours(23, 59, 59, 999);

  switch (period) {
    case 'day':
      break;
    case 'week':
      const dayOfWeek = startDate.getDay() || 7;
      startDate.setDate(startDate.getDate() - (dayOfWeek - 1));
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
      startDate.setDate(startDate.getDate() - (defaultDay - 1));
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

class AnalyticsController {
  
  async getDashboardStats(req, res, next) {
    try {
      const { period = 'week', startDate: customStart, endDate: customEnd } = req.query;
      
      const { startDate, endDate } = calculateDateRange(period, customStart, customEnd);
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];

      console.log(`>>> [Analytics] период=${period}, с ${startDateStr} по ${endDateStr}`);

      const now = new Date();
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      
      const yesterdayStart = new Date(todayStart);
      yesterdayStart.setDate(yesterdayStart.getDate() - 1);

      const warehouseDateCondition = period === 'all'
        ? { [Op.gte]: startDate }
        : { [Op.gte]: startDate, [Op.lte]: endDate };

      const productionDateCondition = period === 'all'
        ? { [Op.gte]: startDateStr }
        : { [Op.gte]: startDateStr, [Op.lte]: endDateStr };

      // === Склад ===
      const stockStats = await WarehouseBox.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItems"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalBoxes"],
        ],
        where: { status: "ON_STOCK" },
        raw: true
      });

      // === Выработка за период ===
      const periodWarehouse = await WarehouseMovement.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("goodQty")), "goodQty"]],
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        raw: true
      });

      const periodProduction = await ProductionOutput.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("approvedQty")), "approvedQty"]],
        where: {
          date: productionDateCondition,
          status: OUTPUT_STATUSES.APPROVED
        },
        raw: true
      });

      // === Выработка сегодня ===
      const todayWarehouse = await WarehouseMovement.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("goodQty")), "goodQty"]],
        where: {
          performedAt: { [Op.gte]: todayStart },
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        raw: true
      });

      const todayProduction = await ProductionOutput.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("approvedQty")), "approvedQty"]],
        where: {
          date: todayStart.toISOString().split('T')[0],
          status: OUTPUT_STATUSES.APPROVED
        },
        raw: true
      });

      // === Выработка вчера ===
      const yesterdayWarehouse = await WarehouseMovement.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("goodQty")), "goodQty"]],
        where: {
          performedAt: { [Op.gte]: yesterdayStart, [Op.lt]: todayStart },
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        raw: true
      });

      const yesterdayProduction = await ProductionOutput.findOne({
        attributes: [[sequelize.fn("SUM", sequelize.col("approvedQty")), "approvedQty"]],
        where: {
          date: yesterdayStart.toISOString().split('T')[0],
          status: OUTPUT_STATUSES.APPROVED
        },
        raw: true
      });

      // === ДЕФЕКТЫ ===
      let periodDefects = 0;
      let defectTypes = [];

      if (BoardDefect) {
        try {
          periodDefects = await BoardDefect.count({
            where: { detectedAt: warehouseDateCondition }
          });

          if (DefectCategory && periodDefects > 0) {
            try {
              const defectsByCategory = await BoardDefect.findAll({
                attributes: [
                  "categoryId",
                  [sequelize.fn("COUNT", sequelize.col("board_defect.id")), "count"]
                ],
                where: { detectedAt: warehouseDateCondition },
                include: [{
                  model: DefectCategory,
                  as: "category",
                  attributes: ["title"],
                  required: false
                }],
                group: ["categoryId", "category.id"],
                raw: false
              });

              defectTypes = defectsByCategory
                .filter(d => d.dataValues.count > 0)
                .map(d => ({
                  name: d.category?.title || "Без категории",
                  value: Number(d.dataValues.count) || 0
                }));
            } catch (e) {
              console.log("[Analytics] Ошибка категорий:", e.message);
            }
          }

          if (defectTypes.length === 0 && periodDefects > 0) {
            defectTypes = [{ name: "Дефекты", value: periodDefects }];
          }
        } catch (e) {
          console.log("[Analytics] Ошибка дефектов:", e.message);
        }
      }

      // === Активные пользователи ===
      const activeUsers = await WarehouseMovement.count({
        distinct: true,
        col: 'performedById',
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null }
        }
      });

      const activeUsersToday = await WarehouseMovement.count({
        distinct: true,
        col: 'performedById',
        where: {
          performedAt: { [Op.gte]: todayStart },
          performedById: { [Op.ne]: null }
        }
      });

      // === График по дням (с заполнением пропусков) ===
      const chartByDay = await WarehouseMovement.findAll({
        attributes: [
          [sequelize.fn("DATE", sequelize.col("performedAt")), "date"],
          [sequelize.fn("SUM", sequelize.col("goodQty")), "output"],
        ],
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        group: [sequelize.fn("DATE", sequelize.col("performedAt"))],
        order: [[sequelize.fn("DATE", sequelize.col("performedAt")), "ASC"]],
        raw: true
      });

      const productionByDayRaw = await ProductionOutput.findAll({
        attributes: [
          "date",
          [sequelize.fn("SUM", sequelize.col("approvedQty")), "output"],
        ],
        where: {
          date: productionDateCondition,
          status: OUTPUT_STATUSES.APPROVED
        },
        group: ["date"],
        order: [["date", "ASC"]],
        raw: true
      });

      // Собираем данные в Map
      const daysMap = new Map();

      chartByDay.forEach(row => {
        const dateKey = row.date;
        if (!daysMap.has(dateKey)) daysMap.set(dateKey, { output: 0 });
        daysMap.get(dateKey).output += Number(row.output) || 0;
      });

      productionByDayRaw.forEach(row => {
        const dateKey = row.date;
        if (!daysMap.has(dateKey)) daysMap.set(dateKey, { output: 0 });
        daysMap.get(dateKey).output += Number(row.output) || 0;
      });

      // Генерируем полный диапазон дат и заполняем пропуски нулями
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
      const allDates = generateDateRange(startDate, endDate);
      
      // Ограничиваем для очень длинных периодов (>90 дней показываем каждый 3й день)
      let filteredDates = allDates;
      let skipFactor = 1;
      
      if (allDates.length > 90) {
        skipFactor = Math.ceil(allDates.length / 90);
        filteredDates = allDates.filter((_, idx) => idx % skipFactor === 0);
      }

      const productionByDay = filteredDates.map(date => {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        
        // Суммируем данные за skipFactor дней если агрегируем
        let output = 0;
        if (skipFactor > 1) {
          const idx = allDates.indexOf(date);
          for (let i = 0; i < skipFactor && idx + i < allDates.length; i++) {
            output += daysMap.get(allDates[idx + i])?.output || 0;
          }
        } else {
          output = daysMap.get(date)?.output || 0;
        }
        
        return {
          date,
          name: dayNames[dayOfWeek],
          fullDate: date,
          output,
          isWeekend
        };
      });

      // === ТОП-5 СОТРУДНИКОВ ===
      const topUsersRaw = await WarehouseMovement.findAll({
        attributes: [
          "performedById",
          [sequelize.fn("SUM", sequelize.col("goodQty")), "output"],
        ],
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        include: [{
          model: User,
          as: "performedBy",
          attributes: ["id", "name", "surname"]
        }],
        group: ["performedById", "performedBy.id"],
        order: [[sequelize.fn("SUM", sequelize.col("goodQty")), "DESC"]],
        limit: 5,
        raw: false
      });

      const formattedTopUsers = topUsersRaw.map(row => {
        const plain = row.get({ plain: true });
        const user = plain.performedBy;
        return {
          id: plain.performedById,
          name: user ? `${user.surname || ''} ${(user.name || '')[0] || ''}.`.trim() : `ID: ${plain.performedById}`,
          output: Number(plain.output) || 0
        };
      }).filter(u => u.output > 0);

      // === БРИГАДЫ ===
      const userOutputs = await WarehouseMovement.findAll({
        attributes: [
          "performedById",
          [sequelize.fn("SUM", sequelize.col("goodQty")), "output"],
        ],
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        group: ["performedById"],
        raw: true
      });

      const userIds = userOutputs.map(u => u.performedById);
      const usersWithTeams = await User.findAll({
        attributes: ["id", "teamId"],
        where: { id: { [Op.in]: userIds } },
        include: [{
          model: Team,
          attributes: ["id", "title"]
        }],
        raw: false
      });

      const userTeamMap = new Map();
      usersWithTeams.forEach(u => {
        const plain = u.get({ plain: true });
        if (plain.Team) {
          userTeamMap.set(plain.id, plain.Team);
        }
      });

      const teamsMap = new Map();
      userOutputs.forEach(uo => {
        const team = userTeamMap.get(uo.performedById);
        if (team) {
          if (!teamsMap.has(team.id)) {
            teamsMap.set(team.id, {
              id: team.id,
              name: team.title,
              output: 0,
              members: new Set()
            });
          }
          const t = teamsMap.get(team.id);
          t.output += Number(uo.output) || 0;
          t.members.add(uo.performedById);
        }
      });

      const teamStats = Array.from(teamsMap.values())
        .map(t => ({ id: t.id, name: t.name, output: t.output, members: t.members.size }))
        .sort((a, b) => b.output - a.output)
        .slice(0, 5);

      // === Итоги ===
      const periodOutput = (Number(periodWarehouse?.goodQty) || 0) + (Number(periodProduction?.approvedQty) || 0);
      const todayOutput = (Number(todayWarehouse?.goodQty) || 0) + (Number(todayProduction?.approvedQty) || 0);
      const yesterdayOutput = (Number(yesterdayWarehouse?.goodQty) || 0) + (Number(yesterdayProduction?.approvedQty) || 0);

      const defectRate = (periodOutput + periodDefects) > 0 
        ? Number(((periodDefects / (periodOutput + periodDefects)) * 100).toFixed(1))
        : 0;

      const daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));

      res.json({
        period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysInPeriod: daysDiff,
        
        periodOutput,
        periodDefects,
        defectRate,
        
        todayOutput,
        yesterdayOutput,
        
        activeUsers,
        activeUsersToday,
        
        stock: {
          totalItems: Number(stockStats?.totalItems) || 0,
          totalBoxes: Number(stockStats?.totalBoxes) || 0
        },
        
        productionByDay,
        defectTypes,
        topUsers: formattedTopUsers,
        teamStats,

        generatedAt: new Date().toISOString()
      });

    } catch (e) {
      console.error("Analytics Dashboard Error:", e);
      next(ApiError.internal("Ошибка загрузки аналитики: " + e.message));
    }
  }
}

module.exports = new AnalyticsController();