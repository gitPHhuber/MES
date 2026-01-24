const { Project, User } = require("../models/index");
const ApiError = require("../error/ApiError");

class ProjectController {
  async create(req, res, next) {
    try {
      const { title, description } = req.body;
      if (!title) return next(ApiError.badRequest("Нужно название проекта"));
      
      const project = await Project.create({
        title, 
        description,
        createdById: req.user.id
      });
      return res.json(project);
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  async getAll(req, res, next) {
    try {
      const projects = await Project.findAll({
        order: [["createdAt", "DESC"]],
        include: [{ model: User, as: "author", attributes: ["name", "surname"] }]
      });
      return res.json(projects);
    } catch (e) {
      next(ApiError.internal(e.message));
    }
  }

  async delete(req, res, next) {
    try {
        await Project.destroy({ where: { id: req.params.id } });
        return res.json({ message: "Deleted" });
    } catch(e) { next(ApiError.internal(e.message)); }
  }
}

module.exports = new ProjectController();