const Router = require("express");
const router = new Router();
const ProductController = require("../controllers/product_componentController"); 
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// --- Изделия (Products) ---

// Создание и Редактирование (Технолог)
router.post(
    "/products", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.createProduct
);

router.put(
    "/products/:id", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.updateProduct
);

router.delete(
    "/products/:id", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.deleteProduct
);

// Просмотр (Всем авторизованным, т.к. нужно для Склада и Сборки)
router.get(
    "/products", 
    ...protect, 
    ProductController.getProducts
);

router.get(
    "/products/:id", 
    ...protect, 
    ProductController.getProductById
);

// --- Комплектующие (Components) ---

router.post(
    "/components", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.createComponent
);

router.put(
    "/components/:id", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.updateComponent
);

router.delete(
    "/components/:id", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.deleteComponent
);

router.get(
    "/components", 
    ...protect, 
    ProductController.getComponents
);

// --- Статусы (Statuses) ---

router.post(
    "/statuses", 
    ...protect, 
    checkAbility("recipe.manage"), 
    ProductController.createStatus
);

router.get(
    "/statuses", 
    ...protect, 
    ProductController.getStatuses
);

module.exports = router;