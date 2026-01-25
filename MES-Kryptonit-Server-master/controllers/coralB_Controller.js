const { Session, CoralB } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");

class CoralB_Controller {
  async getBoards(req, res, next) {
    let {
      serial,
      firmware,
      pcId,
      userId,
      SAW_filter,
      firmwareVersion,
      categoryDefectCoralBId,
      date,
      limit,
      page,
    } = req.query;
    page = page || 1;
    limit = limit || 100;
    let offset = page * limit - limit;

    try {
      let sessionIds = null;

      if (pcId || userId) {
        const sessionPCIds = pcId
          ? await Session.findAll({
            attributes: ["id"],
            where: { pcId },
            raw: true,
          })
          : [];


        const sessionUserIds = userId
          ? await Session.findAll({
              attributes: ["id"],
              where: { userId },
              raw: true,
            })
          : [];

        const pcIdList = new Set(sessionPCIds.map((s) => s.id));
        const userIdList = new Set(sessionUserIds.map((s) => s.id));

        if (pcId && userId) {
          sessionIds = [...pcIdList].filter((id) => userIdList.has(id));
        } else if (pcId) {
          sessionIds = [...pcIdList];
        } else if (userId) {
          sessionIds = [...userIdList];
        }

        if (pcId && userId && sessionIds.length === 0) {
          return res.json({ count: 0, rows: [] });
        }
      }

      let whereClause = {};

      if (sessionIds && sessionIds.length > 0) {
        whereClause.sessionId = sessionIds;
      }

      if (categoryDefectCoralBId) {
        whereClause.categoryDefectCoralBId = categoryDefectCoralBId;
      }

      if (firmware) {
        whereClause.firmware = firmware;
      }
      if (serial) {
        whereClause.serial = serial;
      }
      if (firmwareVersion) {
        whereClause.firmwareVersion = firmwareVersion;
      }
      if (SAW_filter) {
        whereClause.SAW_filter = SAW_filter;
      }

      const convertToISODate = (dateStr) => {
        //DD.MM.YYYY → YYYY-MM-DD преобразование
        const [day, month, year] = dateStr.split(".");
        return `${year}-${month}-${day}`;
      };

      if (date) {
        //date должна быть в формате  YYYY-MM-DD (например, "2025-02-07")   а приходит в формте dd.mm.yyyy

        date = convertToISODate(date);

        whereClause.createdAt = {
          [Op.between]: [
            new Date(`${date}T00:00:00.000Z`),
            new Date(`${date}T23:59:59.999Z`),
          ],
        };
      }

      const boardsAll = await CoralB.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["id", "ASC"]],
      }); // Применяем только существующие условия

      return res.json(boardsAll);
    } catch (error) {
      next(error);
    }
  }

  async postBoard(req, res, next) {
    try {
      const {
        serial,
        firmware,
        SAW_filter,
        firmwareVersion,
        sessionId,
        categoryDefectCoralBId,
      } = req.body;

      const board = await CoralB.create({
        serial,
        firmware,
        SAW_filter,
        firmwareVersion,
        sessionId,
        categoryDefectCoralBId,
      });
      return res.json(board);
    } catch (e) {
      next(e);
    }
  }

  async postManyDefectCoralB(req, res, next) {
    try {
      const { count, SAW_filter, sessionId, categoryDefectCoralBId } = req.body;
      const serial = null;
      const firmware = false;
      const firmwareVersion = null;

      // Создаём массив объектов для массовой вставки
      const records = Array.from({ length: count }, () => ({
        serial,
        firmware,
        SAW_filter,
        firmwareVersion,
        sessionId,
        categoryDefectCoralBId,
      }));

      await CoralB.bulkCreate(records); //массовая вставка

      return res.json("добавлены записи");
    } catch (e) {
      next(e);
    }
  }

  async deleteManyDefectCoralB(req, res, next) {
    try {
      const { count, SAW_filter, categoryDefectCoralBId } = req.body;

      const recordsToDelete = await CoralB.findAll({
        attributes: ["id"],
        where: {
          SAW_filter: SAW_filter,
          categoryDefectCoralBId: categoryDefectCoralBId,
        },
        order: [["createdAt", "DESC"]],
        limit: count,
      });

      const idsToDelete = recordsToDelete.map((record) => record.id);

      await CoralB.destroy({
        where: {
          id: {
            [Op.in]: idsToDelete,
          },
        },
      });

      return res.json("записи удалены");
    } catch (e) {
      next(e);
    }
  }

  async updateBoard(req, res, next) {
    try {
      const {
        id,
        firmware,
        SAW_filter,
        firmwareVersion,
        sessionId,
        categoryDefectCoralBId,
      } = req.body;
      await CoralB.update(
        {
          firmware,
          sessionId,
          SAW_filter,
          firmwareVersion,
          categoryDefectCoralBId,
        },
        { where: { id } }
      );
      const boardUpdated = await CoralB.findAll({ where: { id } });
      return res.json(boardUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async deleteBoardByDBid(req, res, next) {
    try {
      const id = req.params.id;
      await CoralB.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new CoralB_Controller();
