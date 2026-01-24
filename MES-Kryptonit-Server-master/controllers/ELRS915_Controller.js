const { ELRS915, Session } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");

class ELRS915_Controller {
  async getBoards(req, res, next) {
    let {
      MAC_address,
      firmware,
      PCId,
      userId,
      categoryDefect915Id,
      firmwareVersion,
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

      if (categoryDefect915Id) {
        whereClause.categoryDefect915Id = categoryDefect915Id;
      }
      if (firmwareVersion) {
        whereClause.firmwareVersion = firmwareVersion;
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

      const boardsAll = await ELRS915.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      return res.json(boardsAll);
    } catch (error) {
      next(ApiError.badRequest(error.message));
    }
  }

  async postBoard(req, res, next) {
    try {
      const { MAC_address, firmware, sessionId, categoryDefect915Id, firmwareVersion } =
        req.body;

      const board = await ELRS915.create({
        MAC_address,
        firmware,
        sessionId,
        categoryDefect915Id,
        firmwareVersion
      });
      return res.json(board);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async postManyDefect915(req, res, next) {
    try {
      const { count, sessionId, categoryDefect915Id } = req.body;
      const MAC_address = null;
      const firmware = false;

      const records = Array.from({ length: count }, () => ({
        MAC_address,
        firmware,
        sessionId,
        categoryDefect915Id,
      }));

      await ELRS915.bulkCreate(records);

      return res.json("добавлены записи");
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async deleteManyDefect915(req, res, next) {
    try {
      const { count, categoryDefect915Id } = req.body;

      const recordsToDelete = await ELRS915.findAll({
        attributes: ["id"],
        where: { categoryDefect915Id },
        order: [["createdAt", "DESC"]],
        limit: count,
      });

      const idsToDelete = recordsToDelete.map((record) => record.id);

      await ELRS915.destroy({
        where: {
          id: {
            [Op.in]: idsToDelete,
          },
        },
      });

      return res.json("записи удалены");
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async updateBoard(req, res, next) {
    try {
      const { id, firmware, sessionId, categoryDefectId } = req.body;
      await ELRS915.update(
        { firmware, sessionId, categoryDefectId },
        { where: { id } }
      );
      const boardUpdated = await ELRS915.findAll({ where: { id } });
      return res.json(boardUpdated[0]);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async deleteBoardByDBid(req, res, next) {
    try {
      const id = req.params.id;
      await ELRS915.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new ELRS915_Controller();
