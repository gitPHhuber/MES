const Router = require("express");
const axios = require("axios");
const sequelize = require("../db");
const authMiddleware = require("../middleware/authMiddleware");
const syncUserMiddleware = require("../middleware/syncUserMiddleware");
const KeycloakSyncService = require("../services/KeycloakSyncService");

const router = new Router();

const healthTimeoutMs = 3000;

const checkDatabase = async () => {
  try {
    await sequelize.authenticate();
    return "ok";
  } catch (error) {
    return "fail";
  }
};

const checkKeycloak = async () => {
  const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
  const realm = KeycloakSyncService.getRealm();

  if (!baseUrl) {
    return "fail";
  }

  const endpoints = [
    `${baseUrl}/health/ready`,
    realm ? `${baseUrl}/realms/${realm}/.well-known/openid-configuration` : null,
  ].filter(Boolean);

  for (const endpoint of endpoints) {
    try {
      const response = await axios.get(endpoint, { timeout: healthTimeoutMs });
      if (response.status >= 200 && response.status < 300) {
        return "ok";
      }
    } catch (error) {
      continue;
    }
  }

  return "fail";
};

router.get("/health", async (req, res) => {
  const [db, keycloak] = await Promise.all([
    checkDatabase(),
    checkKeycloak(),
  ]);

  const status = db === "ok" && keycloak === "ok" ? "ok" : "fail";
  const httpStatus = status === "ok" ? 200 : 503;

  return res.status(httpStatus).json({ status, db, keycloak });
});

router.get(
  "/diag",
  authMiddleware,
  syncUserMiddleware,
  (req, res) => {
    const role = req.user?.role;
    const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN" || role === "Admin";

    if (!isAdmin) {
      return res.status(403).json({ message: "Нет доступа. Требуется роль ADMIN" });
    }

    const version = require("../package.json").version;
    const env = process.env.NODE_ENV || "development";
    const commitHash = process.env.COMMIT_HASH || "unknown";
    const uptime = Math.floor(process.uptime());

    return res.json({
      version,
      env,
      commitHash,
      uptime,
    });
  }
);

module.exports = router;
