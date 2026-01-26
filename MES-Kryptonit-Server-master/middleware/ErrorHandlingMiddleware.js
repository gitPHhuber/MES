const ApiError = require("../error/ApiError");
const logger = require("../services/logger");

module.exports = function (err, req, res, next) {
    // 1. Логирование в консоль
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    const requestMeta = {
        method: req.method,
        path: req.originalUrl || req.url,
        time,
        stack: err?.stack
    };

    if (err instanceof ApiError) {
        logger.warn(`ApiError: ${err.message}`, requestMeta);
    } else {
        logger.error("Unhandled error", { ...requestMeta, message: err?.message });
    }

    // 2. Обработка кастомных ошибок
    if (err instanceof ApiError) {
        return res.status(err.status).json({ 
            message: err.message,
            errors: err.errors,
            stack: err?.stack
        });
    }

    // 3. Обработка ошибок JWT (Keycloak / express-oauth2-jwt-bearer)
    if (err.name === 'UnauthorizedError' || err.status === 401) {
        return res.status(401).json({ 
            message: "Пользователь не авторизован (Invalid Token)",
            stack: err?.stack
        });
    }
    if (err.name === 'InvalidTokenError') {
        return res.status(401).json({ 
            message: "Некорректный токен или срок действия истек",
            stack: err?.stack
        });
    }
    if (err.status === 403) {
        return res.status(403).json({ 
            message: "Нет доступа (Forbidden)",
            stack: err?.stack
        });
    }

    // 4. Обработка ошибок Sequelize (База данных)
    if (err.name === 'SequelizeUniqueConstraintError') {
        // Например: Попытка создать юзера с таким же логином
        return res.status(409).json({ 
            message: "Запись с такими данными уже существует",
            details: err.errors.map(e => e.message),
            stack: err?.stack
        });
    }
    
    if (err.name === 'SequelizeValidationError') {
        return res.status(400).json({ 
            message: "Ошибка валидации данных",
            details: err.errors.map(e => e.message),
            stack: err?.stack
        });
    }

    if (err.name === 'SequelizeConnectionError') {
        return res.status(503).json({ 
            message: "Нет подключения к базе данных",
            stack: err?.stack
        });
    }

    // 5. Обработка всех остальных ошибок (500)
    return res.status(500).json({ 
        message: "Непредвиденная ошибка сервера",
        error: err?.message,
        stack: err?.stack
    });
};
