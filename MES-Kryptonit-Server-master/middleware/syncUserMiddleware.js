const { User, Role, Ability } = require('../models/index');
const KeycloakSyncService = require("../services/KeycloakSyncService");
const logger = require("../services/logger");
const { buildRequestLogContext } = require("../utils/logging");

module.exports = async function (req, res, next) {
    // logger.info("--- [SyncUserMiddleware] START ---");
    
    // Пропускаем preflight запросы (OPTIONS), чтобы не нагружать БД
    if (req.method === "OPTIONS") return next();

    try {
        const logContext = buildRequestLogContext(req);

        // 1. Проверка: есть ли данные от authMiddleware
        if (!req.auth || !req.auth.payload) {
            logger.error("SyncUserMiddleware auth payload missing", {
                ...logContext,
                step: "auth_payload_missing"
            });
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const payload = req.auth.payload;
        // logger.info("🔑 Данные из токена:", payload.sub);

        // 2. Извлечение данных пользователя
        const keycloakUUID = payload.sub;
        
        // Пытаемся найти логин (Keycloak может отдавать его в разных полях)
        const login = payload.preferred_username || payload.nickname || payload.email;

        if (!login) {
            logger.error("SyncUserMiddleware login claim missing", {
                ...logContext,
                step: "login_claim_missing",
                keycloakId: payload?.sub,
                claimKeys: Object.keys(payload || {})
            });
            return res.status(500).json({ message: "Token structure error: missing username" });
        }

        const name = payload.given_name || login;
        const surname = payload.family_name || '';

        // ---------------------------------------------------------------------
        // 3. RBAC: Определение роли на основе Keycloak
        // ---------------------------------------------------------------------
        
        // Получаем массив ролей из токена
        const kcRoles = payload.realm_access?.roles || [];
        
        // Определяем основную роль через синхронизированный приоритет в БД
        const mainRole = await KeycloakSyncService.getMainRole(kcRoles);

        // ---------------------------------------------------------------------
        // 4. Синхронизация с БД (Поиск / Создание / Обновление)
        // ---------------------------------------------------------------------
        
        logger.info("SyncUserMiddleware user lookup db start", {
            ...logContext,
            step: "db_start",
            login
        });
        let user = await User.findOne({ where: { login } });
        logger.info("SyncUserMiddleware user lookup db ok", {
            ...logContext,
            step: "db_ok",
            userId: user?.id,
            login
        });

        if (!user) {
            logger.info("SyncUserMiddleware user create db start", {
                ...logContext,
                step: "db_start",
                login,
                role: mainRole
            });
            try {
                user = await User.create({
                    login,
                    name,
                    surname,
                    role: mainRole,
                    password: 'sso_managed_account', // Пароль не используется при SSO
                    img: null
                });
                logger.info("SyncUserMiddleware user create db ok", {
                    ...logContext,
                    step: "db_ok",
                    userId: user.id,
                    login
                });
            } catch (dbError) {
                logger.error("SyncUserMiddleware user create db error", {
                    ...logContext,
                    step: "db_error",
                    login,
                    error: dbError.message
                });
                return res.status(500).json({ message: "DB Error during user creation" });
            }
        } else {
            // Если пользователь есть, но его роль в Keycloak изменилась — обновляем БД
            if (user.role !== mainRole) {
                logger.info("SyncUserMiddleware user role update db start", {
                    ...logContext,
                    step: "db_start",
                    login,
                    fromRole: user.role,
                    toRole: mainRole
                });
                user.role = mainRole;
                await user.save();
                logger.info("SyncUserMiddleware user role update db ok", {
                    ...logContext,
                    step: "db_ok",
                    userId: user.id,
                    login,
                    role: mainRole
                });
            }
        }

        // ---------------------------------------------------------------------
        // 5. Загрузка Прав (Abilities) для этой роли
        // ---------------------------------------------------------------------
        
        let abilities = [];
        try {
            logger.info("SyncUserMiddleware abilities load db start", {
                ...logContext,
                step: "db_start",
                role: mainRole
            });
            const roleEntity = await Role.findOne({
                where: { name: mainRole },
                include: [{
                    model: Ability, as: "abilities",
                    through: { attributes: [] }
                }]
            });

            if (roleEntity && roleEntity.abilities) {
                abilities = roleEntity.abilities.map(ab => ab.code);
            }
            logger.info("SyncUserMiddleware abilities load db ok", {
                ...logContext,
                step: "db_ok",
                role: mainRole,
                abilitiesCount: abilities.length
            });
        } catch (e) {
            logger.error("SyncUserMiddleware abilities load db error", {
                ...logContext,
                step: "db_error",
                role: mainRole,
                error: e.message
            });
        }

        // ---------------------------------------------------------------------
        // 6. Формирование контекста запроса (req.user)
        // ---------------------------------------------------------------------
        
        req.user = {
            id: user.id,
            login: user.login,
            name: user.name,
            surname: user.surname,
            role: user.role,        // Текущая роль в нашей системе
            roles: kcRoles,         // Все сырые роли из Keycloak (на всякий случай)
            abilities: abilities,   // Список прав (строки-слаги) ['warehouse.view', ...]
            keycloakId: keycloakUUID
        };
        
        next();

    } catch (e) {
        logger.error("SyncUserMiddleware crash", {
            ...buildRequestLogContext(req),
            step: "middleware_error",
            error: e.message
        });
        return res.status(500).json({ message: "Sync Middleware Crash", error: e.message });
    }
};
