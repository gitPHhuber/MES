const ApiError = require("../../../error/ApiError");
const FileService = require("../services/FileService");

class FileController {
  async uploadChecklistFile(req, res, next) {
    try {
      const { serverId, checklistId } = req.params;
      const userId = req.user.id;
      
      if (!req.files || !req.files.file) {
        return next(ApiError.badRequest("Файл не загружен"));
      }
      
      const file = req.files.file;
      const result = await FileService.uploadChecklistFile(serverId, checklistId, file, userId);
      
      return res.json(result);
    } catch (e) {
      console.error(e);
      if (e.message === "Сервер не найден" || e.message === "Пункт чек-листа не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async getServerFiles(req, res, next) {
    try {
      const { serverId } = req.params;
      const files = await FileService.getServerFiles(serverId);
      return res.json(files);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async downloadFile(req, res, next) {
    try {
      const { fileId } = req.params;
      const { fullPath, originalName } = await FileService.getFileForDownload(fileId);
      
      return res.download(fullPath, originalName);
    } catch (e) {
      console.error(e);
      if (e.message.includes("не найден")) {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new FileController();
