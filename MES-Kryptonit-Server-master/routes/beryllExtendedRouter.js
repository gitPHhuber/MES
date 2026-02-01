const Router = require("express");
const router = new Router();

const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const RackController = require("../controllers/beryll/controllers/RackController");
const ClusterController = require("../controllers/beryll/controllers/ClusterController");
const DefectRecordController = require("../controllers/beryll/controllers/DefectRecordController");
const YadroController = require("../controllers/beryll/controllers/YadroController");
const DefectExportController = require("../controllers/beryll/controllers/DefectExportController");
const CatalogExtendedController = require("../controllers/beryll/CatalogExtendedController");
const ComponentInventoryController = require("../controllers/beryll/controllers/ComponentInventoryController");
const {
  addComponent,
  addComponentsBatch,
  updateComponent,
  updateSerials,
  replaceComponent,
  deleteComponent,
  searchComponent,
  scanYadroSerial,
  checkSerialUniqueness,
  getComponentHistory,
  getServerComponentsHistory
} = require("../controllers/beryll/ComponentsExtendedController");

const protect = [authMiddleware, syncUserMiddleware];

// ============================================
// СЕРВЕРЫ - РУЧНОЕ СОЗДАНИЕ
// ============================================

// Создать сервер вручную (без DHCP, но с опциональным поиском)
router.post("/servers/create", ...protect, checkAbility("beryll.work"), RackController.createServer);

// Создать сервер и сразу разместить в стойку (с поддержкой unitData)
router.post("/servers/create-and-place", ...protect, checkAbility("beryll.work"), RackController.createAndPlaceServer);

// Поиск сервера в DHCP по серийнику/hostname
router.get("/dhcp/find-server/:serial", ...protect, checkAbility("beryll.view"), RackController.findServerInDhcp);

// ============================================
// СТОЙКИ (RACKS) - БАЗОВЫЕ ОПЕРАЦИИ
// ============================================

router.get("/racks", ...protect, checkAbility("beryll.view"), RackController.getAllRacks);
router.get("/racks/:id", ...protect, checkAbility("beryll.view"), RackController.getRackById);
router.post("/racks", ...protect, checkAbility("beryll.manage"), RackController.createRack);
router.put("/racks/:id", ...protect, checkAbility("beryll.manage"), RackController.updateRack);
router.delete("/racks/:id", ...protect, checkAbility("beryll.manage"), RackController.deleteRack);
router.get("/racks/:id/history", ...protect, checkAbility("beryll.view"), RackController.getRackHistory);

// ============================================
// СТОЙКИ - РАСШИРЕННЫЕ ОПЕРАЦИИ
// ============================================

// Получить сводку по стойке (статистика по статусам, кто разместил и т.д.)
router.get("/racks/:rackId/summary", ...protect, checkAbility("beryll.view"), RackController.getRackSummary);

// Синхронизировать стойку с DHCP - найти IP для всех серверов
router.post("/racks/:rackId/sync-dhcp", ...protect, checkAbility("beryll.work"), RackController.syncWithDhcp);

// ============================================
// ЮНИТЫ - БАЗОВЫЕ ОПЕРАЦИИ
// ============================================

router.get("/racks/:rackId/free-units", ...protect, checkAbility("beryll.view"), RackController.getFreeUnits);
router.get("/racks/:rackId/units/:unitNumber", ...protect, checkAbility("beryll.view"), RackController.getUnit);
router.put("/rack-units/:unitId", ...protect, checkAbility("beryll.work"), RackController.updateUnit);
router.post("/rack-units/move", ...protect, checkAbility("beryll.work"), RackController.moveServer);

// ============================================
// ЮНИТЫ - РАСШИРЕННЫЕ ОПЕРАЦИИ
// ============================================

// Получить юниты по статусу сервера (IN_WORK, DEFECT, DONE и т.д.)
router.get("/racks/:rackId/units-by-status", ...protect, checkAbility("beryll.view"), RackController.getUnitsByStatus);

// ============================================
// СЕРВЕРЫ В СТОЙКАХ
// ============================================

