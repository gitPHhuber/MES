/**
 * AnalyticsController.js
 * Контроллер аналитики - ИСПРАВЛЕНО: убран scrapQty полностью
 */

const { Op } = require("sequelize");
const { WarehouseBox, WarehouseMovement, User, Team } = require("../../models/index");
const { ProductionOutput, OUTPUT_STATUSES } = require("../../models/ProductionOutput");
const sequelize = require("../../db");
const ApiError = require("../../error/ApiError");

// Импорт моделей дефектов
let BoardDefect = null;
let DefectCategory = null;
try {
  const defectModels = require("../../models/definitions/Defect");
  BoardDefect = defectModels.BoardDefect;
  DefectCategory = defectModels.DefectCategory;
  console.log("[Analytics] Модели дефектов загружены");
} catch (e) {
  console.log("[Analytics] Модели дефектов не найдены:", e.message);
}

/**
 * Вычисляет диапазон дат для периода
 */
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

      // === Склад - общее состояние ===
      const stockStats = await WarehouseBox.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalItems"],
          [sequelize.fn("COUNT", sequelize.col("id")), "totalBoxes"],
        ],
        where: { status: "ON_STOCK" },
        raw: true
      });

      // === Выработка за период (склад) - ТОЛЬКО goodQty ===
      const periodWarehouse = await WarehouseMovement.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("goodQty")), "goodQty"],
        ],
        where: {
          performedAt: warehouseDateCondition,
          performedById: { [Op.ne]: null },
          goodQty: { [Op.gt]: 0 }
        },
        raw: true
      });

      // === Выработка за период (производство) ===
      const periodProduction = await ProductionOutput.findOne({
        attributes: [
          [sequelize.fn("SUM", sequelize.col("approvedQty")), "approvedQty"],
        ],
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

      // === ДЕФЕКТЫ - ТОЛЬКО из таблицы board_defect ===
      let periodDefects = 0;
      let defectTypes = [];

      if (BoardDefect) {
        try {
          periodDefects = await BoardDefect.count({
            where: { detectedAt: warehouseDateCondition }
          });

          // Статистика по категориям (если есть связь)
          if (DefectCategory) {
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
            } catch (catErr) {
              console.log("[Analytics] Ошибка категорий:", catErr.message);
            }
          }

          // Если категории не загрузились, показываем общее число
          if (defectTypes.length === 0 && periodDefects > 0) {
            defectTypes = [{ name: "Дефекты", value: periodDefects }];
          }
        } catch (defErr) {
          console.log("[Analytics] Ошибка дефектов:", defErr.message);
          periodDefects = 0;
          defectTypes = [];
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

      // === График по дням ===
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

      // Объединяем данные
      const dayNames = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
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

      const productionByDay = Array.from(daysMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, values]) => {
          const d = new Date(date);
          return {
            date,
            name: dayNames[d.getDay()],
            fullDate: date,
            output: values.output
          };
        });

      // === Топ-5 сотрудников ===
      const topUsers = await WarehouseMovement.findAll({
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

      // === Статистика по бригадам ===
      const usersByTeam = await WarehouseMovement.findAll({
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
          attributes: ["id", "teamId"],
          include: [{
            model: Team,
            attributes: ["id", "title"]
          }]
        }],
        group: ["performedById", "performedBy.id", "performedBy.production_team.id"],
        raw: false
      });

      const teamsMap = new Map();
      usersByTeam.forEach(row => {
        const plain = row.get({ plain: true });
        const team = plain.performedBy?.production_team;
        if (team) {
          if (!teamsMap.has(team.id)) {
            teamsMap.set(team.id, { id: team.id, name: team.title, output: 0, members: new Set() });
          }
          const t = teamsMap.get(team.id);
          t.output += Number(plain.output) || 0;
          t.members.add(plain.performedBy.id);
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

      const formattedTopUsers = topUsers.map(row => {
        const user = row.get({ plain: true }).performedBy;
        return {
          id: user?.id,
          name: user ? `${user.surname} ${user.name[0]}.` : "Неизвестно",
          output: Number(row.dataValues.output) || 0
        };
      });

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