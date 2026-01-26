const Router = require("express");
const router = new Router();

const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const BoxController = require("../controllers/warehouse/BoxController");
const MovementController = require("../controllers/warehouse/MovementController");
const SupplyController = require("../controllers/warehouse/SupplyController");
const DocumentController = require("../controllers/warehouse/DocumentController");
const AnalyticsController = require("../controllers/warehouse/AnalyticsController");
const AlertsController = require("../controllers/warehouse/AlertsController");
const HistoryController = require("../controllers/warehouse/HistoryController");
const LabelTemplatesController = require("../controllers/warehouse/LabelTemplatesController");
const RankingsController = require("../controllers/RankingsController");
const validateRequest = require("../middleware/validateRequest");
const { rankingsQuerySchema } = require("../schemas/warehouse/rankings.schema");

const protect = [authMiddleware, syncUserMiddleware];

// ===== Supplies =====
router.post("/supplies", ...protect, checkAbility("warehouse.manage"), SupplyController.createSupply);
router.get("/supplies", ...protect, checkAbility("warehouse.view"), SupplyController.getSupplies);
router.get("/supplies/:id/export-csv", ...protect, checkAbility("warehouse.view"), SupplyController.exportCsv);

// ===== Boxes =====
router.post("/boxes/single", ...protect, checkAbility("warehouse.manage"), BoxController.createSingleBox);
router.post("/boxes/batch", ...protect, checkAbility("warehouse.manage"), BoxController.createBoxesBatch);
router.put("/boxes/batch", ...protect, checkAbility("warehouse.manage"), BoxController.updateBatch);
router.get("/boxes", ...protect, checkAbility("warehouse.view"), BoxController.getBoxes);
router.get("/boxes/by-qr/:qr", ...protect, checkAbility("warehouse.view"), BoxController.getBoxByQr);
router.get("/boxes/:id", ...protect, checkAbility("warehouse.view"), BoxController.getBoxById);
router.post("/boxes/export", ...protect, checkAbility("warehouse.view"), BoxController.exportCsv);
router.post("/boxes/print-pdf", ...protect, checkAbility("labels.print"), BoxController.printLabelsPdf);
router.post("/boxes/print-special", ...protect, checkAbility("labels.print"), BoxController.printSpecialLabel);
router.post("/boxes/:id/reserve", ...protect, checkAbility("warehouse.manage"), BoxController.reserveBox);
router.post("/boxes/:id/release", ...protect, checkAbility("warehouse.manage"), BoxController.releaseBox);
router.post("/boxes/:id/confirm", ...protect, checkAbility("warehouse.manage"), BoxController.confirmBox);

// ===== Movements =====
router.post("/movements", ...protect, checkAbility("warehouse.manage"), MovementController.moveSingle);
router.post("/movements/batch", ...protect, checkAbility("warehouse.manage"), MovementController.moveBatch);
router.get("/movements", ...protect, checkAbility("warehouse.view"), MovementController.getMovements);

// ===== Balance & Analytics =====
router.get("/balance", ...protect, checkAbility("warehouse.view"), MovementController.getBalance);
router.get("/analytics/dashboard", ...protect, checkAbility("analytics.view"), AnalyticsController.getDashboardStats);

// ===== Alerts & Limits =====
router.get("/alerts", ...protect, checkAbility("warehouse.view"), AlertsController.getAlerts);
router.get("/limits", ...protect, checkAbility("warehouse.view"), AlertsController.getAllLimits);
router.post("/limits", ...protect, checkAbility("warehouse.manage"), AlertsController.setLimit);

// ===== Documents =====
router.get("/documents", ...protect, checkAbility("warehouse.view"), DocumentController.getDocuments);
router.post("/documents", ...protect, checkAbility("warehouse.manage"), DocumentController.createDocument);

// ===== Print History =====
router.get("/print-history", ...protect, checkAbility("labels.print"), HistoryController.getPrintHistory);

// ===== Label Templates =====
router.get("/label-templates", ...protect, checkAbility("labels.print"), LabelTemplatesController.getAll);
router.post("/label-templates", ...protect, checkAbility("labels.print"), LabelTemplatesController.create);
router.delete("/label-templates/:id", ...protect, checkAbility("labels.print"), LabelTemplatesController.remove);

// ===== Rankings =====
router.get(
  "/rankings",
  ...protect,
  checkAbility("analytics.view"),
  validateRequest({ query: rankingsQuerySchema }),
  RankingsController.getStats
);
router.get("/rankings/user/:userId", ...protect, checkAbility("analytics.view"), RankingsController.getUserDetails);
router.get("/rankings/history/:userId", ...protect, checkAbility("analytics.view"), RankingsController.getUserHistory);

module.exports = router;
