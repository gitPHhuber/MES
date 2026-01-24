const ApiError = require("../error/ApiError");

module.exports = function (requiredSlug) {
    return function (req, res, next) {
        if (req.method === "OPTIONS") return next();

        try {
            const user = req.user;
            if (!user) return next(ApiError.unauthorized("Нет пользователя"));

            // SUPER_ADMIN может всё
            if (user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Проверяем наличие права
            if (user.abilities && user.abilities.includes(requiredSlug)) {
                return next();
            }

            return next(ApiError.forbidden(`Нет доступа. Требуется право: ${requiredSlug}`));

        } catch (e) {
            return next(ApiError.internal("Ошибка проверки прав"));
        }
    };
};