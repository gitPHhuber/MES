/**
 * ================================================================================
 * passportsExportController.js
 * ================================================================================
 * 
 * Контроллер API для выгрузки и объединения паспортов серверов
 * 
 * Endpoints:
 * - POST /api/beryll/export/passports - Экспорт паспортов в Excel
 * - GET /api/beryll/export/passports/stats - Получение статистики для экспорта
 * - GET /api/beryll/export/passports/preview - Предпросмотр данных
 * 
 * ================================================================================
 */

const UnifiedPassportsExportService = require("./services/UnifiedPassportsExportService");
const ApiError = require("../../error/ApiError");

/**
 * Экспорт объединённых паспортов серверов в Excel
 * 
 * @route POST /api/beryll/export/passports
 * @body {Object} options - Параметры экспорта
 * @body {number[]} options.serverIds - ID серверов для экспорта
 * @body {number} options.batchId - ID партии
 * @body {string} options.status - Статус серверов
 * @body {string} options.dateFrom - Дата начала
 * @body {string} options.dateTo - Дата окончания
 * @body {string} options.search - Поисковый запрос
 * @body {boolean} options.includeArchived - Включать архивные
 */
async function exportPassports(req, res, next) {
  try {
    const options = {
      serverIds: req.body.serverIds || null,
      batchId: req.body.batchId || null,
      status: req.body.status || null,
      dateFrom: req.body.dateFrom || null,
      dateTo: req.body.dateTo || null,
      search: req.body.search || null,
      includeArchived: req.body.includeArchived || false
    };

    console.log("[PassportsExport] Starting export with options:", options);

    const buffer = await UnifiedPassportsExportService.exportUnifiedPassports(options);

    // Формируем имя файла
    const timestamp = new Date().toISOString().split("T")[0];
    let filename = `Состав_серверов_${timestamp}`;
    
    if (options.batchId) {
      filename += `_партия_${options.batchId}`;
    }
    if (options.status) {
      filename += `_${options.status}`;
    }
    
    filename += ".xlsx";

    // Устанавливаем заголовки для скачивания
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Length", buffer.length);

    console.log(`[PassportsExport] Export complete, file size: ${buffer.length} bytes`);

    res.send(buffer);

  } catch (error) {
    console.error("[PassportsExport] Export error:", error);
    
    if (error.message === "Не найдено серверов для экспорта") {
      return next(ApiError.notFound(error.message));
    }
    
    next(ApiError.internal(`Ошибка экспорта: ${error.message}`));
  }
}

/**
 * Получение статистики для экспорта
 * 
 * @route GET /api/beryll/export/passports/stats
 * @query {number} batchId - ID партии
 * @query {string} status - Статус серверов
 * @query {string} dateFrom - Дата начала
 * @query {string} dateTo - Дата окончания
 * @query {string} search - Поисковый запрос
 */
async function getExportStats(req, res, next) {
  try {
    const options = {
      batchId: req.query.batchId || null,
      status: req.query.status || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      search: req.query.search || null,
      includeArchived: req.query.includeArchived === "true"
    };

    console.log("[PassportsExport] Getting stats with options:", options);

    const stats = await UnifiedPassportsExportService.getExportStats(options);

    res.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error("[PassportsExport] Stats error:", error);
    next(ApiError.internal(`Ошибка получения статистики: ${error.message}`));
  }
}

/**
 * Предпросмотр данных для экспорта
 * 
 * @route GET /api/beryll/export/passports/preview
 * @query {number} batchId - ID партии
 * @query {string} status - Статус серверов  
 * @query {number} limit - Лимит записей (по умолчанию 10)
 */
async function getExportPreview(req, res, next) {
  try {
    const options = {
      batchId: req.query.batchId || null,
      status: req.query.status || null,
      dateFrom: req.query.dateFrom || null,
      dateTo: req.query.dateTo || null,
      search: req.query.search || null,
      includeArchived: req.query.includeArchived === "true"
    };

    const limit = parseInt(req.query.limit) || 10;

    console.log("[PassportsExport] Getting preview with options:", options);

    // Получаем серверы
    const servers = await UnifiedPassportsExportService.getServersWithComponents(options);
    
    // Ограничиваем количество для предпросмотра
    const previewServers = servers.slice(0, limit);

    // Формируем превью данные
    const preview = previewServers.map(server => {
      const components = server.components || [];
      const grouped = UnifiedPassportsExportService.groupComponentsByType(components);
      
      return {
        id: server.id,
        apkSerialNumber: server.apkSerialNumber,
        serialNumber: server.serialNumber,
        status: server.status,
        batchName: server.batch?.name || null,
        createdAt: server.createdAt,
        componentsSummary: {
          total: components.length,
          hdd: grouped.HDD?.length || 0,
          ssd: (grouped.SSD?.length || 0) + (grouped.NVME?.length || 0),
          ram: grouped.RAM?.length || 0,
          psu: grouped.PSU?.length || 0,
          motherboard: grouped.MOTHERBOARD?.length || 0,
          bmc: grouped.BMC?.length || 0,
          nic: grouped.NIC?.length || 0,
          raid: grouped.RAID?.length || 0
        },
        completeness: this.calculateCompleteness(grouped)
      };
    });

    res.json({
      success: true,
      total: servers.length,
      showing: previewServers.length,
      preview
    });

  } catch (error) {
    console.error("[PassportsExport] Preview error:", error);
    next(ApiError.internal(`Ошибка предпросмотра: ${error.message}`));
  }
}

