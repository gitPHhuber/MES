/**
 * ================================================================================
 * UnifiedPassportsExportService.js
 * ================================================================================
 * 
 * Сервис для выгрузки и объединения паспортов изделий (серверов) в единую таблицу
 * Формат соответствует шаблону "Состав серверов.xlsx"
 * 
 * Функционал:
 * - Экспорт всех серверов с компонентами в единую таблицу
 * - Поддержка фильтров (партия, даты, статусы)
 * - Группировка компонентов по типам (HDD, SSD, RAM и т.д.)
 * - Экспорт в Excel с форматированием
 * 
 * ================================================================================
 */

const ExcelJS = require("exceljs");
const { Op } = require("sequelize");
const { 
  BeryllServer, 
  BeryllServerComponent, 
  BeryllBatch,
  BeryllServerChecklist,
  BeryllChecklistTemplate,
  User,
  UserAlias
} = require("../../../models/index");

/**
 * Конфигурация структуры выходной таблицы
 * Соответствует формату "Состав серверов.xlsx"
 */
const EXPORT_CONFIG = {
  // Количество компонентов каждого типа
  HDD_COUNT: 12,
  SSD_BOOT_COUNT: 2,    // SSD загрузочные (Intel)
  SSD_DATA_COUNT: 2,    // SSD данных (Samsung)
  RAM_COUNT: 12,
  PSU_COUNT: 2,
  
  // Типы компонентов для маппинга
  COMPONENT_TYPES: {
    HDD: "HDD",
    SSD: "SSD",
    NVME: "NVME", 
    RAM: "RAM",
    PSU: "PSU",
    MOTHERBOARD: "MOTHERBOARD",
    BMC: "BMC",
    NIC: "NIC",
    RAID: "RAID",
    FAN: "FAN",
    CPU: "CPU",
    BACKPLANE_HDD: "BACKPLANE_HDD",
    BACKPLANE_SSD: "BACKPLANE_SSD"
  }
};

/**
 * Структура столбцов для экспорта
 */
const COLUMN_STRUCTURE = {
  // Базовая информация о сервере
  BASE: [
    { key: "rowNumber", header: "№", width: 5 },
    { key: "apkSerialNumber", header: "Серийный № сервера", width: 18 },
    { key: "inspectionDate", header: "Дата проведения входного контроля", width: 20 },
    { key: "employees1", header: "Фамилии сотрудников", width: 20 },
    { key: "employees2", header: "", width: 20 }
  ],
  
  // HDD диски (12 штук, по 2 колонки каждый)
  HDD: Array.from({ length: 12 }, (_, i) => ([
    { key: `hdd${i + 1}_yadro`, header: i === 0 ? "S/N ядро" : "", subHeader: `HDD ${i + 1}` },
    { key: `hdd${i + 1}_manuf`, header: i === 0 ? "S/N производитель" : "" }
  ])).flat(),
  
  // Backplane HDD
  BACKPLANE_HDD: [
    { key: "backplaneHdd", header: "Backplane HDD", width: 18 }
  ],
  
  // Материнская плата
  MOTHERBOARD: [
    { key: "motherboard", header: "Материнская плата внешние отличия (рев.,тип,sn)", width: 30 },
    { key: "motherboardType", header: "", width: 8 }
  ],
  
  // Кулеры CPU
  COOLERS: [
    { key: "coolers", header: "Кулеры CPU", width: 12 }
  ],
  
  // Блоки питания (2 штуки)
  PSU: [
    { key: "psu1_yadro", header: "Блоки питания", subHeader: "S/N ядро", width: 18 },
    { key: "psu1_manuf", header: "", subHeader: "S/N производитель", width: 18 },
    { key: "psu2_yadro", header: "", subHeader: "S/N ядро", width: 18 },
    { key: "psu2_manuf", header: "", subHeader: "S/N производитель", width: 18 }
  ],
  
  // SSD загрузочные (Intel)
  SSD_BOOT: [
    { key: "ssdBoot1_yadro", header: "SSD (sn)", subHeader: "S/N ядро", width: 18 },
    { key: "ssdBoot1_manuf", header: "", subHeader: "S/N производитель", width: 18 },
    { key: "ssdBoot2_yadro", header: "", subHeader: "S/N ядро", width: 18 },
    { key: "ssdBoot2_manuf", header: "", subHeader: "S/N производитель", width: 18 }
  ],
  
  // SSD данных (Samsung NVMe)
  SSD_DATA: [
    { key: "ssdData1_yadro", header: "", subHeader: "S/N ядро", width: 18 },
    { key: "ssdData1_manuf", header: "", subHeader: "S/N производитель", width: 18 },
    { key: "ssdData2_yadro", header: "", subHeader: "S/N ядро", width: 18 },
    { key: "ssdData2_manuf", header: "", subHeader: "S/N производитель", width: 18 }
  ],
  
  // BMC
  BMC: [
    { key: "bmc", header: "bmc (ревизия и sn)", width: 18 }
  ],
  
  // Backplane SSD
  BACKPLANE_SSD: [
    { key: "backplaneSsd", header: "Backplane SSD (S/N, разъем)", width: 22 }
  ],
  
  // RAM планки (12 штук)
  RAM: Array.from({ length: 12 }, (_, i) => ([
    { key: `ram${i + 1}_yadro`, header: i === 0 ? "Планки памяти" : "", subHeader: i === 0 ? "S/N ядро" : "" },
    { key: `ram${i + 1}_manuf`, header: "", subHeader: i === 0 ? "S/N производитель" : "" }
  ])).flat(),
  
  // RAID контроллер
  RAID: [
    { key: "raid_yadro", header: "Raid-контроллер (ревизия и sn)", subHeader: "S/N ядро", width: 20 },
    { key: "raid_manuf", header: "", subHeader: "S/N производитель", width: 20 }
  ],
  
  // Сетевая карта
  NIC: [
    { key: "nic_yadro", header: "Сетевая карта P225P (ревизия и sn)", subHeader: "S/N ядро", width: 22 },
    { key: "nic_manuf", header: "", subHeader: "S/N производитель", width: 22 }
  ]
};