// Разместить сервер в стойку БЕЗ взятия в работу
router.post("/racks/:rackId/units/:unitNumber/place", ...protect, checkAbility("beryll.work"), RackController.placeServer);

// Установить сервер и взять в работу
router.post("/racks/:rackId/units/:unitNumber/install", ...protect, checkAbility("beryll.work"), RackController.installServer);

// Извлечь сервер из стойки
router.post("/racks/:rackId/units/:unitNumber/remove", ...protect, checkAbility("beryll.work"), RackController.removeServer);

// Найти сервер в стойках
router.get("/servers/:serverId/rack-location", ...protect, checkAbility("beryll.view"), RackController.findServerInRacks);

// ============================================
// DHCP ИНТЕГРАЦИЯ
// ============================================

// Найти IP по MAC адресу в DHCP
router.get("/dhcp/find-ip/:mac", ...protect, checkAbility("beryll.view"), RackController.findIpByMac);

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
router.delete("/clusters/:clusterId/servers/:serverId", ...protect, checkAbility("beryll.work"), ClusterController.removeServerFromCluster);
router.put("/cluster-servers/:id", ...protect, checkAbility("beryll.work"), ClusterController.updateClusterServer);
router.get("/servers/unassigned", ...protect, checkAbility("beryll.view"), ClusterController.getUnassignedServers);
router.get("/servers/:serverId/clusters", ...protect, checkAbility("beryll.view"), ClusterController.getServerClusters);

// ============================================
// КАТАЛОГ КОМПЛЕКТУЮЩИХ
// (ВАЖНО: статические роуты ПЕРЕД параметризованными /catalog/:id)
// ============================================

// Расширенные эндпоинты (CatalogExtendedController)
router.get("/catalog/grouped",       ...protect, checkAbility("beryll.view"),   CatalogExtendedController.getCatalogGrouped);
router.get("/catalog/stats",         ...protect, checkAbility("beryll.view"),   CatalogExtendedController.getCatalogStats);
router.get("/catalog/types",         ...protect, checkAbility("beryll.view"),   CatalogExtendedController.getCatalogTypes);
router.get("/catalog/search",        ...protect, checkAbility("beryll.view"),   CatalogExtendedController.searchCatalog);
router.get("/catalog/export",        ...protect, checkAbility("beryll.manage"), CatalogExtendedController.exportCatalog);
router.post("/catalog/batch",        ...protect, checkAbility("beryll.manage"), CatalogExtendedController.batchCreateCatalog);

// Базовые CRUD (ComponentInventoryController)
router.get("/catalog",               ...protect, checkAbility("beryll.view"),   ComponentInventoryController.getCatalog);
router.post("/catalog",              ...protect, checkAbility("beryll.manage"), ComponentInventoryController.createCatalogEntry);
router.put("/catalog/:id",           ...protect, checkAbility("beryll.manage"), ComponentInventoryController.updateCatalogEntry);

// Мягкое удаление и восстановление (CatalogExtendedController)
router.delete("/catalog/:id",        ...protect, checkAbility("beryll.manage"), CatalogExtendedController.deleteCatalogEntry);
router.post("/catalog/:id/restore",  ...protect, checkAbility("beryll.manage"), CatalogExtendedController.restoreCatalogEntry);

// ============================================
// КОМПЛЕКТУЮЩИЕ СЕРВЕРОВ (COMPONENTS)
// ============================================

// Поиск и сканирование комплектующих
router.get("/components/search", ...protect, checkAbility("beryll.view"), searchComponent);
router.get("/components/scan", ...protect, checkAbility("beryll.view"), scanYadroSerial);
router.post("/components/check-serial", ...protect, checkAbility("beryll.view"), checkSerialUniqueness);

// Комплектующие конкретного сервера
router.post("/servers/:id/components", ...protect, checkAbility("beryll.work"), addComponent);
router.post("/servers/:id/components/batch", ...protect, checkAbility("beryll.work"), addComponentsBatch);
router.get("/servers/:id/components/history", ...protect, checkAbility("beryll.view"), getServerComponentsHistory);

