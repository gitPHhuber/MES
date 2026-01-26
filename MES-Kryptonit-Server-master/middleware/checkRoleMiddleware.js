const logger = require("../services/logger");
module.exports = function (role) {
  return function (req, res, next) {
    if (req.method === "OPTIONS") {
      return next();
    }

    try {
      if (!req.user) {
        return res.status(401).json({ message: "Пользователь не идентифицирован (Backend Error)" });
      }

      if (req.user.role !== role) {
        return res.status(403).json({ 
            message: `Нет доступа. Требуется роль ${role}, у вас ${req.user.role}` 
        });
      }

      next();
    } catch (e) {
      logger.error("CheckRole Error:", e);
      return res.status(500).json({ message: "Ошибка проверки роли" });
    }
  };
};