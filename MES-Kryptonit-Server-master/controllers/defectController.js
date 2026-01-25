const { CategoryDefect } = require("../models/index");
const ApiError = require("../error/ApiError");

class DefectController {
  async getDefects(req, res, next) {
    try {
      const defectAll = await CategoryDefect.findAll({
        order: [ ["id", "ASC"]],
      });
      return res.json(defectAll);
    } catch (e) {
      next(e);
    }
  }

  async postDefect(req, res, next) {
    try {
      const { title, description } = req.body;
      const defect = await CategoryDefect.create({ title, description });
      return res.json(defect);
    } catch (e) {
      next(e);
    }
  }

  async updateDefect(req, res, next) {
    try {
      const { id, title, description } = req.body;
      await CategoryDefect.update({ title, description }, { where: { id } });
      const defectUpdated = await CategoryDefect.findAll({ where: { id } });
      return res.json(defectUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async deleteDefect(req, res, next) {
    try {
      const id = req.params.id;
      await CategoryDefect.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new DefectController();
