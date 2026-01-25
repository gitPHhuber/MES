const logger = require("../services/logger");

module.exports = function requestLogger(req, res, next) {
  const startTime = process.hrtime.bigint();

  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startTime) / 1e6;
    logger.info("HTTP request", {
      method: req.method,
      url: req.originalUrl || req.url,
      status: res.statusCode,
      durationMs: Number(durationMs.toFixed(3)),
      ip: req.ip,
      userAgent: req.get("user-agent"),
      userId: req.user?.id,
      requestId: req.requestId,
      contentLength: res.get("content-length"),
    });
  });

  next();
};
