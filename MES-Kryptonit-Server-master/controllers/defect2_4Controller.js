const { CategoryDefect2_4 } = require("../models/index");
const ApiError = require("../error/ApiError");

class DefectController2_4 {
  async getDefects(req, res, next) {
    try {
      const defectAll = await CategoryDefect2_4.findAll({
        order: [["id", "ASC"]],
      });
      return res.json(defectAll);
    } catch (e) {
      next(e);
    }
  }

  async postDefect(req, res, next) {
    try {
      const { title, description } = req.body;
      const defect = await CategoryDefect2_4.create({ title, description });
      return res.json(defect);
    } catch (e) {
      next(e);
    }
  }

  async updateDefect(req, res, next) {
    try {
      const { id, title, description } = req.body;
      await CategoryDefect2_4.update({ title, description }, { where: { id } });
      const defectUpdated = await CategoryDefect2_4.findAll({ where: { id } });
      return res.json(defectUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async deleteDefect(req, res, next) {
    try {
      const id = req.params.id;
      await CategoryDefect2_4.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new DefectController2_4();
