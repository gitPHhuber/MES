const ApiError = require("../../../error/ApiError");
const PassportService = require("../services/PassportService");

class PassportController {
  async generatePassport(req, res, next) {
    try {
      const { id } = req.params;
      const { buffer, fileName } = await PassportService.generatePassport(id);
      
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader("Content-Length", buffer.length);
      
      return res.send(buffer);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new PassportController();
