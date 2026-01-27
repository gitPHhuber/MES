const Router = require("express");
const router = new Router();
const multer = require("multer");
const path = require("path");

const beryllController = require("../controllers/beryll");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");
const DefectMonitoringController = require("../controllers/beryll/controllers/DefectMonitoringController");
const ComponentsController = require("../controllers/beryll/controllers/ComponentsController");

// Защита маршрутов
const protect = [authMiddleware, syncUserMiddleware];

// ============================================
// НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ ДЛЯ ДЕФЕКТОВ
// ============================================
const defectStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "../uploads/beryll/defects"));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const defectUpload = multer({ 
  storage: defectStorage, 
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ============================================
// СИНХРОНИЗАЦИЯ С DHCP
// ============================================

router.post(
  "/sync",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.syncWithDhcp
);

// ============================================
// СЕРВЕРЫ
// ============================================

router.get(
  "/servers",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServers
);

router.get(
  "/stats",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getStats
);

router.get(
  "/analytics",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getAnalytics
);

router.get(
  "/servers/:id",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServerById
);

router.post(
  "/servers/:id/take",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.takeServer
);

router.post(
  "/servers/:id/release",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.releaseServer
);

router.put(
  "/servers/:id/status",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateStatus
);

router.put(
  "/servers/:id/notes",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateNotes
);

router.delete(
  "/servers/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteServer
);

// ============================================
// ЧЕК-ЛИСТЫ СЕРВЕРА
// ============================================

router.put(
  "/servers/:serverId/checklist/:checklistId",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.toggleChecklistItem
);

// ============================================
// ПАРТИИ (BATCHES)
// ============================================

router.get(
  "/batches",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getBatches
);

router.get(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getBatchById
);

router.post(
  "/batches",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.createBatch
);

router.put(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.updateBatch
);

router.delete(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteBatch
);

router.post(
  "/batches/:id/assign",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.assignServersToBatch
);

router.post(
  "/batches/:id/remove",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.removeServersFromBatch
);

// ============================================
// ИСТОРИЯ (AUDIT TRAIL)
// ============================================

router.get(
  "/history",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getHistory
);

// ============================================
// ШАБЛОНЫ ЧЕК-ЛИСТОВ
// ============================================

router.get(
  "/checklists/templates",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getChecklistTemplates
);

router.post(
  "/checklists/templates",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.createChecklistTemplate
);

router.put(
  "/checklists/templates/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.updateChecklistTemplate
);

router.delete(
  "/checklists/templates/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteChecklistTemplate
);

// ============================================
// АРХИВ
// ============================================

router.get(
  "/archive",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getArchivedServers
);

router.post(
  "/servers/:id/unarchive",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.unarchiveServer
);

router.post(
  "/servers/:id/archive",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.archiveServer
);

// ============================================
// СЕРИЙНЫЙ НОМЕР АПК
// ============================================

router.put(
  "/servers/:id/apk-serial",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateApkSerialNumber
);

// ============================================
// ФАЙЛЫ
// ============================================

router.post(
  "/servers/:serverId/checklist/:checklistId/file",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.uploadChecklistFile
);

router.get(
  "/servers/:serverId/files",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServerFiles
);

router.get(
  "/files/:fileId",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.downloadFile
);

// ============================================
// ГЕНЕРАЦИЯ ПАСПОРТА
// ============================================

router.get(
  "/servers/:id/passport",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.generatePassport
);

// ============================================
// МОНИТОРИНГ
// ============================================

router.get(
  "/monitoring/stats",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getMonitoringStats
);

router.get(
  "/monitoring/status",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getCachedStatus
);

router.get(
  "/monitoring/ping/:id",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.pingServer
);

router.post(
  "/monitoring/ping-all",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.pingAllServers
);

router.get(
  "/monitoring/servers/online",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getOnlineServers
);

router.get(
  "/monitoring/servers/offline",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getOfflineServers
);

router.post(
  "/monitoring/clear-cache",
  ...protect,
  checkAbility("beryll.manage"),
  DefectMonitoringController.clearCache
);

// ============================================
// ДЕФЕКТЫ (Учёт брака)
// ============================================

router.get(
  "/servers/:serverId/defects",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getServerDefects
);

router.get(
  "/defects/stats",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getDefectStats
);

router.post(
  "/servers/:serverId/defects",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.createDefect
);

router.get(
  "/defects/:id",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.getDefectById
);

router.put(
  "/defects/:id",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.updateDefect
);

router.delete(
  "/defects/:id",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.deleteDefect
);

router.post(
  "/defects/:id/resolve",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.resolveDefect
);

router.post(
  "/defects/:id/files",
  ...protect,
  checkAbility("beryll.work"),
  defectUpload.single("file"),
  DefectMonitoringController.uploadDefectFile
);

router.get(
  "/defect-files/:id/download",
  ...protect,
  checkAbility("beryll.view"),
  DefectMonitoringController.downloadDefectFile
);

router.delete(
  "/defect-files/:id",
  ...protect,
  checkAbility("beryll.work"),
  DefectMonitoringController.deleteDefectFile
);

// ============================================
// КОМПЛЕКТУЮЩИЕ (BMC)
// ============================================

router.get(
  "/servers/:id/bmc/check",
  ...protect,
  checkAbility("beryll.view"),
  ComponentsController.checkBMC
);

router.post(
  "/servers/:id/components/fetch",
  ...protect,
  checkAbility("beryll.work"),
  ComponentsController.fetchComponents
);

router.get(
  "/servers/:id/components",
  ...protect,
  checkAbility("beryll.view"),
  ComponentsController.getComponents
);

router.delete(
  "/servers/:id/components",
  ...protect,
  checkAbility("beryll.manage"),
  ComponentsController.deleteComponents
);

router.get(
  "/components/:id",
  ...protect,
  checkAbility("beryll.view"),
  ComponentsController.getComponentById
);

router.put(
  "/servers/:id/bmc-address",
  ...protect,
  checkAbility("beryll.work"),
  ComponentsController.updateBMCAddress
);

module.exports = router;