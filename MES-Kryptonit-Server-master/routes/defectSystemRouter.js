const Router = require("express");
const router = new Router();
const DefectSystemController = require("../controllers/defectSystemController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// =========================================================
// КАТЕГОРИИ ДЕФЕКТОВ
// =========================================================

// Получить все категории (доступно всем авторизованным)
router.get("/categories", ...protect, DefectSystemController.getCategories);

// Создать категорию (только админ/технолог)
router.post(
  "/categories",
  ...protect,
  checkAbility("defect.manage"),
  DefectSystemController.createCategory
);

// Обновить категорию
router.put(
  "/categories/:id",
  ...protect,
  checkAbility("defect.manage"),
  DefectSystemController.updateCategory
);

// Удалить категорию
router.delete(
  "/categories/:id",
  ...protect,
  checkAbility("defect.manage"),
  DefectSystemController.deleteCategory
);

// =========================================================
// ДЕФЕКТЫ (БРАК)
// =========================================================

// Получить список дефектов с фильтрацией
router.get("/", ...protect, DefectSystemController.getDefects);

// Получить статистику
router.get("/statistics", ...protect, DefectSystemController.getStatistics);

// Получить один дефект с историей
router.get("/:id", ...protect, DefectSystemController.getDefectById);

// Зарегистрировать новый дефект
router.post(
  "/",
  ...protect,
  checkAbility("defect.create"),
  DefectSystemController.createDefect
);

// Обновить статус дефекта
router.patch(
  "/:id/status",
  ...protect,
  checkAbility("defect.update"),
  DefectSystemController.updateDefectStatus
);

// =========================================================
// ДЕЙСТВИЯ ПО РЕМОНТУ
// =========================================================

// Получить историю ремонта
router.get(
  "/:defectId/repairs",
  ...protect,
  DefectSystemController.getRepairHistory
);

// Добавить действие по ремонту
router.post(
  "/:defectId/repairs",
  ...protect,
  checkAbility("defect.repair"),
  DefectSystemController.addRepairAction
);

// =========================================================
// БЫСТРЫЕ ДЕЙСТВИЯ
// =========================================================

// Отметить как "Починено"
router.post(
  "/:id/repaired",
  ...protect,
  checkAbility("defect.repair"),
  DefectSystemController.markAsRepaired
);

// Отметить как "Списано"
router.post(
  "/:id/scrap",
  ...protect,
  checkAbility("defect.scrap"),
  DefectSystemController.markAsScrapped
);

// Подтвердить ремонт (ОТК)
router.post(
  "/:id/verify",
  ...protect,
  checkAbility("defect.verify"),
  DefectSystemController.verifyRepair
);

module.exports = router;
