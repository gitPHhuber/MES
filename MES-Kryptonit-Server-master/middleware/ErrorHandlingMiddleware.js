const { randomUUID } = require("crypto");
const ApiError = require("../error/ApiError");
const logger = require("../services/logger");
const { getRequestId } = require("../services/requestContext");

const sequelizeConnectionErrors = new Set([
    "SequelizeConnectionError",
    "SequelizeConnectionRefusedError",
    "SequelizeHostNotFoundError",
    "SequelizeHostNotReachableError",
    "SequelizeConnectionTimedOutError",
]);

const getStatusFromError = (err) => {
    if (err instanceof ApiError) {
        return err.status;
    }
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return 401;
    }
    if (err.name === 'InvalidTokenError') {
        return 401;
    }
    if (err.status === 403) {
        return 403;
    }
    if (err.name === 'SequelizeUniqueConstraintError') {
        return 409;
    }
    if (err.name === 'SequelizeValidationError') {
        return 400;
    }
    if (sequelizeConnectionErrors.has(err.name)) {
        return 503;
    }
    if (err.name?.startsWith("Sequelize")) {
        return 500;
    }
    return 500;
};

module.exports = function (err, req, res, next) {
    const resolvedRequestId = req.requestId || getRequestId() || randomUUID();
    if (!req.requestId) {
        req.requestId = resolvedRequestId;
        res.set("X-Request-Id", resolvedRequestId);
    }

    const status = getStatusFromError(err);

    logger.error("Request error", {
        method: req.method,
        url: req.originalUrl || req.url,
        status,
        name: err.name,
        message: err.message,
        stack: err.stack,
        isApiError: err instanceof ApiError,
        errors: err.errors,
        requestId: resolvedRequestId,
    });

    // 2. Обработка кастомных ошибок
    if (err instanceof ApiError) {
        return res.status(err.status).json({ 
            message: err.message,
            errors: err.errors 
        });
    }

    // 3. Обработка ошибок JWT (Keycloak / express-oauth2-jwt-bearer)
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({ 
            message: "Пользователь не авторизован (Invalid Token)" 
        });
    }
    if (err.name === 'InvalidTokenError') {
        return res.status(401).json({ 
            message: "Некорректный токен или срок действия истек" 
        });
    }
    if (err.status === 403) {
        return res.status(403).json({ 
            message: "Нет доступа (Forbidden)" 
        });
    }

    // 4. Обработка ошибок Sequelize (База данных)
    if (err.name === 'SequelizeUniqueConstraintError') {
        // Например: Попытка создать юзера с таким же логином
        return res.status(409).json({ 
            message: "Запись с такими данными уже существует",
            details: err.errors.map(e => e.message)
        });
    }
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
            message: "Ошибка валидации данных",
            details: err.errors?.map((error) => error.message)
        });
    }

    if (sequelizeConnectionErrors.has(err.name)) {
        return res.status(503).json({
            message: "Нет подключения к базе данных",
        });
    }

    if (err.name?.startsWith("Sequelize")) {
        return res.status(500).json({
            message: "Ошибка базы данных",
            error: process.env.NODE_ENV === 'development' ? err.message : undefined,
        });
    }

    // 5. Обработка всех остальных ошибок (500)
    return res.status(500).json({ 
        message: "Непредвиденная ошибка сервера",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
