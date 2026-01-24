const ApiError = require("../../../error/ApiError");
const ChecklistService = require("../services/ChecklistService");

class ChecklistController {
  async getChecklistTemplates(req, res, next) {
    try {
      const templates = await ChecklistService.getChecklistTemplates();
      return res.json(templates);
    } catch (e) {
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
  
  async createChecklistTemplate(req, res, next) {
    try {
      const template = await ChecklistService.createChecklistTemplate(req.body);
      return res.json(template);
    } catch (e) {
      console.error(e);
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
      console.error(e);
      if (e.message === "Шаблон не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  async deleteChecklistTemplate(req, res, next) {
    try {
      const { id } = req.params;
      const result = await ChecklistService.deleteChecklistTemplate(id);
      return res.json(result);
    } catch (e) {
      console.error(e);
      if (e.message === "Шаблон не найден") {
        return next(ApiError.notFound(e.message));
      }
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
      console.error(e);
      return next(ApiError.internal(e.message));
    }
  }
}

module.exports = new ChecklistController();
