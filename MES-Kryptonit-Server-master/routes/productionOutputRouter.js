/**
 * productionOutputRouter.js - Роуты для учёта выработки v2
 */

const Router = require("express");
const router = new Router();
const controller = require("../controllers/productionOutputController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// =========================================================================
// СПРАВОЧНИК ОПЕРАЦИЙ
// =========================================================================

// Получить список типов операций (все авторизованные)
router.get("/operation-types", ...protect, controller.getOperationTypes);

// Управление типами операций (только технолог/админ)
router.post("/operation-types", ...protect, checkAbility("recipe.manage"), controller.createOperationType);
router.put("/operation-types/:id", ...protect, checkAbility("recipe.manage"), controller.updateOperationType);
router.delete("/operation-types/:id", ...protect, checkAbility("recipe.manage"), controller.deleteOperationType);

// =========================================================================
// ЗАПИСИ ВЫРАБОТКИ
// =========================================================================

// Получить записи (с фильтрацией)
router.get("/outputs", ...protect, controller.getOutputs);

// Получить одну запись
router.get("/outputs/:id", ...protect, controller.getOutputById);

// Создать запись
router.post("/outputs", ...protect, controller.createOutput);

// Обновить запись
router.put("/outputs/:id", ...protect, controller.updateOutput);

// Удалить запись
router.delete("/outputs/:id", ...protect, controller.deleteOutput);

// =========================================================================
// ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
// =========================================================================

// Список ожидающих подтверждения (для текущего пользователя)
router.get("/pending", ...protect, controller.getPendingOutputs);

// Подтвердить записи (batch)
router.post("/approve", ...protect, controller.approveOutputs);

// Отклонить записи (batch)
router.post("/reject", ...protect, controller.rejectOutputs);

// =========================================================================
// СТАТИСТИКА И ОТЧЁТЫ
// =========================================================================

// Сводка по сотруднику
router.get("/summary/:userId", ...protect, controller.getUserSummary);

// Матрица выработки
router.get("/matrix", ...protect, controller.getMatrix);

// Сотрудники для выбора (моя бригада/участок)
router.get("/my-team", ...protect, controller.getMyTeamMembers);

module.exports = router;
