const { BeryllServer, BeryllServerChecklist, BeryllChecklistTemplate, BeryllBatch, BeryllServerComponent, User } = require("../../../models/index");
const { CHECKLIST_GROUPS } = require("../../../models/definitions/Beryll");
const ExcelJS = require("exceljs");

/**
 * Форматирование байтов в читаемый формат
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return null;
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Форматирование capacity для RAM (может быть в байтах или в GB)
 */
function formatRamCapacity(capacity) {
  if (!capacity) return null;
  
  const numCapacity = parseInt(capacity);
  if (!numCapacity || isNaN(numCapacity)) return null;
  
  // Если значение меньше 1024, считаем что это уже GB
  if (numCapacity < 1024) {
    return `${numCapacity} GB`;
  }
  
  // Иначе форматируем как байты
  return formatBytes(numCapacity);
}

/**
 * Форматирование capacity для накопителей (может быть в байтах или в GB)
 */
function formatStorageCapacity(capacity) {
  if (!capacity) return null;
  
  const numCapacity = parseInt(capacity);
  if (!numCapacity || isNaN(numCapacity)) return null;
  
  // Если значение меньше 10000, считаем что это GB
  if (numCapacity < 10000) {
    // Форматируем в TB если больше 1000 GB
    if (numCapacity >= 1000) {
      return `${(numCapacity / 1000).toFixed(2)} TB`;
    }
    return `${numCapacity} GB`;
  }
  
  // Иначе форматируем как байты
  return formatBytes(numCapacity);
}

/**
 * Извлекает характеристики RAM из названия модели
 * Например: "Samsung M393A8G40AB2-CWE" -> { capacity: "64 GB", type: "DDR4", speed: "3200 MT/s" }
 */
function extractRamSpecsFromName(name, model) {
  const source = `${name || ''} ${model || ''}`.toUpperCase();
  const specs = {};
  
  // Известные модели Samsung DDR4 и их характеристики
  const knownModels = {
    'M393A8G40AB2': { capacity: '64 GB', type: 'DDR4', speed: '3200 MT/s' },
    'M393A8G40BB4': { capacity: '64 GB', type: 'DDR4', speed: '2933 MT/s' },
    'M393A8G40MB2': { capacity: '64 GB', type: 'DDR4', speed: '2666 MT/s' },
    'M393A4K40CB2': { capacity: '32 GB', type: 'DDR4', speed: '2666 MT/s' },
    'M393A4K40DB2': { capacity: '32 GB', type: 'DDR4', speed: '2933 MT/s' },
    'M393A4K40DB3': { capacity: '32 GB', type: 'DDR4', speed: '3200 MT/s' },
    'M393A2K40CB2': { capacity: '16 GB', type: 'DDR4', speed: '2666 MT/s' },
    'M393A2K40DB2': { capacity: '16 GB', type: 'DDR4', speed: '2933 MT/s' },
    'M393A2K40DB3': { capacity: '16 GB', type: 'DDR4', speed: '3200 MT/s' },
    'M393A1K43DB2': { capacity: '8 GB', type: 'DDR4', speed: '2933 MT/s' },
    // DDR5
    'M321R8GA0BB0': { capacity: '64 GB', type: 'DDR5', speed: '4800 MT/s' },
    'M321R4GA0BB0': { capacity: '32 GB', type: 'DDR5', speed: '4800 MT/s' },
  };
  
  // Проверяем известные модели
  for (const [modelPrefix, modelSpecs] of Object.entries(knownModels)) {
    if (source.includes(modelPrefix)) {
      return modelSpecs;
    }
  }
  
  // Пытаемся извлечь объём из названия (например "64GB", "64 GB")
  const capacityMatch = source.match(/(\d+)\s*GB/i);
  if (capacityMatch) {
    specs.capacity = `${capacityMatch[1]} GB`;
  }
  
  // Извлекаем тип памяти
  if (source.includes('DDR5')) {
    specs.type = 'DDR5';
  } else if (source.includes('DDR4')) {
    specs.type = 'DDR4';
  } else if (source.includes('DDR3')) {
    specs.type = 'DDR3';
  }
  
  // Извлекаем скорость (например "3200", "2933", "2666")
  const speedMatch = source.match(/(\d{4})\s*(MT\/S|MHZ)?/i);
  if (speedMatch) {
    specs.speed = `${speedMatch[1]} MT/s`;
  }
  
  return Object.keys(specs).length > 0 ? specs : null;
}

