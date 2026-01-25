/**
 * beryllExtendedRoutes.js - Роуты для расширенных функций Beryll
 * 
 * Включает:
 * - Инвентарь компонентов
 * - Записи о дефектах
 * - Заявки Ядро
 * - Подменные серверы
 * - SLA конфигурация
 * - Алиасы пользователей
 */

const path = require("path");
const Router = require("express");
const router = new Router();

// Контроллеры
const ComponentInventoryController = require("../../controllers/beryll/controllers/ComponentInventoryController");
const DefectRecordController = require("../../controllers/beryll/controllers/DefectRecordController");
const YadroController = require("../../controllers/beryll/controllers/YadroController");

// Middleware
const authMiddleware = require(path.join(__dirname, "../../middleware/authMiddleware"));
const checkAbilityMiddleware = require(path.join(__dirname, "../../middleware/checkAbilityMiddleware"));
const validateRequest = require(path.join(__dirname, "../../middleware/validateRequest"));
const {
    defectFiltersSchema,
    defectCreateSchema,
    defectCompleteDiagnosisSchema,
    defectNotesSchema,
    defectInventorySchema,
    defectSubstituteSchema,
    defectIdParamSchema,
} = require(path.join(__dirname, "../../schemas/beryll/defect.schema"));

// ============================================
// ИНВЕНТАРЬ КОМПОНЕНТОВ
// ============================================

// Справочник
router.get("/inventory/catalog", 
    authMiddleware, 
    ComponentInventoryController.getCatalog
);
router.post("/inventory/catalog", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.createCatalogEntry
);
router.put("/inventory/catalog/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.updateCatalogEntry
);

// Список и поиск
router.get("/inventory", 
    authMiddleware, 
    ComponentInventoryController.getAll
);
router.get("/inventory/stats", 
    authMiddleware, 
    ComponentInventoryController.getStats
);
router.get("/inventory/warranty-expiring", 
    authMiddleware, 
    ComponentInventoryController.getWarrantyExpiring
);
router.get("/inventory/available/:type", 
    authMiddleware, 
    ComponentInventoryController.getAvailableByType
);
router.get("/inventory/serial/:serial", 
    authMiddleware, 
    ComponentInventoryController.getBySerial
);
router.get("/inventory/:id", 
    authMiddleware, 
    ComponentInventoryController.getById
);
router.get("/inventory/:id/history", 
    authMiddleware, 
    ComponentInventoryController.getHistory
);

// Создание
router.post("/inventory", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.create
);
router.post("/inventory/bulk", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.bulkCreate
);

// Операции
router.post("/inventory/:id/reserve", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.reserve
);
router.post("/inventory/:id/release", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.release
);
router.post("/inventory/:id/install", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.installToServer
);
router.post("/inventory/:id/remove", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.removeFromServer
);
router.post("/inventory/:id/send-to-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.sendToYadro
);
router.post("/inventory/:id/return-from-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.returnFromYadro
);
router.post("/inventory/:id/scrap", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.scrap
);
router.post("/inventory/:id/location", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.updateLocation
);
router.post("/inventory/:id/test", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    ComponentInventoryController.markTested
);

// ============================================
// ЗАПИСИ О ДЕФЕКТАХ
// ============================================

// Справочники
router.get("/defects/part-types", 
    authMiddleware, 
    DefectRecordController.getRepairPartTypes
);
router.get("/defects/statuses", 
    authMiddleware, 
    DefectRecordController.getStatuses
);
router.get("/defects/stats", 
    authMiddleware, 
    DefectRecordController.getStats
);

// CRUD
router.get("/defects", 
    authMiddleware,
    validateRequest({ query: defectFiltersSchema }),
    DefectRecordController.getAll
);
router.get("/defects/:id", 
    authMiddleware,
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.getById
);
router.get("/defects/:id/available-actions", 
    authMiddleware, 
    DefectRecordController.getAvailableActions
);
router.post("/defects", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ body: defectCreateSchema }),
    DefectRecordController.create
);
router.put("/defects/:id/status", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    DefectRecordController.updateStatus
);