class UnifiedPassportsExportService {
  /**
   * Основной метод экспорта
   * @param {Object} options - Параметры экспорта
   * @param {number[]} options.serverIds - ID серверов для экспорта (опционально)
   * @param {number} options.batchId - ID партии для фильтрации
   * @param {string} options.status - Статус серверов для фильтрации
   * @param {Date} options.dateFrom - Дата начала периода
   * @param {Date} options.dateTo - Дата окончания периода
   * @param {string} options.search - Поисковый запрос
   * @returns {Promise<Buffer>} Excel файл в виде буфера
   */
  async exportUnifiedPassports(options = {}) {
    const { 
      serverIds, 
      batchId, 
      status, 
      dateFrom, 
      dateTo, 
      search,
      includeArchived = false 
    } = options;

    // Получаем серверы с компонентами
    const servers = await this.getServersWithComponents({
      serverIds,
      batchId,
      status,
      dateFrom,
      dateTo,
      search,
      includeArchived
    });

    if (servers.length === 0) {
      throw new Error("Не найдено серверов для экспорта");
    }

    // Формируем данные для Excel
    const exportData = await this.prepareExportData(servers);

    // Создаём Excel файл
    const buffer = await this.createExcelFile(exportData, options);

    return buffer;
  }

  /**
   * Получение серверов с компонентами
   */
  async getServersWithComponents(filters) {
    const where = {};
    
    // Фильтр по ID серверов
    if (filters.serverIds && filters.serverIds.length > 0) {
      where.id = { [Op.in]: filters.serverIds };
    }
    
    // Фильтр по партии
    if (filters.batchId) {
      if (filters.batchId === "null") {
        where.batchId = null;
      } else {
        where.batchId = filters.batchId;
      }
    }
    
    // Фильтр по статусу
    if (filters.status) {
      where.status = filters.status;
    }
    
    // Фильтр по архивным
    if (!filters.includeArchived) {
      where.archivedAt = null;
    }
    
    // Фильтр по датам
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }
    
    // Поисковый запрос
    if (filters.search) {
      where[Op.or] = [
        { apkSerialNumber: { [Op.iLike]: `%${filters.search}%` } },
        { serialNumber: { [Op.iLike]: `%${filters.search}%` } },
        { hostname: { [Op.iLike]: `%${filters.search}%` } }
      ];
    }

