/**
 * Сидер: Справочник компонентов
 * 
 * Заполняет component_catalog начальными данными
 * на основе "Форма_комплектующие_VegmanS220v8_1.xlsx"
 */

"use strict";

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();
    
    const catalogData = [
      // ============================================
      // МАТЕРИНСКИЕ ПЛАТЫ
      // ============================================
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001E",
        revision: "1E-",
        partNumber: "MBDX86780001E",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          memorySlots: 16,
          maxMemory: "4TB"
        }),
        serialNumberPattern: "^MBD[A-Z0-9]+$",
        isActive: true,
        notes: "Материнская плата VegamanS220v8 Rev 1E-",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001E1",
        revision: "1E1-",
        partNumber: "MBDX86780001E1",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          memorySlots: 16,
          maxMemory: "4TB"
        }),
        serialNumberPattern: "^MBD[A-Z0-9]+$",
        isActive: true,
        notes: "Материнская плата VegamanS220v8 Rev 1E1-",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001E+",
        revision: "1E+",
        partNumber: "MBDX86780001E+",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          memorySlots: 16,
          maxMemory: "4TB"
        }),
        serialNumberPattern: "^MBD[A-Z0-9]+$",
        isActive: true,
        notes: "Материнская плата VegamanS220v8 Rev 1E+",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // SSD НАКОПИТЕЛИ
      // ============================================
      {
        type: "SSD",
        manufacturer: "Intel",
        model: "SSDSC2KB960G8",
        revision: null,
        partNumber: "SSDSC2KB960G8",
        specifications: JSON.stringify({
          capacity: "960GB",
          interface: "SATA 6Gb/s",
          formFactor: "2.5\"",
          type: "TLC",
          readSpeed: "560 MB/s",
          writeSpeed: "510 MB/s"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Intel SSD D3-S4510 Series 960GB",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Samsung",
        model: "MZ-QL27T60",
        revision: null,
        partNumber: "MZ-QL27T60",
        specifications: JSON.stringify({
          capacity: "7.68TB",
          interface: "NVMe PCIe 4.0",
          formFactor: "U.2",
          type: "TLC",
          readSpeed: "7000 MB/s",
          writeSpeed: "3500 MB/s"
        }),
        serialNumberPattern: "^S[A-Z0-9]+$",
        isActive: true,
        notes: "Samsung PM9A3 7.68TB NVMe",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ОПЕРАТИВНАЯ ПАМЯТЬ
      // ============================================
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "M393A8G40AB2-CWEC0",
        revision: "2245",
        partNumber: "KR M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MHz",
          ecc: true,
          registered: true,
          voltage: "1.2V"
        }),
        serialNumberPattern: "^Y1[A-Z0-9]+$",
        isActive: true,
        notes: "Samsung DDR4 64GB RDIMM ECC",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "M393A8G40BB4-CWE",
        revision: null,
        partNumber: "M393A8G40BB4-CWE",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MHz",
          ecc: true,
          registered: true,
          voltage: "1.2V"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Samsung DDR4 64GB RDIMM ECC (альтернативный)",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ЖЁСТКИЕ ДИСКИ
      // ============================================
      {
        type: "HDD",
        manufacturer: "Seagate",
        model: "ST16000NM001G",
        revision: null,
        partNumber: "ST16000NM001G",
        specifications: JSON.stringify({
          capacity: "16TB",
          interface: "SATA 6Gb/s",
          formFactor: "3.5\"",
          rpm: 7200,
          cache: "256MB"
        }),
        serialNumberPattern: "^ZRT[A-Z0-9]+$",
        isActive: true,
        notes: "Seagate Exos X16 16TB",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "HDD",
        manufacturer: "Seagate",
        model: "STL015",
        revision: null,
        partNumber: "STL015",
        specifications: JSON.stringify({
          capacity: "15TB",
          interface: "SAS 12Gb/s",
          formFactor: "3.5\"",
          rpm: 7200
        }),
        serialNumberPattern: "^Y1P[A-Z0-9]+$",
        isActive: true,
        notes: "Seagate SAS 15TB",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // БЛОКИ ПИТАНИЯ
      // ============================================
      {
        type: "PSU",
        manufacturer: "Aspower",
        model: "U1A-D11200-DRB",
        revision: null,
        partNumber: "U1A-D11200-DRB",
        specifications: JSON.stringify({
          power: "1200W",
          efficiency: "80+ Platinum",
          formFactor: "1U",
          redundant: true,
          hotSwap: true
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Блок питания 1200W 1U Redundant",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ПРОЦЕССОРЫ
      // ============================================
      {
        type: "CPU",
        manufacturer: "Intel",
        model: "Xeon Gold 6338",
        revision: null,
        partNumber: "CD8068904572501",
        specifications: JSON.stringify({
          cores: 32,
          threads: 64,
          baseClock: "2.0 GHz",
          turboClock: "3.2 GHz",
          tdp: "205W",
          socket: "LGA4189"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Intel Xeon Gold 6338 32-Core",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "CPU",
        manufacturer: "Intel",
        model: "Xeon Platinum 8380",
        revision: null,
        partNumber: "CD8068904572601",
        specifications: JSON.stringify({
          cores: 40,
          threads: 80,
          baseClock: "2.3 GHz",
          turboClock: "3.4 GHz",
          tdp: "270W",
          socket: "LGA4189"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Intel Xeon Platinum 8380 40-Core",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // СЕТЕВЫЕ КАРТЫ
      // ============================================
      {
        type: "NIC",
        manufacturer: "Intel",
        model: "X710-DA4",
        revision: null,
        partNumber: "X710DA4FHBLK",
        specifications: JSON.stringify({
          ports: 4,
          speed: "10GbE",
          connector: "SFP+",
          pcie: "x8 Gen3"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Intel X710 4x10GbE SFP+",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "MCX516A-CDAT",
        revision: null,
        partNumber: "MCX516A-CDAT",
        specifications: JSON.stringify({
          ports: 2,
          speed: "100GbE",
          connector: "QSFP28",
          pcie: "x16 Gen4"
        }),
        serialNumberPattern: "^MT[A-Z0-9]+$",
        isActive: true,
        notes: "Mellanox ConnectX-5 2x100GbE",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // RAID КОНТРОЛЛЕРЫ
      // ============================================
      {
        type: "RAID",
        manufacturer: "Broadcom",
        model: "MegaRAID 9460-16i",
        revision: null,
        partNumber: "05-50011-00",
        specifications: JSON.stringify({
          ports: 16,
          interface: "SAS/SATA",
          cache: "4GB",
          raidLevels: "0,1,5,6,10,50,60"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Broadcom MegaRAID 9460-16i",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // BMC МОДУЛИ
      // ============================================
      {
        type: "BMC",
        manufacturer: "ASPEED",
        model: "AST2600",
        revision: null,
        partNumber: "AST2600A3",
        specifications: JSON.stringify({
          type: "BMC SoC",
          processor: "ARM Cortex-A7 Dual Core",
          memory: "1GB DDR4"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "ASPEED AST2600 BMC",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // ВЕНТИЛЯТОРЫ
      // ============================================
      {
        type: "FAN",
        manufacturer: "Delta",
        model: "GFB0412EHS",
        revision: null,
        partNumber: "GFB0412EHS",
        specifications: JSON.stringify({
          size: "40x40x56mm",
          rpm: "15000",
          cfm: "24.5",
          voltage: "12V"
        }),
        serialNumberPattern: "^[A-Z0-9]+$",
        isActive: true,
        notes: "Delta высокоскоростной серверный вентилятор",
        createdAt: now,
        updatedAt: now
      },
      
      // ============================================
      // BACKPLANE
      // ============================================
      {
        type: "BACKPLANE",
        manufacturer: "Yadro",
        model: "BP-SAS-12",
        revision: null,
        partNumber: "BP-SAS-12",
        specifications: JSON.stringify({
          slots: 12,
          interface: "SAS/SATA",
          formFactor: "3.5\""
        }),
        serialNumberPattern: "^BP[A-Z0-9]+$",
        isActive: true,
        notes: "Backplane на 12 дисков 3.5\"",
        createdAt: now,
        updatedAt: now
      }
    ];
    
    await queryInterface.bulkInsert("component_catalog", catalogData);
    
    console.log(`✅ Seeded ${catalogData.length} component catalog entries`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("component_catalog", null, {});
  }
};
