/**
 * importRoutes.js - Роуты импорта данных из Excel
 */

const path = require("path");
const Router = require("express");
const router = new Router();

const ImportController = require("../controllers/ImportController");
const authMiddleware = require(path.join(__dirname, "../../middleware/authMiddleware"));
const checkAbilityMiddleware = require(path.join(__dirname, "../../middleware/checkAbilityMiddleware"));

// Импорт компонентов серверов
router.post("/server-components",
    authMiddleware,
    checkAbilityMiddleware("beryll.manage"),
    ImportController.importServerComponents
);

// Импорт записей о браке
router.post("/defect-records",
    authMiddleware,
    checkAbilityMiddleware("beryll.manage"),
    ImportController.importDefectRecords
);

// Скачать шаблоны
router.get("/template/server-components",
    authMiddleware,
    ImportController.downloadServerComponentsTemplate
);

router.get("/template/defect-records",
    authMiddleware,
    ImportController.downloadDefectRecordsTemplate
);

module.exports = router;
