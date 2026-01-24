const Router = require("express");
const router = new Router();
const CoralB_Controller = require("../controllers/coralB_Controller");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Создание (Прошивка) - firmware.flash
router.post("/", ...protect, checkAbility("firmware.flash"), CoralB_Controller.postBoard);

router.post(
  "/addManyDefectCoralB",
  ...protect,
  checkAbility("firmware.flash"),
  CoralB_Controller.postManyDefectCoralB
);

router.post(
  "/deleteManyDefectCoralB",
  ...protect,
  checkAbility("defect.manage"),
  CoralB_Controller.deleteManyDefectCoralB
);

router.get("/", CoralB_Controller.getBoards);

router.put("/", ...protect, checkAbility("defect.manage"), CoralB_Controller.updateBoard);

router.delete(
  "/byDBid/:id",
  ...protect,
  checkAbility("defect.manage"),
  CoralB_Controller.deleteBoardByDBid
);

module.exports = router;