    const servers = await BeryllServer.findAll({
      where,
      include: [
        {
          model: BeryllServerComponent,
          as: "components",
          required: false
        },
        {
          model: BeryllBatch,
          as: "batch",
          required: false
        },
        {
          model: User,
          as: "assignedTo",
          attributes: ["id", "name", "surname", "login"],
          required: false
        },
        {
          model: BeryllServerChecklist,
          as: "checklists",
          required: false,
          include: [
            {
              model: User,
              as: "completedBy",
              attributes: ["id", "name", "surname"],
              required: false
            }
          ]
        }
      ],
      order: [
        ["createdAt", "ASC"],
        [{ model: BeryllServerComponent, as: "components" }, "componentType", "ASC"],
        [{ model: BeryllServerComponent, as: "components" }, "slot", "ASC"]
      ]
    });

    return servers;
  }

  /**
   * Подготовка данных для экспорта
   */
  async prepareExportData(servers) {
    const rows = [];
    let rowNumber = 1;

    for (const server of servers) {
      const components = server.components || [];
      
      // Группируем компоненты по типам
      const grouped = this.groupComponentsByType(components);
      
      // Получаем сотрудников, работавших с сервером
      const employees = await this.getServerEmployees(server);
      
      // Формируем основную строку данных
      const mainRow = {
        rowNumber,
        apkSerialNumber: server.apkSerialNumber || server.serialNumber || "",
        inspectionDate: this.formatDate(server.createdAt),
        employees1: employees[0] || "",
        employees2: employees[1] || "",
        
        // HDD диски
        ...this.mapHddComponents(grouped.HDD || []),
        
        // Backplane HDD
        backplaneHdd: this.getBackplaneHdd(grouped),
        
        // Материнская плата
        ...this.mapMotherboard(grouped.MOTHERBOARD || []),
        
        // Кулеры
        coolers: this.getCoolerType(grouped.FAN || []),
        
        // Блоки питания
        ...this.mapPsuComponents(grouped.PSU || []),
        
        // SSD загрузочные (Intel)
        ...this.mapSsdBootComponents(grouped.SSD || [], grouped.NVME || []),
        
        // SSD данных (Samsung NVMe)
        ...this.mapSsdDataComponents(grouped.SSD || [], grouped.NVME || []),
        
        // BMC
        bmc: this.mapBmc(grouped.BMC || []),
        
        // Backplane SSD
        backplaneSsd: this.getBackplaneSsd(grouped),
        
        // RAM планки
        ...this.mapRamComponents(grouped.RAM || []),
        
        // RAID контроллер
        ...this.mapRaidController(grouped.RAID || []),
        
        // Сетевая карта
        ...this.mapNicCard(grouped.NIC || [])
      };
      
      // Формируем дополнительную строку с серийными номерами производителя
      const serialRow = {
        rowNumber: null,
        apkSerialNumber: "",
        inspectionDate: "",
        employees1: "",
        employees2: "",
        
        // HDD серийники производителя
        ...this.mapHddSerialManuf(grouped.HDD || []),
        
        backplaneHdd: "",
        motherboard: "",
        motherboardType: "",
        coolers: "",
        
        // PSU серийники производителя
        ...this.mapPsuSerialManuf(grouped.PSU || []),
        
        // SSD серийники производителя
        ...this.mapSsdBootSerialManuf(grouped.SSD || [], grouped.NVME || []),
        ...this.mapSsdDataSerialManuf(grouped.SSD || [], grouped.NVME || []),
        
        bmc: "",
        backplaneSsd: "",
        
        // RAM серийники производителя
        ...this.mapRamSerialManuf(grouped.RAM || []),
        
        // RAID серийник производителя
        ...this.mapRaidSerialManuf(grouped.RAID || []),
        
        // NIC серийник производителя
        ...this.mapNicSerialManuf(grouped.NIC || [])
      };
      
      rows.push({ main: mainRow, serial: serialRow, server });
      rowNumber++;
    }

    return rows;
  }

  /**
   * Группировка компонентов по типам
   */
  groupComponentsByType(components) {
    const grouped = {};
    
    for (const comp of components) {
      const type = comp.componentType || "OTHER";
      if (!grouped[type]) {
        grouped[type] = [];
      }
      grouped[type].push(comp);
    }
    
    // Сортируем каждую группу по слоту
    for (const type in grouped) {
      grouped[type].sort((a, b) => {
        const slotA = this.extractSlotNumber(a.slot);
        const slotB = this.extractSlotNumber(b.slot);
        return slotA - slotB;
      });
    }
    
    return grouped;
  }

  /**
   * Извлечение номера слота
   */
  extractSlotNumber(slot) {
    if (!slot) return 999;
    const match = slot.match(/(\d+)/);
    return match ? parseInt(match[1]) : 999;
  }

  /**
   * Получение сотрудников, работавших с сервером
   */
  async getServerEmployees(server) {
    const employees = [];
    
    // Из чеклистов
    if (server.checklists && server.checklists.length > 0) {
      for (const checklist of server.checklists) {
        if (checklist.completedBy) {
          const name = `${checklist.completedBy.surname || ""} ${checklist.completedBy.name || ""}`.trim();
          if (name && !employees.includes(name)) {
            employees.push(name);
          }
        }
      }
    }
    
    // Из assignedTo
    if (server.assignedTo) {
      const name = `${server.assignedTo.surname || ""} ${server.assignedTo.name || ""}`.trim();
      if (name && !employees.includes(name)) {
        employees.push(name);
      }
    }
    
    return employees.slice(0, 2);
  }

  /**
   * Маппинг HDD компонентов
   */
  mapHddComponents(hdds) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.HDD_COUNT; i++) {
      const hdd = hdds[i];
      result[`hdd${i + 1}_yadro`] = hdd?.serialNumberYadro || hdd?.serialNumber || "";
      result[`hdd${i + 1}_manuf`] = "";  // Заполняется в serialRow
    }
    
    return result;
  }

  /**
   * Маппинг серийных номеров производителя HDD
   */
  mapHddSerialManuf(hdds) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.HDD_COUNT; i++) {
      const hdd = hdds[i];
      result[`hdd${i + 1}_yadro`] = "";  // Ядро в основной строке
      result[`hdd${i + 1}_manuf`] = hdd?.serialNumber || "";
    }
    
    return result;
  }

  /**
   * Получение Backplane HDD
   */
  getBackplaneHdd(grouped) {
    const backplane = grouped.BACKPLANE_HDD || grouped.BACKPLANE || [];
    if (backplane.length > 0) {
      return backplane[0].serialNumberYadro || backplane[0].serialNumber || backplane[0].model || "";
    }
    
    // Проверяем в metadata материнской платы
    const motherboard = grouped.MOTHERBOARD?.[0];
    if (motherboard?.metadata?.backplaneHdd) {
      return motherboard.metadata.backplaneHdd;
    }
    
    return "";
  }

  /**
   * Маппинг материнской платы
   */
  mapMotherboard(motherboards) {
    const mb = motherboards[0];
    if (!mb) {
      return { motherboard: "", motherboardType: "" };
    }
    
    const serial = mb.serialNumberYadro || mb.serialNumber || "";
    const revision = mb.metadata?.revision || mb.firmwareVersion || "";
    const type = mb.metadata?.type || "";
    
    return {
      motherboard: `${mb.model || ""} ${serial}`.trim(),
      motherboardType: `${revision}${type ? ` ${type}` : ""}`
    };
  }

  /**
   * Получение типа кулеров
   */
  getCoolerType(fans) {
    if (fans.length === 0) return "";
    
    const fan = fans[0];
    return fan.metadata?.type || fan.model || "Тип 1";
  }

  /**
   * Маппинг блоков питания
   */
  mapPsuComponents(psus) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.PSU_COUNT; i++) {
      const psu = psus[i];
      result[`psu${i + 1}_yadro`] = psu?.serialNumberYadro || psu?.model || "";
      result[`psu${i + 1}_manuf`] = "";  // Заполняется в serialRow
    }
    
    return result;
  }

  /**
   * Маппинг серийных номеров производителя PSU
   */
  mapPsuSerialManuf(psus) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.PSU_COUNT; i++) {
      const psu = psus[i];
      result[`psu${i + 1}_yadro`] = "";
      result[`psu${i + 1}_manuf`] = psu?.serialNumber || "";
    }
    
    return result;
  }

  /**
   * Маппинг загрузочных SSD (Intel)
   */
  mapSsdBootComponents(ssds, nvmes) {
    // Фильтруем Intel SSD для загрузки
    const bootSsds = ssds.filter(s => 
      s.manufacturer?.toLowerCase()?.includes("intel") ||
      s.model?.toLowerCase()?.includes("intel") ||
      s.slot?.toLowerCase()?.includes("boot")
    ).slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    // Если не нашли Intel, берём первые SSD
    const finalBootSsds = bootSsds.length > 0 ? bootSsds : ssds.slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    return {
      ssdBoot1_yadro: finalBootSsds[0]?.serialNumberYadro || finalBootSsds[0]?.model || "",
      ssdBoot1_manuf: "",
      ssdBoot2_yadro: finalBootSsds[1]?.serialNumberYadro || finalBootSsds[1]?.model || "",
      ssdBoot2_manuf: ""
    };
  }

  /**
   * Маппинг серийных номеров производителя загрузочных SSD
   */
  mapSsdBootSerialManuf(ssds, nvmes) {
    const bootSsds = ssds.filter(s => 
      s.manufacturer?.toLowerCase()?.includes("intel") ||
      s.model?.toLowerCase()?.includes("intel") ||
      s.slot?.toLowerCase()?.includes("boot")
    ).slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    const finalBootSsds = bootSsds.length > 0 ? bootSsds : ssds.slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    return {
      ssdBoot1_yadro: "",
      ssdBoot1_manuf: finalBootSsds[0]?.serialNumber || "",
      ssdBoot2_yadro: "",
      ssdBoot2_manuf: finalBootSsds[1]?.serialNumber || ""
    };
  }

  /**
   * Маппинг SSD данных (Samsung NVMe)
   */
  mapSsdDataComponents(ssds, nvmes) {
    // Объединяем NVMe и Samsung SSD
    const dataSsds = [
      ...nvmes,
      ...ssds.filter(s => 
        s.manufacturer?.toLowerCase()?.includes("samsung") ||
        s.model?.toLowerCase()?.includes("samsung") ||
        s.model?.toLowerCase()?.includes("mz-ql")
      )
    ].slice(0, EXPORT_CONFIG.SSD_DATA_COUNT);
    
    return {
      ssdData1_yadro: dataSsds[0]?.serialNumberYadro || dataSsds[0]?.model || "",
      ssdData1_manuf: "",
      ssdData2_yadro: dataSsds[1]?.serialNumberYadro || dataSsds[1]?.model || "",
      ssdData2_manuf: ""
    };
  }

  /**
   * Маппинг серийных номеров производителя SSD данных
   */
  mapSsdDataSerialManuf(ssds, nvmes) {
    const dataSsds = [
      ...nvmes,
      ...ssds.filter(s => 
        s.manufacturer?.toLowerCase()?.includes("samsung") ||
        s.model?.toLowerCase()?.includes("samsung")
      )
    ].slice(0, EXPORT_CONFIG.SSD_DATA_COUNT);
    
    return {
      ssdData1_yadro: "",
      ssdData1_manuf: dataSsds[0]?.serialNumber || "",
      ssdData2_yadro: "",
      ssdData2_manuf: dataSsds[1]?.serialNumber || ""
    };
  }

  /**
   * Маппинг BMC
   */
  mapBmc(bmcs) {
    const bmc = bmcs[0];
    if (!bmc) return "";
    
    const revision = bmc.metadata?.revision || bmc.firmwareVersion || "";
    const serial = bmc.serialNumberYadro || bmc.serialNumber || "";
    
    return `${revision ? `${revision} ` : ""}${serial}`.trim();
  }

  /**
   * Получение Backplane SSD
   */
  getBackplaneSsd(grouped) {
    const backplane = grouped.BACKPLANE_SSD || [];
    if (backplane.length > 0) {
      return backplane[0].serialNumberYadro || backplane[0].serialNumber || "";
    }
    return "";
  }

  /**
   * Маппинг RAM компонентов
   */
  mapRamComponents(rams) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.RAM_COUNT; i++) {
      const ram = rams[i];
      result[`ram${i + 1}_yadro`] = ram?.serialNumberYadro || "";
      result[`ram${i + 1}_manuf`] = "";  // Заполняется в serialRow
    }
    
    return result;
  }

  /**
   * Маппинг серийных номеров производителя RAM
   */
  mapRamSerialManuf(rams) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.RAM_COUNT; i++) {
      const ram = rams[i];
      result[`ram${i + 1}_yadro`] = "";
      result[`ram${i + 1}_manuf`] = ram?.serialNumber || "";
    }
    
    return result;
  }

  /**
   * Маппинг RAID контроллера
   */
  mapRaidController(raids) {
    const raid = raids[0];
    if (!raid) {
      return { raid_yadro: "", raid_manuf: "" };
    }
    
    const type = raid.metadata?.type || raid.model || "";
    return {
      raid_yadro: `${type} ${raid.serialNumberYadro || ""}`.trim(),
      raid_manuf: ""
    };
  }

  /**
   * Маппинг серийного номера производителя RAID
   */
  mapRaidSerialManuf(raids) {
    const raid = raids[0];
    return {
      raid_yadro: "",
      raid_manuf: raid?.serialNumber || ""
    };
  }

  /**
   * Маппинг сетевой карты
   */
  mapNicCard(nics) {
    const nic = nics[0];
    if (!nic) {
      return { nic_yadro: "", nic_manuf: "" };
    }
    
    const revision = nic.metadata?.revision || nic.firmwareVersion || "";
    return {
      nic_yadro: `${revision ? `${revision} ` : ""}${nic.serialNumberYadro || ""}`.trim(),
      nic_manuf: ""
    };
  }

  /**
   * Маппинг серийного номера производителя NIC
   */
  mapNicSerialManuf(nics) {
    const nic = nics[0];
    return {
      nic_yadro: "",
      nic_manuf: nic?.serialNumber || ""
    };
  }

  /**
   * Форматирование даты
   */
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  }

  /**
   * Создание Excel файла
   */
  async createExcelFile(exportData, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MES Kryptonit";
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet("Состав серверов", {
      views: [{ state: "frozen", ySplit: 2, xSplit: 3 }]
    });

    // Настройка стилей
    const headerStyle = {
      font: { bold: true, size: 10 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFD9E1F2" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };

    const subHeaderStyle = {
      font: { bold: false, size: 9 },
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      fill: { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0E0E0" } },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };

    const dataStyle = {
      font: { size: 9 },
      alignment: { horizontal: "left", vertical: "middle" },
      border: {
        top: { style: "thin" },
        bottom: { style: "thin" },
        left: { style: "thin" },
        right: { style: "thin" }
      }
    };

    // Создаём заголовки
    const columns = this.buildColumnDefinitions();
    sheet.columns = columns.map(col => ({
      header: "",
      key: col.key,
      width: col.width || 12
    }));

    // Строка 1: Основные заголовки групп
    this.addGroupHeaders(sheet, columns, headerStyle);

    // Строка 2: Подзаголовки (S/N ядро, S/N производитель)
    this.addSubHeaders(sheet, columns, subHeaderStyle);

    // Добавляем данные
    let currentRow = 3;
    for (const rowData of exportData) {
      // Основная строка с данными
      const mainRowValues = columns.map(col => rowData.main[col.key] || "");
      const mainRow = sheet.getRow(currentRow);
      mainRow.values = mainRowValues;
      mainRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        Object.assign(cell, dataStyle);
      });
      currentRow++;

      // Строка с серийными номерами производителя
      const serialRowValues = columns.map(col => rowData.serial[col.key] || "");
      const serialRow = sheet.getRow(currentRow);
      serialRow.values = serialRowValues;
      serialRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        Object.assign(cell, dataStyle);
        cell.font = { size: 8, color: { argb: "FF666666" } };
      });
      currentRow++;
    }

    // Применяем объединение ячеек для заголовков
    this.applyHeaderMerges(sheet, columns);

    // Автоподбор высоты строк
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 25;

    // Генерируем буфер
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  /**
   * Построение определений столбцов
   */
  buildColumnDefinitions() {
    const columns = [];
    
    // Базовые столбцы
    columns.push(
      { key: "rowNumber", header: "№", width: 5, group: "base" },
      { key: "apkSerialNumber", header: "Серийный № сервера", width: 18, group: "base" },
      { key: "inspectionDate", header: "Дата проведения входного контроля", width: 22, group: "base" },
      { key: "employees1", header: "Фамилии сотрудников проводившие проверку, сборку сервера", width: 20, group: "base" },
      { key: "employees2", header: "", width: 18, group: "base" }
    );
    
    // HDD диски (12 штук)
    for (let i = 1; i <= 12; i++) {
      columns.push(
        { key: `hdd${i}_yadro`, header: i === 1 ? "HDD диски" : "", subHeader: "S/N ядро", width: 15, group: "hdd" },
        { key: `hdd${i}_manuf`, header: "", subHeader: "S/N производитель", width: 12, group: "hdd" }
      );
    }
    
    // Backplane HDD
    columns.push({ key: "backplaneHdd", header: "Backplane HDD", width: 16, group: "backplane_hdd" });
    
    // Материнская плата
    columns.push(
      { key: "motherboard", header: "Материнская плата внешние отличия (рев.,тип,sn)", width: 28, group: "mb" },
      { key: "motherboardType", header: "", width: 8, group: "mb" }
    );
    
    // Кулеры
    columns.push({ key: "coolers", header: "Кулеры CPU", width: 10, group: "coolers" });
    
    // Блоки питания (2 штуки)
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `psu${i}_yadro`, header: i === 1 ? "Блоки питания" : "", subHeader: "S/N ядро", width: 18, group: "psu" },
        { key: `psu${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "psu" }
      );
    }
    
    // SSD загрузочные (2 штуки)
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `ssdBoot${i}_yadro`, header: i === 1 ? "SSD (sn)" : "", subHeader: "S/N ядро", width: 18, group: "ssd_boot" },
        { key: `ssdBoot${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "ssd_boot" }
      );
    }
    
    // SSD данных (2 штуки)
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `ssdData${i}_yadro`, header: i === 1 ? "SSD NVMe" : "", subHeader: "S/N ядро", width: 18, group: "ssd_data" },
        { key: `ssdData${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "ssd_data" }
      );
    }
    
    // BMC
    columns.push({ key: "bmc", header: "bmc (ревизия и sn)", width: 16, group: "bmc" });
    
    // Backplane SSD
    columns.push({ key: "backplaneSsd", header: "Backplane SSD (S/N, разъем)", width: 20, group: "backplane_ssd" });
    
    // RAM планки (12 штук)
    for (let i = 1; i <= 12; i++) {
      columns.push(
        { key: `ram${i}_yadro`, header: i === 1 ? "Планки памяти" : "", subHeader: "S/N ядро", width: 16, group: "ram" },
        { key: `ram${i}_manuf`, header: "", subHeader: "S/N производитель", width: 14, group: "ram" }
      );
    }
    
    // RAID контроллер
    columns.push(
      { key: "raid_yadro", header: "Raid-контроллер (ревизия и sn)", subHeader: "S/N ядро", width: 18, group: "raid" },
      { key: "raid_manuf", header: "", subHeader: "S/N производитель", width: 16, group: "raid" }
    );
    
    // Сетевая карта
    columns.push(
      { key: "nic_yadro", header: "Сетевая карта P225P (ревизия и sn)", subHeader: "S/N ядро", width: 20, group: "nic" },
      { key: "nic_manuf", header: "", subHeader: "S/N производитель", width: 18, group: "nic" }
    );
    
    return columns;
  }

  /**
   * Добавление заголовков групп
   */
  addGroupHeaders(sheet, columns, style) {
    const headerRow = sheet.getRow(1);
    
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header || "";
      Object.assign(cell, style);
    });
    
    headerRow.height = 35;
  }

  /**
   * Добавление подзаголовков
   */
  addSubHeaders(sheet, columns, style) {
    const subHeaderRow = sheet.getRow(2);
    
    columns.forEach((col, idx) => {
      const cell = subHeaderRow.getCell(idx + 1);
      cell.value = col.subHeader || "";
      Object.assign(cell, style);
    });
    
    subHeaderRow.height = 25;
  }

  /**
   * Применение объединения ячеек для заголовков
   */
  applyHeaderMerges(sheet, columns) {
    const groups = {};
    let startIdx = null;
    let currentGroup = null;
    
    // Находим группы для объединения
    columns.forEach((col, idx) => {
      if (col.group !== currentGroup) {
        if (currentGroup && startIdx !== null) {
          if (!groups[currentGroup]) groups[currentGroup] = [];
          groups[currentGroup].push({ start: startIdx, end: idx });
        }
        currentGroup = col.group;
        startIdx = idx + 1;
      }
    });
    
    // Последняя группа
    if (currentGroup && startIdx !== null) {
      if (!groups[currentGroup]) groups[currentGroup] = [];
      groups[currentGroup].push({ start: startIdx, end: columns.length + 1 });
    }
    
    // Объединяем заголовки групп компонентов
    const multiColumnGroups = ["hdd", "psu", "ssd_boot", "ssd_data", "ram"];
    for (const groupName of multiColumnGroups) {
      const groupRanges = [];
      let rangeStart = null;
      
      columns.forEach((col, idx) => {
        if (col.group === groupName) {
          if (rangeStart === null) rangeStart = idx + 1;
        } else if (rangeStart !== null) {
          groupRanges.push({ start: rangeStart, end: idx });
          rangeStart = null;
        }
      });
      
      if (rangeStart !== null) {
        groupRanges.push({ start: rangeStart, end: columns.length });
      }
      
      // Объединяем ячейки заголовков групп
      for (const range of groupRanges) {
        if (range.end - range.start > 1) {
          try {
            // Находим первую ячейку с заголовком
            const headerCol = columns.findIndex((c, i) => 
              i >= range.start - 1 && i < range.end && c.header && c.group === groupName
            );
            
            if (headerCol !== -1) {
              const cell = sheet.getRow(1).getCell(headerCol + 1);
              sheet.mergeCells(1, range.start, 1, range.end);
              cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            }
          } catch (e) {
            // Пропускаем ошибки объединения
          }
        }
      }
    }
  }

  /**
   * Экспорт статистики
   */
  async getExportStats(options = {}) {
    const servers = await this.getServersWithComponents(options);
    
    const stats = {
      totalServers: servers.length,
      totalComponents: 0,
      byComponentType: {},
      byBatch: {},
      byStatus: {},
      missingComponents: []
    };
    
    for (const server of servers) {
      const components = server.components || [];
      stats.totalComponents += components.length;
      
      // По типам компонентов
      for (const comp of components) {
        const type = comp.componentType || "OTHER";
        stats.byComponentType[type] = (stats.byComponentType[type] || 0) + 1;
      }
      
      // По партиям
      const batchName = server.batch?.name || "Без партии";
      stats.byBatch[batchName] = (stats.byBatch[batchName] || 0) + 1;
      
      // По статусам
      const status = server.status || "UNKNOWN";
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Проверка на отсутствующие компоненты
      const grouped = this.groupComponentsByType(components);
      const missing = [];
      
      if (!grouped.HDD || grouped.HDD.length < 12) {
        missing.push(`HDD (${grouped.HDD?.length || 0}/12)`);
      }
      if (!grouped.RAM || grouped.RAM.length < 12) {
        missing.push(`RAM (${grouped.RAM?.length || 0}/12)`);
      }
      if (!grouped.PSU || grouped.PSU.length < 2) {
        missing.push(`PSU (${grouped.PSU?.length || 0}/2)`);
      }
      if (!grouped.MOTHERBOARD || grouped.MOTHERBOARD.length === 0) {
        missing.push("Материнская плата");
      }
      
      if (missing.length > 0) {
        stats.missingComponents.push({
          serverId: server.id,
          apkSerialNumber: server.apkSerialNumber,
          missing
        });
      }
    }
    
    return stats;
  }
}

module.exports = new UnifiedPassportsExportService();
