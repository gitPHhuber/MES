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
const validateRequest = require("../middleware/validateRequest");
const {
  boxFiltersSchema,
  createBoxSchema,
  createBoxesBatchSchema,
  updateBatchSchema,
  movementSchema,
  movementBatchSchema,
  movementFiltersSchema,
  boxIdParamSchema,
  idsBodySchema,
  genericBodySchema,
} = require("../schemas/warehouse/box.schema");

const protect = [authMiddleware, syncUserMiddleware];

// --- Поставки ---
// Создавать поставки может тот, кто управляет складом
router.post(
  "/supplies",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: genericBodySchema }),
  SupplyController.createSupply
);
router.get("/supplies", ...protect, checkAbility("warehouse.view"), SupplyController.getSupplies);
router.get("/supplies/:id/export-csv", ...protect, checkAbility("warehouse.view"), SupplyController.exportCsv);

// --- Коробки (приёмка и просмотр) ---
// Создавать коробки - управление складом
router.post(
  "/boxes",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: createBoxSchema }),
  BoxController.createSingleBox
);
router.post(
  "/boxes/batch",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: createBoxesBatchSchema }),
  BoxController.createBoxesBatch
);

// Массовое обновление (Реестр этикеток)
router.put(
  "/boxes/batch",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: updateBatchSchema }),
  BoxController.updateBatch
);

// Смотреть коробки могут многие (ОТК, Нач. пр., Кладовщик)
router.get(
  "/boxes",
  ...protect,
  checkAbility("warehouse.view"),
  validateRequest({ query: boxFiltersSchema }),
  BoxController.getBoxes
);
router.get(
  "/boxes/:id",
  ...protect,
  checkAbility("warehouse.view"),
  validateRequest({ params: boxIdParamSchema }),
  BoxController.getBoxById
);
router.get(
  "/boxes/by-qr/:qr",
  ...protect,
  checkAbility("warehouse.view"),
  BoxController.getBoxByQr
);

// Экспорт и печать
router.post(
  "/boxes/export",
  ...protect,
  checkAbility("warehouse.view"),
  validateRequest({ body: idsBodySchema }),
  BoxController.exportCsv
);
router.post(
  "/boxes/print-pdf",
  ...protect,
  checkAbility("labels.print"),
  validateRequest({ body: idsBodySchema }),
  BoxController.printLabelsPdf
);

// Печать спец-этикетки (Видеопередатчики)
router.post(
  "/boxes/print-special",
  ...protect,
  checkAbility("labels.print"),
  validateRequest({ body: idsBodySchema }),
  BoxController.printSpecialLabel
);

// --- История печати (НОВЫЙ РОУТ) ---
router.get("/print-history", ...protect, checkAbility("labels.print"), HistoryController.getPrintHistory);

// --- Движения по складу ---
router.post(
  "/movements",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: movementSchema }),
  MovementController.moveSingle
);
router.post(
  "/movements/batch",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: movementBatchSchema }),
  MovementController.moveBatch
);
router.get(
  "/movements",
  ...protect,
  checkAbility("warehouse.view"),
  validateRequest({ query: movementFiltersSchema }),
  MovementController.getMovements
);

// --- Остатки / баланс ---
router.get("/balance", ...protect, checkAbility("warehouse.view"), MovementController.getBalance);

// --- Документы ---
router.post(
  "/documents",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: genericBodySchema }),
  DocumentController.createDocument
);
router.get("/documents", ...protect, checkAbility("warehouse.view"), DocumentController.getDocuments);

// --- Аналитика и Рейтинги ---
router.get("/analytics/dashboard", ...protect, checkAbility("analytics.view"), AnalyticsController.getDashboardStats);
// Рейтинг видят все, кто имеет доступ к складу 
router.get("/rankings", ...protect, checkAbility("analytics.view"), RankingsController.getStats);

// --- Лимиты и алерты ---
router.get("/alerts", ...protect, checkAbility("warehouse.view"), AlertsController.getAlerts);
router.get("/limits", ...protect, checkAbility("warehouse.view"), AlertsController.getAllLimits);
router.post(
  "/limits",
  ...protect,
  checkAbility("warehouse.manage"),
  validateRequest({ body: genericBodySchema }),
  AlertsController.setLimit
);
// Детальная статистика пользователя
router.get("/rankings/user/:userId", ...protect, RankingsController.getUserDetails);


module.exports = router;
