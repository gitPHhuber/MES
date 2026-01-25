const ApiError = require("../error/ApiError");
const logger = require("../services/logger");

module.exports = function (err, req, res, next) {
    logger.error("Request error", {
        method: req.method,
        url: req.originalUrl || req.url,
        status: err.status,
        name: err.name,
        message: err.message,
        stack: err.stack,
        isApiError: err instanceof ApiError,
        errors: err.errors,
        requestId: req.requestId,
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
            details: err.errors.map(e => e.message)
        });
    }

    if (err.name === 'SequelizeConnectionError') {
        return res.status(503).json({ 
            message: "Нет подключения к базе данных" 
        });
    }

    // 5. Обработка всех остальных ошибок (500)
    return res.status(500).json({ 
        message: "Непредвиденная ошибка сервера",
        error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
};
