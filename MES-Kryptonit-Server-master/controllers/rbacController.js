const { Role, Ability, RoleAbility } = require("../models/index");
const ApiError = require("../error/ApiError");

class RbacController {
    // 1. Получить все роли вместе с их правами
    async getRoles(req, res, next) {
        try {
            const roles = await Role.findAll({
                include: [{
                    model: Ability,
                    through: { attributes: [] }
                }],
                order: [['id', 'ASC']]
            });
            return res.json(roles);
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // 2. Получить список всех возможных прав (для отрисовки колонок таблицы)
    async getAbilities(req, res, next) {
        try {
            const abilities = await Ability.findAll({
                order: [['code', 'ASC']]
            });
            return res.json(abilities);
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }

    // 3. Обновить права для роли (Полная перезапись прав роли)
    async updateRoleAbilities(req, res, next) {
        try {
            const { roleId } = req.params;
            const { abilityIds } = req.body;

            const role = await Role.findByPk(roleId);
            if (!role) {
                return next(ApiError.badRequest("Роль не найдена"));
            }

            // Sequelize метод setAbilities перезаписывает связи
            await role.setAbilities(abilityIds);

            return res.json({ message: "Права роли обновлены" });
        } catch (e) {
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new RbacController();