const fs = require("fs");
const path = require("path");
const winston = require("winston");
const DailyRotateFile = require("winston-daily-rotate-file");

const logDir = path.resolve(__dirname, "..", "logs");

if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

const logFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: logFormat,
  defaultMeta: { service: "mes-server" },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaString = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
          return `${timestamp} ${level}: ${message}${metaString}`;
        })
      )
    }),
    new DailyRotateFile({
      dirname: logDir,
      filename: "application-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "14d"
    }),
    new DailyRotateFile({
      dirname: logDir,
      filename: "error-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d",
      level: "error"
    })
  ],
  exceptionHandlers: [
    new DailyRotateFile({
      dirname: logDir,
      filename: "exceptions-%DATE%.log",
      datePattern: "YYYY-MM-DD",
      zippedArchive: true,
      maxSize: "20m",
      maxFiles: "30d"
    })
  ]
});

module.exports = logger;
