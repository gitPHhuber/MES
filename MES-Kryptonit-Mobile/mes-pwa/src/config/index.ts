/**
 * Конфигурация приложения MES Kryptonit PWA
 * 
 * Основные настройки API и Keycloak находятся в src/api/client.ts
 */

// Re-export из client для удобства
export { API_BASE_URL, KEYCLOAK_CONFIG } from '../api/client'

// ============================================================================
// Таймауты и кеширование
// ============================================================================

export const config = {
  // Таймауты
  REQUEST_TIMEOUT: 15000,
  
  // Кеширование
  CACHE_TTL: 5 * 60 * 1000, // 5 минут
  
  // Debug режим
  DEBUG: import.meta.env.DEV,
}

// ============================================================================
// Статусы и константы
// ============================================================================

export const PRODUCT_STATUS = {
  IN_PRODUCTION: 'IN_PRODUCTION',
  QUALITY_CONTROL: 'QUALITY_CONTROL',
  READY: 'READY',
  SHIPPED: 'SHIPPED',
  DEFECT: 'DEFECT',
  ARCHIVED: 'ARCHIVED',
} as const

export const TASK_STATUS = {
  PENDING: 'PENDING',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
  ON_HOLD: 'ON_HOLD',
} as const

export const BOX_STATUS = {
  ACTIVE: 'ACTIVE',
  RESERVED: 'RESERVED',
  EMPTY: 'EMPTY',
  WRITTEN_OFF: 'WRITTEN_OFF',
} as const

export const STATUS_COLORS: Record<string, 'primary' | 'success' | 'warning' | 'danger' | 'neutral'> = {
  // Products
  IN_PRODUCTION: 'warning',
  QUALITY_CONTROL: 'primary',
  READY: 'success',
  SHIPPED: 'primary',
  DEFECT: 'danger',
  ARCHIVED: 'neutral',
  // Tasks
  PENDING: 'warning',
  IN_PROGRESS: 'primary',
  COMPLETED: 'success',
  CANCELLED: 'danger',
  ON_HOLD: 'neutral',
  // Boxes
  ACTIVE: 'success',
  RESERVED: 'warning',
  EMPTY: 'neutral',
  WRITTEN_OFF: 'danger',
}

export const STATUS_LABELS: Record<string, string> = {
  // Products
  IN_PRODUCTION: 'В производстве',
  QUALITY_CONTROL: 'Контроль качества',
  READY: 'Готов',
  SHIPPED: 'Отгружен',
  DEFECT: 'Брак',
  ARCHIVED: 'В архиве',
  // Tasks
  PENDING: 'Ожидает',
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Завершена',
  CANCELLED: 'Отменена',
  ON_HOLD: 'На паузе',
  // Boxes
  ACTIVE: 'Активна',
  RESERVED: 'Резерв',
  EMPTY: 'Пусто',
  WRITTEN_OFF: 'Списана',
}

export const USER_ROLES: Record<string, string> = {
  SUPER_ADMIN: 'Суперадмин',
  PRODUCTION_CHIEF: 'Начальник производства',
  WAREHOUSE_MASTER: 'Кладовщик',
  TECHNOLOGIST: 'Технолог',
  ASSEMBLER: 'Сборщик',
  QC_INSPECTOR: 'Контролёр ОТК',
  REPAIR_TECHNICIAN: 'Ремонтник',
}

export default config
