const Router = require("express");
const router = new Router();
const Controller = require("../controllers/ELRS2_4_Controller"); 
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Прошивка (Оператор, Технолог)
router.post("/", ...protect, checkAbility("firmware.flash"), Controller.postBoard);
router.post("/addManyDefect2-4", ...protect, checkAbility("firmware.flash"), Controller.postManyDefect24);

// Удаление/Правка (Управление браком)
router.post("/deleteManyDefect2-4", ...protect, checkAbility("defect.manage"), Controller.deleteManyDefect24);
router.delete("/byDBid/:id", ...protect, checkAbility("defect.manage"), Controller.deleteBoardByDBid);
router.put("/", ...protect, checkAbility("defect.manage"), Controller.updateBoard);

// Просмотр
router.get("/", ...protect, checkAbility("devices.view"), Controller.getBoards);

module.exports = router;