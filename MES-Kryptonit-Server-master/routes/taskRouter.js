const Router = require("express");
const router = new Router();
const TaskController = require("../controllers/TaskController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/", ...protect, TaskController.getTasks);
router.get("/:id", ...protect, TaskController.getTaskById);

router.post("/", ...protect, checkAbility("users.manage"), TaskController.createTask);
router.delete("/:id", ...protect, checkAbility("users.manage"), TaskController.deleteTask);
router.put("/:id", ...protect, checkAbility("users.manage"), TaskController.updateFullTask);

router.patch("/:id/status", ...protect, checkAbility("assembly.execute"), TaskController.updateTaskStatus);

module.exports = router;