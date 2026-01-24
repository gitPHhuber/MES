const Router = require("express");
const router = new Router();
const DefectController_CoralB = require("../controllers/defect_CoralB_Controller");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Создание
router.post(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController_CoralB.postDefect
);

// Просмотр
router.get("/", DefectController_CoralB.getDefects);

// Обновление
router.put(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController_CoralB.updateDefect
);

// Удаление
router.delete(
    "/:id", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController_CoralB.deleteDefect
);

module.exports = router;