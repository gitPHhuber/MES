const Router = require("express");
const router = new Router();

const SessionController = require("../controllers/sessionController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

// Создание/Вход (доступно всем)
router.post("/", ...protect, SessionController.postSession);
router.put("/", ...protect, SessionController.setOnlineSession);

// Просмотр активных сессий (доступно всем, чтобы видеть занятость ПК)
router.get("/", ...protect, SessionController.getSessions);


router.get(
    "/offlineAll", 
    ...protect, 
    checkAbility("users.manage"), 
    SessionController.setOfflineSession
);

router.get("/offAll", ...protect, checkAbility("users.manage"), SessionController.offlineSessionManual);
router.delete("/:id", ...protect, checkAbility("users.manage"), SessionController.deleteSession);

module.exports = router;