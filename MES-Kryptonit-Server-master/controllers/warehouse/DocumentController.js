const { Op } = require("sequelize");
const ApiError = require("../../error/ApiError");
const { WarehouseDocument, User } = require("../../models/index");

class DocumentController {
  async createDocument(req, res, next) {
    try {
      const { boxId, number, type, date, fileUrl, comment } = req.body;

      if (!number) {
        return next(ApiError.badRequest("Нужен номер документа"));
      }

      const doc = await WarehouseDocument.create({
        boxId: boxId || null,
        number,
        type: type || null,
        date: date || null,
        fileUrl: fileUrl || null,
        comment: comment || null,
        createdById: req.user.id,
      });

      return res.json(doc);
    } catch (e) {
      console.error(e);
      next(ApiError.internal(e.message));
    }
  }

  async getDocuments(req, res, next) {
    try {
      let { page = 1, limit = 50, search, type } = req.query;
      page = Number(page) || 1;
      limit = Number(limit) || 50;

      const where = {};
      if (type) where.type = type;
      if (search) where.number = { [Op.iLike]: `%${search}%` };

      const offset = (page - 1) * limit;

      const data = await WarehouseDocument.findAndCountAll({
        where,
        limit,
        offset,
        order: [["date", "DESC"]],
        include: [
          {
            model: User,
            as: "createdBy",
            attributes: ["name", "surname"],
          },
        ],
      });

      return res.json({
        rows: data.rows,
        count: data.count,
        page,
        limit,
      });
    } catch (e) {
      console.error(e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new DocumentController();
