/**
 * utils/consts.ts - Константы маршрутов приложения
 * 
 * ОБНОВЛЕНО: Добавлен PRODUCTION_ROUTE для модуля учёта выработки
 */

// =========================================================================
// АДМИНКА
// =========================================================================

export const ADMIN_ROUTE = '/admin';
export const ADMIN_PCs_ROUTE = '/admin/pcs';
export const ADMIN_DEFECTS_FC_CATEGORIES_ROUTE = '/admin/defects-FC-categories';
export const ADMIN_DEFECTS_915_CATEGORIES_ROUTE = '/admin/defects-915-categories';
export const ADMIN_DEFECTS_2_4_CATEGORIES_ROUTE = '/admin/defects-2-4-categories';
export const ADMIN_DEFECTS_CORAL_B_CATEGORIES_ROUTE = '/admin/defects-coral-b-categories';
export const ADMIN_USERS_ROUTE = '/admin/users';
export const ADMIN_PRODUCTS_ROUTE = '/admin/products';
export const ADMIN_PRODUCTS_STATUSES_ROUTE = '/admin/products-statuses';
export const ADMIN_COMPONENTS_ROUTE = '/admin/components';
export const STRUCTURE_ROUTE = '/admin/structure';
export const AUDIT_LOG_ROUTE = '/admin/audit-log';
export const ADMIN_WAREHOUSE_ROUTE = '/admin/warehouse';
export const ADMIN_RBAC_ROUTE = '/admin/rbac';
export const ADMIN_ASSEMBLY_ROUTES_ROUTE = '/admin/assembly-routes';

// =========================================================================
// ДЕФЕКТЫ (Учёт брака)
// =========================================================================

export const DEFECTS_ROUTE = '/defects';
export const DEFECT_DETAIL_ROUTE = '/defects/:id';
export const ADMIN_DEFECT_CATEGORIES_ROUTE = '/admin/defect-categories';
export const INPUT_DEFECT_ROUTE = '/input-defect';

// =========================================================================
// СБОРКА
// =========================================================================

export const RECIPE_CONSTRUCTOR_ROUTE = '/assembly/recipes/constructor';
export const RECIPE_EXECUTION_ROUTE = '/assembly/recipes/terminal';
export const ASSEMBLY_ROUTE = '/assembly';
export const ASSEMBLED_PRODUCTS_ROUTE = '/database/assembled';

// =========================================================================
// ЛОГИН / РЕГИСТРАЦИЯ
// =========================================================================

export const LOGIN_ROUTE = '/login';
export const SELECT_PC_ROUTE = '/select-pc-for-start-session';
export const REGISTRATION_ROUTE = '/registration';
export const USERS_ROUTE = '/users';
export const PROFILE_ROUTE = '/profile';

// =========================================================================
// ОСНОВНОЕ
// =========================================================================

export const START_ROUTE = '/';
export const BETAFLIGHT_ROUTE = '/betaflight';

// =========================================================================
// ТАБЛИЦЫ ПЛАТ (Legacy)
// =========================================================================

export const FC_ROUTE = '/flight-controller';
export const ELRS_915_ROUTE = '/elrs-915';
export const ELRS_2_4_ROUTE = '/elrs-2-4';
export const CORAL_B_ROUTE = '/coral-b';

// =========================================================================
// АПК БЕРИЛЛ
// =========================================================================

export const BERYLL_ROUTE = '/beryll';
export const BERYLL_SERVER_ROUTE = '/beryll/server/:id';
export const BERYLL_BATCH_ROUTE = '/beryll/batch/:id';
export const BERYLL_MONITORING_ROUTE = '/beryll/monitoring';

// =========================================================================
// ОБЩЕЕ
// =========================================================================

export const KNOWLEDGE_BASE_ROUTE = '/knowledge-base';
export const WAREHOUSE_ROUTE = '/warehouse';

// =========================================================================
// ПРОШИВКИ (Legacy)
// =========================================================================

export const FIRMWARE_OLD_ROUTE = '/firmware-node-red';
export const FIRMWARE_FC_ROUTE = '/firmware-flight-controller';
export const FIRMWARE_915_019_ROUTE = '/firmware-915-019';
export const FIRMWARE_915_002_ROUTE = '/firmware-915-002';
export const FIRMWARE_2_4_ROUTE = '/firmware-2-4';
export const FIRMWARE_Coral_B_ROUTE = '/firmware-coral-b';
export const MQTT_CHECK_FC_ROUTE = '/mqtt-check-fc';
export const MQTT_CHECK_ESC_ROUTE = '/mqtt-check-esc';

export const TEST_ROUTE = '/test';

// =========================================================================
// РЕЙТИНГИ (KPI)
// =========================================================================

export const RANKINGS_ROUTE = '/rankings';
export const RANKINGS_CHARTS_ROUTE = '/rankings/analytics';

// =========================================================================
// СКЛАД
// =========================================================================

export const WAREHOUSE_ANALYTICS_ROUTE = '/warehouse/analytics';
export const WAREHOUSE_INVENTORY_ROUTE = '/warehouse/inventory';

// =========================================================================
// ЗАДАЧИ
// =========================================================================

export const TASKS_ROUTE = '/tasks';

// =========================================================================
// АНАЛИТИКА
// =========================================================================

export const ANALYTICS_DASHBOARD_ROUTE = '/analytics/dashboard';

// =========================================================================
// НОВОЕ: ПРОИЗВОДСТВО (Учёт выработки)
// =========================================================================

export const PRODUCTION_ROUTE = '/production';