// Workflow: Диагностика
router.post("/defects/:id/start-diagnosis", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.startDiagnosis
);
router.post("/defects/:id/complete-diagnosis", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectCompleteDiagnosisSchema }),
    DefectRecordController.completeDiagnosis
);

// Workflow: Ожидание запчастей
router.post("/defects/:id/waiting-parts", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.setWaitingParts
);
router.post("/defects/:id/reserve-component", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectInventorySchema }),
    DefectRecordController.reserveComponent
);

// Workflow: Ремонт
router.post("/defects/:id/start-repair", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.startRepair
);
router.post("/defects/:id/perform-replacement", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.performReplacement
);

// Workflow: Ядро
router.post("/defects/:id/send-to-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.sendToYadro
);
router.post("/defects/:id/return-from-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.returnFromYadro
);

// Workflow: Подменные серверы
router.post("/defects/:id/issue-substitute", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectSubstituteSchema }),
    DefectRecordController.issueSubstitute
);
router.post("/defects/:id/return-substitute", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.returnSubstitute
);

// Workflow: Закрытие
router.post("/defects/:id/resolve", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.resolve
);

// ============================================
// ЖУРНАЛ УЧЁТА ЗАЯВОК ЯДРО
// (Номера заявок присваивает поставщик, мы копируем для учёта)
// ============================================

// Справочники
router.get("/yadro/request-types", 
    authMiddleware, 
    YadroController.getRequestTypes
);
router.get("/yadro/log-statuses", 
    authMiddleware, 
    YadroController.getLogStatuses
);

// Журнал
router.get("/yadro/logs", 
    authMiddleware, 
    YadroController.getAllLogs
);
router.get("/yadro/logs/open", 
    authMiddleware, 
    YadroController.getOpenLogs
);
router.get("/yadro/logs/stats", 
    authMiddleware, 
    YadroController.getLogStats
);
router.get("/yadro/logs/:id", 
    authMiddleware, 
    YadroController.getLogById
);
router.post("/yadro/logs", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    YadroController.createLog
);
router.put("/yadro/logs/:id/status", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    YadroController.updateLogStatus
);

// ============================================
// ПОДМЕННЫЕ СЕРВЕРЫ
// ============================================

router.get("/substitutes", 
    authMiddleware, 
    YadroController.getAllSubstitutes
);
router.get("/substitutes/available", 
    authMiddleware, 
    YadroController.getAvailableSubstitutes
);
router.get("/substitutes/stats", 
    authMiddleware, 
    YadroController.getSubstituteStats
);
router.post("/substitutes", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.addToSubstitutePool
);
router.delete("/substitutes/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.removeFromSubstitutePool
);
router.post("/substitutes/:id/issue", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    YadroController.issueSubstitute
);
router.post("/substitutes/:id/return", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.work"),
    YadroController.returnSubstitute
);
router.post("/substitutes/:id/maintenance", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.setSubstituteMaintenance
);

// ============================================
// SLA КОНФИГУРАЦИЯ
// ============================================

router.get("/sla", 
    authMiddleware, 
    YadroController.getAllSlaConfigs
);
router.post("/sla", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.createSlaConfig
);
router.put("/sla/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.updateSlaConfig
);
router.delete("/sla/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.deleteSlaConfig
);

// ============================================
// АЛИАСЫ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

router.get("/aliases", 
    authMiddleware, 
    YadroController.getAllAliases
);
router.get("/aliases/find/:alias", 
    authMiddleware, 
    YadroController.findUserByAlias
);
router.post("/aliases", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.createAlias
);
router.delete("/aliases/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.deleteAlias
);
router.post("/aliases/generate/:userId", 
    authMiddleware, 
    checkAbilityMiddleware("beryll.manage"),
    YadroController.generateAliasesForUser
);

module.exports = router;
