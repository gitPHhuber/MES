const { 
  DefectCategory, 
  BoardDefect, 
  RepairAction,
  User,
  FC,
  ELRS915,
  ELRS2_4,
  CoralB
} = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");
const sequelize = require("../db");

class DefectSystemController {
  
  // =========================================================
  // КАТЕГОРИИ ДЕФЕКТОВ (CRUD)
  // =========================================================
  
  // Получить все категории
  async getCategories(req, res, next) {
    try {
      const { boardType, activeOnly } = req.query;
      
      const where = {};
      if (activeOnly === "true") {
        where.isActive = true;
      }
      
      let categories = await DefectCategory.findAll({
        where,
        order: [["title", "ASC"]]
      });
      
      // Фильтрация по типу платы (на уровне JS, т.к. JSON поле)
      if (boardType) {
        categories = categories.filter(cat => 
          cat.applicableTypes && cat.applicableTypes.includes(boardType)
        );
      }
      
      return res.json(categories);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Создать категорию
  async createCategory(req, res, next) {
    try {
      const { code, title, description, severity, applicableTypes } = req.body;
      
      if (!code || !title) {
        return next(ApiError.badRequest("Код и название обязательны"));
      }
      
      const existing = await DefectCategory.findOne({ where: { code } });
      if (existing) {
        return next(ApiError.badRequest("Категория с таким кодом уже существует"));
      }
      
      const category = await DefectCategory.create({
        code,
        title,
        description,
        severity: severity || "MAJOR",
        applicableTypes: applicableTypes || []
      });
      
      return res.json(category);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Обновить категорию
  async updateCategory(req, res, next) {
    try {
      const { id } = req.params;
      const { code, title, description, severity, applicableTypes, isActive } = req.body;
      
      const category = await DefectCategory.findByPk(id);
      if (!category) {
        return next(ApiError.notFound("Категория не найдена"));
      }
      
      await category.update({
        code: code ?? category.code,
        title: title ?? category.title,
        description: description ?? category.description,
        severity: severity ?? category.severity,
        applicableTypes: applicableTypes ?? category.applicableTypes,
        isActive: isActive ?? category.isActive
      });
      
      return res.json(category);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Удалить категорию (soft delete — деактивация)
  async deleteCategory(req, res, next) {
    try {
      const { id } = req.params;
      
      const category = await DefectCategory.findByPk(id);
      if (!category) {
        return next(ApiError.notFound("Категория не найдена"));
      }
      
      // Проверяем, есть ли связанные дефекты
      const defectsCount = await BoardDefect.count({ where: { categoryId: id } });
      if (defectsCount > 0) {
        // Деактивируем вместо удаления
        await category.update({ isActive: false });
        return res.json({ message: "Категория деактивирована (есть связанные записи)" });
      }
      
      await category.destroy();
      return res.json({ message: "Категория удалена" });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // =========================================================
  // РЕГИСТРАЦИЯ БРАКА
  // =========================================================
  
  // Получить список дефектов с фильтрацией
  async getDefects(req, res, next) {
    try {
      let { 
        page = 1, 
        limit = 50, 
        status, 
        boardType, 
        categoryId, 
        search,
        startDate,
        endDate
      } = req.query;
      
      page = Number(page) || 1;
      limit = Number(limit) || 50;
      const offset = (page - 1) * limit;
      
      const where = {};
      
      // Фильтр по статусу
      if (status) {
        if (status === "ACTIVE") {
          // Все активные (не закрытые)
          where.status = { [Op.in]: ["OPEN", "IN_REPAIR", "REPAIRED"] };
        } else {
          where.status = status;
        }
      }
      
      // Фильтр по типу платы
      if (boardType) {
        where.boardType = boardType;
      }
      
      // Фильтр по категории
      if (categoryId) {
        where.categoryId = Number(categoryId);
      }
      
      // Поиск по серийнику
      if (search) {
        where.serialNumber = { [Op.iLike]: `%${search}%` };
      }
      
      // Фильтр по дате
      if (startDate || endDate) {
        where.detectedAt = {};
        if (startDate) {
          where.detectedAt[Op.gte] = new Date(startDate);
        }
        if (endDate) {
          where.detectedAt[Op.lte] = new Date(endDate + "T23:59:59.999Z");
        }
      }
      
      const { rows, count } = await BoardDefect.findAndCountAll({
        where,
        limit,
        offset,
        order: [
          ["status", "ASC"], // OPEN первыми
          ["detectedAt", "DESC"]
        ],
        include: [
          { 
            model: DefectCategory, 
            as: "category",
            attributes: ["id", "code", "title", "severity"]
          },
          { 
            model: User, 
            as: "detectedBy",
            attributes: ["id", "name", "surname"]
          },
          { 
            model: User, 
            as: "closedBy",
            attributes: ["id", "name", "surname"]
          }
        ]
      });
      
      // Считаем статистику
      const stats = await BoardDefect.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"]
        ],
        group: ["status"],
        raw: true
      });
      
      const statsByStatus = {};
      stats.forEach(s => {
        statsByStatus[s.status] = Number(s.count);
      });
      
      return res.json({
        defects: rows,
        total: count,
        page,
        totalPages: Math.ceil(count / limit),
        stats: statsByStatus
      });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Получить один дефект с историей
  async getDefectById(req, res, next) {
    try {
      const { id } = req.params;
      
      const defect = await BoardDefect.findByPk(id, {
        include: [
          { 
            model: DefectCategory, 
            as: "category"
          },
          { 
            model: User, 
            as: "detectedBy",
            attributes: ["id", "name", "surname"]
          },
          { 
            model: User, 
            as: "closedBy",
            attributes: ["id", "name", "surname"]
          },
          { 
            model: RepairAction, 
            as: "repairs",
            include: [
              { 
                model: User, 
                as: "performedBy",
                attributes: ["id", "name", "surname"]
              }
            ],
            order: [["performedAt", "ASC"]]
          }
        ]
      });
      
      if (!defect) {
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      // Пробуем получить информацию о плате
      let boardInfo = null;
      try {
        boardInfo = await this._getBoardInfo(defect.boardType, defect.boardId);
      } catch (e) {
        console.log("Не удалось получить информацию о плате:", e.message);
      }
      
      return res.json({
        defect,
        boardInfo
      });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Зарегистрировать новый дефект
  async createDefect(req, res, next) {
    try {
      const { 
        boardType, 
        boardId, 
        serialNumber, 
        categoryId, 
        description 
      } = req.body;
      
      // Валидация
      if (!boardType) {
        return next(ApiError.badRequest("Укажите тип платы"));
      }
      if (!categoryId) {
        return next(ApiError.badRequest("Укажите категорию дефекта"));
      }
      
      // Проверяем категорию
      const category = await DefectCategory.findByPk(categoryId);
      if (!category) {
        return next(ApiError.notFound("Категория не найдена"));
      }
      
      // Создаём запись
      const defect = await BoardDefect.create({
        boardType,
        boardId: boardId || null,
        serialNumber: serialNumber || null,
        categoryId,
        description: description || null,
        detectedById: req.user.id,
        detectedAt: new Date(),
        status: "OPEN"
      });
      
      // Загружаем с ассоциациями для ответа
      const result = await BoardDefect.findByPk(defect.id, {
        include: [
          { model: DefectCategory, as: "category" },
          { model: User, as: "detectedBy", attributes: ["id", "name", "surname"] }
        ]
      });
      
      return res.json(result);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Обновить статус дефекта
  async updateDefectStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { status, finalResult } = req.body;
      
      const defect = await BoardDefect.findByPk(id);
      if (!defect) {
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      const updateData = { status };
      
      // Если закрываем — фиксируем кто и когда
      const closedStatuses = ["VERIFIED", "SCRAPPED", "RETURNED", "CLOSED"];
      if (closedStatuses.includes(status)) {
        updateData.closedById = req.user.id;
        updateData.closedAt = new Date();
        if (finalResult) {
          updateData.finalResult = finalResult;
        }
      }
      
      await defect.update(updateData);
      
      return res.json(defect);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // =========================================================
  // ДЕЙСТВИЯ ПО РЕМОНТУ
  // =========================================================
  
  // Добавить действие по ремонту
  async addRepairAction(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const { defectId } = req.params;
      const { actionType, description, timeSpentMinutes, result } = req.body;
      
      // Валидация
      if (!actionType) {
        await t.rollback();
        return next(ApiError.badRequest("Укажите тип действия"));
      }
      if (!description) {
        await t.rollback();
        return next(ApiError.badRequest("Укажите описание"));
      }
      
      // Проверяем дефект
      const defect = await BoardDefect.findByPk(defectId, { transaction: t });
      if (!defect) {
        await t.rollback();
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      // Создаём действие
      const action = await RepairAction.create({
        boardDefectId: defectId,
        actionType,
        performedById: req.user.id,
        performedAt: new Date(),
        description,
        timeSpentMinutes: timeSpentMinutes || null,
        result: result || "PENDING"
      }, { transaction: t });
      
      // Обновляем суммарное время и статус дефекта
      const newTotalMinutes = (defect.totalRepairMinutes || 0) + (timeSpentMinutes || 0);
      const updateData = { totalRepairMinutes: newTotalMinutes };
      
      // Автоматически меняем статус на IN_REPAIR если был OPEN
      if (defect.status === "OPEN") {
        updateData.status = "IN_REPAIR";
      }
      
      await defect.update(updateData, { transaction: t });
      
      await t.commit();
      
      // Загружаем с ассоциацией
      const resultAction = await RepairAction.findByPk(action.id, {
        include: [
          { model: User, as: "performedBy", attributes: ["id", "name", "surname"] }
        ]
      });
      
      return res.json(resultAction);
    } catch (e) {
      await t.rollback();
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Получить историю ремонта
  async getRepairHistory(req, res, next) {
    try {
      const { defectId } = req.params;
      
      const actions = await RepairAction.findAll({
        where: { boardDefectId: defectId },
        include: [
          { model: User, as: "performedBy", attributes: ["id", "name", "surname"] }
        ],
        order: [["performedAt", "ASC"]]
      });
      
      return res.json(actions);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // =========================================================
  // БЫСТРЫЕ ДЕЙСТВИЯ
  // =========================================================
  
  // Отметить как "Починено"
  async markAsRepaired(req, res, next) {
    const t = await sequelize.transaction();
    
    try {
      const { id } = req.params;
      const { repairNote, timeSpentMinutes } = req.body;
      
      const defect = await BoardDefect.findByPk(id, { transaction: t });
      if (!defect) {
        await t.rollback();
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      // Добавляем финальное действие если есть заметка
      if (repairNote) {
        await RepairAction.create({
          boardDefectId: id,
          actionType: "OTHER",
          performedById: req.user.id,
          performedAt: new Date(),
          description: repairNote,
          timeSpentMinutes: timeSpentMinutes || null,
          result: "SUCCESS"
        }, { transaction: t });
      }
      
      // Обновляем статус
      await defect.update({
        status: "REPAIRED",
        totalRepairMinutes: (defect.totalRepairMinutes || 0) + (timeSpentMinutes || 0)
      }, { transaction: t });
      
      await t.commit();
      
      return res.json({ message: "Дефект отмечен как отремонтированный", defect });
    } catch (e) {
      await t.rollback();
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Отметить как "Списано"
  async markAsScrapped(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const defect = await BoardDefect.findByPk(id);
      if (!defect) {
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      // Добавляем заметку о списании
      if (reason) {
        await RepairAction.create({
          boardDefectId: id,
          actionType: "OTHER",
          performedById: req.user.id,
          performedAt: new Date(),
          description: `Списано: ${reason}`,
          result: "FAILED"
        });
      }
      
      await defect.update({
        status: "SCRAPPED",
        closedById: req.user.id,
        closedAt: new Date(),
        finalResult: "SCRAPPED"
      });
      
      return res.json({ message: "Дефект списан", defect });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // Подтвердить ремонт (ОТК)
  async verifyRepair(req, res, next) {
    try {
      const { id } = req.params;
      
      const defect = await BoardDefect.findByPk(id);
      if (!defect) {
        return next(ApiError.notFound("Дефект не найден"));
      }
      
      if (defect.status !== "REPAIRED") {
        return next(ApiError.badRequest("Можно подтвердить только отремонтированные дефекты"));
      }
      
      await defect.update({
        status: "VERIFIED",
        closedById: req.user.id,
        closedAt: new Date(),
        finalResult: "FIXED"
      });
      
      return res.json({ message: "Ремонт подтверждён", defect });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // =========================================================
  // СТАТИСТИКА
  // =========================================================
  
  async getStatistics(req, res, next) {
    try {
      const { startDate, endDate, boardType } = req.query;
      
      const where = {};
      if (boardType) where.boardType = boardType;
      if (startDate || endDate) {
        where.detectedAt = {};
        if (startDate) where.detectedAt[Op.gte] = new Date(startDate);
        if (endDate) where.detectedAt[Op.lte] = new Date(endDate + "T23:59:59.999Z");
      }
      
      // По статусам
      const byStatus = await BoardDefect.findAll({
        attributes: [
          "status",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"]
        ],
        where,
        group: ["status"],
        raw: true
      });
      
      // По категориям
      const byCategory = await BoardDefect.findAll({
        attributes: [
          "categoryId",
          [sequelize.fn("COUNT", sequelize.col("board_defect.id")), "count"]
        ],
        where,
        include: [
          { model: DefectCategory, as: "category", attributes: ["title"] }
        ],
        group: ["categoryId", "category.id"],
        raw: true
      });
      
      // По типам плат
      const byBoardType = await BoardDefect.findAll({
        attributes: [
          "boardType",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"]
        ],
        where,
        group: ["boardType"],
        raw: true
      });
      
      // Среднее время ремонта
      const avgRepairTime = await BoardDefect.findOne({
        attributes: [
          [sequelize.fn("AVG", sequelize.col("totalRepairMinutes")), "avgMinutes"]
        ],
        where: {
          ...where,
          status: { [Op.in]: ["VERIFIED", "REPAIRED"] },
          totalRepairMinutes: { [Op.gt]: 0 }
        },
        raw: true
      });
      
      return res.json({
        byStatus,
        byCategory,
        byBoardType,
        avgRepairTime: avgRepairTime?.avgMinutes 
          ? Math.round(avgRepairTime.avgMinutes) 
          : null
      });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
  
  // =========================================================
  // ПРИВАТНЫЕ МЕТОДЫ
  // =========================================================
  
  async _getBoardInfo(boardType, boardId) {
    if (!boardId) return null;
    
    switch (boardType) {
      case "FC":
        return await FC.findByPk(boardId);
      case "ELRS_915":
        return await ELRS915.findByPk(boardId);
      case "ELRS_2_4":
        return await ELRS2_4.findByPk(boardId);
      case "CORAL_B":
        return await CoralB.findByPk(boardId);
      default:
        return null;
    }
  }
}

module.exports = new DefectSystemController();
