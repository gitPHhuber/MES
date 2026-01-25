const fs = require("fs");
const path = require("path");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logLevel = process.env.LOG_LEVEL || "info";
const serviceName = process.env.SERVICE_NAME || "mes-backend";
const envName = process.env.NODE_ENV || "development";
const isContainer =
  process.env.CONTAINER === "true" ||
  process.env.DOCKER === "true" ||
  process.env.RUNNING_IN_CONTAINER === "true";
const enableFileTransports = process.env.LOG_TO_FILE
  ? process.env.LOG_TO_FILE === "true"
  : !isContainer;

const logDirectory = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.join(__dirname, "..", "logs");

if (enableFileTransports && !fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format((info) => {
    const errorSource =
      info.error instanceof Error
        ? info.error
        : info instanceof Error
          ? info
          : null;
    const errorFromInfo = info.error && typeof info.error === "object" ? info.error : {};

    return {
      timestamp: info.timestamp,
      level: info.level,
      service: info.service || serviceName,
      env: info.env || envName,
      message: info.message,
      requestId: info.requestId,
      method: info.method,
      path: info.path,
      query: info.query,
      statusCode: info.statusCode,
      durationMs: info.durationMs,
      userId: info.userId || info.login,
      "error.name": errorSource?.name || errorFromInfo.name,
      "error.message": errorSource?.message || errorFromInfo.message,
      "error.stack": errorSource?.stack || errorFromInfo.stack,
    };
  })(),
  winston.format.json()
);

const transports = [new winston.transports.Console({ level: logLevel })];

if (enableFileTransports) {
  transports.push(
    new DailyRotateFile({
      filename: path.join(logDirectory, "app-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d",
      level: logLevel,
    }),
    new DailyRotateFile({
      filename: path.join(logDirectory, "error-%DATE%.log"),
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error",
    })
  );
}

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
  defaultMeta: { service: serviceName, env: envName },
});

module.exports = logger;
