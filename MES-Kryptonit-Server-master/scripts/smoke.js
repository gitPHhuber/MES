require("dotenv").config();

const jwt = require("jsonwebtoken");
const request = require("supertest");
const sequelize = require("../db");
const models = require("../models/index");
const { app, initInitialData } = require("../index");

const DEFAULT_SECRET = "smoke-secret";

const ensureEnvDefaults = () => {
  if (!process.env.AUTH_MODE) {
    process.env.AUTH_MODE = "local";
  }
  if (!process.env.SECRET_KEY) {
    process.env.SECRET_KEY = DEFAULT_SECRET;
  }
};

const ensureSmokeUser = async () => {
  const login = process.env.SMOKE_USER_LOGIN || "smoke.user";
  const role = process.env.SMOKE_USER_ROLE || "SUPER_ADMIN";
  const name = process.env.SMOKE_USER_NAME || "Smoke";
  const surname = process.env.SMOKE_USER_SURNAME || "Tester";

  const existing = await models.User.findOne({ where: { login } });
  if (existing) {
    return existing;
  }

  return models.User.create({
    login,
    role,
    name,
    surname,
    password: "smoke_password",
    img: null,
  });
};

const buildToken = (user) => {
  const payload = {
    id: user.id,
    login: user.login,
    role: user.role,
    name: user.name,
    surname: user.surname,
  };

  return jwt.sign(payload, process.env.SECRET_KEY, { expiresIn: "1h" });
};

const runRequest = async (client, token, route) => {
  const { method, url, body, expectedStatus } = route;
  const req = client[method](url).set("Authorization", `Bearer ${token}`);
  if (body) {
    req.send(body);
  }

  const response = await req;
  const { status } = response;

  if (status >= 500) {
    console.error(`❌ 500 detected: ${method.toUpperCase()} ${url}`);
  }

  if (expectedStatus && status !== expectedStatus) {
    throw new Error(
      `Unexpected status for ${method.toUpperCase()} ${url}: ${status}`
    );
  }

  return response;
};

const runSmoke = async () => {
  ensureEnvDefaults();
  await sequelize.authenticate();
  await initInitialData();

  const user = await ensureSmokeUser();
  const token = buildToken(user);
  const client = request(app);

  const routes = [
    {
      method: "get",
      url: "/api/user/auth",
      expectedStatus: 200,
    },
    {
      method: "post",
      url: "/api/session",
      body: { online: true, userId: user.id, PCId: null },
      expectedStatus: 200,
    },
    {
      method: "get",
      url: "/api/session",
      expectedStatus: 200,
    },
    {
      method: "put",
      url: "/api/session",
      body: { online: false, userId: user.id, PCId: null },
      expectedStatus: 200,
    },
  ];

  for (const route of routes) {
    await runRequest(client, token, route);
  }

  await sequelize.close();
};

runSmoke()
  .then(() => {
    console.log("✅ Smoke checks completed.");
  })
  .catch((error) => {
    console.error("❌ Smoke checks failed:", error.message);
    sequelize.close().finally(() => {
      process.exit(1);
    });
  });
