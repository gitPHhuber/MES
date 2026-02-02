const ChecklistService = require("../services/ChecklistService");
const ApiError = require("../../../error/ApiError");

class ChecklistController {
  

  async getChecklistTemplates(req, res, next) {
    try {
      const { includeInactive } = req.query;
      
      let templates;
      if (includeInactive === 'true') {
        templates = await ChecklistService.getAllChecklistTemplates(true);
      } else {
        templates = await ChecklistService.getChecklistTemplates();
      }
      
      return res.json(templates);
    } catch (e) {
      console.error("getChecklistTemplates error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async createChecklistTemplate(req, res, next) {
    try {
      const template = await ChecklistService.createChecklistTemplate(req.body);
      return res.status(201).json(template);
    } catch (e) {
      console.error("createChecklistTemplate error:", e);
      if (e.message === "Название обязательно") {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async updateChecklistTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const template = await ChecklistService.updateChecklistTemplate(id, req.body);
      return res.json(template);
    } catch (e) {
      console.error("updateChecklistTemplate error:", e);
      if (e.message === "Шаблон не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async deleteChecklistTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const { hardDelete } = req.query;
      const result = await ChecklistService.deleteChecklistTemplate(id, hardDelete === 'true');
      return res.json(result);
    } catch (e) {
      console.error("deleteChecklistTemplate error:", e);
      if (e.message === "Шаблон не найден") {
        return next(ApiError.notFound(e.message));
      }
      if (e.message.includes("Невозможно удалить")) {
        return next(ApiError.badRequest(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async restoreChecklistTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const template = await ChecklistService.restoreChecklistTemplate(id);
      return res.json(template);
    } catch (e) {
      console.error("restoreChecklistTemplate error:", e);
      if (e.message === "Шаблон не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async reorderChecklistTemplates(req, res, next) {
    try {
      const { orderedIds } = req.body;
      
      if (!Array.isArray(orderedIds) || orderedIds.length === 0) {
        return next(ApiError.badRequest("Необходим массив orderedIds"));
      }
      
      const result = await ChecklistService.reorderChecklistTemplates(orderedIds);
      return res.json(result);
    } catch (e) {
      console.error("reorderChecklistTemplates error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async getServerChecklist(req, res, next) {
    try {
      const { serverId } = req.params;
      const checklist = await ChecklistService.getServerChecklist(serverId);
      return res.json(checklist);
    } catch (e) {
      console.error("getServerChecklist error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async toggleChecklistItem(req, res, next) {
    try {
      const { serverId, checklistId } = req.params;
      const { completed, notes } = req.body;
      const userId = req.user?.id;
      
      const checklist = await ChecklistService.toggleChecklistItem(
        serverId, 
        checklistId, 
        completed, 
        notes, 
        userId
      );
      
      return res.json(checklist);
    } catch (e) {
      console.error("toggleChecklistItem error:", e);
      if (e.message.includes("необходимо загрузить")) {
        return next(ApiError.badRequest(e.message));
      }
      if (e.message.includes("не найден")) {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async uploadChecklistFile(req, res, next) {
    try {
      const { serverId, checklistId } = req.params;
      const userId = req.user?.id;


      if (!req.files || !req.files.file) {
        return next(ApiError.badRequest("Файл не загружен"));
      }

      const uploadedFile = req.files.file;
      

      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return next(ApiError.badRequest("Недопустимый тип файла. Разрешены: JPG, PNG, GIF, WEBP, PDF"));
      }
      

      if (uploadedFile.size > 5 * 1024 * 1024) {
        return next(ApiError.badRequest("Максимальный размер файла 5 МБ"));
      }

      const file = await ChecklistService.uploadChecklistFile(
        serverId,
        checklistId,
        uploadedFile,  
        userId
      );
      
      return res.status(201).json(file);
    } catch (e) {
      console.error("uploadChecklistFile error:", e);
      if (e.message.includes("не найден")) {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async getServerFiles(req, res, next) {
    try {
      const { serverId } = req.params;
      const files = await ChecklistService.getServerFiles(serverId);
      return res.json(files);
    } catch (e) {
      console.error("getServerFiles error:", e);
      return next(ApiError.internal(e.message));
    }
  }
  

  async downloadFile(req, res, next) {
    try {
      const { fileId } = req.params;
      const file = await ChecklistService.getFileById(fileId);
      
      if (!file) {
        return next(ApiError.notFound("Файл не найден"));
      }


      const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
      
      res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalName)}"`);
      

      return res.sendFile(file.path);
    } catch (e) {
      console.error("downloadFile error:", e);
      if (e.message === "Файл не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  

  async deleteChecklistFile(req, res, next) {
    try {
      const { fileId } = req.params;
      const userId = req.user?.id;
      
      const result = await ChecklistService.deleteChecklistFile(fileId, userId);
      return res.json(result);
    } catch (e) {
      console.error("deleteChecklistFile error:", e);
      if (e.message === "Файл не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ChecklistController();