/**
 * Извлекает характеристики HDD/SSD из названия модели
 */
function extractStorageSpecsFromName(name, model, componentType) {
  const source = `${name || ''} ${model || ''}`.toUpperCase();
  const specs = {};
  
  // Известные модели Seagate
  const knownHddModels = {
    'ST16000NM004J': { capacity: '16 TB', interface: 'SAS' },
    'ST18000NM000J': { capacity: '18 TB', interface: 'SAS' },
    'ST14000NM001G': { capacity: '14 TB', interface: 'SAS' },
    'ST12000NM001G': { capacity: '12 TB', interface: 'SAS' },
    'ST10000NM001G': { capacity: '10 TB', interface: 'SAS' },
    'ST8000NM000A': { capacity: '8 TB', interface: 'SAS' },
  };
  
  // Проверяем известные модели HDD
  for (const [modelPrefix, modelSpecs] of Object.entries(knownHddModels)) {
    if (source.includes(modelPrefix)) {
      return modelSpecs;
    }
  }
  
  // Пытаемся извлечь объём
  const tbMatch = source.match(/(\d+(?:\.\d+)?)\s*TB/i);
  if (tbMatch) {
    specs.capacity = `${tbMatch[1]} TB`;
  } else {
    const gbMatch = source.match(/(\d+)\s*GB/i);
    if (gbMatch) {
      specs.capacity = `${gbMatch[1]} GB`;
    }
  }
  
  // Определяем интерфейс
  if (source.includes('SAS')) {
    specs.interface = 'SAS';
  } else if (source.includes('NVME') || source.includes('NVM')) {
    specs.interface = 'NVMe';
  } else if (source.includes('SATA')) {
    specs.interface = 'SATA';
  } else if (componentType === 'HDD') {
    specs.interface = 'SAS'; // По умолчанию для HDD
  }
  
  return Object.keys(specs).length > 0 ? specs : null;
}

class PassportService {
  /**
   * Генерирует паспорт сервера в формате Excel
   */
  async generatePassport(id) {
    const server = await BeryllServer.findByPk(id, {
      include: [
        { model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] },
        { model: BeryllBatch, as: "batch" },
        {
          model: BeryllServerChecklist,
          as: "checklists",
          include: [
            { model: BeryllChecklistTemplate, as: "template" },
            { model: User, as: "completedBy", attributes: ["name", "surname"] }
          ]
        }
      ]
    });
    
    if (!server) {
      throw new Error("Сервер не найден");
    }
    
    // Получаем комплектующие
    const components = await BeryllServerComponent.findAll({
      where: { serverId: id },
      order: [
        ["componentType", "ASC"],
        ["slot", "ASC"]
      ]
    });
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Паспорт");
    
    // Настройки столбцов
    sheet.columns = [
      { width: 8 },   // A - №
      { width: 35 },  // B - Тип
      { width: 50 },  // C - Наименование
      { width: 22 },  // D - Серийный номер
      { width: 22 },  // E - S/N Yadro
      { width: 18 }   // F - Характеристики (расширил)
    ];
    
    // Стили
    const headerFont = { bold: true, size: 14 };
    const titleFont = { bold: true, size: 11 };
    const normalFont = { size: 10 };
    const centerAlign = { horizontal: "center", vertical: "middle" };
    const leftAlign = { horizontal: "left", vertical: "middle" };
    
