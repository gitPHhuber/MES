const Router = require("express");
const router = new Router();
const DefectController = require("../controllers/defectController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.post("/", ...protect, checkAbility("defect.manage"), DefectController.postDefect);
router.get("/", DefectController.getDefects);
router.put("/", ...protect, checkAbility("defect.manage"), DefectController.updateDefect);
router.delete("/:id", ...protect, checkAbility("defect.manage"), DefectController.deleteDefect);

module.exports = router;