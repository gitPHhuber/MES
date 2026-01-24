const { CategoryDefect915 } = require("../models/index");
const ApiError = require("../error/ApiError");

class DefectController915 {
  async getDefects(req, res, next) {
    try {
      const defectAll = await CategoryDefect915.findAll({
        order: [["id", "ASC"]],
      });
      return res.json(defectAll);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async postDefect(req, res, next) {
    try {
      const { title, description } = req.body;
      const defect = await CategoryDefect915.create({ title, description });
      return res.json(defect);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async updateDefect(req, res, next) {
    try {
      const { id, title, description } = req.body;
      await CategoryDefect915.update({ title, description }, { where: { id } });
      const defectUpdated = await CategoryDefect915.findAll({ where: { id } });
      return res.json(defectUpdated[0]);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async deleteDefect(req, res, next) {
    try {
      const id = req.params.id;
      await CategoryDefect915.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new DefectController915();
