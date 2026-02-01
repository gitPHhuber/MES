const { BeryllServer, BeryllServerChecklist, BeryllChecklistTemplate, BeryllBatch, BeryllServerComponent, User } = require("../../../models/index");
const { CHECKLIST_GROUPS } = require("../../../models/definitions/Beryll");
const ExcelJS = require("exceljs");

/**
 * Форматировать байты в человекочитаемый формат
 */
function formatBytes(bytes) {
  if (!bytes || bytes === 0) return "—";
  
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB", "PB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

class PassportService {
  /**
   * Генерация Excel паспорта сервера
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
    
    // Загружаем комплектующие
    const components = await BeryllServerComponent.findAll({
      where: { serverId: id },
      order: [
        ["componentType", "ASC"],
        ["slot", "ASC"]
      ]
    });
    
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Паспорт");
    
    // Настройка колонок - расширено до 6 колонок (A-F)
    sheet.columns = [
      { width: 8 },   // A: №
      { width: 35 },  // B: Тип / Операция
      { width: 50 },  // C: Наименование / Этап
      { width: 22 },  // D: Серийный номер производителя / Подпись
      { width: 22 },  // E: S/N Yadro / Дата
      { width: 18 }   // F: Характеристики
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
    
    // ==========================================
    // ШАПКА ДОКУМЕНТА
    // ==========================================
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
    
    // Серийный номер сервера
    sheet.mergeCells("A3:B3");
    sheet.getCell("A3").value = "Серийный номер сервера, (АПК):";
    sheet.getCell("A3").font = normalFont;
    
    sheet.getCell("C3").value = server.serialNumber || "___";
    sheet.getCell("D3").value = server.apkSerialNumber || "___";
    
    // ==========================================
    // СЕКЦИЯ КОМПЛЕКТУЮЩИХ
    // ==========================================
    let currentRow = 5;
    
    if (components.length > 0) {
      // Заголовок секции комплектующих
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
      
      // Заголовки таблицы комплектующих - 6 колонок
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
      
      // Группируем компоненты
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
      
      // Выводим компоненты по группам
      const allGrouped = [
        ...grouped.CPU,
        ...grouped.RAM,
        ...grouped.storage,
        ...grouped.NIC,
        ...grouped.other
      ];
      
      for (const comp of allGrouped) {
        compNumber++;
        
        // A: Номер
        sheet.getCell(`A${currentRow}`).value = compNumber;
        sheet.getCell(`A${currentRow}`).font = normalFont;
        sheet.getCell(`A${currentRow}`).alignment = centerAlign;
        
        // B: Тип
        sheet.getCell(`B${currentRow}`).value = typeLabels[comp.componentType] || comp.componentType;
        sheet.getCell(`B${currentRow}`).font = normalFont;
        sheet.getCell(`B${currentRow}`).alignment = leftAlign;
        
        // C: Наименование
        const name = comp.name || comp.model || "—";
        sheet.getCell(`C${currentRow}`).value = name;
        sheet.getCell(`C${currentRow}`).font = normalFont;
        sheet.getCell(`C${currentRow}`).alignment = { ...leftAlign, wrapText: true };
        
        // D: Серийный номер производителя
        sheet.getCell(`D${currentRow}`).value = comp.serialNumber || "—";
        sheet.getCell(`D${currentRow}`).font = normalFont;
        sheet.getCell(`D${currentRow}`).alignment = centerAlign;
        
        // E: S/N Yadro (новая колонка)
        sheet.getCell(`E${currentRow}`).value = comp.serialNumberYadro || "—";
        sheet.getCell(`E${currentRow}`).font = normalFont;
        sheet.getCell(`E${currentRow}`).alignment = centerAlign;
        
        // F: Характеристики (зависят от типа)
        let specs = "";
        if (comp.componentType === "CPU") {
          const cores = comp.metadata?.cores;
          const threads = comp.metadata?.threads;
          const speed = comp.speed;
          if (cores) specs += `${cores} ядер`;
          if (threads) specs += `/${threads} потоков`;
          if (speed) specs += ` @ ${speed} MHz`;
        } else if (comp.componentType === "RAM") {
          specs = formatBytes(parseInt(comp.capacity) || 0);
          if (comp.metadata?.memoryType) specs += ` ${comp.metadata.memoryType}`;
          if (comp.speed) specs += ` ${comp.speed} MT/s`;
        } else if (["SSD", "HDD", "NVME"].includes(comp.componentType)) {
          specs = formatBytes(parseInt(comp.capacity) || 0);
          if (comp.metadata?.interface) specs += ` ${comp.metadata.interface}`;
        } else if (comp.componentType === "NIC") {
          if (comp.metadata?.macAddress) specs = comp.metadata.macAddress;
          if (comp.metadata?.linkSpeed) specs += ` ${comp.metadata.linkSpeed}`;
        } else if (comp.firmwareVersion) {
          specs = `FW: ${comp.firmwareVersion}`;
        }
        
        sheet.getCell(`F${currentRow}`).value = specs || "—";
        sheet.getCell(`F${currentRow}`).font = normalFont;
        sheet.getCell(`F${currentRow}`).alignment = centerAlign;
        
        // Рамки для всех 6 колонок
        for (let col of ["A", "B", "C", "D", "E", "F"]) {
          sheet.getCell(`${col}${currentRow}`).border = thinBorder;
        }
        
        currentRow++;
      }
      
      // Итоговая строка
      sheet.mergeCells(`A${currentRow}:D${currentRow}`);
      sheet.getCell(`A${currentRow}`).value = "Итого комплектующих:";
      sheet.getCell(`A${currentRow}`).font = titleFont;
      sheet.getCell(`A${currentRow}`).alignment = { horizontal: "right", vertical: "middle" };
      sheet.getCell(`A${currentRow}`).border = thinBorder;
      
      // Суммы
      const totalRAM = grouped.RAM.reduce((sum, r) => sum + (parseInt(r.capacity) || 0), 0);
      const totalStorage = grouped.storage.reduce((sum, s) => sum + (parseInt(s.capacity) || 0), 0);
      const totalCores = grouped.CPU.reduce((sum, c) => sum + (c.metadata?.cores || 0), 0);
      
      sheet.mergeCells(`E${currentRow}:F${currentRow}`);
      sheet.getCell(`E${currentRow}`).value = `CPU: ${totalCores} ядер | RAM: ${formatBytes(totalRAM)} | Storage: ${formatBytes(totalStorage)}`;
      sheet.getCell(`E${currentRow}`).font = titleFont;
      sheet.getCell(`E${currentRow}`).alignment = centerAlign;
      sheet.getCell(`E${currentRow}`).border = thinBorder;
      
      currentRow += 2;
    }
    
    // ==========================================
    // СЕКЦИЯ ЧЕК-ЛИСТОВ (ОПЕРАЦИИ ПРОИЗВОДСТВА)
    // ==========================================
    
    // Заголовок таблицы чек-листов
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
    
    // Заголовки таблицы операций - объединяем C:D для "Этап"
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
    // Добавляем border для D (объединена с C)
    sheet.getCell(`D${headerRow}`).border = thinBorder;
    sheet.getRow(headerRow).height = 30;
    currentRow++;
    
    // Группируем чек-листы по группам
    const groupLabels = {
      [CHECKLIST_GROUPS.VISUAL]: "Визуальный осмотр",
      [CHECKLIST_GROUPS.TESTING]: "Проверка работоспособности",
      [CHECKLIST_GROUPS.QC_PRIMARY]: "Контрольная",
      [CHECKLIST_GROUPS.BURN_IN]: "Испытательная",
      [CHECKLIST_GROUPS.QC_FINAL]: "Контрольная"
    };
    
    // Сортируем чек-листы
    const sortedChecklists = (server.checklists || []).sort(
      (a, b) => (a.template?.sortOrder || 0) - (b.template?.sortOrder || 0)
    );
    
    let currentGroup = null;
    let groupNumber = 0;
    
    for (const checklist of sortedChecklists) {
      const template = checklist.template;
      if (!template) continue;
      
      // Новая группа?
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
      
      // Этап (объединённые колонки C:D)
      sheet.mergeCells(`C${currentRow}:D${currentRow}`);
      sheet.getCell(`C${currentRow}`).value = template.title;
      sheet.getCell(`C${currentRow}`).font = normalFont;
      sheet.getCell(`C${currentRow}`).alignment = { ...leftAlign, wrapText: true };
      
      // Подпись (колонка E)
      if (checklist.completed && checklist.completedBy) {
        sheet.getCell(`E${currentRow}`).value = 
          `${checklist.completedBy.surname} ${checklist.completedBy.name?.charAt(0) || ""}.`;
      }
      sheet.getCell(`E${currentRow}`).font = normalFont;
      sheet.getCell(`E${currentRow}`).alignment = centerAlign;
      
      // Дата (колонка F)
      if (checklist.completedAt) {
        const date = new Date(checklist.completedAt);
        sheet.getCell(`F${currentRow}`).value = date.toLocaleDateString("ru-RU");
      }
      sheet.getCell(`F${currentRow}`).font = normalFont;
      sheet.getCell(`F${currentRow}`).alignment = centerAlign;
      
      // Рамки
      for (let col of ["A", "B", "C", "D", "E", "F"]) {
        sheet.getCell(`${col}${currentRow}`).border = thinBorder;
      }
      
      currentRow++;
    }
    
    // ==========================================
    // ИНФОРМАЦИЯ О ТЕХНОЛОГИЧЕСКОМ ПРОГОНЕ
    // ==========================================
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
    
    // Генерируем файл
    const buffer = await workbook.xlsx.writeBuffer();
    
    const fileName = `Паспорт_${server.apkSerialNumber || server.id}.xlsx`;
    
    return {
      buffer,
      fileName
    };
  }
}

module.exports = new PassportService();