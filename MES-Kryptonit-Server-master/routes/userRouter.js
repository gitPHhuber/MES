const Router = require("express");
const router = new Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/auth", ...protect, (req, res) => {
    return res.json(req.user);
});

router.get("/", ...protect, userController.getUsers);

router.get("/:id", ...protect, userController.getCurrentUser);
router.put("/", ...protect, userController.updateUser); 
router.patch("/", ...protect, userController.updateUserImg);

router.delete("/:id", ...protect, checkAbility("users.manage"), userController.deleteUser);

module.exports = router;