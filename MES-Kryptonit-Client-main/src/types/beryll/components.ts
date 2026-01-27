/**
 * components.ts
 * 
 * Типы для работы с комплектующими серверов
 * Включает поддержку двойных серийных номеров (Yadro + производитель)
 * 
 * Положить в: src/types/beryll/components.ts
 */

// ============================================
// ТИПЫ КОМПОНЕНТОВ
// ============================================

export type ComponentType = 
  | 'CPU' 
  | 'RAM' 
  | 'HDD' 
  | 'SSD' 
  | 'NVME' 
  | 'NIC' 
  | 'MOTHERBOARD' 
  | 'PSU' 
  | 'GPU' 
  | 'RAID' 
  | 'BMC' 
  | 'OTHER';

export type ComponentStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'REPLACED';

export type DataSource = 'BMC' | 'REDFISH' | 'MANUAL' | 'IMPORT' | 'REPLACEMENT';

// ============================================
// ОСНОВНОЙ ИНТЕРФЕЙС КОМПОНЕНТА
// ============================================

export interface ServerComponent {
  id: number;
  serverId: number;
  
  // Тип и название
  componentType: ComponentType;
  name: string;
  
  // Производитель и модель
  manufacturer?: string;
  model?: string;
  
  // Серийные номера
  serialNumber?: string;          // Заводской S/N производителя
  serialNumberYadro?: string;     // Внутренний S/N Yadro (наклейка)
  partNumber?: string;            // Артикул (P/N)
  
  // Расположение
  slot?: string;                  // Слот (например: DIMM_A1, SSD_1, PSU_1)
  
  // Характеристики
  capacity?: number;              // Объём в байтах
  speed?: string;                 // Частота/скорость (например: 2934 MT/s)
  firmwareVersion?: string;       // Версия прошивки
  
  // Состояние
  status: ComponentStatus;
  healthPercent?: number;         // Здоровье в процентах (0-100)
  
  // Метаданные
  dataSource?: DataSource;
  metadata?: ComponentMetadata;
  lastUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Связи
  inventoryId?: number;           // Связь с инвентарём
  catalogId?: number;             // Связь с каталогом
  installedById?: number;         // Кто установил
}

export interface ComponentMetadata {
  // CPU
  cores?: number;
  threads?: number;
  architecture?: string;
  
  // RAM
  memoryType?: string;            // DDR4, DDR5
  rank?: number;
  
  // Storage
  mediaType?: string;             // SSD, HDD, NVMe
  interface?: string;             // SATA, NVMe, SAS
  
  // Network
  macAddress?: string;
  linkSpeed?: string;
  
  // Общие
  health?: string | number;
  fetchedById?: number;
  
  // Замена
  replacedAt?: string;
  replacedById?: number;
  reason?: string;
  replacesComponentId?: number;
  replacementReason?: string;
  defectRecordId?: number;
  inventorySourceId?: number;
}

// ============================================
// API RESPONSES
// ============================================

export interface ComponentsResponse {
  server: {
    id: number;
    ipAddress?: string;
    hostname?: string;
    apkSerialNumber?: string;
    lastComponentsFetchAt?: string;
  };
  summary: {
    totalRAMBytes: number;
    totalStorageBytes: number;
    totalRAM: string;
    totalStorage: string;
    cpuCores: number;
    cpuThreads: number;
    totalComponents: number;
  };
  grouped: {
    CPU: ServerComponent[];
    RAM: ServerComponent[];
    storage: ServerComponent[];
    NIC: ServerComponent[];
    other: ServerComponent[];
  };
  components: ServerComponent[];
}

export interface BMCCheckResponse {
  reachable: boolean;
  latency?: number;
  bmcAddress?: string;
  message?: string;
}

export interface FetchComponentsResponse {
  success: boolean;
  message: string;
  components: ServerComponent[];
}

// ============================================
// КОНСТАНТЫ ДЛЯ UI
// ============================================

export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  CPU: 'Процессор',
  RAM: 'Оперативная память',
  HDD: 'Жёсткий диск',
  SSD: 'Твердотельный накопитель',
  NVME: 'NVMe накопитель',
  NIC: 'Сетевая карта',
  MOTHERBOARD: 'Материнская плата',
  PSU: 'Блок питания',
  GPU: 'Видеокарта',
  RAID: 'RAID-контроллер',
  BMC: 'BMC',
  OTHER: 'Прочее'
};

