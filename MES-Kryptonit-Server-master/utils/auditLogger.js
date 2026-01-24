const { AuditLog } = require("../models/index");

/**
 * Универсальный логгер действий в системе.
 *
 * @param {Object} params
 * @param {Object} [params.req]        - Express request (для IP, userAgent и req.user)
 * @param {number} [params.userId]     - Явный ID пользователя (если нужно переопределить req.user.id)
 * @param {string} params.action       - Код действия (например: LOGIN, LOGOUT, TEAM_CREATE)
 * @param {string} [params.entity]     - Тип сущности (SESSION, Section, Team и т.д.)
 * @param {string|number} [params.entityId] - ID сущности
 * @param {string} [params.description]     - Человекочитаемое описание
 * @param {Object} [params.metadata]        - Доп. JSON (PC, IP и т.п.)
 */
async function logAudit({
  req,
  userId,
  action,
  entity,
  entityId,
  description,
  metadata,
}) {
  if (!action) {
    return;
  }

  try {
    // 1. Определяем пользователя
    let finalUserId = null;

    if (req && req.user && req.user.id) {
      finalUserId = req.user.id;
    } else if (userId) {
      finalUserId = userId;
    }

    // 2. Собираем метаданные
    let meta = metadata || {};

    if (req) {
      const ipHeader = req.headers["x-forwarded-for"];
      const ip =
        (typeof ipHeader === "string" ? ipHeader.split(",")[0] : null) ||
        req.connection?.remoteAddress ||
        req.ip ||
        null;

      meta = {
        ...meta,
        ip,
        userAgent: req.headers["user-agent"] || null,
      };
    }

    // 3. Пишем в БД
    await AuditLog.create({
      userId: finalUserId,
      action,
      entity: entity || null,
      entityId:
        entityId === undefined || entityId === null ? null : String(entityId),
      description: description || null,
      metadata: meta,
    });
  } catch (e) {
    console.error("ОШИБКА ЗАПИСИ АУДИТА:", e.message);
  }
}

module.exports = { logAudit };
