const { Op } = require("sequelize");
const { WarehouseBox, InventoryLimit } = require("../../models/index");
const sequelize = require("../../db");
const ApiError = require("../../error/ApiError");
const logger = require("../../services/logger");

class AlertsController {
  async getAlerts(req, res, next) {
    try {
      const limits = await InventoryLimit.findAll();

      const balances = await WarehouseBox.findAll({
        attributes: [
          "label",
          "originType",
          "originId",
          [sequelize.fn("SUM", sequelize.col("quantity")), "total"],
        ],
        where: {
          status: {
            [Op.notIn]: ["SCRAP", "SHIPPED"],
          },
        },
        group: ["label", "originType", "originId"],
      });

      const alerts = [];

      for (const limit of limits) {
        let currentQty = 0;

        const foundBalance = balances.find(
          (b) =>
            b.label === limit.label &&
            b.originType === limit.originType &&
            (limit.originId == null || b.originId === limit.originId)
        );

        if (foundBalance) {
          currentQty = Number(foundBalance.get("total")) || 0;
        }

        if (currentQty < limit.minQuantity) {
          alerts.push({
            id: limit.id,
            label: limit.label,
            min: limit.minQuantity,
            current: currentQty,
            deficit: limit.minQuantity - currentQty,
          });
        }
      }

      res.json(alerts);
    } catch (e) {
      logger.error("Alerts Error:", e);
      next(ApiError.internal(e.message));
    }
  }

  async getAllLimits(req, res, next) {
    try {
      const limits = await InventoryLimit.findAll({
        order: [["label", "ASC"]],
      });
      res.json(limits);
    } catch (e) {
      logger.error("Get Limits Error:", e);
      next(ApiError.internal(e.message));
    }
  }

  async setLimit(req, res, next) {
    try {
      const { label, originType, originId, min } = req.body;

      let whereClause = {};
      if (originId && originType) {
        whereClause = { originId, originType };
      } else {
        whereClause = { label };
      }

      let limit = await InventoryLimit.findOne({ where: whereClause });

      if (limit) {
        if (min <= 0) {
          await limit.destroy();
          return res.json({ message: "Лимит удален" });
        }
        await limit.update({ minQuantity: min, label });
      } else if (min > 0) {
        limit = await InventoryLimit.create({
          label,
          originType,
          originId,
          minQuantity: min,
        });
      }

      res.json(limit);
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new AlertsController();
