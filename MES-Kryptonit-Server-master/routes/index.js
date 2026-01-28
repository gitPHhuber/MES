
const Router = require("express");
const router = new Router();

// =========================================================================
// ИМПОРТ РОУТЕРОВ
// =========================================================================

// --- Пользователи и сессии ---
const userRouter = require("./userRouter");
const sessionRouter = require("./sessionRouter");
const pcRouter = require("./pcRouter");

// --- RBAC и структура ---
const rbacRouter = require("./rbacRouter");
const structureRouter = require("./structureRouter");
const auditRouter = require("./auditRouter");

// --- Склад ---
const warehouseRouter = require("./warehouseRouter");

// --- Сборка ---
const assemblyRouter = require("./assemblyRouter");
const assemblyRecipeRouter = require("./assemblyRecipeRouter");

// --- Задачи и проекты ---
const taskRouter = require("./taskRouter");
const projectRouter = require("./projectRouter");

// --- Legacy: Прошивка плат ---
const fcRouter = require("./fcRouter");
const ELRS915_Router = require("./ELRS915_Router");
const ELRS2_4_Router = require("./ELRS2_4_Router");
const coralB_router = require("./CoralBRouter");
const passportsExportRouter = require("./passportsExportRoutes"); 
// --- Legacy: Дефекты плат ---
const defectRouter = require("./defectRouter");
const defectRouter915 = require("./defectRouter915");
const defectRouter2_4 = require("./defectRouter2_4");
const defectRouter_CoralB = require("./defectRouterCoralB");

// --- Beryll (АПК серверы) ---
const beryllRouter = require("./beryllRouter");
const beryllExtendedRouter = require("./beryllExtendedRouter"); // Включает роуты комплектующих

// --- Система дефектов (Учёт брака) ---
const defectSystemRouter = require("./defectSystemRouter");

const productionOutputRouter = require("./productionOutputRouter");


// =========================================================================
// РЕГИСТРАЦИЯ МАРШРУТОВ
// =========================================================================

// --- Пользователи и сессии ---
router.use("/users", userRouter);
router.use("/sessions", sessionRouter);
router.use("/pcs", pcRouter);

// --- RBAC и структура ---
router.use("/rbac", rbacRouter);
router.use("/structure", structureRouter);
router.use("/audit", auditRouter);

// --- Склад ---
router.use("/warehouse", warehouseRouter);

// --- Сборка ---
router.use("/assembly", assemblyRouter);
router.use("/assembly/recipes", assemblyRecipeRouter);

// --- Задачи и проекты ---
router.use("/tasks", taskRouter);
router.use("/projects", projectRouter);

// --- Legacy: Прошивка плат ---
router.use("/fcs", fcRouter);
router.use("/ELRS915", ELRS915_Router);
router.use("/ELRS2-4", ELRS2_4_Router);
router.use("/Coral-B", coralB_router);

// --- Legacy: Дефекты плат ---
router.use("/defectsFC", defectRouter);
router.use("/defects915", defectRouter915);
router.use("/defects2-4", defectRouter2_4);
router.use("/defects-Coral-B", defectRouter_CoralB);

// --- Beryll (АПК серверы) ---
router.use("/beryll", beryllRouter);
router.use("/beryll", beryllExtendedRouter);
router.use("/beryll/export/passports", passportsExportRouter); 

// --- Система дефектов (Учёт брака) ---
router.use("/defects", defectSystemRouter);

router.use("/production", productionOutputRouter);

module.exports = router;