/**
 * Расчёт полноты комплектации сервера
 */
function calculateCompleteness(grouped) {
  const expected = {
    HDD: 12,
    RAM: 12,
    PSU: 2,
    SSD: 2,
    NVME: 2,
    MOTHERBOARD: 1,
    BMC: 1,
    NIC: 1,
    RAID: 1
  };
  
  let totalExpected = 0;
  let totalActual = 0;
  
  for (const [type, count] of Object.entries(expected)) {
    totalExpected += count;
    const actual = grouped[type]?.length || 0;
    totalActual += Math.min(actual, count);
  }
  
  // Для SSD+NVME считаем вместе
  const ssdNvmeActual = (grouped.SSD?.length || 0) + (grouped.NVME?.length || 0);
  const ssdNvmeExpected = expected.SSD + expected.NVME;
  totalActual = totalActual - Math.min(grouped.SSD?.length || 0, expected.SSD) - Math.min(grouped.NVME?.length || 0, expected.NVME);
  totalActual += Math.min(ssdNvmeActual, ssdNvmeExpected);
  
  return Math.round((totalActual / totalExpected) * 100);
}

/**
 * Экспорт по шаблону конкретного сервера (вертикальная форма)
 * 
 * @route GET /api/beryll/export/passports/single/:serverId
 */
async function exportSinglePassport(req, res, next) {
  try {
    const { serverId } = req.params;
    
    if (!serverId) {
      return next(ApiError.badRequest("Не указан ID сервера"));
    }

    console.log("[PassportsExport] Single export for server:", serverId);

    // Экспортируем только один сервер
    const buffer = await UnifiedPassportsExportService.exportUnifiedPassports({
      serverIds: [parseInt(serverId)]
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Паспорт_сервера_${serverId}_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error("[PassportsExport] Single export error:", error);
    next(ApiError.internal(`Ошибка экспорта: ${error.message}`));
  }
}

/**
 * Экспорт выбранных серверов
 * 
 * @route POST /api/beryll/export/passports/selected
 * @body {number[]} serverIds - Массив ID серверов
 */
async function exportSelectedPassports(req, res, next) {
  try {
    const { serverIds } = req.body;
    
    if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
      return next(ApiError.badRequest("Не выбраны серверы для экспорта"));
    }

    console.log("[PassportsExport] Selected export for servers:", serverIds);

    const buffer = await UnifiedPassportsExportService.exportUnifiedPassports({
      serverIds: serverIds.map(id => parseInt(id))
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = `Состав_серверов_выбранные_${serverIds.length}шт_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error("[PassportsExport] Selected export error:", error);
    next(ApiError.internal(`Ошибка экспорта: ${error.message}`));
  }
}

/**
 * Экспорт по партии
 * 
 * @route GET /api/beryll/export/passports/batch/:batchId
 */
async function exportBatchPassports(req, res, next) {
  try {
    const { batchId } = req.params;
    
    console.log("[PassportsExport] Batch export for:", batchId);

    const buffer = await UnifiedPassportsExportService.exportUnifiedPassports({
      batchId: batchId === "null" ? "null" : parseInt(batchId)
    });

    const timestamp = new Date().toISOString().split("T")[0];
    const filename = batchId === "null" 
      ? `Состав_серверов_без_партии_${timestamp}.xlsx`
      : `Состав_серверов_партия_${batchId}_${timestamp}.xlsx`;

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`);
    res.setHeader("Content-Length", buffer.length);

    res.send(buffer);

  } catch (error) {
    console.error("[PassportsExport] Batch export error:", error);
    next(ApiError.internal(`Ошибка экспорта: ${error.message}`));
  }
}

module.exports = {
  exportPassports,
  getExportStats,
  getExportPreview,
  exportSinglePassport,
  exportSelectedPassports,
  exportBatchPassports,
  calculateCompleteness
};
