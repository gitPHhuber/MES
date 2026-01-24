const Router = require("express");
const router = new Router();
const DefectController2_4 = require("../controllers/defect2_4Controller");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Создание
router.post(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController2_4.postDefect
);

// Просмотр
router.get("/", DefectController2_4.getDefects);

// Обновление
router.put(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController2_4.updateDefect
);

// Удаление
router.delete(
    "/:id", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController2_4.deleteDefect
);

module.exports = router;