/**
 * ================================================================================
 * passportsExportRoutes.js
 * ================================================================================
 * 
 * Маршруты API для экспорта паспортов серверов
 * 
 * ================================================================================
 */

const Router = require("express");
const router = new Router();
const authMiddleware = require("../middleware/authMiddleware");
const {
  exportPassports,
  getExportStats,
  getExportPreview,
  exportSinglePassport,
  exportSelectedPassports,
  exportBatchPassports
} = require("../controllers/beryll/passportsExportController");

// Все маршруты требуют авторизации
router.use(authMiddleware);

// POST /api/beryll/export/passports - Экспорт с фильтрами
router.post("/", exportPassports);

// GET /api/beryll/export/passports/stats - Статистика
router.get("/stats", getExportStats);

// GET /api/beryll/export/passports/preview - Предпросмотр
router.get("/preview", getExportPreview);

// GET /api/beryll/export/passports/single/:serverId - Один сервер
router.get("/single/:serverId", exportSinglePassport);

// POST /api/beryll/export/passports/selected - Выбранные серверы
router.post("/selected", exportSelectedPassports);

// GET /api/beryll/export/passports/batch/:batchId - По партии
router.get("/batch/:batchId", exportBatchPassports);

module.exports = router;