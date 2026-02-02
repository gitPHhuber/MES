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

const EXPORT_CONFIG = {
  
  HDD_COUNT: 12,
  SSD_BOOT_COUNT: 2,    
  SSD_DATA_COUNT: 2,    
  RAM_COUNT: 12,
  PSU_COUNT: 2,
  
  
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


// Структура колонок экспорта (справочник, не используется напрямую - см. buildColumnDefinitions)
// Каждый компонент имеет: S/N ядро, S/N производитель, Ревизия
const COLUMN_STRUCTURE = {
  BASE: ["rowNumber", "apkSerialNumber", "inspectionDate", "employees1", "employees2"],
  HDD: "12x(hdd_yadro, hdd_manuf) + hdd_revision",
  BACKPLANE_HDD: ["backplaneHdd"],
  MOTHERBOARD: ["mb_yadro", "mb_manuf", "mb_revision"],
  COOLERS: ["coolers"],
  CPU: ["cpu_yadro", "cpu_manuf", "cpu_revision"],
  PSU: "2x(psu_yadro, psu_manuf) + psu_revision",
  SSD_BOOT: "2x(ssdBoot_yadro, ssdBoot_manuf) + ssd_boot_revision",
  SSD_DATA: "2x(ssdData_yadro, ssdData_manuf) + ssd_data_revision",
  BMC: ["bmc_yadro", "bmc_manuf", "bmc_revision"],
  BACKPLANE_SSD: ["backplaneSsd"],
  RAM: "12x(ram_yadro, ram_manuf) + ram_revision",
  RAID: ["raid_yadro", "raid_manuf", "raid_revision"],
  NIC: ["nic_yadro", "nic_manuf", "nic_revision"]
};

class UnifiedPassportsExportService {
  
  /**
   * Главный метод экспорта
   * 
   * @param {Object} options - фильтры экспорта
   * @param {number[]} options.serverIds - ID серверов
   * @param {number} options.batchId - ID партии
   * @param {string} options.status - статус серверов
   * @param {string} options.dateFrom - дата от
   * @param {string} options.dateTo - дата до
   * @param {string} options.search - поисковый запрос
   * @param {boolean} options.includeArchived - включать архивные
   * @returns {Buffer} - Excel файл
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

    // 1. Получаем серверы с компонентами
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

    // 2. Подготавливаем данные для экспорта
    const exportData = await this.prepareExportData(servers);

    // 3. Создаём Excel файл
    const buffer = await this.createExcelFile(exportData, options);

    return buffer;
  }

  // =====================================================================
  // ПОЛУЧЕНИЕ ДАННЫХ
  // =====================================================================

  async getServersWithComponents(filters) {
    const where = {};
    
    if (filters.serverIds && filters.serverIds.length > 0) {
      where.id = { [Op.in]: filters.serverIds };
    }
    
    if (filters.batchId) {
      if (filters.batchId === "null") {
        where.batchId = null;
      } else {
        where.batchId = filters.batchId;
      }
    }
    
    if (filters.status) {
      where.status = filters.status;
    }
    
    if (!filters.includeArchived) {
      where.archivedAt = null;
    }
    
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) {
        where.createdAt[Op.gte] = new Date(filters.dateFrom);
      }
      if (filters.dateTo) {
        where.createdAt[Op.lte] = new Date(filters.dateTo);
      }
    }
    
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

  // =====================================================================
  // ПОДГОТОВКА ДАННЫХ ДЛЯ ЭКСПОРТА
  // =====================================================================

  async prepareExportData(servers) {
    const rows = [];
    let rowNumber = 1;

    for (const server of servers) {
      const components = server.components || [];
      
      // Группируем компоненты по типам
      const grouped = this.groupComponentsByType(components);
      
      // Получаем сотрудников
      const employees = await this.getServerEmployees(server);
      
      // Основная строка (S/N ядро + ревизия)
      const mainRow = {
        rowNumber,
        apkSerialNumber: server.apkSerialNumber || server.serialNumber || "",
        inspectionDate: this.formatDate(server.createdAt),
        employees1: employees[0] || "",
        employees2: employees[1] || "",
        
        // HDD (12 шт) + ревизия
        ...this.mapHddComponents(grouped.HDD || []),
        
        // Backplane HDD
        backplaneHdd: this.getBackplaneHdd(grouped),
        
        // Материнская плата (S/N ядро, S/N произв., ревизия)
        ...this.mapMotherboard(grouped.MOTHERBOARD || []),
        
        // Кулеры
        coolers: this.getCoolerType(grouped.FAN || []),
        
        // CPU (S/N ядро, S/N произв., ревизия)
        ...this.mapCpuComponents(grouped.CPU || []),
        
        // Блоки питания (2 шт) + ревизия
        ...this.mapPsuComponents(grouped.PSU || []),
        
        // SSD Boot (2 шт) + ревизия
        ...this.mapSsdBootComponents(grouped.SSD || [], grouped.NVME || []),
        
        // SSD Data/NVMe (2 шт) + ревизия
        ...this.mapSsdDataComponents(grouped.SSD || [], grouped.NVME || []),
        
        // BMC (S/N ядро, S/N произв., ревизия)
        ...this.mapBmcComponents(grouped.BMC || []),
        
        // Backplane SSD
        backplaneSsd: this.getBackplaneSsd(grouped),
        
        // Планки памяти (12 шт) + ревизия
        ...this.mapRamComponents(grouped.RAM || []),
        
        // RAID-контроллер (S/N ядро, S/N произв., ревизия)
        ...this.mapRaidController(grouped.RAID || []),
        
        // Сетевая карта (S/N ядро, S/N произв., ревизия)
        ...this.mapNicCard(grouped.NIC || [])
      };
      
      // Вторая строка (S/N производитель)
      const serialRow = {
        rowNumber: null,
        apkSerialNumber: "",
        inspectionDate: "",
        employees1: "",
        employees2: "",
        
        // HDD серийные номера производителей
        ...this.mapHddSerialManuf(grouped.HDD || []),
        
        backplaneHdd: "",
        
        // Мат. плата серийный произв.
        ...this.mapMotherboardSerialManuf(grouped.MOTHERBOARD || []),
        
        coolers: "",
        
        // CPU серийный произв.
        ...this.mapCpuSerialManuf(grouped.CPU || []),
        
        // БП серийные произв.
        ...this.mapPsuSerialManuf(grouped.PSU || []),
        
        // SSD серийные произв.
        ...this.mapSsdBootSerialManuf(grouped.SSD || [], grouped.NVME || []),
        ...this.mapSsdDataSerialManuf(grouped.SSD || [], grouped.NVME || []),
        
        // BMC серийный произв.
        ...this.mapBmcSerialManuf(grouped.BMC || []),
        
        backplaneSsd: "",
        
        // RAM серийные произв.
        ...this.mapRamSerialManuf(grouped.RAM || []),
        
        // RAID серийный произв.
        ...this.mapRaidSerialManuf(grouped.RAID || []),
        
        // NIC серийный произв.
        ...this.mapNicSerialManuf(grouped.NIC || [])
      };
      
      rows.push({ main: mainRow, serial: serialRow, server });
      rowNumber++;
    }

    return rows;
  }

  // =====================================================================
  // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
  // =====================================================================

  /**
   * Извлечь уникальные ревизии из массива компонентов
   * @param {Array} components - массив компонентов
   * @returns {string} - ревизии через запятую
   */
  _extractRevisions(components) {
    const revisions = new Set();
    for (const comp of components) {
      const rev = comp?.metadata?.revision || '';
      if (rev) revisions.add(rev);
    }
    return [...revisions].join(', ') || '';
  }

  /**
   * Группировка компонентов по типу с сортировкой по слоту
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
    
    // Сортируем по слотам внутри каждой группы
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
   * Извлечь номер слота из строки
   */
  extractSlotNumber(slot) {
    if (!slot) return 999;
    const match = slot.match(/(\d+)/);
    return match ? parseInt(match[1]) : 999;
  }

  /**
   * Получить сотрудников, выполнявших проверку/сборку сервера
   */
  async getServerEmployees(server) {
    const employees = [];
    
    // Из чек-листов
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

  // =====================================================================
  // HDD (12 шт): S/N ядро, S/N произв. + 1 колонка ревизии на группу
  // =====================================================================

  mapHddComponents(hdds) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.HDD_COUNT; i++) {
      const hdd = hdds[i];
      result[`hdd${i + 1}_yadro`] = hdd?.serialNumberYadro || hdd?.serialNumber || "";
      result[`hdd${i + 1}_manuf`] = "";  // заполнится в serial row
    }
    
    // Ревизия — одна на всю группу HDD
    result.hdd_revision = this._extractRevisions(hdds);
    
    return result;
  }

  mapHddSerialManuf(hdds) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.HDD_COUNT; i++) {
      const hdd = hdds[i];
      result[`hdd${i + 1}_yadro`] = "";  // пусто во второй строке
      result[`hdd${i + 1}_manuf`] = hdd?.serialNumber || "";
    }
    
    result.hdd_revision = "";
    
    return result;
  }

  /**
   * Backplane HDD
   */
  getBackplaneHdd(grouped) {
    const backplane = grouped.BACKPLANE_HDD || grouped.BACKPLANE || [];
    if (backplane.length > 0) {
      return backplane[0].serialNumberYadro || backplane[0].serialNumber || backplane[0].model || "";
    }
    
    // Fallback: из metadata материнской платы
    const motherboard = grouped.MOTHERBOARD?.[0];
    if (motherboard?.metadata?.backplaneHdd) {
      return motherboard.metadata.backplaneHdd;
    }
    
    return "";
  }

  // =====================================================================
  // Материнская плата: S/N ядро, S/N произв., ревизия (отдельные колонки)
  // =====================================================================

  mapMotherboard(motherboards) {
    const mb = motherboards[0];
    if (!mb) {
      return { mb_yadro: "", mb_manuf: "", mb_revision: "" };
    }
    
    return {
      mb_yadro: mb.serialNumberYadro || "",
      mb_manuf: "",  // заполнится в serial row
      mb_revision: mb.metadata?.revision || mb.firmwareVersion || ""
    };
  }

  mapMotherboardSerialManuf(motherboards) {
    const mb = motherboards[0];
    return {
      mb_yadro: "",
      mb_manuf: mb?.serialNumber || "",
      mb_revision: ""
    };
  }

  /**
   * Кулеры CPU — тип
   */
  getCoolerType(fans) {
    if (fans.length === 0) return "";
    
    const fan = fans[0];
    return fan.metadata?.type || fan.model || "Тип 1";
  }

  // =====================================================================
  // CPU: S/N ядро, S/N произв., ревизия (отдельные колонки)
  // =====================================================================

  mapCpuComponents(cpus) {
    if (cpus.length === 0) {
      return { cpu_yadro: "", cpu_manuf: "", cpu_revision: "" };
    }
    
    // Берём первый CPU для серийных номеров
    const cpu = cpus[0];
    
    return {
      cpu_yadro: cpu.serialNumberYadro || "",
      cpu_manuf: "",  // заполнится в serial row
      cpu_revision: this._extractRevisions(cpus)
    };
  }

  mapCpuSerialManuf(cpus) {
    const cpu = cpus[0];
    return {
      cpu_yadro: "",
      cpu_manuf: cpu?.serialNumber || "",
      cpu_revision: ""
    };
  }

  // =====================================================================
  // Блоки питания (2 шт): S/N ядро, S/N произв. + 1 колонка ревизии
  // =====================================================================

  mapPsuComponents(psus) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.PSU_COUNT; i++) {
      const psu = psus[i];
      result[`psu${i + 1}_yadro`] = psu?.serialNumberYadro || "";
      result[`psu${i + 1}_manuf`] = "";  // заполнится в serial row
    }
    
    result.psu_revision = this._extractRevisions(psus);
    
    return result;
  }

  mapPsuSerialManuf(psus) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.PSU_COUNT; i++) {
      const psu = psus[i];
      result[`psu${i + 1}_yadro`] = "";
      result[`psu${i + 1}_manuf`] = psu?.serialNumber || "";
    }
    
    result.psu_revision = "";
    
    return result;
  }

  // =====================================================================
  // SSD Boot (2 шт): S/N ядро, S/N произв. + 1 колонка ревизии
  // =====================================================================

  mapSsdBootComponents(ssds, nvmes) {
    // Фильтруем boot SSD (Intel или с пометкой boot)
    const bootSsds = ssds.filter(s => 
      s.manufacturer?.toLowerCase()?.includes("intel") ||
      s.model?.toLowerCase()?.includes("intel") ||
      s.slot?.toLowerCase()?.includes("boot")
    ).slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    // Fallback: берём первые SSD если boot не найдены
    const finalBootSsds = bootSsds.length > 0 ? bootSsds : ssds.slice(0, EXPORT_CONFIG.SSD_BOOT_COUNT);
    
    return {
      ssdBoot1_yadro: finalBootSsds[0]?.serialNumberYadro || "",
      ssdBoot1_manuf: "",
      ssdBoot2_yadro: finalBootSsds[1]?.serialNumberYadro || "",
      ssdBoot2_manuf: "",
      ssd_boot_revision: this._extractRevisions(finalBootSsds)
    };
  }

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
      ssdBoot2_manuf: finalBootSsds[1]?.serialNumber || "",
      ssd_boot_revision: ""
    };
  }

  // =====================================================================
  // SSD Data/NVMe (2 шт): S/N ядро, S/N произв. + 1 колонка ревизии
  // =====================================================================

  mapSsdDataComponents(ssds, nvmes) {
    // Приоритет: NVMe, затем Samsung SSD
    const dataSsds = [
      ...nvmes,
      ...ssds.filter(s => 
        s.manufacturer?.toLowerCase()?.includes("samsung") ||
        s.model?.toLowerCase()?.includes("samsung") ||
        s.model?.toLowerCase()?.includes("mz-ql")
      )
    ].slice(0, EXPORT_CONFIG.SSD_DATA_COUNT);
    
    return {
      ssdData1_yadro: dataSsds[0]?.serialNumberYadro || "",
      ssdData1_manuf: "",
      ssdData2_yadro: dataSsds[1]?.serialNumberYadro || "",
      ssdData2_manuf: "",
      ssd_data_revision: this._extractRevisions(dataSsds)
    };
  }

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
      ssdData2_manuf: dataSsds[1]?.serialNumber || "",
      ssd_data_revision: ""
    };
  }

  // =====================================================================
  // BMC: S/N ядро, S/N произв., ревизия (отдельные колонки)
  // =====================================================================

  mapBmcComponents(bmcs) {
    const bmc = bmcs[0];
    if (!bmc) {
      return { bmc_yadro: "", bmc_manuf: "", bmc_revision: "" };
    }
    
    return {
      bmc_yadro: bmc.serialNumberYadro || "",
      bmc_manuf: "",  // заполнится в serial row
      bmc_revision: bmc.metadata?.revision || bmc.firmwareVersion || ""
    };
  }

  mapBmcSerialManuf(bmcs) {
    const bmc = bmcs[0];
    return {
      bmc_yadro: "",
      bmc_manuf: bmc?.serialNumber || "",
      bmc_revision: ""
    };
  }

  /**
   * Backplane SSD
   */
  getBackplaneSsd(grouped) {
    const backplane = grouped.BACKPLANE_SSD || [];
    if (backplane.length > 0) {
      return backplane[0].serialNumberYadro || backplane[0].serialNumber || "";
    }
    return "";
  }

  // =====================================================================
  // Планки памяти (12 шт): S/N ядро, S/N произв. + 1 колонка ревизии
  // =====================================================================

  mapRamComponents(rams) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.RAM_COUNT; i++) {
      const ram = rams[i];
      result[`ram${i + 1}_yadro`] = ram?.serialNumberYadro || "";
      result[`ram${i + 1}_manuf`] = "";  // заполнится в serial row
    }
    
    result.ram_revision = this._extractRevisions(rams);
    
    return result;
  }

  mapRamSerialManuf(rams) {
    const result = {};
    
    for (let i = 0; i < EXPORT_CONFIG.RAM_COUNT; i++) {
      const ram = rams[i];
      result[`ram${i + 1}_yadro`] = "";
      result[`ram${i + 1}_manuf`] = ram?.serialNumber || "";
    }
    
    result.ram_revision = "";
    
    return result;
  }

  // =====================================================================
  // RAID-контроллер: S/N ядро, S/N произв., ревизия (отдельные колонки)
  // =====================================================================

  mapRaidController(raids) {
    const raid = raids[0];
    if (!raid) {
      return { raid_yadro: "", raid_manuf: "", raid_revision: "" };
    }
    
    return {
      raid_yadro: raid.serialNumberYadro || "",
      raid_manuf: "",  // заполнится в serial row
      raid_revision: raid.metadata?.revision || raid.firmwareVersion || ""
    };
  }

  mapRaidSerialManuf(raids) {
    const raid = raids[0];
    return {
      raid_yadro: "",
      raid_manuf: raid?.serialNumber || "",
      raid_revision: ""
    };
  }

  // =====================================================================
  // Сетевая карта: S/N ядро, S/N произв., ревизия (отдельные колонки)
  // =====================================================================

  mapNicCard(nics) {
    const nic = nics[0];
    if (!nic) {
      return { nic_yadro: "", nic_manuf: "", nic_revision: "" };
    }
    
    return {
      nic_yadro: nic.serialNumberYadro || "",
      nic_manuf: "",  // заполнится в serial row
      nic_revision: nic.metadata?.revision || nic.firmwareVersion || ""
    };
  }

  mapNicSerialManuf(nics) {
    const nic = nics[0];
    return {
      nic_yadro: "",
      nic_manuf: nic?.serialNumber || "",
      nic_revision: ""
    };
  }

  /**
   * Форматирование даты в ДД ММ ГГ
   */
  formatDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = String(d.getFullYear()).slice(-2);
    return `${day} ${month} ${year}`;
  }

  // =====================================================================
  // СОЗДАНИЕ EXCEL ФАЙЛА
  // =====================================================================

  async createExcelFile(exportData, options = {}) {
    const workbook = new ExcelJS.Workbook();
    workbook.creator = "MES Kryptonit";
    workbook.created = new Date();
    
    const sheet = workbook.addWorksheet("Состав серверов", {
      views: [{ state: "frozen", ySplit: 2, xSplit: 3 }]
    });

    // Стили
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

    // Определяем колонки
    const columns = this.buildColumnDefinitions();
    sheet.columns = columns.map(col => ({
      header: "",
      key: col.key,
      width: col.width || 12
    }));

    // Заголовки групп (строка 1)
    this.addGroupHeaders(sheet, columns, headerStyle);

    // Подзаголовки (строка 2)
    this.addSubHeaders(sheet, columns, subHeaderStyle);

    // Данные
    let currentRow = 3;
    for (const rowData of exportData) {
      // Основная строка (S/N ядро)
      const mainRowValues = columns.map(col => rowData.main[col.key] || "");
      const mainRow = sheet.getRow(currentRow);
      mainRow.values = mainRowValues;
      mainRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        Object.assign(cell, dataStyle);
      });
      currentRow++;

      // Вторая строка (S/N производитель)
      const serialRowValues = columns.map(col => rowData.serial[col.key] || "");
      const serialRow = sheet.getRow(currentRow);
      serialRow.values = serialRowValues;
      serialRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
        Object.assign(cell, dataStyle);
        cell.font = { size: 8, color: { argb: "FF666666" } };
      });
      currentRow++;
    }

    // Объединяем заголовки групп
    this.applyHeaderMerges(sheet, columns);

    // Высота строк заголовков
    sheet.getRow(1).height = 30;
    sheet.getRow(2).height = 25;

    // Генерируем buffer
    const buffer = await workbook.xlsx.writeBuffer();
    return buffer;
  }

  // =====================================================================
  // ОПРЕДЕЛЕНИЕ КОЛОНОК
  // =====================================================================

  buildColumnDefinitions() {
    const columns = [];
    
    // === БАЗОВЫЕ КОЛОНКИ ===
    columns.push(
      { key: "rowNumber", header: "№", width: 5, group: "base" },
      { key: "apkSerialNumber", header: "Серийный № сервера", width: 18, group: "base" },
      { key: "inspectionDate", header: "Дата проведения входного контроля", width: 22, group: "base" },
      { key: "employees1", header: "Фамилии сотрудников проводившие проверку, сборку сервера", width: 20, group: "base" },
      { key: "employees2", header: "", width: 18, group: "base" }
    );
    
    // === HDD диски (12 шт) + ревизия ===
    for (let i = 1; i <= 12; i++) {
      columns.push(
        { key: `hdd${i}_yadro`, header: i === 1 ? "HDD диски" : "", subHeader: "S/N ядро", width: 15, group: "hdd" },
        { key: `hdd${i}_manuf`, header: "", subHeader: "S/N производитель", width: 12, group: "hdd" }
      );
    }
    columns.push({ key: "hdd_revision", header: "", subHeader: "Ревизия", width: 12, group: "hdd" });
    
    // === Backplane HDD ===
    columns.push({ key: "backplaneHdd", header: "Backplane HDD", width: 16, group: "backplane_hdd" });
    
    // === Материнская плата (S/N ядро, S/N произв., ревизия) ===
    columns.push(
      { key: "mb_yadro", header: "Материнская плата", subHeader: "S/N ядро", width: 20, group: "mb" },
      { key: "mb_manuf", header: "", subHeader: "S/N производитель", width: 20, group: "mb" },
      { key: "mb_revision", header: "", subHeader: "Ревизия", width: 12, group: "mb" }
    );
    
    // === Кулеры CPU ===
    columns.push({ key: "coolers", header: "Кулеры CPU", width: 10, group: "coolers" });
    
    // === CPU (S/N ядро, S/N произв., ревизия) ===
    columns.push(
      { key: "cpu_yadro", header: "CPU", subHeader: "S/N ядро", width: 18, group: "cpu" },
      { key: "cpu_manuf", header: "", subHeader: "S/N производитель", width: 18, group: "cpu" },
      { key: "cpu_revision", header: "", subHeader: "Ревизия", width: 12, group: "cpu" }
    );
    
    // === Блоки питания (2 шт) + ревизия ===
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `psu${i}_yadro`, header: i === 1 ? "Блоки питания" : "", subHeader: "S/N ядро", width: 18, group: "psu" },
        { key: `psu${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "psu" }
      );
    }
    columns.push({ key: "psu_revision", header: "", subHeader: "Ревизия", width: 12, group: "psu" });
    
    // === SSD Boot (2 шт) + ревизия ===
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `ssdBoot${i}_yadro`, header: i === 1 ? "SSD Boot" : "", subHeader: "S/N ядро", width: 18, group: "ssd_boot" },
        { key: `ssdBoot${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "ssd_boot" }
      );
    }
    columns.push({ key: "ssd_boot_revision", header: "", subHeader: "Ревизия", width: 12, group: "ssd_boot" });
    
    // === SSD Data/NVMe (2 шт) + ревизия ===
    for (let i = 1; i <= 2; i++) {
      columns.push(
        { key: `ssdData${i}_yadro`, header: i === 1 ? "SSD NVMe" : "", subHeader: "S/N ядро", width: 18, group: "ssd_data" },
        { key: `ssdData${i}_manuf`, header: "", subHeader: "S/N производитель", width: 16, group: "ssd_data" }
      );
    }
    columns.push({ key: "ssd_data_revision", header: "", subHeader: "Ревизия", width: 12, group: "ssd_data" });
    
    // === BMC (S/N ядро, S/N произв., ревизия) ===
    columns.push(
      { key: "bmc_yadro", header: "BMC", subHeader: "S/N ядро", width: 16, group: "bmc" },
      { key: "bmc_manuf", header: "", subHeader: "S/N производитель", width: 16, group: "bmc" },
      { key: "bmc_revision", header: "", subHeader: "Ревизия", width: 12, group: "bmc" }
    );
    
    // === Backplane SSD ===
    columns.push({ key: "backplaneSsd", header: "Backplane SSD (S/N, разъем)", width: 20, group: "backplane_ssd" });
    
    // === Планки памяти (12 шт) + ревизия ===
    for (let i = 1; i <= 12; i++) {
      columns.push(
        { key: `ram${i}_yadro`, header: i === 1 ? "Планки памяти" : "", subHeader: "S/N ядро", width: 16, group: "ram" },
        { key: `ram${i}_manuf`, header: "", subHeader: "S/N производитель", width: 14, group: "ram" }
      );
    }
    columns.push({ key: "ram_revision", header: "", subHeader: "Ревизия", width: 12, group: "ram" });
    
    // === RAID-контроллер (S/N ядро, S/N произв., ревизия) ===
    columns.push(
      { key: "raid_yadro", header: "Raid-контроллер (ревизия и sn)", subHeader: "S/N ядро", width: 18, group: "raid" },
      { key: "raid_manuf", header: "", subHeader: "S/N производитель", width: 16, group: "raid" },
      { key: "raid_revision", header: "", subHeader: "Ревизия", width: 12, group: "raid" }
    );
    
    // === Сетевая карта (S/N ядро, S/N произв., ревизия) ===
    columns.push(
      { key: "nic_yadro", header: "Сетевая карта P225P (ревизия и sn)", subHeader: "S/N ядро", width: 20, group: "nic" },
      { key: "nic_manuf", header: "", subHeader: "S/N производитель", width: 18, group: "nic" },
      { key: "nic_revision", header: "", subHeader: "Ревизия", width: 12, group: "nic" }
    );
    
    return columns;
  }

  // =====================================================================
  // ЗАГОЛОВКИ И ОБЪЕДИНЕНИЕ
  // =====================================================================

  addGroupHeaders(sheet, columns, style) {
    const headerRow = sheet.getRow(1);
    
    columns.forEach((col, idx) => {
      const cell = headerRow.getCell(idx + 1);
      cell.value = col.header || "";
      Object.assign(cell, style);
    });
    
    headerRow.height = 35;
  }

  addSubHeaders(sheet, columns, style) {
    const subHeaderRow = sheet.getRow(2);
    
    columns.forEach((col, idx) => {
      const cell = subHeaderRow.getCell(idx + 1);
      cell.value = col.subHeader || "";
      Object.assign(cell, style);
    });
    
    subHeaderRow.height = 25;
  }

  applyHeaderMerges(sheet, columns) {
    const groups = {};
    let startIdx = null;
    let currentGroup = null;
    
    // Определяем диапазоны групп
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
    
    // Объединяем заголовки для многоколоночных групп
    const multiColumnGroups = ["hdd", "psu", "ssd_boot", "ssd_data", "ram", "mb", "cpu", "bmc", "raid", "nic"];
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
      
      // Merge
      for (const range of groupRanges) {
        if (range.end - range.start > 1) {
          try {
            const headerCol = columns.findIndex((c, i) => 
              i >= range.start - 1 && i < range.end && c.header && c.group === groupName
            );
            
            if (headerCol !== -1) {
              const cell = sheet.getRow(1).getCell(headerCol + 1);
              sheet.mergeCells(1, range.start, 1, range.end);
              cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
            }
          } catch (e) {
            // Merge conflict — skip silently
          }
        }
      }
    }
  }

  // =====================================================================
  // СТАТИСТИКА ЭКСПОРТА
  // =====================================================================

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
      
      // По типу
      for (const comp of components) {
        const type = comp.componentType || "OTHER";
        stats.byComponentType[type] = (stats.byComponentType[type] || 0) + 1;
      }
      
      // По партии
      const batchName = server.batch?.name || "Без партии";
      stats.byBatch[batchName] = (stats.byBatch[batchName] || 0) + 1;
      
      // По статусу
      const status = server.status || "UNKNOWN";
      stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
      
      // Недостающие компоненты
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