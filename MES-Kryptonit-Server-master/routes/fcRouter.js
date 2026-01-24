const Router = require("express");
const router = new Router();
const FCController = require("../controllers/fcController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.post("/", ...protect, checkAbility("firmware.flash"), FCController.postFC);
router.post("/addManyDefectFC", ...protect, checkAbility("firmware.flash"), FCController.postManyDefectFC);

router.post(
  "/deleteManyDefectFC",
  ...protect,
  checkAbility("defect.manage"),
  FCController.deleteManyDefectFC
);

// Просмотр таблицы - devices.view (Технолог, ОТК, Нач. пр., Прошивальщик)
router.get("/", ...protect, checkAbility("devices.view"), FCController.getFCs);

// Обновление
router.put("/", ...protect, checkAbility("defect.manage"), FCController.updateFC);
router.put("/update-stand-test", ...protect, checkAbility("firmware.flash"), FCController.updateStandTestFC);

// Удаление по ID
router.delete(
  "/byUniqID/:uniqueID",
  ...protect,
  checkAbility("defect.manage"),
  FCController.deleteFCByUniqueID
);
router.delete(
  "/byDBid/:id", 
  ...protect, 
  checkAbility("defect.manage"), 
  FCController.deleteFCByDBid
);

module.exports = router;