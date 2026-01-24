const { 
  BeryllChecklistTemplate, 
  BeryllServerChecklist, 
  User,
  HISTORY_ACTIONS,
  CHECKLIST_GROUPS
} = require("../../../models/definitions/Beryll");
const HistoryService = require("./HistoryService");

class ChecklistService {
  /**
   * Инициализация чек-листа для сервера
   */
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
  
  /**
   * Получить шаблоны чек-листов
   */
  async getChecklistTemplates() {
    const templates = await BeryllChecklistTemplate.findAll({
      where: { isActive: true },
      order: [["sortOrder", "ASC"]]
    });
    
    return templates;
  }
  
  /**
   * Создать шаблон чек-листа
   */
  async createChecklistTemplate(data) {
    const { title, description, sortOrder, isRequired, estimatedMinutes } = data;
    
    if (!title) {
      throw new Error("Название обязательно");
    }
    
    const template = await BeryllChecklistTemplate.create({
      title,
      description,
      sortOrder: sortOrder || 0,
      isRequired: isRequired !== false,
      estimatedMinutes: estimatedMinutes || 30
    });
    
    return template;
  }
  
  /**
   * Обновить шаблон чек-листа
   */
  async updateChecklistTemplate(id, data) {
    const { title, description, sortOrder, isRequired, estimatedMinutes, isActive } = data;
    
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
    
    await template.update(updateData);
    
    return template;
  }
  
  /**
   * Удалить шаблон чек-листа (деактивировать)
   */
  async deleteChecklistTemplate(id) {
    const template = await BeryllChecklistTemplate.findByPk(id);
    
    if (!template) {
      throw new Error("Шаблон не найден");
    }
    
    // Деактивируем вместо удаления
    await template.update({ isActive: false });
    
    return { success: true };
  }
  
  /**
   * Переключить статус пункта чек-листа
   */
  async toggleChecklistItem(serverId, checklistId, completed, notes, userId) {
    let checklist = await BeryllServerChecklist.findOne({
      where: { serverId, checklistTemplateId: checklistId }
    });
    
    if (!checklist) {
      checklist = await BeryllServerChecklist.create({
        serverId,
        checklistTemplateId: checklistId,
        completed: false
      });
    }
    
    const updateData = {
      completed,
      notes
    };
    
    if (completed) {
      updateData.completedById = userId;
      updateData.completedAt = new Date();
    } else {
      updateData.completedById = null;
      updateData.completedAt = null;
    }
    
    await checklist.update(updateData);
    
    // Логируем
    if (completed) {
      const template = await BeryllChecklistTemplate.findByPk(checklistId);
      await HistoryService.logHistory(parseInt(serverId), userId, HISTORY_ACTIONS.CHECKLIST_COMPLETED, {
        checklistItemId: checklistId,
        comment: `Выполнен этап: ${template?.title}`
      });
    }
    
    return checklist;
  }
}

/**
 * Инициализация шаблонов чек-листа (вызывается при старте сервера)
 */
async function initChecklistTemplates() {
  try {
    const count = await BeryllChecklistTemplate.count();
    if (count > 0) {
      console.log(`✅ Чек-лист шаблоны уже существуют (${count} шт.)`);
      return;
    }

    const templates = [
      // ГРУППА 1: Визуальный осмотр
      { groupCode: 'VISUAL', title: 'Визуальный контроль сервера', description: 'Провести визуальный контроль (механические повреждения)', fileCode: null, requiresFile: false, sortOrder: 100, isRequired: true, estimatedMinutes: 10 },
      
      // ГРУППА 2: Проверка работоспособности  
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
      
      // ГРУППА 3: Контрольная (ОТК) - первичная
      { groupCode: 'QC_PRIMARY', title: 'Проверка результатов тестов (ОТК)', description: 'Проверка результатов', fileCode: null, requiresFile: false, sortOrder: 300, isRequired: true, estimatedMinutes: 15 },
      
      // ГРУППА 4: Испытательная
      { groupCode: 'BURN_IN', title: 'Технологический прогон', description: 'Установка на прогон (burn-in)', fileCode: null, requiresFile: false, sortOrder: 400, isRequired: true, estimatedMinutes: 1440 },
      
      // ГРУППА 5: Контрольная (ОТК) - финальная
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
