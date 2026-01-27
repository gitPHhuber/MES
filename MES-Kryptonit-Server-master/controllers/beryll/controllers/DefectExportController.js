/**
 * DefectExportController.js - Контроллер экспорта дефектов в Excel
 * Путь: controllers/beryll/controllers/DefectExportController.js
 */

const DefectExportService = require("../services/DefectExportService");
const ApiError = require("../../../error/ApiError");

class DefectExportController {
    /**
     * GET /api/beryll/defect-records/export
     * Экспорт всех дефектов в Excel
     */
    async exportDefects(req, res, next) {
        try {
            const { status, dateFrom, dateTo, serverId, search } = req.query;
            
            const buffer = await DefectExportService.exportToExcel({
                status,
                dateFrom,
                dateTo,
                serverId: serverId ? parseInt(serverId) : undefined,
                search
            });
            
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const filename = `Брак_серверов_${date}.xlsx`;
            
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader(
                "Content-Disposition",
                `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
            );
            res.setHeader("Content-Length", buffer.length);
            
            return res.send(buffer);
            
        } catch (error) {
            console.error("exportDefects error:", error);
            return next(ApiError.internal(error.message));
        }
    }
    
    /**
     * GET /api/beryll/defect-records/export/stats
     * Экспорт статистики по дефектам
     */
    async exportStats(req, res, next) {
        try {
            const buffer = await DefectExportService.exportStatsToExcel();
            
            const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
            const filename = `Статистика_брака_${date}.xlsx`;
            
            res.setHeader(
                "Content-Type",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            );
            res.setHeader(
                "Content-Disposition",
                `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`
            );
            res.setHeader("Content-Length", buffer.length);
            
            return res.send(buffer);
            
        } catch (error) {
            console.error("exportStats error:", error);
            return next(ApiError.internal(error.message));
        }
    }
}

module.exports = new DefectExportController();