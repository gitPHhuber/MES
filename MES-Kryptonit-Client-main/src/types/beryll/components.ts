/**
 * components.ts
 * 
 * Типы для работы с комплектующими серверов Beryll
 * Включает: компоненты, BMC синхронизация, история изменений
 * 
 * Положить в: src/types/beryll/components.ts
 */

// ============================================
// БАЗОВЫЕ ТИПЫ
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
  | 'FAN'
  | 'CHASSIS'
  | 'OTHER';

export type ComponentStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'REPLACED';

export type DataSource = 'BMC' | 'REDFISH' | 'MANUAL' | 'IMPORT' | 'REPLACEMENT';

export type BMCDiscrepancyReason = 
  | 'NOT_FOUND_IN_BMC'
  | 'REMOVED_FROM_BMC'
  | 'DATA_MISMATCH'
  | 'SERIAL_CHANGED';

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
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  
  // Расположение
  slot?: string;
  
  // Характеристики
  capacity?: number;
  speed?: string;
  firmwareVersion?: string;
  
  // Состояние
  status: ComponentStatus;
  healthPercent?: number;
  
  // Метаданные
  dataSource?: DataSource;
  metadata?: ComponentMetadata;
  lastUpdatedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Связи
  inventoryId?: number;
  catalogId?: number;
  installedById?: number;
  
  // BMC расхождения
  bmcDiscrepancy?: boolean;
  bmcDiscrepancyReason?: BMCDiscrepancyReason;
}

export interface ComponentMetadata {
  // CPU
  cores?: number;
  threads?: number;
  architecture?: string;
  
  // RAM
  memoryType?: string;
  rank?: number;
  
  // Storage
  mediaType?: string;
  interface?: string;
  
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
// API RESPONSES - БАЗОВЫЕ
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
  discrepancyCount?: number;
}

export interface BMCCheckResponse {
  success: boolean;
  redfishVersion?: string;
  bmcAddress?: string;
  error?: string;
}

export interface FetchComponentsResponse {
  success: boolean;
  message: string;
  components: ServerComponent[];
}

// ============================================
// BMC СИНХРОНИЗАЦИЯ
// ============================================

export type SyncMode = 'compare' | 'force' | 'merge';

export interface BMCComponent {
  componentType: ComponentType;
  name?: string;
  slot?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  partNumber?: string;
  firmwareVersion?: string;
  status?: string;
  capacityBytes?: number;
  speedMHz?: number;
  speedMT?: number;
  speed?: number;
  cores?: number;
  threads?: number;
  architecture?: string;
  memoryType?: string;
  rank?: string;
  mediaType?: string;
  interface?: string;
  macAddress?: string;
  linkSpeed?: string;
  health?: number | string;
}

export interface ComponentDifference {
  field: string;
  db: string | null;
  bmc: string | null;
}

export interface ComparisonMatchedItem {
  dbComponent: ServerComponent;
  bmcComponent: BMCComponent;
}

export interface ComparisonMissingItem {
  dbComponent: ServerComponent;
  isManual: boolean;
  reason: string;
}

export interface ComparisonNewItem {
  bmcComponent: BMCComponent;
  reason: string;
}

export interface ComparisonMismatchItem {
  dbComponent: ServerComponent;
  bmcComponent: BMCComponent;
  differences: ComponentDifference[];
}

export interface ComparisonDetails {
  matched: ComparisonMatchedItem[];
  missingInBmc: ComparisonMissingItem[];
  newInBmc: ComparisonNewItem[];
  mismatches: ComparisonMismatchItem[];
}

export interface ComparisonSummary {
  total: {
    inDb: number;
    inBmc: number;
  };
  matched: number;
  missingInBmc: number;
  newInBmc: number;
  mismatches: number;
}

export interface BMCCompareResponse {
  success: boolean;
  mode: 'compare';
  hasDiscrepancies: boolean;
  summary: ComparisonSummary;
  details: ComparisonDetails;
  message?: string;
}

export interface BMCForceResponse {
  success: boolean;
  mode: 'force';
  message: string;
  manualPreserved: number;
  components: ServerComponent[];
}

export interface BMCMergeActions {
  updated: Array<{
    id: number;
    serialNumber: string | null;
    changes: ComponentDifference[];
  }>;
  added: ServerComponent[];
  preserved: ServerComponent[];
  flaggedForReview: Array<{
    id: number;
    serialNumber: string | null;
    reason: string;
  }>;
}

export interface BMCMergeResponse {
  success: boolean;
  mode: 'merge';
  message: string;
  actions: BMCMergeActions;
}

export type BMCSyncResponse = BMCCompareResponse | BMCForceResponse | BMCMergeResponse;

export interface BMCSyncRequest {
  mode: SyncMode;
  preserveManual?: boolean;
}

export interface ResolveDiscrepancyRequest {
  resolution: 'keep' | 'delete';
}

export interface ResolveDiscrepancyResponse {
  success: boolean;
  action: 'kept' | 'deleted';
  component?: ServerComponent;
}

// ============================================
// ДОБАВЛЕНИЕ/РЕДАКТИРОВАНИЕ
// ============================================

export interface AddComponentData {
  componentType: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  status?: string;
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
  status?: string;
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
// ИСТОРИЯ ИЗМЕНЕНИЙ
// ============================================

export type ComponentHistoryAction = 
  | 'ADDED' 
  | 'UPDATED' 
  | 'REPLACED' 
  | 'REMOVED' 
  | 'SERIAL_CHANGED'
  | 'COMPONENTS_FETCHED'
  | 'COMPONENTS_MERGED'
  | 'DISCREPANCY_RESOLVED';

export interface ComponentHistoryEntry {
  id: number;
  action: ComponentHistoryAction;
  componentId: number;
  serverId: number;
  userId: number;
  userName?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  performedAt: string;
}

// ============================================
// ПОИСК
// ============================================

export interface ComponentSearchParams {
  serialNumber?: string;
  serialNumberYadro?: string;
  componentType?: string;
  serverId?: number;
}

export interface ComponentSearchResult {
  found: boolean;
  component?: ServerComponent;
  server?: {
    id: number;
    apkSerialNumber: string;
    hostname?: string;
    ipAddress?: string;
  };
  suggestions?: ServerComponent[];
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
  FAN: 'Вентилятор',
  CHASSIS: 'Корпус',
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
  FAN: 'fan',
  CHASSIS: 'box',
  OTHER: 'settings'
};

export const BMC_DISCREPANCY_LABELS: Record<BMCDiscrepancyReason, string> = {
  NOT_FOUND_IN_BMC: 'Не найден в BMC',
  REMOVED_FROM_BMC: 'Удалён из BMC',
  DATA_MISMATCH: 'Данные отличаются',
  SERIAL_CHANGED: 'Изменён S/N'
};

// ============================================
// УТИЛИТЫ
// ============================================

export function formatBytes(bytes: number | undefined | null): string {
  if (!bytes || bytes === 0) return '0 B';
  
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function isStorageComponent(type: ComponentType): boolean {
  return ['HDD', 'SSD', 'NVME'].includes(type);
}

export function getStatusColor(status: ComponentStatus): string {
  return COMPONENT_STATUS_COLORS[status] || COMPONENT_STATUS_COLORS.UNKNOWN;
}