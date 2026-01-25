const ApiError = require("../error/ApiError");
const { User, Session } = require("../models/index");
const jwt = require("jsonwebtoken");
const uuid = require("uuid");
const path = require("path");

const generateJWT = (id, login, role, name, surname, img) => {
  return jwt.sign(
    { id, login, role, name, surname, img },
    process.env.SECRET_KEY,
    {
      expiresIn: "5h",
    }
  );
};

// --- Вспомогательная функция проверки прав доступа к профилю ---
const checkAccess = (req, targetUserId) => {
  // 1. Это сам пользователь?
  const isSelf = req.user.id === Number(targetUserId);
  
  // 2. Есть ли у пользователя право управлять юзерами?
  const hasManageRights = req.user.abilities && req.user.abilities.includes('users.manage');
  
  // 3. Является ли он супер-админом?
  const isSuperAdmin = req.user.role === 'SUPER_ADMIN';

  // Если ни одно условие не выполнено — запрещаем
  if (!isSelf && !hasManageRights && !isSuperAdmin) {
      throw ApiError.forbidden("Нет доступа к чужому профилю");
  }
};

class UserController {
  // Получение списка всех пользователей (защищено роутером через checkAbility("users.manage"))
  async getUsers(req, res, next) {
    try {
      const usersAll = await User.findAll({
        order: [["name", "ASC"]],
      });
      return res.json(usersAll);
    } catch (e) {
      next(e);
    }
  }

  // Получение конкретного профиля (Свой или чужой, если есть права)
  async getCurrentUser(req, res, next) {
    try {
      const id = req.params.id;

      // Проверяем: можно ли этому юзеру смотреть этот ID
      checkAccess(req, id);

      const user = await User.findOne({
        where: { id },
      });
      return res.json(user);
    } catch (e) {
      // Если это наша ошибка 403, прокидываем её как есть
      if (e instanceof ApiError) return next(e);
      next(e);
    }
  }

  // Обновление профиля (Свой или чужой, если есть права)
  async updateUser(req, res, next) {
    try {
      const { id, password, name, surname } = req.body;

      // Проверяем права
      checkAccess(req, id);

      // Формируем объект для обновления
      const updateData = { name, surname };
      
      // Обновляем пароль только если он пришел в запросе
      if (password && password.trim() !== "") {
        updateData.password = password;
      }

      await User.update(updateData, { where: { id } });
      const user = await User.findAll({ where: { id } });
      return res.json(user[0]);
    } catch (e) {
      if (e instanceof ApiError) return next(e);
      next(e);
    }
  }

  // Обновление фото (Свой или чужой, если есть права)
  async updateUserImg(req, res, next) {
    try {
      const { id } = req.body;
      
      // Проверяем права
      checkAccess(req, id);

      const { img } = req.files;
      let fileName = uuid.v4() + ".jpg";
      img.mv(path.resolve(__dirname, "..", "static", fileName));

      await User.update({ img: fileName }, { where: { id } });

      const user = await User.findAll({ where: { id } });
      return res.json(user[0]);
    } catch (e) {
      if (e instanceof ApiError) return next(e);
      next(e);
    }
  }

  async registration(req, res, next) {
    try {
      const { login, password, role, name, surname } = req.body;

      if (!login || !password) {
        return next(ApiError.badRequest("нет логина или пароля в запросе"));
      }
      const candidate = await User.findOne({ where: { login } });
      if (candidate) {
        return next(
          ApiError.badRequest("Такой пользователь с таким логином уже есть")
        );
      }

      const user = await User.create({ login, password, role, name, surname });
      const token = generateJWT(
        user.id,
        user.login,
        user.role,
        user.name,
        user.surname,
        null
      );
      return res.json({ token });
    } catch (e) {
      next(e);
    }
  }

  async login(req, res, next) {
    try {
      const { login, password } = req.body;

      if (!login || !password) {
        return next(ApiError.badRequest("нет логина или пароля в запросе"));
      }
      const currentUser = await User.findOne({ where: { login } });
      if (!currentUser) {
        return next(ApiError.internal("Такого пользователя нет"));
      }

      if (currentUser.password != password) {
        return next(ApiError.internal("неверный пароль"));
      }

      const isAciveSession = await Session.findAll({
        where: { userId: currentUser.id, online: true },
      });

      if (isAciveSession.length >= 1) {
        await Session.update(
          { online: false },
          { where: { userId: currentUser.id, online: true } }
        );
      }

      const token = generateJWT(
        currentUser.id,
        currentUser.login,
        currentUser.role,
        currentUser.name,
        currentUser.surname,
        currentUser.img
      );
      return res.json({ token });
    } catch (e) {
      next(e);
    }
  }

  // Используется для валидации сессии на фронтенде (возвращает данные из syncUserMiddleware)
  async check(req, res, next) {
    const token = generateJWT(
      req.user.id,
      req.user.login,
      req.user.role,
      req.user.name,
      req.user.surname,
      req.user.img 
    );
    res.json({ token });
  }

  // Удаление пользователя (защищено роутером через checkAbility("users.manage"))
  async deleteUser(req, res, next) {
    try {
      const id = req.params.id;
      const deleteUser = await User.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new UserController();