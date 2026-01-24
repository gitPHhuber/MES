const Router = require("express");
const router = new Router();
const DefectController915 = require("../controllers/defect915Controller");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Создание категории (Технолог, Нач. пр.)
router.post(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController915.postDefect
);

router.get("/", DefectController915.getDefects);

// Обновление
router.put(
    "/", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController915.updateDefect
);

// Удаление
router.delete(
    "/:id", 
    ...protect, 
    checkAbility("defect.manage"), 
    DefectController915.deleteDefect
);

module.exports = router;