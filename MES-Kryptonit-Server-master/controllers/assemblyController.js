const { Op } = require("sequelize");
const ApiError = require("../error/ApiError");
const logger = require("../services/logger");
const {
  AssemblyRoute,
  AssemblyRouteStep,
  Section,
  Team,
} = require("../models/index");

class AssemblyController {
  async getRoutes(req, res, next) {
    try {
      const { search, productName, isActive } = req.query;

      const where = {};
      if (productName) {
        where.productName = productName;
      }
      if (typeof isActive === "string") {
        where.isActive = isActive === "true";
      }
      if (search) {
        where[Op.or] = [
          { title: { [Op.iLike]: `%${search}%` } },
          { productName: { [Op.iLike]: `%${search}%` } },
        ];
      }

      const routes = await AssemblyRoute.findAll({
        where,
        include: [
          {
            model: AssemblyRouteStep,
            as: "steps",
            include: [
              { model: Section, as: "section", attributes: ["id", "title"] },
              { model: Team, as: "team", attributes: ["id", "title"] },
            ],
          },
        ],
        order: [
          ["title", "ASC"],
          [{ model: AssemblyRouteStep, as: "steps" }, "order", "ASC"],
        ],
      });

      return res.json(routes);
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  async getRouteById(req, res, next) {
    try {
      const { id } = req.params;

      const route = await AssemblyRoute.findByPk(id, {
        include: [
          {
            model: AssemblyRouteStep,
            as: "steps",
            include: [
              { model: Section, as: "section", attributes: ["id", "title"] },
              { model: Team, as: "team", attributes: ["id", "title"] },
            ],
            order: [["order", "ASC"]],
          },
        ],
      });

      if (!route) {
        return next(ApiError.notFound("Маршрут не найден"));
      }

      return res.json(route);
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  async createRoute(req, res, next) {
    try {
      const { title, productName, description, isActive = true, steps = [] } =
        req.body;

      if (!title) {
        return next(ApiError.badRequest("Не указано название маршрута"));
      }

      if (!req.user || !req.user.id) {
        return next(ApiError.unauthorized("Нет информации о пользователе"));
      }

      const route = await AssemblyRoute.create({
        title,
        productName: productName || null,
        description: description || null,
        isActive: Boolean(isActive),
        createdById: req.user.id,
      });

      if (Array.isArray(steps) && steps.length > 0) {
        const prepared = steps.map((s, index) => ({
          routeId: route.id,
          order: s.order ?? index + 1,
          title: s.title || `Шаг ${index + 1}`,
          operation: s.operation || "MOVE",
          sectionId: s.sectionId || null,
          teamId: s.teamId || null,
          description: s.description || null,
        }));

        await AssemblyRouteStep.bulkCreate(prepared);
      }

      const fullRoute = await AssemblyRoute.findByPk(route.id, {
        include: [
          {
            model: AssemblyRouteStep,
            as: "steps",
            include: [
              { model: Section, as: "section", attributes: ["id", "title"] },
              { model: Team, as: "team", attributes: ["id", "title"] },
            ],
            order: [["order", "ASC"]],
          },
        ],
      });

      return res.json(fullRoute);
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  async updateRoute(req, res, next) {
    try {
      const { id } = req.params;
      const { title, productName, description, isActive = true, steps = [] } =
        req.body;

      const route = await AssemblyRoute.findByPk(id);
      if (!route) {
        return next(ApiError.notFound("Маршрут не найден"));
      }

      await route.update({
        title: title || route.title,
        productName:
          productName !== undefined ? productName : route.productName,
        description:
          description !== undefined ? description : route.description,
        isActive:
          typeof isActive === "boolean" ? isActive : Boolean(route.isActive),
      });

      if (Array.isArray(steps)) {
        await AssemblyRouteStep.destroy({ where: { routeId: route.id } });

        const prepared = steps.map((s, index) => ({
          routeId: route.id,
          order: s.order ?? index + 1,
          title: s.title || `Шаг ${index + 1}`,
          operation: s.operation || "MOVE",
          sectionId: s.sectionId || null,
          teamId: s.teamId || null,
          description: s.description || null,
        }));

        if (prepared.length > 0) {
          await AssemblyRouteStep.bulkCreate(prepared);
        }
      }

      const fullRoute = await AssemblyRoute.findByPk(route.id, {
        include: [
          {
            model: AssemblyRouteStep,
            as: "steps",
            include: [
              { model: Section, as: "section", attributes: ["id", "title"] },
              { model: Team, as: "team", attributes: ["id", "title"] },
            ],
            order: [["order", "ASC"]],
          },
        ],
      });

      return res.json(fullRoute);
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }

  async deleteRoute(req, res, next) {
    try {
      const { id } = req.params;

      const route = await AssemblyRoute.findByPk(id);
      if (!route) {
        return next(ApiError.notFound("Маршрут не найден"));
      }

      await AssemblyRouteStep.destroy({ where: { routeId: route.id } });
      await route.destroy();

      return res.json({ message: "Маршрут удалён" });
    } catch (e) {
      logger.error(e);
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new AssemblyController();
