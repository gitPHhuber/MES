/**
 * Типы для комплектующих серверов
 * 
 * Положить в: src/types/beryll/components.ts
 */

export type ComponentType = 
  | 'CPU' 
  | 'RAM' 
  | 'SSD' 
  | 'HDD' 
  | 'NVME' 
  | 'NIC' 
  | 'MOTHERBOARD' 
  | 'PSU' 
  | 'GPU' 
  | 'RAID' 
  | 'BMC' 
  | 'OTHER';

export type ComponentStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN';

export interface ServerComponent {
  id: number;
  serverId: number;
  componentType: ComponentType;
  slot?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  partNumber?: string;
  capacity?: string;
  capacityBytes?: number;

  capacityFormatted?: string;
  speedFormatted?: string; 
  
  // CPU
  cores?: number;
  threads?: number;
  speedMHz?: number;
  architecture?: string;
  
  // RAM
  memoryType?: string;
  speedMT?: number;
  rank?: number;
  
  // Storage
  mediaType?: string;
  interface?: string;
  firmwareVersion?: string;
  
  // NIC
  macAddress?: string;
  linkSpeed?: string;
  
  // Status
  status: ComponentStatus;
  health?: string;
  healthRollup?: string;
  
  // Meta
  rawData?: any;
  fetchedAt?: string;
  fetchedById?: number;
  createdAt: string;
  updatedAt: string;
}

export interface ComponentsSummary {
  totalRAM: number;
  totalStorage: number;
  cpuCores: number;
  cpuThreads: number;
}

export interface ComponentsGrouped {
  CPU: ServerComponent[];
  RAM: ServerComponent[];
  storage: ServerComponent[];
  NIC: ServerComponent[];
  other: ServerComponent[];
}

export interface ComponentsResponse {
  server: {
    id: number;
    ipAddress: string;
    hostname?: string;
    apkSerialNumber?: string;
    lastComponentsFetchAt?: string;
  };
  summary: ComponentsSummary;
  grouped: ComponentsGrouped;
  components: ServerComponent[];
}

export interface BMCCheckResponse {
  serverId: number;
  bmcAddress: string;
  success: boolean;
  redfishVersion?: string;
  name?: string;
  uuid?: string;
  error?: string;
}

export interface FetchComponentsResponse {
  success: boolean;
  message: string;
  components: ServerComponent[];
}

// Лейблы
export const COMPONENT_TYPE_LABELS: Record<ComponentType, string> = {
  CPU: 'Процессор',
  RAM: 'Оперативная память',
  SSD: 'SSD накопитель',
  HDD: 'HDD накопитель',
  NVME: 'NVMe накопитель',
  NIC: 'Сетевой адаптер',
  MOTHERBOARD: 'Материнская плата',
  PSU: 'Блок питания',
  GPU: 'Видеокарта',
  RAID: 'RAID контроллер',
  BMC: 'BMC контроллер',
  OTHER: 'Другое'
};

export const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  OK: 'Исправен',
  WARNING: 'Предупреждение',
  CRITICAL: 'Критично',
  UNKNOWN: 'Неизвестно'
};

export const COMPONENT_STATUS_COLORS: Record<ComponentStatus, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  UNKNOWN: 'bg-slate-100 text-slate-600 border-slate-300'
};

// Иконки типов (для lucide-react)
export const COMPONENT_TYPE_ICONS: Record<ComponentType, string> = {
  CPU: 'Cpu',
  RAM: 'MemoryStick',
  SSD: 'HardDrive',
  HDD: 'HardDrive',
  NVME: 'HardDrive',
  NIC: 'Network',
  MOTHERBOARD: 'CircuitBoard',
  PSU: 'Zap',
  GPU: 'Monitor',
  RAID: 'Database',
  BMC: 'Server',
  OTHER: 'Box'
};

// Утилиты
export function formatBytes(bytes: number): string {
  if (!bytes) return '—';
  const gb = bytes / (1024 * 1024 * 1024);
  if (gb >= 1000) {
    return `${(gb / 1024).toFixed(1)} TB`;
  }
  return `${Math.round(gb)} GB`;
}

export function formatMHz(mhz: number): string {
  if (!mhz) return '—';
  if (mhz >= 1000) {
    return `${(mhz / 1000).toFixed(2)} GHz`;
  }
  return `${mhz} MHz`;
}
