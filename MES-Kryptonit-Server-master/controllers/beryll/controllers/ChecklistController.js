/**
 * ChecklistController.js - Контроллер для работы с чек-листами
 * 
 * Эндпоинты:
 * - GET    /api/beryll/checklists/templates              - получить шаблоны
 * - POST   /api/beryll/checklists/templates              - создать шаблон
 * - PUT    /api/beryll/checklists/templates/reorder      - изменить порядок (ВАЖНО: перед /:id)
 * - PUT    /api/beryll/checklists/templates/:id          - обновить шаблон
 * - DELETE /api/beryll/checklists/templates/:id          - удалить шаблон
 * - POST   /api/beryll/checklists/templates/:id/restore  - восстановить
 * - GET    /api/beryll/servers/:serverId/checklist       - чек-лист сервера
 * - PUT    /api/beryll/servers/:serverId/checklist/:checklistId - toggle
 * - POST   /api/beryll/servers/:serverId/checklist/:checklistId/file - загрузить файл
 * - GET    /api/beryll/servers/:serverId/files           - все файлы сервера
 * - GET    /api/beryll/files/:fileId                     - скачать файл
 * - DELETE /api/beryll/checklists/files/:fileId          - удалить файл
 * 
 * Путь: controllers/beryll/controllers/ChecklistController.js
 */

const ChecklistService = require("../services/ChecklistService");
const ApiError = require("../../../error/ApiError");

class ChecklistController {
  
  // ============================================
  // ШАБЛОНЫ ЧЕК-ЛИСТОВ
  // ============================================
  
  /**
   * GET /api/beryll/checklists/templates
   * Получить шаблоны чек-листов
   * @query includeInactive - включить неактивные (удалённые)
   */
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
  
  /**
   * POST /api/beryll/checklists/templates
   * Создать шаблон чек-листа
   */
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
  
  /**
   * PUT /api/beryll/checklists/templates/:id
   * Обновить шаблон чек-листа
   */
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
  
  /**
   * DELETE /api/beryll/checklists/templates/:id
   * Удалить (деактивировать) шаблон чек-листа
   * @query hardDelete - полное удаление (если не используется)
   */
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
  
  /**
   * POST /api/beryll/checklists/templates/:id/restore
   * Восстановить деактивированный шаблон
   */
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
  
  /**
   * PUT /api/beryll/checklists/templates/reorder
   * Изменить порядок шаблонов (Drag & Drop)
   * @body orderedIds - массив ID в новом порядке
   */
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
  
  // ============================================
  // ЧЕК-ЛИСТ СЕРВЕРА
  // ============================================
  
  /**
   * GET /api/beryll/servers/:serverId/checklist
   * Получить чек-лист сервера с файлами
   */
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
  
  /**
   * PUT /api/beryll/servers/:serverId/checklist/:checklistId
   * Переключить статус пункта чек-листа
   * @body completed - выполнен или нет
   * @body notes - примечание (опционально)
   * @throws Ошибка если requiresFile=true и нет файлов
   */
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
  
  // ============================================
  // ФАЙЛЫ ДОКАЗАТЕЛЬСТВ
  // ============================================
  
  /**
   * POST /api/beryll/servers/:serverId/checklist/:checklistId/file
   * Загрузить файл (доказательство) к пункту чек-листа
   * Использует express-fileupload (НЕ multer!)
   */
  async uploadChecklistFile(req, res, next) {
    try {
      const { serverId, checklistId } = req.params;
      const userId = req.user?.id;

      // express-fileupload использует req.files (объект), а не req.file (multer)
      if (!req.files || !req.files.file) {
        return next(ApiError.badRequest("Файл не загружен"));
      }

      const uploadedFile = req.files.file;
      
      // Валидация типа
      const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(uploadedFile.mimetype)) {
        return next(ApiError.badRequest("Недопустимый тип файла. Разрешены: JPG, PNG, GIF, WEBP, PDF"));
      }
      
      // Валидация размера (5 MB)
      if (uploadedFile.size > 5 * 1024 * 1024) {
        return next(ApiError.badRequest("Максимальный размер файла 5 МБ"));
      }

      const file = await ChecklistService.uploadChecklistFile(
        serverId,
        checklistId,
        uploadedFile,  // express-fileupload объект: { name, data, size, mimetype, mv() }
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
  
  /**
   * GET /api/beryll/servers/:serverId/files
   * Получить все файлы сервера
   */
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
  
  /**
   * GET /api/beryll/files/:fileId
   * Скачать/просмотреть файл
   */
  async downloadFile(req, res, next) {
    try {
      const { fileId } = req.params;
      const file = await ChecklistService.getFileById(fileId);
      
      if (!file) {
        return next(ApiError.notFound("Файл не найден"));
      }

      // Устанавливаем заголовки для отображения в браузере (inline) или скачивания
      const disposition = req.query.download === 'true' ? 'attachment' : 'inline';
      
      res.setHeader('Content-Type', file.mimetype || 'application/octet-stream');
      res.setHeader('Content-Disposition', `${disposition}; filename="${encodeURIComponent(file.originalName)}"`);
      
      // Отправляем файл
      return res.sendFile(file.path);
    } catch (e) {
      console.error("downloadFile error:", e);
      if (e.message === "Файл не найден") {
        return next(ApiError.notFound(e.message));
      }
      return next(ApiError.internal(e.message));
    }
  }
  
  /**
   * DELETE /api/beryll/checklists/files/:fileId
   * Удалить файл доказательства
   * Если это последний файл для этапа с requiresFile=true, отметка выполнения снимается
   */
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