// Операции с отдельными комплектующими
router.put("/components/:id", ...protect, checkAbility("beryll.work"), updateComponent);
router.patch("/components/:id/serials", ...protect, checkAbility("beryll.work"), updateSerials);
router.post("/components/:id/replace", ...protect, checkAbility("beryll.work"), replaceComponent);
router.delete("/components/:id", ...protect, checkAbility("beryll.work"), deleteComponent);
router.get("/components/:id/history", ...protect, checkAbility("beryll.view"), getComponentHistory);

// ============================================
// УЧЁТ БРАКА (DEFECT RECORDS)
// ============================================

// Справочники (ВАЖНО: перед роутами с :id)
router.get("/defect-records/part-types", ...protect, checkAbility("beryll.view"), DefectRecordController.getRepairPartTypes);
router.get("/defect-records/statuses", ...protect, checkAbility("beryll.view"), DefectRecordController.getStatuses);
router.get("/defect-records/stats", ...protect, checkAbility("beryll.view"), DefectRecordController.getStats);

// Экспорт в Excel (ВАЖНО: перед роутами с :id)
router.get("/defect-records/export", ...protect, checkAbility("beryll.view"), DefectExportController.exportDefects);
router.get("/defect-records/export/stats", ...protect, checkAbility("beryll.view"), DefectExportController.exportStats);

// CRUD операции
router.get("/defect-records", ...protect, checkAbility("beryll.view"), DefectRecordController.getAll);
router.post("/defect-records", ...protect, checkAbility("beryll.work"), DefectRecordController.create);
router.get("/defect-records/:id", ...protect, checkAbility("beryll.view"), DefectRecordController.getById);
router.put("/defect-records/:id", ...protect, checkAbility("beryll.work"), DefectRecordController.update);
router.delete("/defect-records/:id", ...protect, checkAbility("beryll.manage"), DefectRecordController.delete);

// Workflow: Смена статуса
router.put("/defect-records/:id/status", ...protect, checkAbility("beryll.work"), DefectRecordController.changeStatus);

// Workflow: Диагностика
router.post("/defect-records/:id/start-diagnosis", ...protect, checkAbility("beryll.work"), DefectRecordController.startDiagnosis);
router.post("/defect-records/:id/complete-diagnosis", ...protect, checkAbility("beryll.work"), DefectRecordController.completeDiagnosis);

// Workflow: Ожидание/резерв запчастей
router.post("/defect-records/:id/waiting-parts", ...protect, checkAbility("beryll.work"), DefectRecordController.setWaitingParts);
router.post("/defect-records/:id/reserve-component", ...protect, checkAbility("beryll.work"), DefectRecordController.reserveComponent);

// Workflow: Ремонт
router.post("/defect-records/:id/start-repair", ...protect, checkAbility("beryll.work"), DefectRecordController.startRepair);
router.post("/defect-records/:id/perform-replacement", ...protect, checkAbility("beryll.work"), DefectRecordController.performReplacement);

// Workflow: Отправка в Ядро
router.post("/defect-records/:id/send-to-yadro", ...protect, checkAbility("beryll.work"), DefectRecordController.sendToYadro);
router.post("/defect-records/:id/return-from-yadro", ...protect, checkAbility("beryll.work"), DefectRecordController.returnFromYadro);

// Workflow: Подменные серверы
router.post("/defect-records/:id/issue-substitute", ...protect, checkAbility("beryll.work"), DefectRecordController.issueSubstitute);
router.post("/defect-records/:id/return-substitute", ...protect, checkAbility("beryll.work"), DefectRecordController.returnSubstitute);

// Workflow: Закрытие
router.post("/defect-records/:id/resolve", ...protect, checkAbility("beryll.work"), DefectRecordController.resolve);
router.post("/defect-records/:id/mark-repeated", ...protect, checkAbility("beryll.work"), DefectRecordController.markAsRepeated);

// ============================================
// ФАЙЛЫ ЗАПИСЕЙ О БРАКЕ
// ============================================

router.get("/defect-records/:id/files", ...protect, checkAbility("beryll.view"), DefectRecordController.getFiles);
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