const { FC, Session } = require("../models/index");
const ApiError = require("../error/ApiError");
const { Op } = require("sequelize");
const logger = require("../services/logger");

class FCController {
  async getFCs(req, res, next) {
    let {
      unique_device_id,
      firmware,
      pcId,
      userId,
      categoryDefectId,
      stand_test,
      startDate,
      endDate,
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

      if (categoryDefectId) {
        whereClause.categoryDefectId = categoryDefectId;
      }

      if (firmware) {
        whereClause.firmware = firmware;
      }

      if (stand_test) {
        whereClause.stand_test = stand_test;
      }

      if (unique_device_id) {
        whereClause.unique_device_id = unique_device_id;
      }

      const convertToISODate = (dateStr) => {
        const [day, month, year] = dateStr.split(".");
        return `${year}-${month}-${day}`;
      };

      if (startDate || endDate) {

        let start = startDate ? convertToISODate(startDate) : null;
        let end = endDate ? convertToISODate(endDate) : null;

        const dateCondition = {};


        if (start && end) {
          dateCondition[Op.between] = [
            new Date(`${start}T00:00:00.000Z`),
            new Date(`${end}T23:59:59.999Z`)
          ];
        } else if (start) {
          dateCondition[Op.gte] = new Date(`${start}T00:00:00.000Z`);
        } else if (end) {
          dateCondition[Op.lte] = new Date(`${end}T23:59:59.999Z`);
        }

        whereClause.createdAt = dateCondition;
      }

      const fcAll = await FC.findAndCountAll({
        where: whereClause,
        limit,
        offset,
        order: [["id", "ASC"]],
      });

      return res.json(fcAll);
    } catch (error) {
      next(error);
    }
  }

  async postFC(req, res, next) {
    try {
      const { unique_device_id, firmware, sessionId, categoryDefectId } =
        req.body;

      const fc = await FC.create({
        unique_device_id,
        firmware,
        sessionId,
        categoryDefectId,
      });
      return res.json(fc);
    } catch (e) {
      next(e);
    }
  }

  async postManyDefectFC(req, res, next) {
    try {
      const { count, sessionId, categoryDefectId } = req.body;
      const unique_device_id = null;
      const firmware = false;

      const records = Array.from({ length: count }, () => ({
        unique_device_id,
        firmware,
        sessionId,
        categoryDefectId,
      }));

      await FC.bulkCreate(records);

      return res.json("добавлены записи");
    } catch (e) {
      next(e);
    }
  }

  async deleteManyDefectFC(req, res, next) {
    try {
      const { count, categoryDefectId } = req.body;

      const recordsToDelete = await FC.findAll({
        attributes: ["id"],
        where: { categoryDefectId },
        order: [["createdAt", "DESC"]],
        limit: count,
      });

      const idsToDelete = recordsToDelete.map((record) => record.id);

      await FC.destroy({
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

  async updateFC(req, res, next) {
    try {
      const { id, firmware, sessionId, categoryDefectId } = req.body;
      await FC.update(
        { firmware, sessionId, categoryDefectId },
        { where: { id } }
      );
      const fcUpdated = await FC.findAll({ where: { id } });
      return res.json(fcUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async updateStandTestFC(req, res, next) {
    try {
      const { unique_device_id, sessionId, stand_test } = req.body;

      let standTestBool;
      stand_test === "true" ? (standTestBool = true) : (standTestBool = false);
      stand_test === true ? (standTestBool = true) : (standTestBool = false);

      const existingFC = await FC.findOne({
        where: { unique_device_id },
      });

      if (existingFC) {
        let newCategoryDefectId, newFirmware;
        standTestBool ? (newCategoryDefectId = 1) : (newCategoryDefectId = 2);
        if (standTestBool) newFirmware = true;
        logger.info(newCategoryDefectId);
        await FC.update(
          {
            stand_test: standTestBool,
            firmware: newFirmware,
            categoryDefectId: newCategoryDefectId,
          },
          {
            where: { unique_device_id },
          }
        );

        const updatedFC = await FC.findOne({ where: { unique_device_id } });
        return res.json(updatedFC);
      } else {
        const categoryDefectId = standTestBool ? 1 : 2;
        const firmware = standTestBool ? true : false;
        const newFC = await FC.create({
          unique_device_id,
          firmware,
          sessionId,
          categoryDefectId,
          stand_test: standTestBool,
        });
        return res.json(newFC);
      }
    } catch (e) {
      next(e);
    }
  }

  async deleteFCByUniqueID(req, res, next) {
    try {
      const uniqueID = req.params.uniqueID;
      await FC.destroy({
        where: { unique_device_id: uniqueID },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }

  async deleteFCByDBid(req, res, next) {
    try {
      const id = req.params.id;
      await FC.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new FCController();
