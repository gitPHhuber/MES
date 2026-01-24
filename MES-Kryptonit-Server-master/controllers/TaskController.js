const { Op } = require("sequelize");
const ApiError = require("../error/ApiError");
const sequelize = require("../db");
const logger = require("../services/logger");

const {
  ProductionTask,
  WarehouseBox,
  Section,
  Team,
  User,
  Project
} = require("../models/index"); 

class TaskController {
  // 1. Создать задачу
  async createTask(req, res, next) {
    try {
      const {
        title,
        originType,
        originId,
        targetQty,
        unit,
        dueDate,
        priority,
        comment,
        responsibleId,
        sectionId,
        projectId
      } = req.body;

      if (!req.user || !req.user.id) {
        return next(ApiError.unauthorized("Нет пользователя в сессии"));
      }

      if (!title || !targetQty) {
        return next(ApiError.badRequest("Нужны title и targetQty"));
      }

      const task = await ProductionTask.create({
        title,
        originType: originType || null,
        originId: originId || null,
        targetQty,
        unit: unit || "шт",
        dueDate: dueDate || null,
        priority: priority || null,
        comment: comment || null,
        status: "NEW",
        createdById: req.user.id,
        responsibleId: responsibleId || null,
        sectionId: sectionId || null,
        projectId: projectId || null
      });

      return res.json(task);
    } catch (e) {
      logger.error("TaskController.createTask error", { error: e });
      next(ApiError.internal(e.message));
    }
  }

  // 2. Список задач с статистикой
  async getTasks(req, res, next) {
    try {
      let { page = 1, limit = 50, status, search, originType } = req.query;
      page = Number(page) || 1;
      limit = Number(limit) || 50;
      const offset = (page - 1) * limit;

      const where = {};
      if (status) where.status = status;
      if (originType) where.originType = originType;
      if (search) {
        const s = String(search).trim();
        where[Op.or] = [
          { title: { [Op.iLike]: `%${s}%` } },
          { comment: { [Op.iLike]: `%${s}%` } },
        ];
      }

      const { rows, count } = await ProductionTask.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ["priority", "DESC"],
          ["dueDate", "ASC"],
          ["id", "ASC"],
        ],
        include: [
            { 
                model: User, 
                as: "responsible", 
                attributes: ["id", "name", "surname"] 
            },
            { 
                model: Section, 
                as: "targetSection", 
                attributes: ["id", "title"] 
            },
            { 
                model: Project, 
                as: "project", 
                attributes: ["id", "title"] 
            },
            { 
                model: User, 
                as: "createdBy", 
                attributes: ["id", "name", "surname"] 
            }
        ]
      });

      // Считаем статистику по коробкам для каждого таска
      for (const task of rows) {
        let stats = {
          total: 0,
          done: 0,
          inWork: 0,
          onStock: 0
        };

        // Если задача привязана к конкретному изделию (Product/Component ID)
        if (task.originType && task.originId) {
          const boxes = await WarehouseBox.findAll({
            attributes: ['status', 'quantity'],
            where: {
              originType: task.originType,
              originId: task.originId,
              status: { [Op.notIn]: ["SCRAP"] },
            },
          });

          for (const box of boxes) {
            const qty = Number(box.quantity) || 0;
            stats.total += qty;

            const st = box.status;
            if (st === 'DONE' || st === 'SHIPPED') {
              stats.done += qty;
            } else if (st === 'ON_STOCK') {
              stats.onStock += qty;
            } else {
              // Любой другой статус (IN_WORK, ASSEMBLY...) считается "В работе"
              stats.inWork += qty;
            }
          }
        }

        const progressPercent = task.targetQty > 0 
            ? Math.min(100, Math.round((stats.done / task.targetQty) * 100)) 
            : 0;

        // Добавляем вычисленные данные к объекту задачи
        task.setDataValue("stats", stats);
        task.setDataValue("progressPercent", progressPercent);
        task.setDataValue("totalFound", stats.total);
      }

      return res.json({ rows, count, page, limit });
    } catch (e) {
      logger.error("TaskController.getTasks error", { error: e });
      next(ApiError.internal(e.message));
    }
  }

  // 3. Детали одной задачи
  async getTaskById(req, res, next) {
    try {
      const { id } = req.params;
      const task = await ProductionTask.findByPk(id, {
        include: [
            { model: User, as: "responsible", attributes: ["id", "name", "surname"] },
            { model: Section, as: "targetSection", attributes: ["id", "title"] },
            { model: Project, as: "project", attributes: ["id", "title"] }
        ]
      });

      if (!task) {
        return next(ApiError.notFound("Задача не найдена"));
      }

      let boxes = [];
      let breakdown = [];
      let totalQty = 0;

      // Собираем данные о местонахождении коробок
      if (task.originType && task.originId) {
        boxes = await WarehouseBox.findAll({
          where: {
            originType: task.originType,
            originId: task.originId,
            status: { [Op.notIn]: ["SCRAP"] },
          },
          include: [
            {
              model: Section,
              as: "currentSection",
              attributes: ["id", "title"],
            },
            {
              model: Team,
              as: "currentTeam",
              attributes: ["id", "title"],
            },
          ],
          order: [["id", "ASC"]],
        });

        const map = {};

        for (const box of boxes) {
          const qty = box.quantity || 0;
          totalQty += qty;
          // Группируем по (Статус + Участок)
          const key = `${box.status}|${box.currentSectionId || "null"}`;

          if (!map[key]) {
            map[key] = {
              status: box.status,
              sectionId: box.currentSectionId || null,
              sectionTitle: box.currentSection ? box.currentSection.title : null,
              qty: 0,
            };
          }
          map[key].qty += qty;
        }

        breakdown = Object.values(map);
      }

      return res.json({
        task,
        totalQty,
        breakdown,
        boxes,
      });
    } catch (e) {
      logger.error("TaskController.getTaskById error", { error: e });
      next(ApiError.internal(e.message));
    }
  }

  // 4. Полное редактирование задачи (PUT)
  async updateFullTask(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        title, targetQty, unit, dueDate, priority, comment, 
        responsibleId, sectionId, projectId, status 
      } = req.body;

      const task = await ProductionTask.findByPk(id);
      if (!task) return next(ApiError.notFound("Задача не найдена"));

      await task.update({
        title: title !== undefined ? title : task.title,
        targetQty: targetQty !== undefined ? targetQty : task.targetQty,
        unit: unit !== undefined ? unit : task.unit,
        dueDate: dueDate !== undefined ? dueDate : task.dueDate,
        priority: priority !== undefined ? priority : task.priority,
        comment: comment !== undefined ? comment : task.comment,
        responsibleId: responsibleId !== undefined ? (responsibleId || null) : task.responsibleId,
        sectionId: sectionId !== undefined ? (sectionId || null) : task.sectionId,
        projectId: projectId !== undefined ? (projectId || null) : task.projectId,
        status: status !== undefined ? status : task.status
      });

      return res.json(task);
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  // 5. Обновить только статус (PATCH)
  async updateTaskStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const task = await ProductionTask.findByPk(id);
      if (!task) return next(ApiError.notFound("Задача не найдена"));

      task.status = status;
      await task.save();

      return res.json(task);
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  // 6. Удалить задачу (DELETE)
  async deleteTask(req, res, next) {
    try {
        const { id } = req.params;
        const deleted = await ProductionTask.destroy({ where: { id } });
        if (!deleted) return next(ApiError.notFound("Задача не найдена"));
        return res.json({ message: "Задача удалена" });
    } catch(e) {
        next(ApiError.internal(e.message));
    }
  }
}

module.exports = new TaskController();
