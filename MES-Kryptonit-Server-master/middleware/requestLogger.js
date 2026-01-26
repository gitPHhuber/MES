const logger = require("../services/logger");

const requestLogger = (req, res, next) => {
  const startTime = process.hrtime.bigint();
  const requestId = req.headers["x-request-id"];

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    const contentLength = res.getHeader("content-length");

    logger.info("HTTP request completed", {
      requestId,
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(2)),
      contentLength: contentLength ? Number(contentLength) : undefined,
      ip: req.ip,
      userAgent: req.get("user-agent")
    });
  });

  next();
};

module.exports = requestLogger;
