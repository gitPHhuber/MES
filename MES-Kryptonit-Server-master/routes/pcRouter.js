const Router = require("express");
const router = new Router();
const PCController = require("../controllers/pcController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/", ...protect, PCController.getPCs);

// --- Управление (Только менеджеры) ---
router.post("/", ...protect, checkAbility("users.manage"), PCController.postPC);
router.put("/", ...protect, checkAbility("users.manage"), PCController.updatePC);
router.delete("/:id", ...protect, checkAbility("users.manage"), PCController.deletePC);

module.exports = router;