const fs = require("fs");
const path = require("path");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");
const { getRequestId } = require("./requestContext");

const logDirectory = process.env.LOG_DIR
  ? path.resolve(process.env.LOG_DIR)
  : path.join(__dirname, "..", "logs");

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory, { recursive: true });
}

const logLevel = process.env.LOG_LEVEL || "info";

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format((info) => {
    const requestId = getRequestId();
    if (requestId && !info.requestId) {
      info.requestId = requestId;
    }
    return info;
  })(),
  winston.format.json()
);

const transports = [
  new winston.transports.Console({ level: logLevel }),
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
  }),
];

const logger = winston.createLogger({
  level: logLevel,
  format: logFormat,
  transports,
});

module.exports = logger;
