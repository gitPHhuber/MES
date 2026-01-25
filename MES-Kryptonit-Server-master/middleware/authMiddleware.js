const { auth } = require("express-oauth2-jwt-bearer");
const jwt = require("jsonwebtoken");

const authMode = process.env.AUTH_MODE || "auto"; // keycloak | local | auto

const checkJwt = auth({
  audience: process.env.KEYCLOAK_AUDIENCE || "account",
  issuerBaseURL:
    process.env.KEYCLOAK_ISSUER_BASE_URL ||
    "http://keycloak.local/realms/MES-Realm", // Minikube address
  tokenSigningAlg: "RS256",
});

const verifyLocalToken = (req, res, next) => {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "Missing token" });
  }

  try {
    const payload = jwt.verify(token, process.env.SECRET_KEY);
    req.auth = { payload };
    return next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  if (authMode === "local") {
    return verifyLocalToken(req, res, next);
  }

  return checkJwt(req, res, (err) => {
    if (!err || authMode === "keycloak") {
      return err ? next(err) : next();
    }

    return verifyLocalToken(req, res, next);
  });
};
