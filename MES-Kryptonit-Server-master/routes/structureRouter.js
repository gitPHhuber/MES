const Router = require("express");
const router = new Router();
const structureController = require("../controllers/structureController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/", ...protect, structureController.getFullStructure);
router.get("/users/unassigned", ...protect, checkAbility("users.manage"), structureController.getUnassignedUsers);


router.post("/section", ...protect, checkAbility("users.manage"), structureController.createSection);
router.post("/team", ...protect, checkAbility("users.manage"), structureController.createTeam);


router.put("/section/manager", ...protect, checkAbility("users.manage"), structureController.assignSectionManager);
router.put("/team/lead", ...protect, checkAbility("users.manage"), structureController.assignTeamLead);
router.put("/user/assign", ...protect, checkAbility("users.manage"), structureController.addMemberToTeam);
router.put("/user/remove", ...protect, checkAbility("users.manage"), structureController.removeMemberFromTeam);

module.exports = router;