const Router = require("express");
const router = new Router();

const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const SupplyController = require("../controllers/warehouse/SupplyController");
const BoxController = require("../controllers/warehouse/BoxController");
const MovementController = require("../controllers/warehouse/MovementController");
const DocumentController = require("../controllers/warehouse/DocumentController");
const AnalyticsController = require("../controllers/warehouse/AnalyticsController");
const AlertsController = require("../controllers/warehouse/AlertsController");
const RankingsController = require("../controllers/RankingsController");
const HistoryController = require("../controllers/warehouse/HistoryController"); // <--- Импорт контроллера истории

const protect = [authMiddleware, syncUserMiddleware];

// --- Поставки ---
// Создавать поставки может тот, кто управляет складом
router.post("/supplies", ...protect, checkAbility("warehouse.manage"), SupplyController.createSupply);
router.get("/supplies", ...protect, checkAbility("warehouse.view"), SupplyController.getSupplies);
router.get("/supplies/:id/export-csv", ...protect, checkAbility("warehouse.view"), SupplyController.exportCsv);

// --- Коробки (приёмка и просмотр) ---
// Создавать коробки - управление складом
router.post("/boxes", ...protect, checkAbility("warehouse.manage"), BoxController.createSingleBox);
router.post("/boxes/batch", ...protect, checkAbility("warehouse.manage"), BoxController.createBoxesBatch);

// Массовое обновление (Реестр этикеток)
router.put("/boxes/batch", ...protect, checkAbility("warehouse.manage"), BoxController.updateBatch);

// Смотреть коробки могут многие (ОТК, Нач. пр., Кладовщик)
router.get("/boxes", ...protect, checkAbility("warehouse.view"), BoxController.getBoxes);
router.get("/boxes/:id", ...protect, checkAbility("warehouse.view"), BoxController.getBoxById);
router.get("/boxes/by-qr/:qr", ...protect, checkAbility("warehouse.view"), BoxController.getBoxByQr);
router.post("/boxes/:id/reserve", ...protect, checkAbility("warehouse.manage"), BoxController.reserveBox);
router.post("/boxes/:id/release", ...protect, checkAbility("warehouse.manage"), BoxController.releaseBox);
router.post("/boxes/:id/confirm", ...protect, checkAbility("warehouse.manage"), BoxController.confirmBox);

// Экспорт и печать
router.post("/boxes/export", ...protect, checkAbility("warehouse.view"), BoxController.exportCsv);
router.post("/boxes/print-pdf", ...protect, checkAbility("labels.print"), BoxController.printLabelsPdf);

// Печать спец-этикетки (Видеопередатчики)
router.post("/boxes/print-special", ...protect, checkAbility("labels.print"), BoxController.printSpecialLabel);

// --- История печати (НОВЫЙ РОУТ) ---
router.get("/print-history", ...protect, checkAbility("labels.print"), HistoryController.getPrintHistory);

// --- Движения по складу ---
router.post("/movements", ...protect, checkAbility("warehouse.manage"), MovementController.moveSingle);
router.post("/movements/batch", ...protect, checkAbility("warehouse.manage"), MovementController.moveBatch);
router.get("/movements", ...protect, checkAbility("warehouse.view"), MovementController.getMovements);

// --- Остатки / баланс ---
router.get("/balance", ...protect, checkAbility("warehouse.view"), MovementController.getBalance);

// --- Документы ---
router.post("/documents", ...protect, checkAbility("warehouse.manage"), DocumentController.createDocument);
router.get("/documents", ...protect, checkAbility("warehouse.view"), DocumentController.getDocuments);

// --- Аналитика и Рейтинги ---
router.get("/analytics/dashboard", ...protect, checkAbility("analytics.view"), AnalyticsController.getDashboardStats);
// Рейтинг видят все, кто имеет доступ к складу 
router.get("/rankings", ...protect, checkAbility("analytics.view"), RankingsController.getStats);

// --- Лимиты и алерты ---
router.get("/alerts", ...protect, checkAbility("warehouse.view"), AlertsController.getAlerts);
router.get("/limits", ...protect, checkAbility("warehouse.view"), AlertsController.getAllLimits);
router.post("/limits", ...protect, checkAbility("warehouse.manage"), AlertsController.setLimit);
// Детальная статистика пользователя
router.get("/rankings/user/:userId", ...protect, RankingsController.getUserDetails);


module.exports = router;
