const { ELRS2_4, Session } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");

class ELRS2_4_Controller {
  async getBoards(req, res, next) {
    let {
      MAC_address,
      firmware,
      PCId,
      userId,
      categoryDefect24Id,
      date,
      limit,
      page,
    } = req.query;
    page = page || 1;
    limit = limit || 100;
    let offset = page * limit - limit;

    try {
      let sessionIds = null;

      if (PCId || userId) {
        const sessionPCIds = PCId
          ? await Session.findAll({
              attributes: ["id"],
              where: { PCId },
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

        if (PCId && userId) {
          sessionIds = [...pcIdList].filter((id) => userIdList.has(id));
        } else if (PCId) {
          sessionIds = [...pcIdList];
        } else if (userId) {
          sessionIds = [...userIdList];
        }

        if (PCId && userId && sessionIds.length === 0) {
          return res.json({ count: 0, rows: [] });
        }
      }

      let whereClause = {};

      if (sessionIds && sessionIds.length > 0) {
        whereClause.sessionId = sessionIds;
      }

      if (categoryDefect24Id) {
        whereClause.categoryDefect24Id = categoryDefect24Id;
      }

      if (firmware) {
        whereClause.firmware = firmware;
      }
      if (MAC_address) {
        whereClause.MAC_address = MAC_address;
      }

      const convertToISODate = (dateStr) => {
        const [day, month, year] = dateStr.split(".");
        return `${year}-${month}-${day}`;
      };

      if (date) {

        date = convertToISODate(date);

        whereClause.createdAt = {
          [Op.between]: [
            new Date(`${date}T00:00:00.000Z`),
            new Date(`${date}T23:59:59.999Z`),
          ],
        };
      }

      const boardsAll = await ELRS2_4.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      return res.json(boardsAll);
    } catch (error) {
      next(error);
    }
  }

  async postBoard(req, res, next) {
    try {
      const { MAC_address, firmware, sessionId, categoryDefect24Id } = req.body;

      const board = await ELRS2_4.create({
        MAC_address,
        firmware,
        sessionId,
        categoryDefect24Id,
      });
      return res.json(board);
    } catch (e) {
      next(e);
    }
  }

  async postManyDefect24(req, res, next) {
    try {
      const { count, sessionId, categoryDefect24Id } = req.body;
      const MAC_address = null;
      const firmware = false;

      const records = Array.from({ length: count }, () => ({
        MAC_address,
        firmware,
        sessionId,
        categoryDefect24Id,
      }));

      await ELRS2_4.bulkCreate(records);

      return res.json("добавлены записи");
    } catch (e) {
      next(e);
    }
  }

  async deleteManyDefect24(req, res, next) {
    try {
      const { count, categoryDefect24Id } = req.body;

      const recordsToDelete = await ELRS2_4.findAll({
        attributes: ["id"],
        where: { categoryDefect24Id },
        order: [["createdAt", "DESC"]],
        limit: count,
      });

      const idsToDelete = recordsToDelete.map((record) => record.id);

      await ELRS2_4.destroy({
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
      const { id, firmware, sessionId, categoryDefectId } = req.body;
      await ELRS2_4.update(
        { firmware, sessionId, categoryDefectId },
        { where: { id } }
      );
      const boardUpdated = await ELRS2_4.findAll({ where: { id } });
      return res.json(boardUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async deleteBoardByDBid(req, res, next) {
    try {
      const id = req.params.id;
      await ELRS2_4.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new ELRS2_4_Controller();
