const { PrintHistory, User } = require("../../models/index");
const { Op } = require("sequelize");
const ApiError = require("../../error/ApiError");

class HistoryController {
    async getPrintHistory(req, res, next) {
        try {
            let { page = 1, limit = 50, search, template, dateFrom, dateTo } = req.query;
            page = Number(page) || 1;
            limit = Number(limit) || 50;
            const offset = (page - 1) * limit;

            const where = {};

            if (template) where.template = template;

            if (search) {
                const s = String(search).trim();
                where[Op.or] = [
                    { labelName: { [Op.iLike]: `%${s}%` } },
                    { startCode: { [Op.iLike]: `%${s}%` } },
                    { endCode: { [Op.iLike]: `%${s}%` } }
                ];
            }

            if (dateFrom || dateTo) {
                where.createdAt = {};
                if (dateFrom) where.createdAt[Op.gte] = new Date(dateFrom);
                if (dateTo) {
                    const to = new Date(dateTo);
                    to.setDate(to.getDate() + 1); // +1 день, чтобы захватить конец дня
                    where.createdAt[Op.lt] = to;
                }
            }

            const history = await PrintHistory.findAndCountAll({
                where,
                limit,
                offset,
                order: [["createdAt", "DESC"]],
                include: [
                    {
                        model: User,
                        as: "createdBy",
                        attributes: ["id", "name", "surname"]
                    }
                ]
            });

            return res.json({
                rows: history.rows,
                count: history.count,
                page,
                limit
            });

        } catch (e) {
            if (e.status) {
                return next(e);
            }
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new HistoryController();
