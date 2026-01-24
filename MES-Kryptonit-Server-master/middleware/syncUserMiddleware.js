const { User, Role, Ability } = require('../models/index');

module.exports = async function (req, res, next) {
    // console.log("--- [SyncUserMiddleware] START ---");
    
    // Пропускаем preflight запросы (OPTIONS), чтобы не нагружать БД
    if (req.method === "OPTIONS") return next();

    try {
        // 1. Проверка: есть ли данные от authMiddleware
        if (!req.auth || !req.auth.payload) {
            console.error("❌ ОШИБКА: authMiddleware не передал payload. Токен невалиден или не проверен.");
            return res.status(401).json({ message: "Invalid token payload" });
        }

        const payload = req.auth.payload;
        // console.log("🔑 Данные из токена:", payload.sub);

        // 2. Извлечение данных пользователя
        const keycloakUUID = payload.sub;
        
        // Пытаемся найти логин (Keycloak может отдавать его в разных полях)
        const login = payload.preferred_username || payload.nickname || payload.email;

        if (!login) {
            console.error("❌ ОШИБКА: В токене нет поля login (preferred_username/nickname/email).");
            return res.status(500).json({ message: "Token structure error: missing username" });
        }

        const name = payload.given_name || login;
        const surname = payload.family_name || '';

        // ---------------------------------------------------------------------
        // 3. RBAC: Определение роли на основе Keycloak
        // ---------------------------------------------------------------------
        
        // Получаем массив ролей из токена
        const kcRoles = payload.realm_access?.roles || [];
        
        // Список ролей, которые существуют в нашей системе (в порядке приоритета)
        const priorityRoles = [
            "SUPER_ADMIN", 
            "PRODUCTION_CHIEF", 
            "TECHNOLOGIST", 
            "WAREHOUSE_MASTER", 
            "QC_ENGINEER", 
            "FIRMWARE_OPERATOR", 
            "ASSEMBLER"
        ];

        // Ищем первую роль из списка priorityRoles, которая есть у пользователя в Keycloak.
        // Если ничего не нашли — выдаем базовую роль "ASSEMBLER" (или "USER")
        const mainRole = priorityRoles.find(r => kcRoles.includes(r)) || "ASSEMBLER";

        // ---------------------------------------------------------------------
        // 4. Синхронизация с БД (Поиск / Создание / Обновление)
        // ---------------------------------------------------------------------
        
        let user = await User.findOne({ where: { login } });

        if (!user) {
            console.log(`ℹ️ Пользователь ${login} не найден. Создаем с ролью ${mainRole}...`);
            try {
                user = await User.create({
                    login,
                    name,
                    surname,
                    role: mainRole,
                    password: 'sso_managed_account', // Пароль не используется при SSO
                    img: null
                });
                console.log(`✅ Пользователь создан. ID: ${user.id}`);
            } catch (dbError) {
                console.error("❌ ОШИБКА БАЗЫ ДАННЫХ при создании:", dbError);
                return res.status(500).json({ message: "DB Error during user creation" });
            }
        } else {
            // Если пользователь есть, но его роль в Keycloak изменилась — обновляем БД
            if (user.role !== mainRole) {
                console.log(`🔄 Обновление роли пользователя ${login}: ${user.role} -> ${mainRole}`);
                user.role = mainRole;
                await user.save();
            }
        }

        // ---------------------------------------------------------------------
        // 5. Загрузка Прав (Abilities) для этой роли
        // ---------------------------------------------------------------------
        
        let abilities = [];
        try {
            const roleEntity = await Role.findOne({
                where: { name: mainRole },
                include: [{
                    model: Ability,
                    through: { attributes: [] }
                }]
            });

            if (roleEntity && roleEntity.abilities) {
                abilities = roleEntity.abilities.map(ab => ab.code);
            }
        } catch (e) {
            console.error("⚠️ Ошибка при загрузке прав (abilities):", e.message);
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
        console.error("🔥 КРИТИЧЕСКАЯ ОШИБКА в syncUserMiddleware:", e);
        return res.status(500).json({ message: "Sync Middleware Crash", error: e.message });
    }
};