const Router = require("express");
const router = new Router();
const rbacController = require("../controllers/rbacController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

// Доступ только для тех, у кого есть право rbac.manage (или SUPER_ADMIN)
const protect = [
    authMiddleware, 
    syncUserMiddleware, 
    checkAbility("rbac.manage")
];

router.get("/roles", ...protect, rbacController.getRoles);
router.get("/abilities", ...protect, rbacController.getAbilities);
router.post("/role/:roleId", ...protect, rbacController.updateRoleAbilities);

module.exports = router;