    const thinBorder = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" }
    };
    
    // ============ ШАПКА ============
    sheet.mergeCells("A1:B1");
    sheet.getCell("A1").value = "АО «НПК Криптонит»";
    sheet.getCell("A1").font = titleFont;
    
    sheet.mergeCells("C1:F1");
    sheet.getCell("C1").value = "СОПРОВОДИТЕЛЬНЫЙ ПАСПОРТ ПРОИЗВОДСТВА";
    sheet.getCell("C1").font = headerFont;
    sheet.getCell("C1").alignment = centerAlign;
    
    sheet.mergeCells("A2:B2");
    sheet.getCell("A2").value = "АПК \"Берилл\"";
    sheet.getCell("A2").font = titleFont;
    
    sheet.mergeCells("C2:F2");
    sheet.getCell("C2").value = `МРТН.466514.002 - ${server.apkSerialNumber || "___"}`;
    sheet.getCell("C2").font = titleFont;
    sheet.getCell("C2").alignment = centerAlign;
    
    // Серийный номер
    sheet.mergeCells("A3:B3");
    sheet.getCell("A3").value = "Серийный номер сервера, (АПК):";
    sheet.getCell("A3").font = normalFont;
    
    sheet.getCell("C3").value = server.serialNumber || "___";
    sheet.getCell("D3").value = server.apkSerialNumber || "___";
    
    // ============ КОМПЛЕКТУЮЩИЕ ============
    let currentRow = 5;
    
    if (components.length > 0) {
      // Заголовок раздела
      sheet.mergeCells(`A${currentRow}:F${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = "КОМПЛЕКТУЮЩИЕ СЕРВЕРА";
      sheet.getCell(`A${currentRow}`).font = headerFont;
      sheet.getCell(`A${currentRow}`).alignment = centerAlign;
      sheet.getCell(`A${currentRow}`).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFD9E1F2" }
      };
      currentRow++;
      
      // Заголовки таблицы
      sheet.getCell(`A${currentRow}`).value = "№";
      sheet.getCell(`B${currentRow}`).value = "Тип";
      sheet.getCell(`C${currentRow}`).value = "Наименование / Модель";
      sheet.getCell(`D${currentRow}`).value = "Серийный номер";
      sheet.getCell(`E${currentRow}`).value = "S/N Yadro";
      sheet.getCell(`F${currentRow}`).value = "Характеристики";
      
      for (let col of ["A", "B", "C", "D", "E", "F"]) {
        const cell = sheet.getCell(`${col}${currentRow}`);
        cell.font = titleFont;
        cell.alignment = centerAlign;
        cell.border = thinBorder;
        cell.fill = {
          type: "pattern",
          pattern: "solid",
          fgColor: { argb: "FFE0E0E0" }
        };
      }
      currentRow++;
      
      // Группировка компонентов
      const grouped = {
        CPU: components.filter(c => c.componentType === "CPU"),
        RAM: components.filter(c => c.componentType === "RAM"),
        storage: components.filter(c => ["SSD", "HDD", "NVME"].includes(c.componentType)),
        NIC: components.filter(c => c.componentType === "NIC"),
        other: components.filter(c => ["MOTHERBOARD", "BMC", "PSU", "GPU", "RAID", "OTHER"].includes(c.componentType))
      };
      
      const typeLabels = {
        CPU: "Процессор",
        RAM: "Память",
        SSD: "SSD",
        HDD: "HDD",
        NVME: "NVMe",
        NIC: "Сетевой адаптер",
        MOTHERBOARD: "Мат. плата",
        BMC: "BMC",
        PSU: "БП",
        GPU: "Видеокарта",
        RAID: "RAID контроллер",
        OTHER: "Прочее"
      };
      
      let compNumber = 0;
      
      // Объединённый список
      const allGrouped = [
        ...grouped.CPU,
        ...grouped.RAM,
        ...grouped.storage,
        ...grouped.NIC,
        ...grouped.other
      ];
      
      for (const comp of allGrouped) {
        compNumber++;
        
        // Номер
        sheet.getCell(`A${currentRow}`).value = compNumber;
        sheet.getCell(`A${currentRow}`).font = normalFont;
        sheet.getCell(`A${currentRow}`).alignment = centerAlign;
        
        // Тип
        sheet.getCell(`B${currentRow}`).value = typeLabels[comp.componentType] || comp.componentType;
        sheet.getCell(`B${currentRow}`).font = normalFont;
        sheet.getCell(`B${currentRow}`).alignment = leftAlign;
        
        // Наименование
        const name = comp.name || comp.model || "—";
        sheet.getCell(`C${currentRow}`).value = name;
        sheet.getCell(`C${currentRow}`).font = normalFont;
        sheet.getCell(`C${currentRow}`).alignment = { ...leftAlign, wrapText: true };
        
        // Серийный номер
        sheet.getCell(`D${currentRow}`).value = comp.serialNumber || "—";
        sheet.getCell(`D${currentRow}`).font = normalFont;
        sheet.getCell(`D${currentRow}`).alignment = centerAlign;
        
        // S/N Yadro
        sheet.getCell(`E${currentRow}`).value = comp.serialNumberYadro || "—";
        sheet.getCell(`E${currentRow}`).font = normalFont;
        sheet.getCell(`E${currentRow}`).alignment = centerAlign;
        
        // ============ ИСПРАВЛЕНО: Характеристики ============
        // Формируем характеристики независимо от наличия S/N Yadro
        let specs = this.formatComponentSpecs(comp);
        
        sheet.getCell(`F${currentRow}`).value = specs || "—";
        sheet.getCell(`F${currentRow}`).font = normalFont;
        sheet.getCell(`F${currentRow}`).alignment = centerAlign;
        
        // Границы
        for (let col of ["A", "B", "C", "D", "E", "F"]) {
          sheet.getCell(`${col}${currentRow}`).border = thinBorder;
        }
        
        currentRow++;
      }
      
      // Итого
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = "Итого комплектующих:";
      sheet.getCell(`A${currentRow}`).font = titleFont;
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(`A${currentRow}`).border = thinBorder;
      
      // Подсчёт общих характеристик
      const totalRAM = grouped.RAM.reduce((sum, r) => sum + (parseInt(r.capacity) || 0), 0);
      const totalStorage = grouped.storage.reduce((sum, s) => sum + (parseInt(s.capacity) || 0), 0);
      const totalCores = grouped.CPU.reduce((sum, c) => sum + (c.metadata?.cores || 0), 0);
      
      // Форматируем RAM (может быть в GB или в байтах)
      const ramFormatted = formatRamCapacity(totalRAM) || formatBytes(totalRAM) || "—";
      const storageFormatted = formatStorageCapacity(totalStorage) || formatBytes(totalStorage) || "—";
      
      sheet.mergeCells(`E${currentRow}:F${currentRow}`);
      sheet.getCell(`E${currentRow}`).value = `CPU: ${totalCores} ядер | RAM: ${ramFormatted} | Storage: ${storageFormatted}`;
      sheet.getCell(`E${currentRow}`).font = titleFont;
      sheet.getCell(`E${currentRow}`).alignment = centerAlign;
      sheet.getCell(`E${currentRow}`).border = thinBorder;
      
      currentRow += 2;
    }
    
    // ============ ОПЕРАЦИИ ПРОИЗВОДСТВА ============
    sheet.mergeCells(`A${currentRow}:F${currentRow}`);
    sheet.getCell(`A${currentRow}`).value = "ОПЕРАЦИИ ПРОИЗВОДСТВА";
    sheet.getCell(`A${currentRow}`).font = headerFont;
    sheet.getCell(`A${currentRow}`).alignment = centerAlign;
    sheet.getCell(`A${currentRow}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFD9E1F2" }
    };
    currentRow++;
    
    // Заголовок таблицы операций
    const headerRow = currentRow;
    sheet.getCell(`A${headerRow}`).value = "№\nп/п";
    sheet.getCell(`B${headerRow}`).value = "Операция";
    sheet.mergeCells(`C${headerRow}:D${headerRow}`);
    sheet.getCell(`C${headerRow}`).value = "Этап";
    sheet.getCell(`E${headerRow}`).value = "Подпись";
    sheet.getCell(`F${headerRow}`).value = "Дата";
    
    for (let col of ["A", "B", "C", "E", "F"]) {
      const cell = sheet.getCell(`${col}${headerRow}`);
      cell.font = titleFont;
      cell.alignment = centerAlign;
      cell.border = thinBorder;
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFE0E0E0" }
      };
    }
    
    sheet.getCell(`D${headerRow}`).border = thinBorder;
    sheet.getRow(headerRow).height = 30;
    currentRow++;
    
    // Метки групп
    const groupLabels = {
      [CHECKLIST_GROUPS.VISUAL]: "Визуальный осмотр",
      [CHECKLIST_GROUPS.TESTING]: "Проверка работоспособности",
      [CHECKLIST_GROUPS.QC_PRIMARY]: "Контрольная",
      [CHECKLIST_GROUPS.BURN_IN]: "Испытательная",
      [CHECKLIST_GROUPS.QC_FINAL]: "Контрольная"
    };
    
    // Сортировка чек-листа
    const sortedChecklists = (server.checklists || []).sort(
      (a, b) => (a.template?.sortOrder || 0) - (b.template?.sortOrder || 0)
    );
    
    let currentGroup = null;
    let groupNumber = 0;
    
    for (const checklist of sortedChecklists) {
      const template = checklist.template;
      if (!template) continue;
      
      // Новая группа
      if (template.groupCode !== currentGroup) {
        currentGroup = template.groupCode;
        groupNumber++;
        
        // Номер группы
        sheet.getCell(`A${currentRow}`).value = groupNumber;
        sheet.getCell(`A${currentRow}`).font = titleFont;
        sheet.getCell(`A${currentRow}`).alignment = centerAlign;
        
        // Название группы
        sheet.getCell(`B${currentRow}`).value = groupLabels[currentGroup] || template.groupCode;
        sheet.getCell(`B${currentRow}`).font = titleFont;
      }
      
      // Этап
      sheet.mergeCells(`C${currentRow}:D${currentRow}`);
      sheet.getCell(`C${currentRow}`).value = template.title;
      sheet.getCell(`C${currentRow}`).font = normalFont;
      sheet.getCell(`C${currentRow}`).alignment = { ...leftAlign, wrapText: true };
      
      // Подпись
      if (checklist.completed && checklist.completedBy) {
        sheet.getCell(`E${currentRow}`).value = 
          `${checklist.completedBy.surname} ${checklist.completedBy.name?.charAt(0) || ""}.`;
      }
      sheet.getCell(`E${currentRow}`).font = normalFont;
      sheet.getCell(`E${currentRow}`).alignment = centerAlign;
      
      // Дата
      if (checklist.completedAt) {
        const date = new Date(checklist.completedAt);
        sheet.getCell(`F${currentRow}`).value = date.toLocaleDateString("ru-RU");
      }
      sheet.getCell(`F${currentRow}`).font = normalFont;
      sheet.getCell(`F${currentRow}`).alignment = centerAlign;
      
      // Границы
      for (let col of ["A", "B", "C", "D", "E", "F"]) {
        sheet.getCell(`${col}${currentRow}`).border = thinBorder;
      }
      
      currentRow++;
    }
    
    // Даты прогона
    if (server.burnInStartAt) {
      currentRow++;
      sheet.getCell(`B${currentRow}`).value = "Дата и время установки на технологический прогон:";
      sheet.getCell(`B${currentRow}`).font = normalFont;
      sheet.mergeCells(`C${currentRow}:D${currentRow}`);
      sheet.getCell(`C${currentRow}`).value = new Date(server.burnInStartAt).toLocaleString("ru-RU");
      sheet.getCell(`C${currentRow}`).font = normalFont;
    }
    
    if (server.burnInEndAt) {
      currentRow++;
      sheet.getCell(`B${currentRow}`).value = "Дата и время завершения технологического прогона:";
      sheet.getCell(`B${currentRow}`).font = normalFont;
      sheet.mergeCells(`C${currentRow}:D${currentRow}`);
      sheet.getCell(`C${currentRow}`).value = new Date(server.burnInEndAt).toLocaleString("ru-RU");
      sheet.getCell(`C${currentRow}`).font = normalFont;
    }
    
    // Создаём буфер
    const buffer = await workbook.xlsx.writeBuffer();
    
    const fileName = `Паспорт_${server.apkSerialNumber || server.id}.xlsx`;
    
    return {
      buffer,
      fileName
    };
  }

  /**
   * Форматирование характеристик компонента
   * ИСПРАВЛЕНО: извлекает характеристики из названия модели если поля пустые
   */
  formatComponentSpecs(comp) {
    if (comp.componentType === "CPU") {
      const parts = [];
      const cores = comp.metadata?.cores;
      const threads = comp.metadata?.threads;
      const speed = comp.speed;
      
      if (cores) {
        parts.push(`${cores}/${threads || cores} потоков`);
      }
      if (speed) {
        parts.push(`@ ${speed} MHz`);
      }
      return parts.join(" ") || null;
      
    } else if (comp.componentType === "RAM") {
      // Сначала пробуем из полей БД
      let capacityStr = formatRamCapacity(comp.capacity);
      let typeStr = comp.metadata?.memoryType;
      let speedStr = comp.speed ? String(comp.speed) : null;
      
      // Если нет данных - извлекаем из названия модели
      if (!capacityStr || !typeStr || !speedStr) {
        const extracted = extractRamSpecsFromName(comp.name, comp.model);
        if (extracted) {
          if (!capacityStr && extracted.capacity) capacityStr = extracted.capacity;
          if (!typeStr && extracted.type) typeStr = extracted.type;
          if (!speedStr && extracted.speed) speedStr = extracted.speed;
        }
      }
      
      // Формируем строку характеристик
      const parts = [];
      if (capacityStr) parts.push(capacityStr);
      if (typeStr) parts.push(typeStr);
      if (speedStr) {
        // Приводим к строке и добавляем MT/s если нет
        const speedString = String(speedStr);
        if (!speedString.includes('MT/s') && !speedString.includes('MHz')) {
          parts.push(`${speedString} MT/s`);
        } else {
          parts.push(speedString);
        }
      }
      
      return parts.join(" ") || null;
      
    } else if (["SSD", "HDD", "NVME"].includes(comp.componentType)) {
      let capacityStr = formatStorageCapacity(comp.capacity);
      let interfaceStr = comp.metadata?.interface;
      
      // Если нет данных - извлекаем из названия
      if (!capacityStr || !interfaceStr) {
        const extracted = extractStorageSpecsFromName(comp.name, comp.model, comp.componentType);
        if (extracted) {
          if (!capacityStr && extracted.capacity) capacityStr = extracted.capacity;
          if (!interfaceStr && extracted.interface) interfaceStr = extracted.interface;
        }
      }
      
      const parts = [];
      if (capacityStr) parts.push(capacityStr);
      if (interfaceStr) parts.push(interfaceStr);
      
      return parts.join(" ") || null;
      
    } else if (comp.componentType === "NIC") {
      const parts = [];
      if (comp.metadata?.macAddress) parts.push(comp.metadata.macAddress);
      if (comp.metadata?.linkSpeed) parts.push(comp.metadata.linkSpeed);
      return parts.join(" ") || null;
      
    } else if (comp.componentType === "PSU") {
      if (comp.capacity) return `${comp.capacity}W`;
      return null;
      
    } else {
      if (comp.firmwareVersion) return `FW: ${comp.firmwareVersion}`;
      return null;
    }
  }
}

module.exports = new PassportService();