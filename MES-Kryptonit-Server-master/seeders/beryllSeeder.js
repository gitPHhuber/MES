const {
  BeryllChecklistTemplate,
  CHECKLIST_GROUPS
} = require("../models/definitions/Beryll");

/**
 * Инициализация шаблонов чек-листа для модуля Берилл
 * Вызывается при старте сервера
 */
async function seedBeryllChecklistTemplates() {
  try {
    // Проверяем, есть ли уже шаблоны
    const count = await BeryllChecklistTemplate.count();
    if (count > 0) {
      console.log(`✅ [Beryll] Шаблоны чек-листа уже существуют (${count} шт.)`);
      return { created: false, count };
    }

    // Шаблоны по паспорту производства
    const templates = [
      // ГРУППА 1: Визуальный осмотр
      { 
        groupCode: CHECKLIST_GROUPS.VISUAL, 
        title: 'Визуальный контроль сервера', 
        description: 'Провести визуальный контроль (механические повреждения), при обнаружении сделать фото', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 100, 
        isRequired: true, 
        estimatedMinutes: 10,
        isActive: true
      },
      
      // ГРУППА 2: Проверка работоспособности
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Скрин при включении', 
        description: 'Скриншот при включении сервера', 
        fileCode: 'sn_on2', 
        requiresFile: true, 
        sortOrder: 200, 
        isRequired: true, 
        estimatedMinutes: 5,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Тест RAID (cachevault)', 
        description: 'Проверить RAID контроллер и cachevault', 
        fileCode: 'sn_cachevault2', 
        requiresFile: true, 
        sortOrder: 210, 
        isRequired: true, 
        estimatedMinutes: 15,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Стресс тест 3 (60 мин)', 
        description: 'Провести стресс-тестирование 60 минут', 
        fileCode: 'sn_gtk32', 
        requiresFile: true, 
        sortOrder: 220, 
        isRequired: true, 
        estimatedMinutes: 60,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Тест SSD + скрин RAID', 
        description: 'Протестировать SSD и сделать скриншот RAID', 
        fileCode: 'sn_raid2', 
        requiresFile: true, 
        sortOrder: 230, 
        isRequired: true, 
        estimatedMinutes: 20,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Тест HDD, SSD + проверка файлов', 
        description: 'Тестирование HDD и SSD, проверка наличия файлов', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 240, 
        isRequired: true, 
        estimatedMinutes: 30,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Тест модулей памяти (0, 3, 6)', 
        description: 'Тест модулей памяти 0, 3, 6 + скрин', 
        fileCode: 'sn_dimm2', 
        requiresFile: true, 
        sortOrder: 250, 
        isRequired: true, 
        estimatedMinutes: 30,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Тест модулей памяти (11, 12)', 
        description: 'Выявление дефекта, заявка в Ядро, отметка в таблице брака', 
        fileCode: 'sn_dimm2FAIL2', 
        requiresFile: false, 
        sortOrder: 260, 
        isRequired: false, 
        estimatedMinutes: 20,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Проверка результатов тестов', 
        description: 'Проверить наличие результатов всех тестов', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 270, 
        isRequired: true, 
        estimatedMinutes: 5,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Выгрузка файлов на общий диск', 
        description: 'Выгрузка файлов тестирования и скриншотов', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 280, 
        isRequired: true, 
        estimatedMinutes: 10,
        isActive: true
      },
      { 
        groupCode: CHECKLIST_GROUPS.TESTING, 
        title: 'Скрин BIOS, BMC [dts, die]', 
        description: 'Включение сервера + скрин из BIOS, BMC', 
        fileCode: 'sn_Bios2', 
        requiresFile: true, 
        sortOrder: 290, 
        isRequired: true, 
        estimatedMinutes: 10,
        isActive: true
      },
      
      // ГРУППА 3: Контрольная (ОТК) - первичная
      { 
        groupCode: CHECKLIST_GROUPS.QC_PRIMARY, 
        title: 'Проверка результатов тестов (ОТК)', 
        description: 'Проверка наличия и правильности результатов всех тестов', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 300, 
        isRequired: true, 
        estimatedMinutes: 15,
        isActive: true
      },
      
      // ГРУППА 4: Испытательная
      { 
        groupCode: CHECKLIST_GROUPS.BURN_IN, 
        title: 'Технологический прогон', 
        description: 'Установка на технологический прогон (burn-in)', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 400, 
        isRequired: true, 
        estimatedMinutes: 1440,
        isActive: true
      },
      
      // ГРУППА 5: Контрольная (ОТК) - финальная
      { 
        groupCode: CHECKLIST_GROUPS.QC_FINAL, 
        title: 'Проверка результатов прогона (ОТК)', 
        description: 'Проверить наличие результатов прогона', 
        fileCode: null, 
        requiresFile: false, 
        sortOrder: 500, 
        isRequired: true, 
        estimatedMinutes: 10,
        isActive: true
      }
    ];

    await BeryllChecklistTemplate.bulkCreate(templates);
    console.log(`✅ [Beryll] Создано ${templates.length} шаблонов чек-листа`);
    
    return { created: true, count: templates.length };
    
  } catch (e) {
    console.error('❌ [Beryll] Ошибка инициализации шаблонов:', e.message);
    return { created: false, error: e.message };
  }
}

module.exports = { seedBeryllChecklistTemplates };