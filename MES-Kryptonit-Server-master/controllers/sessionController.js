const { Session, PC } = require("../models/index");
const ApiError = require("../error/ApiError");
const { logAudit } = require("../utils/auditLogger");
const logger = require("../services/logger");

class SessionController {
  async getSessions(req, res, next) {
    try {
      const sessionAll = await Session.findAll();
      return res.json(sessionAll);
    } catch (e) {
      next(e);
    }
  }

  // Ручное создание (используется редко, но оставим для совместимости)
  async postSession(req, res, next) {
    try {
      const { online, userId, PCId } = req.body;

      const newSession = await Session.create({
        online,
        userId,
        PCId: PCId || null,
      });

      await logAudit({
        req,
        userId,
        action: "SESSION_CREATE",
        entity: "SESSION",
        entityId: newSession.id,
        description: `Создана сессия вручную (userId=${userId}, PCId=${PCId || 'PERSONAL'}, online=${online})`,
        metadata: { userId, PCId, online },
      });

      return res.json(newSession);
    } catch (e) {
      next(e);
    }
  }

  // Основной метод входа/выхода
  async setOnlineSession(req, res, next) {
    try {
      // PCId может быть null (личный ноутбук)
      const { online, PCId, userId: bodyUserId } = req.body;

      const currentUserId = (req.user && req.user.id) || bodyUserId;

      if (typeof online === "undefined" || !currentUserId) {
        return next(
          ApiError.badRequest(
            "Не переданы обязательные поля: online, userId"
          )
        );
      }

      // 1. Сбрасываем другие активные сессии этого пользователя, чтобы он не был онлайн в двух местах
      if (online === true) {
        await Session.update(
            { online: false },
            { 
                where: { 
                    userId: currentUserId, 
                    online: true
                } 
            }
        );
      }

      // 2. Ищем существующую запись сессии или создаем новую
      let session;
      
      if (PCId) {
          // Если выбран конкретный ПК из базы
          session = await Session.findOne({
            where: { userId: currentUserId, PCId },
          });
      } else {
          // Если это личный ноутбук (PCId is NULL)
          session = await Session.findOne({
            where: { userId: currentUserId, PCId: null },
          });
      }

      if (session) {
        await session.update({ online });
      } else {
        session = await Session.create({
          online,
          userId: currentUserId,
          PCId: PCId || null,
        });
      }

      // 3. Подготовка данных для аудита
      let pcName = "Личный ноутбук";
      let pcIp = "Dynamic";

      if (PCId) {
        try {
          const pc = await PC.findByPk(PCId);
          if (pc) {
            pcName = pc.pc_name;
            pcIp = pc.ip;
          }
        } catch (err) {
          logger.error("Ошибка при чтении ПК для аудита:", err);
        }
      }

      const action = online ? "LOGIN" : "LOGOUT";
      const humanPc = pcName;
      const descr = online
        ? `Вход в систему. Устройство: ${humanPc}${pcIp !== "Dynamic" ? ` (${pcIp})` : ""}`
        : `Выход из системы. Устройство: ${humanPc}`;

      await logAudit({
        req,
        userId: currentUserId,
        action,
        entity: "SESSION",
        entityId: session.id,
        description: descr,
        metadata: {
          PCId: PCId || "PERSONAL",
          pcName,
          pcIp,
          online,
          userId: currentUserId,
        },
      });

      return res.json(session);
    } catch (e) {
      next(e);
    }
  }

  async deleteSession(req, res, next) {
    try {
      const id = req.params.id;
      const session = await Session.findByPk(id);

      await Session.destroy({ where: { id } });

      await logAudit({
        req,
        userId: session ? session.userId : undefined,
        action: "SESSION_DELETE",
        entity: "SESSION",
        entityId: id,
        description: "Сессия удалена администратором",
        metadata: session
          ? { userId: session.userId, PCId: session.PCId }
          : { sessionId: id },
      });

      return res.json("ok");
    } catch (e) {
      next(e);
    }
  }

  async setOfflineSession(req, res, next) {
    try {
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();

      // Разрешаем сброс только ночью (около полуночи)
      if (
        (hours === 23 && minutes >= 59) ||
        hours === 0 ||
        (hours === 1 && minutes <= 1)
      ) {
        const [updated] = await Session.update(
          { online: false },
          { where: { online: true } }
        );

        await logAudit({
          req,
          action: "SESSION_AUTO_OFF",
          entity: "SESSION",
          description: `Ночной сброс сессий. Переведено в offline: ${updated}`,
          metadata: { updatedCount: updated },
        });

        return res.json("Все активные сессии сброшены");
      } else {
        return res.json("Сейчас не время для сброса");
      }
    } catch (e) {
      next(e);
    }
  }

  async offlineSessionManual(req, res, next) {
    try {
      const [updated] = await Session.update(
        { online: false },
        { where: { online: true } }
      );

      await logAudit({
        req,
        action: "SESSION_FORCE_OFF",
        entity: "SESSION",
        description: `Ручной сброс всех активных сессий. Переведено в offline: ${updated}`,
        metadata: { updatedCount: updated },
      });

      return res.json("Все активные сессии сброшены");
    } catch (e) {
      next(e);
    }
  }
}

module.exports = new SessionController();