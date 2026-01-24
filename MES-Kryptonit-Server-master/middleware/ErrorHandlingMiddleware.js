const ApiError = require("../error/ApiError");

module.exports = function (err, req, res, next) {
    // 1. Логирование в консоль
    const time = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.error(`\x1b[31m[${time}] ERROR:\x1b[0m ${req.method} ${req.url}`);
    
    // Если это не наша кастомная ошибка, выводим полный стек (где именно упало)
    if (!(err instanceof ApiError)) {
        console.error(err); 
    } else {
        console.error(`ApiError: ${err.message}`);
    }

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