const Router = require("express");
const router = new Router();
const controller = require("../controllers/assemblyRecipeController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/project/:projectId", ...protect, checkAbility("assembly.execute"), controller.getByProject);


router.post("/", ...protect, checkAbility("recipe.manage"), controller.createOrUpdate);

router.post("/process/start", ...protect, checkAbility("assembly.execute"), controller.startAssembly);
router.put("/process/:id/step", ...protect, checkAbility("assembly.execute"), controller.updateProcessStep);
router.post("/process/:id/finish", ...protect, checkAbility("assembly.execute"), controller.finishAssembly);

router.get("/history/list", ...protect, checkAbility("devices.view"), controller.getAssembledList);
router.get("/history/:processId/passport", ...protect, checkAbility("devices.view"), controller.getAssemblyPassport);

router.put("/history/:id", ...protect, checkAbility("defect.report"), controller.updatePassport);

module.exports = router;