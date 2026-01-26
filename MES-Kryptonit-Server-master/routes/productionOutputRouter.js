/**
 * productionOutputRouter.js - Роуты для учёта выработки v2
 */

const Router = require("express");
const router = new Router();
const controller = require("../controllers/productionOutputController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  operationTypeBodySchema,
  operationTypeUpdateSchema,
  outputFiltersSchema,
  outputCreateSchema,
  outputUpdateSchema,
  approvalSchema,
  rejectSchema,
  summaryQuerySchema,
  outputIdParamSchema,
  userIdParamSchema,
} = require("../schemas/production/output.schema");

const protect = [authMiddleware, syncUserMiddleware];

// =========================================================================
// СПРАВОЧНИК ОПЕРАЦИЙ
// =========================================================================

// Получить список типов операций (все авторизованные)
router.get("/operation-types", ...protect, controller.getOperationTypes);

// Управление типами операций (только технолог/админ)
router.post(
  "/operation-types",
  ...protect,
  checkAbility("recipe.manage"),
  validateRequest({ body: operationTypeBodySchema }),
  controller.createOperationType
);
router.put(
  "/operation-types/:id",
  ...protect,
  checkAbility("recipe.manage"),
  validateRequest({ params: outputIdParamSchema, body: operationTypeUpdateSchema }),
  controller.updateOperationType
);
router.delete(
  "/operation-types/:id",
  ...protect,
  checkAbility("recipe.manage"),
  validateRequest({ params: outputIdParamSchema }),
  controller.deleteOperationType
);

// =========================================================================
// ЗАПИСИ ВЫРАБОТКИ
// =========================================================================

// Получить записи (с фильтрацией)
router.get(
  "/outputs",
  ...protect,
  validateRequest({ query: outputFiltersSchema }),
  controller.getOutputs
);

// Получить одну запись
router.get(
  "/outputs/:id",
  ...protect,
  validateRequest({ params: outputIdParamSchema }),
  controller.getOutputById
);

// Создать запись
router.post(
  "/outputs",
  ...protect,
  validateRequest({ body: outputCreateSchema }),
  controller.createOutput
);

// Обновить запись
router.put(
  "/outputs/:id",
  ...protect,
  validateRequest({ params: outputIdParamSchema, body: outputUpdateSchema }),
  controller.updateOutput
);

// Удалить запись
router.delete(
  "/outputs/:id",
  ...protect,
  validateRequest({ params: outputIdParamSchema }),
  controller.deleteOutput
);

// =========================================================================
// ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
// =========================================================================

// Список ожидающих подтверждения (для текущего пользователя)
router.get("/pending", ...protect, controller.getPendingOutputs);

// Подтвердить записи (batch)
router.post(
  "/approve",
  ...protect,
  validateRequest({ body: approvalSchema }),
  controller.approveOutputs
);

// Отклонить записи (batch)
router.post(
  "/reject",
  ...protect,
  validateRequest({ body: rejectSchema }),
  controller.rejectOutputs
);

// =========================================================================
// СТАТИСТИКА И ОТЧЁТЫ
// =========================================================================

// Сводка по сотруднику
router.get(
  "/summary/:userId",
  ...protect,
  validateRequest({ params: userIdParamSchema, query: summaryQuerySchema }),
  controller.getUserSummary
);

// Матрица выработки
router.get("/matrix", ...protect, controller.getMatrix);

// Сотрудники для выбора (моя бригада/участок)
router.get("/my-team", ...protect, controller.getMyTeamMembers);

module.exports = router;
