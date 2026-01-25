const { Op } = require("sequelize");
const ApiError = require("../../error/ApiError");
const {
  WarehouseBox,
  WarehouseMovement,
  WarehouseDocument,
  Supply,
  Section,
  Team,
  User,
} = require("../../models/index");
const { logAudit } = require("../../utils/auditLogger");
const sequelize = require("../../db");
const logger = require("../../services/logger");

class MovementController {
  // Одна операция (move/consume) по одной коробке
  async moveSingle(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const {
        boxId,
        operation,
        toSectionId,
        toTeamId,
        statusAfter,
        deltaQty = 0,
        goodQty = null,
        scrapQty = null,
        comment,
        documentId,
      } = req.body;

      if (!boxId || !operation) {
        await t.rollback();
        return next(ApiError.badRequest("Не указан boxId или operation"));
      }

      const box = await WarehouseBox.findByPk(boxId, { transaction: t });
      if (!box) {
        await t.rollback();
        return next(ApiError.notFound("Коробка не найдена"));
      }

      const fromSectionId = box.currentSectionId;
      const fromTeamId = box.currentTeamId;

      let newQty = box.quantity;
      const delta = Number(deltaQty) || 0;

      if (delta !== 0) {
        newQty = box.quantity + delta;
        if (newQty < 0) {
          await t.rollback();
          return next(ApiError.badRequest("Количество не может быть отрицательным"));
        }
        box.quantity = newQty;
      }

      if (toSectionId !== undefined) box.currentSectionId = toSectionId || null;
      if (toTeamId !== undefined) box.currentTeamId = toTeamId || null;
      if (statusAfter) box.status = statusAfter;

      await box.save({ transaction: t });

      const movement = await WarehouseMovement.create(
        {
          boxId: box.id,
          documentId: documentId || null,
          fromSectionId,
          toSectionId: toSectionId || null,
          fromTeamId,
          toTeamId: toTeamId || null,
          operation,
          statusAfter: box.status,
          deltaQty: delta,
          goodQty: goodQty !== undefined ? goodQty : null,
          scrapQty: scrapQty !== undefined ? scrapQty : null,
          performedAt: new Date(),
          comment: comment || null,
          performedById: req.user ? req.user.id : null,
        },
        { transaction: t }
      );

      await logAudit({
        req,
        action: "WAREHOUSE_MOVE",
        entity: "WarehouseMovement",
        entityId: String(movement.id),
        description: `Операция ${operation} с коробкой #${box.id}`,
        metadata: {
          boxId: box.id,
          fromSectionId,
          toSectionId,
          deltaQty: delta,
        },
      });

      await t.commit();

      const reloadedBox = await WarehouseBox.findByPk(box.id, {
        include: [
          { model: Section, as: "currentSection", attributes: ["id", "title"] },
          { model: Team, as: "currentTeam", attributes: ["id", "title"] },
          { model: Supply, as: "supply" },
        ],
      });

      return res.json({ box: reloadedBox, movement });
    } catch (e) {
      await t.rollback();
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  // Пакетное движение по нескольким коробкам
  async moveBatch(req, res, next) {
    const t = await sequelize.transaction();
    try {
      const { docNumber, items } = req.body;

      if (!items || !Array.isArray(items) || items.length === 0) {
        await t.rollback();
        return next(ApiError.badRequest("Пустой список операций"));
      }

      let document = null;
      if (docNumber) {
        document = await WarehouseDocument.create(
          {
            boxId: null,
            number: docNumber,
            type: "MOVEMENT",
            date: new Date(),
            fileUrl: null,
            comment: null,
            createdById: req.user ? req.user.id : null,
          },
          { transaction: t }
        );
      }

      const documentId = document ? document.id : null;

      const movements = [];
      const updatedBoxes = [];

      for (const raw of items) {
        const boxId = raw.boxId || (raw.box && raw.box.id);
        if (!boxId) {
          await t.rollback();
          return next(ApiError.badRequest("В одном из элементов нет boxId"));
        }

        const {
          operation,
          toSectionId,
          toTeamId,
          statusAfter,
          deltaQty = 0,
          goodQty = null,
          scrapQty = null,
          comment,
        } = raw;

        const box = await WarehouseBox.findByPk(boxId, { transaction: t });
        if (!box) {
          await t.rollback();
          return next(ApiError.notFound(`Коробка ${boxId} не найдена`));
        }

        const fromSectionId = box.currentSectionId;
        const fromTeamId = box.currentTeamId;
        const delta = Number(deltaQty) || 0;

        if (delta !== 0) {
          const newQty = box.quantity + delta;
          if (newQty < 0) {
            await t.rollback();
            return next(
              ApiError.badRequest(`Отрицательное количество для коробки ${boxId}`)
            );
          }
          box.quantity = newQty;
        }

        if (toSectionId !== undefined) box.currentSectionId = toSectionId || null;
        if (toTeamId !== undefined) box.currentTeamId = toTeamId || null;
        if (statusAfter) box.status = statusAfter;

        await box.save({ transaction: t });

        const movement = await WarehouseMovement.create(
          {
            boxId: box.id,
            documentId,
            fromSectionId,
            toSectionId: toSectionId || null,
            fromTeamId,
            toTeamId: toTeamId || null,
            operation,
            statusAfter: box.status,
            deltaQty: delta,
            goodQty: goodQty !== undefined ? goodQty : null,
            scrapQty: scrapQty !== undefined ? scrapQty : null,
            performedAt: new Date(),
            comment: comment || null,
            performedById: req.user ? req.user.id : null,
          },
          { transaction: t }
        );

        movements.push(movement);
        updatedBoxes.push(box);
      }

      await logAudit({
        req,
        action: "WAREHOUSE_MOVE_BATCH",
        entity: "WarehouseMovement",
        description: `Пакетное перемещение, операций: ${movements.length}`,
        metadata: {
          docNumber: docNumber || null,
          count: movements.length,
        },
      });

      await t.commit();

      return res.json({
        message: "Операции успешно выполнены",
        count: movements.length,
        document: document || null,
      });
    } catch (e) {
      await t.rollback();
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  // Общий список движений (по коробке или по периоду)
  async getMovements(req, res, next) {
    try {
      let { page = 1, limit = 50, boxId, fromDate, toDate } = req.query;
      page = Number(page) || 1;
      limit = Number(limit) || 50;

      const where = {};
      if (boxId) where.boxId = boxId;

      if (fromDate || toDate) {
        where.performedAt = {};
        if (fromDate) where.performedAt[Op.gte] = new Date(fromDate);
        if (toDate) where.performedAt[Op.lte] = new Date(toDate);
      }

      const offset = (page - 1) * limit;

      const { rows, count } = await WarehouseMovement.findAndCountAll({
        where,
        limit,
        offset,
        order: [["performedAt", "DESC"]],
        include: [
          { model: Section, as: "fromSection", attributes: ["id", "title"] },
          { model: Section, as: "toSection", attributes: ["id", "title"] },
          { model: Team, as: "fromTeam", attributes: ["id", "title"] },
          { model: Team, as: "toTeam", attributes: ["id", "title"] },
          {
            model: User,
            as: "performedBy",
            attributes: ["id", "name", "surname"],
          },
        ],
      });

      return res.json({ rows, count, page, limit });
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  // Остатки по номенклатуре (для вкладки "Остатки")
  async getBalance(req, res, next) {
    try {
      const balances = await WarehouseBox.findAll({
        attributes: [
          "label",
          "originType",
          "originId",
          "unit",
          [sequelize.fn("SUM", sequelize.col("quantity")), "totalQuantity"],
          [sequelize.fn("COUNT", sequelize.col("id")), "boxCount"],
        ],
        where: {
          status: {
            [Op.notIn]: ["SCRAP", "SHIPPED"],
          },
        },
        group: ["label", "originType", "originId", "unit"],
        order: [["label", "ASC"]],
      });

      return res.json(balances);
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new MovementController();
