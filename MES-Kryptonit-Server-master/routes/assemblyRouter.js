const Router = require("express");
const router = new Router();

const assemblyController = require("../controllers/assemblyController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/routes", ...protect, assemblyController.getRoutes);
router.get("/routes/:id", ...protect, assemblyController.getRouteById);

router.post(
  "/routes",
  ...protect,
  checkAbility("recipe.manage"),
  assemblyController.createRoute
);
router.put(
  "/routes/:id",
  ...protect,
  checkAbility("recipe.manage"),
  assemblyController.updateRoute
);
router.delete(
  "/routes/:id",
  ...protect,
  checkAbility("recipe.manage"),
  assemblyController.deleteRoute
);

module.exports = router;