export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  OK: 'Исправен',
  WARNING: 'Предупреждение',
  CRITICAL: 'Критическое',
  UNKNOWN: 'Неизвестно',
  REPLACED: 'Заменён'
};

export const COMPONENT_STATUS_COLORS: Record<ComponentStatus, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  UNKNOWN: 'bg-slate-100 text-slate-500 border-slate-300',
  REPLACED: 'bg-violet-100 text-violet-700 border-violet-300'
};

export const COMPONENT_TYPE_ICONS: Record<ComponentType, string> = {
  CPU: 'cpu',
  RAM: 'memory-stick',
  HDD: 'hard-drive',
  SSD: 'hard-drive',
  NVME: 'hard-drive',
  NIC: 'network',
  MOTHERBOARD: 'circuit-board',
  PSU: 'zap',
  GPU: 'circuit-board',
  RAID: 'hard-drive',
  BMC: 'server',
  OTHER: 'settings'
};

// ============================================
// ИСТОРИЯ ИЗМЕНЕНИЙ
// ============================================

export type ComponentHistoryAction = 
  | 'ADDED' 
  | 'UPDATED' 
  | 'REPLACED' 
  | 'REMOVED' 
  | 'SERIAL_CHANGED'
  | 'COMPONENTS_FETCHED'
  | 'COMPONENTS_BATCH_ADDED';

export interface ComponentHistoryEntry {
  id: number;
  action: ComponentHistoryAction;
  serverId: number;
  userId: number;
  userName?: string;
  comment?: string;
  metadata?: {
    componentId?: number;
    componentType?: string;
    oldValues?: Record<string, any>;
    newValues?: Record<string, any>;
    oldComponent?: Partial<ServerComponent>;
    newComponentId?: number;
    reason?: string;
    count?: number;
    ids?: number[];
  };
  createdAt: string;
}

// ============================================
// ФОРМЫ И ВВОД
// ============================================

export interface ComponentFormData {
  componentType: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  serialNumberYadro: string;
  partNumber: string;
  slot: string;
  status: ComponentStatus;
  capacity?: string;
  speed?: string;
}

export interface AddComponentData {
  componentType: ComponentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  status?: ComponentStatus;
  capacity?: number;
  speed?: string;
  firmwareVersion?: string;
  metadata?: Record<string, any>;
}

export interface UpdateComponentData {
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  status?: ComponentStatus;
  firmwareVersion?: string;
  capacity?: number;
  speed?: string;
  metadata?: Record<string, any>;
}

export interface ReplaceComponentData {
  newSerialNumber?: string;
  newSerialNumberYadro?: string;
  newManufacturer?: string;
  newModel?: string;
  newPartNumber?: string;
  reason?: string;
  defectRecordId?: number;
  inventoryComponentId?: number;
}

// ============================================
// ПОИСК И СКАНИРОВАНИЕ
// ============================================

export interface ComponentSearchParams {
  serialNumber?: string;
  serialNumberYadro?: string;
  componentType?: ComponentType;
  serverId?: number;
}

export interface ComponentSearchResult {
  found: boolean;
  count?: number;
  component?: ServerComponent;
  components?: ServerComponent[];
  server?: {
    id: number;
    apkSerialNumber: string;
    hostname?: string;
  };
  suggestions?: ServerComponent[];
}

export interface SerialCheckResult {
  unique: boolean;
  conflictsWith?: {
    componentId: number;
    serverId: number;
    serverSerial: string;
  };
}

// ============================================
// УТИЛИТЫ
// ============================================

/**
 * Форматирование байт в читаемый вид
 */
export function formatBytes(bytes: number | string | null | undefined): string {
  if (!bytes) return '—';
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(b) || b === 0) return '—';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i > 2 ? 1 : 0)} ${units[i]}`;
}

/**
 * Генерация имени компонента
 */
export function generateComponentName(component: Partial<ServerComponent>): string {
  if (component.name) return component.name;
  
  const parts: string[] = [];
  if (component.manufacturer) parts.push(component.manufacturer);
  if (component.model) parts.push(component.model);
  if (parts.length === 0 && component.componentType) {
    parts.push(COMPONENT_TYPE_LABELS[component.componentType] || component.componentType);
  }
  
  return parts.join(' ').trim() || 'Комплектующее';
}

/**
 * Получить полный серийный номер для отображения
 */
export function getDisplaySerial(component: ServerComponent): string {
  if (component.serialNumberYadro && component.serialNumber) {
    return `${component.serialNumberYadro} / ${component.serialNumber}`;
  }
  return component.serialNumberYadro || component.serialNumber || '—';
}