/**
 * Router for roles management endpoints.
 */
const Router = require("express");
const router = new Router();
const rolesController = require("../controllers/RolesController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protectView = [authMiddleware, syncUserMiddleware, checkAbility("roles.view")];
const protectManage = [authMiddleware, syncUserMiddleware, checkAbility("roles.manage")];

router.get("/", ...protectView, rolesController.listRoles);
router.post("/", ...protectManage, rolesController.createRole);
router.put("/:id", ...protectManage, rolesController.updateRole);
router.delete("/:id", ...protectManage, rolesController.deleteRole);
router.post("/sync", ...protectManage, rolesController.syncRoles);
router.get("/keycloak", ...protectManage, rolesController.listKeycloakRoles);

module.exports = router;
