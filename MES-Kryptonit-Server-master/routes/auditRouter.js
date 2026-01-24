const Router = require("express");
const router = new Router();
const auditController = require("../controllers/auditController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

// Доступ только для SUPER_ADMIN или тех, у кого есть право rbac.manage
const protect = [
    authMiddleware, 
    syncUserMiddleware, 
    checkAbility("rbac.manage")
];

router.get("/", ...protect, auditController.getLogs);

module.exports = router;