
const { 
  BeryllChecklistTemplate, 
  BeryllServerChecklist,
  BeryllChecklistFile,
  BeryllServer,
  HISTORY_ACTIONS
} = require("../../../models/definitions/Beryll");


const { User } = require("../../../models/index");

const HistoryService = require("./HistoryService");
const { Op } = require("sequelize");
const path = require("path");
const fs = require("fs");

const UPLOAD_DIR = path.join(__dirname, "../../../uploads/beryll");


function decodeFileName(name) {
  if (!name) return name;
  
  try {

    const hasInvalidChars = /[\u0080-\u00ff]/.test(name);
    
    if (hasInvalidChars) {

      return Buffer.from(name, 'latin1').toString('utf8');
    }
    
    return name;
  } catch (e) {
    console.error("Error decoding filename:", e);
    return name;
  }
}

class ChecklistService {
  

  async initializeServerChecklist(serverId) {
    try {
      const templates = await BeryllChecklistTemplate.findAll({
        where: { isActive: true },
        order: [["sortOrder", "ASC"]]
      });
      
      for (const template of templates) {
        await BeryllServerChecklist.findOrCreate({
          where: { serverId, checklistTemplateId: template.id },
          defaults: { completed: false }
        });
      }
    } catch (e) {
      console.error("Error initializing checklist:", e);
      throw e;
    }
  }
  

