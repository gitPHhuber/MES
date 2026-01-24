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

const Router = require("express");
const router = new Router();

// Контроллеры
const ComponentInventoryController = require("../controllers/ComponentInventoryController");
const DefectRecordController = require("../controllers/DefectRecordController");
const YadroController = require("../controllers/YadroController");

// Middleware
const authMiddleware = require("../../../middleware/authMiddleware");
const checkAbilityMiddleware = require("../../../middleware/checkAbilityMiddleware");
const validateRequest = require("../../../middleware/validateRequest");
const {
    defectFiltersSchema,
    defectCreateSchema,
    defectCompleteDiagnosisSchema,
    defectNotesSchema,
    defectInventorySchema,
    defectSubstituteSchema,
    defectIdParamSchema,
} = require("../../../schemas/beryll/defect.schema");

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
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.createCatalogEntry
);
router.put("/inventory/catalog/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
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
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.create
);
router.post("/inventory/bulk", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.bulkCreate
);

// Операции
router.post("/inventory/:id/reserve", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    ComponentInventoryController.reserve
);
router.post("/inventory/:id/release", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    ComponentInventoryController.release
);
router.post("/inventory/:id/install", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.installToServer
);
router.post("/inventory/:id/remove", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.removeFromServer
);
router.post("/inventory/:id/send-to-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    ComponentInventoryController.sendToYadro
);
router.post("/inventory/:id/return-from-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    ComponentInventoryController.returnFromYadro
);
router.post("/inventory/:id/scrap", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.scrap
);
router.post("/inventory/:id/location", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
    ComponentInventoryController.updateLocation
);
router.post("/inventory/:id/test", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_component_manage"),
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
    checkAbilityMiddleware("beryll_defect_create"),
    validateRequest({ body: defectCreateSchema }),
    DefectRecordController.create
);
router.put("/defects/:id/status", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    DefectRecordController.updateStatus
);

// Workflow: Диагностика
router.post("/defects/:id/start-diagnosis", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.startDiagnosis
);
router.post("/defects/:id/complete-diagnosis", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectCompleteDiagnosisSchema }),
    DefectRecordController.completeDiagnosis
);

// Workflow: Ожидание запчастей
router.post("/defects/:id/waiting-parts", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.setWaitingParts
);
router.post("/defects/:id/reserve-component", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectInventorySchema }),
    DefectRecordController.reserveComponent
);

// Workflow: Ремонт
router.post("/defects/:id/start-repair", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.startRepair
);
router.post("/defects/:id/perform-replacement", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.performReplacement
);

// Workflow: Ядро
router.post("/defects/:id/send-to-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.sendToYadro
);
router.post("/defects/:id/return-from-yadro", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectNotesSchema }),
    DefectRecordController.returnFromYadro
);

// Workflow: Подменные серверы
router.post("/defects/:id/issue-substitute", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema, body: defectSubstituteSchema }),
    DefectRecordController.issueSubstitute
);
router.post("/defects/:id/return-substitute", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    validateRequest({ params: defectIdParamSchema }),
    DefectRecordController.returnSubstitute
);

// Workflow: Закрытие
router.post("/defects/:id/resolve", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
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
    checkAbilityMiddleware("beryll_defect_manage"),
    YadroController.createLog
);
router.put("/yadro/logs/:id/status", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
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
    checkAbilityMiddleware("beryll_admin"),
    YadroController.addToSubstitutePool
);
router.delete("/substitutes/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
    YadroController.removeFromSubstitutePool
);
router.post("/substitutes/:id/issue", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    YadroController.issueSubstitute
);
router.post("/substitutes/:id/return", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_defect_manage"),
    YadroController.returnSubstitute
);
router.post("/substitutes/:id/maintenance", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
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
    checkAbilityMiddleware("beryll_admin"),
    YadroController.createSlaConfig
);
router.put("/sla/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
    YadroController.updateSlaConfig
);
router.delete("/sla/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
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
    checkAbilityMiddleware("beryll_admin"),
    YadroController.createAlias
);
router.delete("/aliases/:id", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
    YadroController.deleteAlias
);
router.post("/aliases/generate/:userId", 
    authMiddleware, 
    checkAbilityMiddleware("beryll_admin"),
    YadroController.generateAliasesForUser
);

module.exports = router;
