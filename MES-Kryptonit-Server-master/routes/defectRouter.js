const Router = require("express");
const router = new Router();
const DefectController = require("../controllers/defectController");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const checkAbility = require("../middleware/checkAbilityMiddleware");
const validateRequest = require("../middleware/validateRequest");
const {
  defectCreateSchema,
  defectUpdateSchema,
  defectIdParamSchema,
} = require("../schemas/defect.schema");

const protect = [authMiddleware, syncUserMiddleware];

router.post(
  "/",
  ...protect,
  checkAbility("defect.manage"),
  validateRequest({ body: defectCreateSchema }),
  DefectController.postDefect
);
router.get("/", DefectController.getDefects);
router.put(
  "/",
  ...protect,
  checkAbility("defect.manage"),
  validateRequest({ body: defectUpdateSchema }),
  DefectController.updateDefect
);
router.delete(
  "/:id",
  ...protect,
  checkAbility("defect.manage"),
  validateRequest({ params: defectIdParamSchema }),
  DefectController.deleteDefect
);

module.exports = router;
