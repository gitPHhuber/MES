/**
 * Сидер: SLA Конфигурация
 * 
 * Заполняет sla_config начальными значениями
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    const slaConfigs = [
      // ============================================
      // ДЕФОЛТНАЯ КОНФИГУРАЦИЯ
      // ============================================
      {
        name: "По умолчанию",
        defectType: null,
        priority: null,
        maxDiagnosisHours: 24,
        maxRepairHours: 72,
        maxTotalHours: 168, // 7 дней
        escalationAfterHours: 48,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ПО ПРИОРИТЕТАМ
      // ============================================
      {
        name: "Критический приоритет",
        defectType: null,
        priority: "CRITICAL",
        maxDiagnosisHours: 4,
        maxRepairHours: 24,
        maxTotalHours: 48,
        escalationAfterHours: 8,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Высокий приоритет",
        defectType: null,
        priority: "HIGH",
        maxDiagnosisHours: 8,
        maxRepairHours: 48,
        maxTotalHours: 96,
        escalationAfterHours: 24,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Средний приоритет",
        defectType: null,
        priority: "MEDIUM",
        maxDiagnosisHours: 24,
        maxRepairHours: 72,
        maxTotalHours: 168,
        escalationAfterHours: 48,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Низкий приоритет",
        defectType: null,
        priority: "LOW",
        maxDiagnosisHours: 48,
        maxRepairHours: 120,
        maxTotalHours: 336, // 14 дней
        escalationAfterHours: 96,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ПО ТИПАМ ДЕФЕКТОВ
      // ============================================
      {
        name: "Материнская плата",
        defectType: "MOTHERBOARD",
        priority: null,
        maxDiagnosisHours: 8,
        maxRepairHours: 48,
        maxTotalHours: 120, // 5 дней
        escalationAfterHours: 24,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Оперативная память",
        defectType: "RAM",
        priority: null,
        maxDiagnosisHours: 4,
        maxRepairHours: 24,
        maxTotalHours: 72, // 3 дня
        escalationAfterHours: 16,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Жёсткий диск",
        defectType: "HDD",
        priority: null,
        maxDiagnosisHours: 4,
        maxRepairHours: 24,
        maxTotalHours: 72,
        escalationAfterHours: 16,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "SSD накопитель",
        defectType: "SSD",
        priority: null,
        maxDiagnosisHours: 4,
        maxRepairHours: 24,
        maxTotalHours: 72,
        escalationAfterHours: 16,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Блок питания",
        defectType: "PSU",
        priority: null,
        maxDiagnosisHours: 2,
        maxRepairHours: 8,
        maxTotalHours: 24, // 1 день - критично
        escalationAfterHours: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Вентилятор",
        defectType: "FAN",
        priority: null,
        maxDiagnosisHours: 2,
        maxRepairHours: 4,
        maxTotalHours: 24,
        escalationAfterHours: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "Сетевая карта",
        defectType: "NIC",
        priority: null,
        maxDiagnosisHours: 8,
        maxRepairHours: 48,
        maxTotalHours: 96,
        escalationAfterHours: 24,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "RAID контроллер",
        defectType: "RAID",
        priority: null,
        maxDiagnosisHours: 8,
        maxRepairHours: 48,
        maxTotalHours: 120,
        escalationAfterHours: 24,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "BMC модуль",
        defectType: "BMC",
        priority: null,
        maxDiagnosisHours: 8,
        maxRepairHours: 48,
        maxTotalHours: 120,
        escalationAfterHours: 24,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // КОМБИНИРОВАННЫЕ (тип + приоритет)
      // ============================================
      {
        name: "Материнская плата - Критический",
        defectType: "MOTHERBOARD",
        priority: "CRITICAL",
        maxDiagnosisHours: 2,
        maxRepairHours: 24,
        maxTotalHours: 48,
        escalationAfterHours: 4,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "RAM - Критический",
        defectType: "RAM",
        priority: "CRITICAL",
        maxDiagnosisHours: 1,
        maxRepairHours: 8,
        maxTotalHours: 24,
        escalationAfterHours: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now
      },
      {
        name: "PSU - Критический",
        defectType: "PSU",
        priority: "CRITICAL",
        maxDiagnosisHours: 1,
        maxRepairHours: 4,
        maxTotalHours: 8,
        escalationAfterHours: 2,
        isActive: true,
        createdAt: now,
        updatedAt: now
      }
    ];
    
    await queryInterface.bulkInsert("sla_config", slaConfigs);
    
    console.log(`✅ Seeded ${slaConfigs.length} SLA configurations`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("sla_config", null, {});
  }
};