  async getChecklistTemplates() {
    const templates = await BeryllChecklistTemplate.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]]
    });
    
    return templates;
  }
  
  async getAllChecklistTemplates(includeInactive = false) {
    const where = includeInactive ? {} : { isActive: true };
    
    const templates = await BeryllChecklistTemplate.findAll({
      where,
      order: [["sortOrder", "ASC"]]
    });
    
    return templates;
  }
  
  async createChecklistTemplate(data) {
    const { 
      title, 
      description, 
      sortOrder, 
      isRequired, 
      estimatedMinutes,
      groupCode,
      fileCode,
      requiresFile
    } = data;
    
    if (!title) {
      throw new Error("Название обязательно");
    }
    
    let order = sortOrder;
    if (order === undefined || order === null) {
      const maxOrder = await BeryllChecklistTemplate.max('sortOrder') || 0;
      order = maxOrder + 10;
    }
    
    const template = await BeryllChecklistTemplate.create({
      title,
      description: description || null,
      sortOrder: order,
      isRequired: isRequired !== false,
      estimatedMinutes: estimatedMinutes || 30,
      groupCode: groupCode || 'TESTING',
      fileCode: fileCode || null,
      requiresFile: requiresFile === true,
      isActive: true
    });
    
    return template;
  }
  
  async updateChecklistTemplate(id, data) {
    const { 
      title, 
      description, 
      sortOrder, 
      isRequired, 
      estimatedMinutes, 
      isActive,
      groupCode,
      fileCode,
      requiresFile
    } = data;
    
    const template = await BeryllChecklistTemplate.findByPk(id);
    
    if (!template) {
      throw new Error("Шаблон не найден");
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;
    if (isRequired !== undefined) updateData.isRequired = isRequired;
    if (estimatedMinutes !== undefined) updateData.estimatedMinutes = estimatedMinutes;
    if (isActive !== undefined) updateData.isActive = isActive;
    if (groupCode !== undefined) updateData.groupCode = groupCode;
    if (fileCode !== undefined) updateData.fileCode = fileCode;
    if (requiresFile !== undefined) updateData.requiresFile = requiresFile;
    
    await template.update(updateData);
    
    return template;
  }
  

  async deleteChecklistTemplate(id, hardDelete = false) {
    const template = await BeryllChecklistTemplate.findByPk(id);
    
    if (!template) {
      throw new Error("Шаблон не найден");
    }
    
    if (hardDelete) {
      const usageCount = await BeryllServerChecklist.count({
        where: { checklistTemplateId: id }
      });
      
      if (usageCount > 0) {
        throw new Error(`Невозможно удалить: шаблон используется в ${usageCount} серверах. Используйте деактивацию.`);
      }
      
      await template.destroy();
    } else {
      await template.update({ isActive: false });
    }
    
    return { success: true };
  }
  

  async restoreChecklistTemplate(id) {
    const template = await BeryllChecklistTemplate.findByPk(id);
    
    if (!template) {
      throw new Error("Шаблон не найден");
    }
    
    await template.update({ isActive: true });
    
    return template;
  }
  

  async reorderChecklistTemplates(orderedIds) {
    const updates = orderedIds.map((id, index) => 
      BeryllChecklistTemplate.update(
        { sortOrder: (index + 1) * 10 },
        { where: { id } }
      )
    );
    
    await Promise.all(updates);
    
    return { success: true };
  }
  

  async getServerChecklist(serverId) {
    const templates = await BeryllChecklistTemplate.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]]
    });
    
    const serverChecklists = await BeryllServerChecklist.findAll({
      where: { serverId },
      include: [
        { 
          model: BeryllChecklistFile, 
          as: "files", 
          include: [
            { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
          ]
        },
        { model: User, as: "completedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
    
    return templates.map(template => {
      const serverChecklist = serverChecklists.find(
        sc => sc.checklistTemplateId === template.id
      );
      
      return {
        id: serverChecklist?.id || null,
        serverId: parseInt(serverId),
        checklistTemplateId: template.id,
        completed: serverChecklist?.completed || false,
        completedAt: serverChecklist?.completedAt || null,
        completedById: serverChecklist?.completedById || null,
        notes: serverChecklist?.notes || null,
        template: template.toJSON(),
        completedBy: serverChecklist?.completedBy || null,
        files: serverChecklist?.files || []
      };
    });
  }
  

  async toggleChecklistItem(serverId, checklistTemplateId, completed, notes, userId) {

    const template = await BeryllChecklistTemplate.findByPk(checklistTemplateId);
    
    if (!template) {
      throw new Error("Шаблон чек-листа не найден");
    }
    
    let [checklist, created] = await BeryllServerChecklist.findOrCreate({
      where: { serverId, checklistTemplateId },
      defaults: { completed: false }
    });
    
    const files = await BeryllChecklistFile.findAll({
      where: { serverChecklistId: checklist.id }
    });
    

    if (completed && template.requiresFile) {
      if (!files || files.length === 0) {
        throw new Error("Для выполнения этого этапа необходимо загрузить доказательство (скриншот)");
      }
    }
    

    const updateData = {
      completed,
      notes: notes !== undefined ? notes : checklist.notes
    };
    
    if (completed) {
      updateData.completedById = userId;
      updateData.completedAt = new Date();
    } else {
      updateData.completedById = null;
      updateData.completedAt = null;
    }
    
    await checklist.update(updateData);
    

    if (completed) {
      try {
        await HistoryService.logHistory(parseInt(serverId), userId, HISTORY_ACTIONS.CHECKLIST_COMPLETED, {
          checklistItemId: checklistTemplateId,
          comment: `Выполнен этап: ${template.title}`
        });
      } catch (e) {
        console.error("Error logging history:", e);
      }
    }
    
    return await BeryllServerChecklist.findByPk(checklist.id, {
      include: [
        { model: BeryllChecklistTemplate, as: "template" },
        { 
          model: BeryllChecklistFile, 
          as: "files",
          include: [
            { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
          ]
        },
        { model: User, as: "completedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  
  /**
   * Загрузить файл доказательства к пункту чек-листа
   * @param serverId ID сервера
   * @param checklistTemplateId ID шаблона чек-листа
   * @param file Объект файла от express-fileupload
   * @param userId ID пользователя
   */
  async uploadChecklistFile(serverId, checklistTemplateId, file, userId) {
    const template = await BeryllChecklistTemplate.findByPk(checklistTemplateId);
    if (!template) {
      throw new Error("Шаблон чек-листа не найден");
    }
    
    let [checklist, created] = await BeryllServerChecklist.findOrCreate({
      where: { serverId, checklistTemplateId },
      defaults: { completed: false }
    });
    
    const serverDir = path.join(UPLOAD_DIR, `server_${serverId}`);
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }
    
    const originalName = decodeFileName(file.name);
    
    const ext = path.extname(file.name);
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const fileName = `checklist_${checklistTemplateId}_${uniqueSuffix}${ext}`;
    const filePath = path.join(serverDir, fileName);
    

    await file.mv(filePath);
    

    const relativePath = path.join(`server_${serverId}`, fileName);
    
    const checklistFile = await BeryllChecklistFile.create({
      serverChecklistId: checklist.id,
      fileName: fileName,
      originalName: originalName, 
      mimetype: file.mimetype,
      fileSize: file.size,
      filePath: relativePath,
      uploadedById: userId
    });
    
    try {
      await HistoryService.logHistory(parseInt(serverId), userId, HISTORY_ACTIONS.FILE_UPLOADED, {
        checklistItemId: checklistTemplateId,
        comment: `Загружен файл: ${originalName}`,  
        metadata: { 
          fileName: fileName, 
          originalName: originalName,
          fileSize: file.size 
        }
      });
    } catch (e) {
      console.error("Error logging history:", e);
    }
    

    return await BeryllChecklistFile.findByPk(checklistFile.id, {
      include: [
        { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  
  async getServerFiles(serverId) {
    const serverChecklists = await BeryllServerChecklist.findAll({
      where: { serverId },
      attributes: ["id"]
    });
    
    const checklistIds = serverChecklists.map(c => c.id);
    
    if (checklistIds.length === 0) {
      return [];
    }
    
    const files = await BeryllChecklistFile.findAll({
      where: { serverChecklistId: { [Op.in]: checklistIds } },
      include: [
        { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] },
        { 
          model: BeryllServerChecklist, 
          as: "checklist",
          include: [
            { model: BeryllChecklistTemplate, as: "template", attributes: ["id", "title", "groupCode"] }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    
    return files;
  }

  async getFileById(fileId) {
    const file = await BeryllChecklistFile.findByPk(fileId);
    
    if (!file) {
      throw new Error("Файл не найден");
    }
    
    const fullPath = path.join(UPLOAD_DIR, file.filePath);
    
    if (!fs.existsSync(fullPath)) {
      throw new Error("Файл не найден на диске");
    }
    
    return {
      id: file.id,
      fileName: file.fileName,
      originalName: file.originalName,
      mimetype: file.mimetype,
      fileSize: file.fileSize,
      path: fullPath
    };
  }
  
  async deleteChecklistFile(fileId, userId) {
    const file = await BeryllChecklistFile.findByPk(fileId, {
      include: [{
        model: BeryllServerChecklist,
        as: "checklist",
        include: [{ model: BeryllChecklistTemplate, as: "template" }]
      }]
    });
    
    if (!file) {
      throw new Error("Файл не найден");
    }
    
    const serverId = file.checklist?.serverId;
    const checklistId = file.checklist?.id;
    const templateRequiresFile = file.checklist?.template?.requiresFile;
    const originalName = file.originalName;
    
    try {
      const fullPath = path.join(UPLOAD_DIR, file.filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    } catch (e) {
      console.error("Error deleting physical file:", e);
    }
    
    await file.destroy();
    

    if (serverId) {
      try {
        await HistoryService.logHistory(serverId, userId, HISTORY_ACTIONS.FILE_DELETED, {
          checklistItemId: file.checklist?.checklistTemplateId,
          comment: `Удалён файл: ${originalName}`,
          metadata: { fileName: file.fileName, originalName }
        });
      } catch (e) {
        console.error("Error logging history:", e);
      }
    }
    
    if (templateRequiresFile && checklistId) {
      const remainingFiles = await BeryllChecklistFile.count({
        where: { serverChecklistId: checklistId }
      });
      
      if (remainingFiles === 0) {
        await BeryllServerChecklist.update(
          {
            completed: false,
            completedById: null,
            completedAt: null
          },
          { where: { id: checklistId } }
        );
      }
    }
    
    return { success: true };
  }
}

async function initChecklistTemplates() {
  try {
    const count = await BeryllChecklistTemplate.count();
    if (count > 0) {
      console.log(`✅ Чек-лист шаблоны уже существуют (${count} шт.)`);
      return;
    }

    const templates = [

      { groupCode: 'VISUAL', title: 'Визуальный контроль сервера', description: 'Провести визуальный контроль (механические повреждения)', fileCode: null, requiresFile: false, sortOrder: 100, isRequired: true, estimatedMinutes: 10 },
      
 
      { groupCode: 'TESTING', title: 'Скрин при включении', description: 'Скриншот при включении сервера', fileCode: 'sn_on2', requiresFile: true, sortOrder: 200, isRequired: true, estimatedMinutes: 5 },
      { groupCode: 'TESTING', title: 'Тест RAID (cachevault)', description: 'Проверить RAID контроллер и cachevault', fileCode: 'sn_cachevault2', requiresFile: true, sortOrder: 210, isRequired: true, estimatedMinutes: 15 },
      { groupCode: 'TESTING', title: 'Стресс тест 3 (60 мин)', description: 'Провести стресс-тестирование 60 минут', fileCode: 'sn_gtk32', requiresFile: true, sortOrder: 220, isRequired: true, estimatedMinutes: 60 },
      { groupCode: 'TESTING', title: 'Тест SSD + скрин RAID', description: 'Протестировать SSD и сделать скриншот RAID', fileCode: 'sn_raid2', requiresFile: true, sortOrder: 230, isRequired: true, estimatedMinutes: 20 },
      { groupCode: 'TESTING', title: 'Тест HDD, SSD + проверка файлов', description: 'Тестирование HDD и SSD', fileCode: null, requiresFile: false, sortOrder: 240, isRequired: true, estimatedMinutes: 30 },
      { groupCode: 'TESTING', title: 'Тест модулей памяти (0, 3, 6)', description: 'Тест модулей памяти + скрин', fileCode: 'sn_dimm2', requiresFile: true, sortOrder: 250, isRequired: true, estimatedMinutes: 30 },
      { groupCode: 'TESTING', title: 'Тест модулей памяти (11, 12)', description: 'Выявление дефекта', fileCode: 'sn_dimm2FAIL2', requiresFile: false, sortOrder: 260, isRequired: false, estimatedMinutes: 20 },
      { groupCode: 'TESTING', title: 'Проверка результатов тестов', description: 'Проверить наличие результатов', fileCode: null, requiresFile: false, sortOrder: 270, isRequired: true, estimatedMinutes: 5 },
      { groupCode: 'TESTING', title: 'Выгрузка файлов на общий диск', description: 'Выгрузка файлов тестирования', fileCode: null, requiresFile: false, sortOrder: 280, isRequired: true, estimatedMinutes: 10 },
      { groupCode: 'TESTING', title: 'Скрин BIOS, BMC [dts, die]', description: 'Включение сервера + скрин', fileCode: 'sn_Bios2', requiresFile: true, sortOrder: 290, isRequired: true, estimatedMinutes: 10 },
      
      { groupCode: 'QC_PRIMARY', title: 'Проверка результатов тестов (ОТК)', description: 'Проверка результатов', fileCode: null, requiresFile: false, sortOrder: 300, isRequired: true, estimatedMinutes: 15 },
      
      { groupCode: 'BURN_IN', title: 'Технологический прогон', description: 'Установка на прогон (burn-in)', fileCode: null, requiresFile: false, sortOrder: 400, isRequired: true, estimatedMinutes: 1440 },
      
      { groupCode: 'QC_FINAL', title: 'Проверка результатов прогона (ОТК)', description: 'Проверить результаты прогона', fileCode: null, requiresFile: false, sortOrder: 500, isRequired: true, estimatedMinutes: 10 }
    ];

    await BeryllChecklistTemplate.bulkCreate(templates);
    console.log(`✅ Создано ${templates.length} шаблонов чек-листа`);
  } catch (e) {
    console.error('❌ Ошибка инициализации шаблонов:', e);
  }
}

module.exports = new ChecklistService();
module.exports.initChecklistTemplates = initChecklistTemplates;