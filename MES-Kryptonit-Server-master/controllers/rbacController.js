const { Role, Ability, RoleAbility } = require("../models/index");
const ApiError = require("../error/ApiError");
const logger = require("../services/logger");
const { buildRequestLogContext } = require("../utils/logging");

class RbacController {
    // 1. Получить все роли вместе с их правами
    async getRoles(req, res, next) {
        try {
            const logContext = buildRequestLogContext(req, { includeInput: true });
            logger.info("RBAC roles db start", { ...logContext, step: "db_start" });
            const roles = await Role.findAll({
                include: [{
                    model: Ability,
                    through: { attributes: [] }
                }],
                order: [['id', 'ASC']]
            });
            logger.info("RBAC roles db ok", {
                ...logContext,
                step: "db_ok",
                rolesCount: roles.length
            });
            return res.json(roles);
        } catch (e) {
            logger.error("RBAC roles db error", {
                ...buildRequestLogContext(req, { includeInput: true }),
                step: "db_error",
                error: e.message
            });
            next(ApiError.internal(e.message));
        }
    }

    // 2. Получить список всех возможных прав (для отрисовки колонок таблицы)
    async getAbilities(req, res, next) {
        try {
            const logContext = buildRequestLogContext(req, { includeInput: true });
            logger.info("RBAC abilities db start", { ...logContext, step: "db_start" });
            const abilities = await Ability.findAll({
                order: [['code', 'ASC']]
            });
            logger.info("RBAC abilities db ok", {
                ...logContext,
                step: "db_ok",
                abilitiesCount: abilities.length
            });
            return res.json(abilities);
        } catch (e) {
            logger.error("RBAC abilities db error", {
                ...buildRequestLogContext(req, { includeInput: true }),
                step: "db_error",
                error: e.message
            });
            next(ApiError.internal(e.message));
        }
    }

    // 3. Обновить права для роли (Полная перезапись прав роли)
    async updateRoleAbilities(req, res, next) {
        try {
            const logContext = buildRequestLogContext(req, { includeInput: true });
            const { roleId } = req.params;
            const { abilityIds } = req.body;

            logger.info("RBAC role abilities db start", {
                ...logContext,
                step: "db_start",
                roleId,
                abilityIdsCount: Array.isArray(abilityIds) ? abilityIds.length : 0
            });
            const role = await Role.findByPk(roleId);
            if (!role) {
                logger.error("RBAC role not found", {
                    ...logContext,
                    step: "db_error",
                    roleId
                });
                return next(ApiError.badRequest("Роль не найдена"));
            }

            // Sequelize метод setAbilities перезаписывает связи
            await role.setAbilities(abilityIds);

            logger.info("RBAC role abilities db ok", {
                ...logContext,
                step: "db_ok",
                roleId
            });
            return res.json({ message: "Права роли обновлены" });
        } catch (e) {
            logger.error("RBAC role abilities db error", {
                ...buildRequestLogContext(req, { includeInput: true }),
                step: "db_error",
                error: e.message
            });
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new RbacController();
