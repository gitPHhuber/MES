const Router = require("express");
const router = new Router();

const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");
const validateRequest = require("../middleware/validateRequest");

const RackController = require("../controllers/beryll/controllers/RackController");
const ClusterController = require("../controllers/beryll/controllers/ClusterController");
const DefectRecordController = require("../controllers/beryll/controllers/DefectRecordController");
const YadroController = require("../controllers/beryll/controllers/YadroController");
const { defectFiltersSchema } = require("../schemas/beryll/defect.schema");

const protect = [authMiddleware, syncUserMiddleware];

// ============================================
// СТОЙКИ (RACKS)
// ============================================

router.get("/racks", ...protect, checkAbility("beryll.view"), RackController.getAllRacks);
router.get("/racks/:id", ...protect, checkAbility("beryll.view"), RackController.getRackById);
router.post("/racks", ...protect, checkAbility("beryll.manage"), RackController.createRack);
router.put("/racks/:id", ...protect, checkAbility("beryll.manage"), RackController.updateRack);
router.delete("/racks/:id", ...protect, checkAbility("beryll.manage"), RackController.deleteRack);
router.get("/racks/:id/history", ...protect, checkAbility("beryll.view"), RackController.getRackHistory);
router.get("/racks/:rackId/free-units", ...protect, checkAbility("beryll.view"), RackController.getFreeUnits);
router.get("/racks/:rackId/units/:unitNumber", ...protect, checkAbility("beryll.view"), RackController.getUnit);
router.post("/racks/:rackId/units/:unitNumber/install", ...protect, checkAbility("beryll.work"), RackController.installServer);
router.post("/racks/:rackId/units/:unitNumber/remove", ...protect, checkAbility("beryll.work"), RackController.removeServer);
router.put("/rack-units/:unitId", ...protect, checkAbility("beryll.work"), RackController.updateUnit);
router.post("/rack-units/move", ...protect, checkAbility("beryll.work"), RackController.moveServer);
router.get("/servers/:serverId(\\d+)/rack-location", ...protect, checkAbility("beryll.view"), RackController.findServerInRacks);

// ============================================
// КОМПЛЕКТЫ / ОТГРУЗКИ (SHIPMENTS)
// ============================================

router.get("/shipments", ...protect, checkAbility("beryll.view"), ClusterController.getAllShipments);
router.get("/shipments/:id", ...protect, checkAbility("beryll.view"), ClusterController.getShipmentById);
router.post("/shipments", ...protect, checkAbility("beryll.manage"), ClusterController.createShipment);
router.put("/shipments/:id", ...protect, checkAbility("beryll.manage"), ClusterController.updateShipment);
router.delete("/shipments/:id", ...protect, checkAbility("beryll.manage"), ClusterController.deleteShipment);
router.get("/shipments/:id/history", ...protect, checkAbility("beryll.view"), ClusterController.getShipmentHistory);

// ============================================
// КЛАСТЕРЫ (CLUSTERS)
// ============================================

router.get("/clusters", ...protect, checkAbility("beryll.view"), ClusterController.getAllClusters);
router.get("/clusters/:id", ...protect, checkAbility("beryll.view"), ClusterController.getClusterById);
router.post("/clusters", ...protect, checkAbility("beryll.manage"), ClusterController.createCluster);
router.put("/clusters/:id", ...protect, checkAbility("beryll.manage"), ClusterController.updateCluster);
router.delete("/clusters/:id", ...protect, checkAbility("beryll.manage"), ClusterController.deleteCluster);
router.get("/clusters/:id/history", ...protect, checkAbility("beryll.view"), ClusterController.getClusterHistory);
router.post("/clusters/:clusterId/servers", ...protect, checkAbility("beryll.work"), ClusterController.addServerToCluster);
router.post("/clusters/:clusterId/servers/bulk", ...protect, checkAbility("beryll.work"), ClusterController.addServersToCluster);
router.delete("/clusters/:clusterId/servers/:serverId(\\d+)", ...protect, checkAbility("beryll.work"), ClusterController.removeServerFromCluster);
router.put("/cluster-servers/:id", ...protect, checkAbility("beryll.work"), ClusterController.updateClusterServer);
router.get("/servers/unassigned", ...protect, checkAbility("beryll.view"), ClusterController.getUnassignedServers);
router.get("/servers/:serverId(\\d+)/clusters", ...protect, checkAbility("beryll.view"), ClusterController.getServerClusters);

// ============================================
// УЧЁТ БРАКА (DEFECT RECORDS)
// ============================================

