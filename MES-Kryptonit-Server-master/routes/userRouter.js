const Router = require("express");
const router = new Router();
const userController = require("../controllers/userController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  userUpdateSchema,
  userImageSchema,
  userIdParamSchema,
} = require("../schemas/user/user.schema");

const protect = [authMiddleware, syncUserMiddleware];

router.get("/auth", ...protect, (req, res) => {
    return res.json(req.user);
});

router.get("/", ...protect, userController.getUsers);

router.get("/:id", ...protect, userController.getCurrentUser);
router.put(
  "/",
  ...protect,
  validateRequest({ body: userUpdateSchema }),
  userController.updateUser
); 
router.patch(
  "/",
  ...protect,
  validateRequest({ body: userImageSchema }),
  userController.updateUserImg
);

router.delete(
  "/:id",
  ...protect,
  checkAbility("users.manage"),
  validateRequest({ params: userIdParamSchema }),
  userController.deleteUser
);

module.exports = router;
