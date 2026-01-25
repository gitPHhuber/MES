const Router = require("express");
const router = new Router();
const multer = require("multer"); // <--- Добавлено для дефектов
const path = require("path");     // <--- Добавлено для дефектов

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
    // Папка должна существовать или создаваться автоматически (см. FileController или DefectMonitoringController)
    cb(null, path.join(__dirname, "../uploads/beryll/defects"));
  },
  filename: (req, file, cb) => {
    // Уникальное имя: TIMESTAMP-RANDOM-ORIGINAL_NAME
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname);
  }
});
const defectUpload = multer({ 
  storage: defectStorage, 
  limits: { fileSize: 10 * 1024 * 1024 } // Лимит 10 МБ
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

// Получить все серверы
router.get(
  "/servers",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServers
);

// Получить статистику
router.get(
  "/stats",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getStats
);

// Получить аналитику
router.get(
  "/analytics",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getAnalytics
);

// Получить один сервер
router.get(
  "/servers/:id(\\d+)",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServerById
);

// Взять в работу
router.post(
  "/servers/:id(\\d+)/take",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.takeServer
);

// Освободить (снять с себя)
router.post(
  "/servers/:id(\\d+)/release",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.releaseServer
);

// Изменить статус
router.put(
  "/servers/:id(\\d+)/status",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateStatus
);

// Обновить примечания
router.put(
  "/servers/:id(\\d+)/notes",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateNotes
);

// Удалить сервер (только админ)
router.delete(
  "/servers/:id(\\d+)",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteServer
);

// ============================================
// ЧЕК-ЛИСТЫ СЕРВЕРА
// ============================================

// Переключить пункт чек-листа
router.put(
  "/servers/:serverId(\\d+)/checklist/:checklistId",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.toggleChecklistItem
);

// ============================================
// ПАРТИИ (BATCHES)
// ============================================

// Получить все партии
router.get(
  "/batches",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getBatches
);

// Получить одну партию
router.get(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getBatchById
);

// Создать партию
router.post(
  "/batches",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.createBatch
);

// Обновить партию
router.put(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.updateBatch
);

// Удалить партию
router.delete(
  "/batches/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteBatch
);

// Привязать серверы к партии
router.post(
  "/batches/:id/assign",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.assignServersToBatch
);

// Отвязать серверы от партии
router.post(
  "/batches/:id/remove",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.removeServersFromBatch
);

// ============================================
// ИСТОРИЯ (AUDIT TRAIL)
// ============================================

// Получить историю
router.get(
  "/history",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getHistory
);

// ============================================
// ШАБЛОНЫ ЧЕК-ЛИСТОВ
// ============================================

// Получить все шаблоны
router.get(
  "/checklists/templates",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getChecklistTemplates
);

// Создать шаблон
router.post(
  "/checklists/templates",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.createChecklistTemplate
);

// Обновить шаблон
router.put(
  "/checklists/templates/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.updateChecklistTemplate
);

// Удалить/деактивировать шаблон
router.delete(
  "/checklists/templates/:id",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.deleteChecklistTemplate
);

// ============================================
// АРХИВ
// ============================================

// Получить архивные серверы
router.get(
  "/archive",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getArchivedServers
);

// Восстановить сервер из архива
router.post(
  "/servers/:id(\\d+)/unarchive",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.unarchiveServer
);

// Перенести сервер в архив
router.post(
  "/servers/:id(\\d+)/archive",
  ...protect,
  checkAbility("beryll.manage"),
  beryllController.archiveServer
);

// ============================================
// СЕРИЙНЫЙ НОМЕР АПК
// ============================================

// Присвоить серийный номер АПК
router.put(
  "/servers/:id(\\d+)/apk-serial",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.updateApkSerialNumber
);

// ============================================
// ФАЙЛЫ
// ============================================

// Загрузить файл к пункту чек-листа
router.post(
  "/servers/:serverId(\\d+)/checklist/:checklistId/file",
  ...protect,
  checkAbility("beryll.work"),
  beryllController.uploadChecklistFile
);

// Получить все файлы сервера
router.get(
  "/servers/:serverId(\\d+)/files",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.getServerFiles
);

// Скачать файл
router.get(
  "/files/:fileId",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.downloadFile
);

// ============================================
// ГЕНЕРАЦИЯ ПАСПОРТА
// ============================================

// Сгенерировать Excel паспорт
router.get(
  "/servers/:id(\\d+)/passport",
  ...protect,
  checkAbility("beryll.view"),
  beryllController.generatePassport
);

// ============================================
// МОНИТОРИНГ
// ============================================

router.get("/monitoring/stats", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getMonitoringStats);
router.get("/monitoring/status", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getCachedStatus);
router.get("/monitoring/ping/:id", ...protect, checkAbility("beryll.view"), DefectMonitoringController.pingServer);
router.post("/monitoring/ping-all", ...protect, checkAbility("beryll.work"), DefectMonitoringController.pingAllServers);
router.get("/monitoring/servers/online", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getOnlineServers);
router.get("/monitoring/servers/offline", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getOfflineServers);
router.post("/monitoring/clear-cache", ...protect, checkAbility("beryll.manage"), DefectMonitoringController.clearCache);

// ============================================
// ДЕФЕКТЫ (Учёт брака)
// ============================================

// Получить дефекты конкретного сервера
router.get("/servers/:serverId(\\d+)/defects", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getServerDefects);
// Статистика по дефектам
router.get("/defects/stats", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getDefectStats);
// Создать дефект
router.post("/servers/:serverId(\\d+)/defects", ...protect, checkAbility("beryll.work"), DefectMonitoringController.createDefect);
// Получить дефект по ID
router.get("/defects/:id", ...protect, checkAbility("beryll.view"), DefectMonitoringController.getDefectById);
// Обновить дефект (текст, категорию)
router.put("/defects/:id", ...protect, checkAbility("beryll.work"), DefectMonitoringController.updateDefect);
// Удалить дефект
router.delete("/defects/:id", ...protect, checkAbility("beryll.work"), DefectMonitoringController.deleteDefect);
// Отметить дефект исправленным (RESOLVED)
router.post("/defects/:id/resolve", ...protect, checkAbility("beryll.work"), DefectMonitoringController.resolveDefect);
// Загрузить файл к дефекту
router.post("/defects/:id/files", ...protect, checkAbility("beryll.work"), defectUpload.single("file"), DefectMonitoringController.uploadDefectFile); // Исправлено имя метода
// Скачать файл дефекта
router.get("/defect-files/:id/download", ...protect, checkAbility("beryll.view"), DefectMonitoringController.downloadDefectFile); // Исправлено имя метода
// Удалить файл дефекта
router.delete("/defect-files/:id", ...protect, checkAbility("beryll.work"), DefectMonitoringController.deleteDefectFile); // Исправлено имя метода
// === КОМПЛЕКТУЮЩИЕ (BMC) ===
router.get("/servers/:id(\\d+)/bmc/check", ...protect, checkAbility("beryll.view"), ComponentsController.checkBMC);
router.post("/servers/:id(\\d+)/components/fetch", ...protect, checkAbility("beryll.work"), ComponentsController.fetchComponents);
router.get("/servers/:id(\\d+)/components", ...protect, checkAbility("beryll.view"), ComponentsController.getComponents);
router.delete("/servers/:id(\\d+)/components", ...protect, checkAbility("beryll.manage"), ComponentsController.deleteComponents);
router.get("/components/:id", ...protect, checkAbility("beryll.view"), ComponentsController.getComponentById);
router.put("/servers/:id(\\d+)/bmc-address", ...protect, checkAbility("beryll.work"), ComponentsController.updateBMCAddress);

module.exports = router;