router.get("/defect-records/part-types", ...protect, checkAbility("beryll.view"), DefectRecordController.getRepairPartTypes);
router.get("/defect-records/statuses", ...protect, checkAbility("beryll.view"), DefectRecordController.getStatuses);
router.get("/defect-records/stats", ...protect, checkAbility("beryll.view"), DefectRecordController.getStats);
router.get(
  "/defect-records",
  ...protect,
  checkAbility("beryll.view"),
  validateRequest({ query: defectFiltersSchema }),
  DefectRecordController.getAll
);
router.get("/defect-records/:id", ...protect, checkAbility("beryll.view"), DefectRecordController.getById);
router.get("/defect-records/:id/available-actions", ...protect, checkAbility("beryll.view"), DefectRecordController.getAvailableActions);
router.get("/defect-records/:id/history", ...protect, checkAbility("beryll.view"), DefectRecordController.getHistory);
router.post("/defect-records", ...protect, checkAbility("beryll.work"), DefectRecordController.create);
router.put("/defect-records/:id", ...protect, checkAbility("beryll.work"), DefectRecordController.update);
router.delete("/defect-records/:id", ...protect, checkAbility("beryll.work"), DefectRecordController.delete);
router.put("/defect-records/:id/status", ...protect, checkAbility("beryll.work"), DefectRecordController.updateStatus);
router.post("/defect-records/:id/mark-repeated", ...protect, checkAbility("beryll.work"), DefectRecordController.markRepeated);
router.post("/defect-records/:id/start-diagnosis", ...protect, checkAbility("beryll.work"), DefectRecordController.startDiagnosis);
router.post("/defect-records/:id/complete-diagnosis", ...protect, checkAbility("beryll.work"), DefectRecordController.completeDiagnosis);
router.post("/defect-records/:id/waiting-parts", ...protect, checkAbility("beryll.work"), DefectRecordController.setWaitingParts);
router.post("/defect-records/:id/reserve-component", ...protect, checkAbility("beryll.work"), DefectRecordController.reserveComponent);
router.post("/defect-records/:id/start-repair", ...protect, checkAbility("beryll.work"), DefectRecordController.startRepair);
router.post("/defect-records/:id/perform-replacement", ...protect, checkAbility("beryll.work"), DefectRecordController.performReplacement);
router.post("/defect-records/:id/send-to-yadro", ...protect, checkAbility("beryll.work"), DefectRecordController.sendToYadro);
router.post("/defect-records/:id/return-from-yadro", ...protect, checkAbility("beryll.work"), DefectRecordController.returnFromYadro);
router.post("/defect-records/:id/issue-substitute", ...protect, checkAbility("beryll.work"), DefectRecordController.issueSubstitute);
router.post("/defect-records/:id/return-substitute", ...protect, checkAbility("beryll.work"), DefectRecordController.returnSubstitute);
router.post("/defect-records/:id/resolve", ...protect, checkAbility("beryll.work"), DefectRecordController.resolve);
router.post("/defect-records/:id/files", ...protect, checkAbility("beryll.work"), DefectRecordController.uploadFile);
router.get("/defect-record-files/:fileId", ...protect, checkAbility("beryll.view"), DefectRecordController.downloadFile);
router.delete("/defect-record-files/:fileId", ...protect, checkAbility("beryll.work"), DefectRecordController.deleteFile);

// ============================================
// ЖУРНАЛ ЗАЯВОК ЯДРО
// ============================================

router.get("/yadro/logs", ...protect, checkAbility("beryll.view"), YadroController.getAllLogs);
router.get("/yadro/logs/open", ...protect, checkAbility("beryll.view"), YadroController.getOpenLogs);
router.get("/yadro/logs/stats", ...protect, checkAbility("beryll.view"), YadroController.getLogStats);
router.get("/yadro/logs/:id", ...protect, checkAbility("beryll.view"), YadroController.getLogById);
router.post("/yadro/logs", ...protect, checkAbility("beryll.work"), YadroController.createLog);
router.put("/yadro/logs/:id", ...protect, checkAbility("beryll.work"), YadroController.updateLog);
router.put("/yadro/logs/:id/status", ...protect, checkAbility("beryll.work"), YadroController.updateLogStatus);
router.delete("/yadro/logs/:id", ...protect, checkAbility("beryll.work"), YadroController.deleteLog);
router.post("/yadro/logs/:id/link-server", ...protect, checkAbility("beryll.work"), YadroController.linkLogToServer);
router.get("/yadro/request-types", ...protect, checkAbility("beryll.view"), YadroController.getRequestTypes);
router.get("/yadro/log-statuses", ...protect, checkAbility("beryll.view"), YadroController.getLogStatuses);

// ============================================
// ПОДМЕННЫЕ СЕРВЕРЫ
// ============================================

router.get("/substitutes", ...protect, checkAbility("beryll.view"), YadroController.getAllSubstitutes);
router.get("/substitutes/available", ...protect, checkAbility("beryll.view"), YadroController.getAvailableSubstitutes);
router.get("/substitutes/stats", ...protect, checkAbility("beryll.view"), YadroController.getSubstituteStats);
router.post("/substitutes", ...protect, checkAbility("beryll.manage"), YadroController.addToSubstitutePool);
router.delete("/substitutes/:id", ...protect, checkAbility("beryll.manage"), YadroController.removeFromSubstitutePool);
router.post("/substitutes/:id/issue", ...protect, checkAbility("beryll.work"), YadroController.issueSubstitute);
router.post("/substitutes/:id/return", ...protect, checkAbility("beryll.work"), YadroController.returnSubstitute);
router.post("/substitutes/:id/maintenance", ...protect, checkAbility("beryll.work"), YadroController.setSubstituteMaintenance);

// ============================================
// SLA КОНФИГУРАЦИЯ
// ============================================

router.get("/sla", ...protect, checkAbility("beryll.view"), YadroController.getAllSlaConfigs);
router.post("/sla", ...protect, checkAbility("beryll.manage"), YadroController.createSlaConfig);
router.put("/sla/:id", ...protect, checkAbility("beryll.manage"), YadroController.updateSlaConfig);
router.delete("/sla/:id", ...protect, checkAbility("beryll.manage"), YadroController.deleteSlaConfig);

// ============================================
// АЛИАСЫ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

router.get("/aliases", ...protect, checkAbility("beryll.view"), YadroController.getAllAliases);
router.get("/aliases/find/:alias", ...protect, checkAbility("beryll.view"), YadroController.findUserByAlias);
router.post("/aliases", ...protect, checkAbility("beryll.manage"), YadroController.createAlias);
router.delete("/aliases/:id", ...protect, checkAbility("beryll.manage"), YadroController.deleteAlias);
router.post("/aliases/generate/:userId", ...protect, checkAbility("beryll.manage"), YadroController.generateAliasesForUser);

module.exports = router;
