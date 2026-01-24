'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const now = new Date();
    
    // Типы плат
    const ALL_BOARDS = ["FC", "ELRS_915", "ELRS_2_4", "CORAL_B", "SMARAGD"];
    const SMALL_BOARDS = ["FC", "ELRS_915", "ELRS_2_4", "CORAL_B"];
    const RF_BOARDS = ["ELRS_915", "ELRS_2_4", "CORAL_B"];
    const SMARAGD_ONLY = ["SMARAGD"];
    
    await queryInterface.bulkInsert('defect_categories', [
      // ===============================
      // ОБЩИЕ ДЕФЕКТЫ (для всех плат)
      // ===============================
      { 
        code: 'SOLDER_DEFECT', 
        title: 'Дефект пайки', 
        description: 'Холодная пайка, перемычки, непропай, шарики припоя', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'VISUAL_DAMAGE', 
        title: 'Визуальный дефект', 
        description: 'Царапины, сколы, трещины на плате или компонентах', 
        severity: 'MINOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'COMPONENT_DAMAGE', 
        title: 'Повреждён компонент', 
        description: 'Механическое или термическое повреждение компонента', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'COMPONENT_MISSING', 
        title: 'Отсутствует компонент', 
        description: 'Компонент не установлен или отвалился', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'WRONG_COMPONENT', 
        title: 'Неверный компонент', 
        description: 'Установлен компонент не того номинала или типа', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'ESD_DAMAGE', 
        title: 'Повреждение ESD', 
        description: 'Повреждение статическим электричеством', 
        severity: 'CRITICAL', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'TEST_FAIL', 
        title: 'Не проходит тесты', 
        description: 'Провал функциональных тестов', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      
      // ===============================
      // ДЕФЕКТЫ ПРОШИВКИ (малые платы)
      // ===============================
      { 
        code: 'FIRMWARE_FAIL', 
        title: 'Не прошивается', 
        description: 'Ошибка при прошивке firmware, не определяется программатором', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'NO_SERIAL', 
        title: 'Нет серийника', 
        description: 'Серийный номер не читается или отсутствует', 
        severity: 'MINOR', 
        applicableTypes: JSON.stringify(["FC"]), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'USB_FAIL', 
        title: 'Не определяется по USB', 
        description: 'Плата не определяется при подключении по USB', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      
      // ===============================
      // RF ДЕФЕКТЫ (ELRS, Coral B)
      // ===============================
      { 
        code: 'RF_ISSUE', 
        title: 'Проблема с радиочастью', 
        description: 'Слабый сигнал, нет связи, помехи', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(RF_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'ANTENNA_ISSUE', 
        title: 'Проблема с антенной', 
        description: 'Дефект разъёма антенны или самой антенны', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(RF_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'BINDING_FAIL', 
        title: 'Не биндится', 
        description: 'Не удаётся связать приёмник с передатчиком', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(RF_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      
      // ===============================
      // SMARAGD СПЕЦИФИЧНЫЕ
      // ===============================
      { 
        code: 'HDD_SSD_ISSUE', 
        title: 'Проблема с диском', 
        description: 'Диск не определяется, ошибки чтения, требуется клонирование', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'DISPLAY_ISSUE', 
        title: 'Проблема с дисплеем', 
        description: 'Битые пиксели, полосы, не включается, засветы', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'KEYBOARD_ISSUE', 
        title: 'Проблема с клавиатурой', 
        description: 'Не работают клавиши, залипание, механическое повреждение', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'CABLE_ISSUE', 
        title: 'Проблема с кабелем/шлейфом', 
        description: 'Повреждён или неисправен кабель, шлейф', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'BOARD_ISSUE', 
        title: 'Проблема с платой', 
        description: 'Неисправна плата (приселектор, конвертер и т.д.)', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'POWER_ISSUE', 
        title: 'Проблема питания', 
        description: 'Не включается, проблема с БП или батареей', 
        severity: 'CRITICAL', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'MEMORY_ISSUE', 
        title: 'Проблема с памятью', 
        description: 'ОЗУ не определяется или с ошибками', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      { 
        code: 'NETWORK_ISSUE', 
        title: 'Проблема с сетью', 
        description: 'Не работает Ethernet или WiFi', 
        severity: 'MAJOR', 
        applicableTypes: JSON.stringify(SMARAGD_ONLY), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
      
      // ===============================
      // ПРОЧЕЕ
      // ===============================
      { 
        code: 'OTHER', 
        title: 'Прочее', 
        description: 'Другие дефекты, не попадающие в стандартные категории', 
        severity: 'MINOR', 
        applicableTypes: JSON.stringify(ALL_BOARDS), 
        isActive: true, 
        createdAt: now, 
        updatedAt: now 
      },
    ]);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.bulkDelete('defect_categories', null, {});
  }
};
