const {Sequelize} = require('sequelize')
const logger = require("./services/logger");

const isSqlDebugEnabled =
  process.env.SQL_DEBUG === "true" && process.env.NODE_ENV !== "production";

module.exports = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        dialect: 'postgres',
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        pool: {
            acquire: Number(process.env.DB_POOL_ACQUIRE_MS) || 5000,
        },
        dialectOptions: {
            connectionTimeoutMillis: Number(process.env.DB_CONNECT_TIMEOUT_MS) || 5000,
        },
        benchmark: true,
        logging: isSqlDebugEnabled
          ? (msg, ms) => logger.debug(`[Sequelize] ${msg} (${ms} ms)`)
          : false,

    }
)
