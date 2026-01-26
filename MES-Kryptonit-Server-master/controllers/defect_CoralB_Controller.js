const { CategoryDefect_CoralB } = require("../models/index");
const ApiError = require("../error/ApiError");

class DefectController_CoralB {
  async getDefects(req, res, next) {
    try {
      const defectAll = await CategoryDefect_CoralB.findAll({
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
      const defect = await CategoryDefect_CoralB.create({ title, description });
      return res.json(defect);
    } catch (e) {
      next(e);
    }
  }

  async updateDefect(req, res, next) {
    try {
      const { id, title, description } = req.body;
      await CategoryDefect_CoralB.update(
        { title, description },
        { where: { id } }
      );
      const defectUpdated = await CategoryDefect_CoralB.findAll({
        where: { id },
      });
      return res.json(defectUpdated[0]);
    } catch (e) {
      next(e);
    }
  }

  async deleteDefect(req, res, next) {
    try {
      const id = req.params.id;
      await CategoryDefect_CoralB.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new DefectController_CoralB();
