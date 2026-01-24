/**
 * defectsAndMonitoring.ts
 * 
 * Положить в: src/types/beryll/defectsAndMonitoring.ts
 */

// ============================================
// ДЕФЕКТЫ
// ============================================

export type DefectCategory = 'HARDWARE' | 'SOFTWARE' | 'ASSEMBLY' | 'COMPONENT' | 'OTHER';
export type DefectPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DefectStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'WONT_FIX';

export interface DefectFile {
  id: number;
  commentId: number;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string | null;
  fileSize: number | null;
  uploadedById: number | null;
  uploadedBy?: {
    id: number;
    login: string;
    name: string;
    surname: string;
  };
  createdAt: string;
}

export interface DefectComment {
  id: number;
  serverId: number;
  userId: number;
  text: string;
  defectCategory: DefectCategory;
  priority: DefectPriority;
  status: DefectStatus;
  resolvedById: number | null;
  resolvedAt: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  author?: {
    id: number;
    login: string;
    name: string;
    surname: string;
  };
  resolvedBy?: {
    id: number;
    login: string;
    name: string;
    surname: string;
  };
  server?: {
    id: number;
    ipAddress: string;
    hostname: string;
    serialNumber: string;
    apkSerialNumber: string;
  };
  files?: DefectFile[];
}

export interface DefectStats {
  total: number;
  unresolved: number;
  resolved: number;
  byCategory: Record<DefectCategory, number>;
  byStatus: Record<DefectStatus, number>;
  byPriority: Record<DefectPriority, number>;
}

// ============================================
// МОНИТОРИНГ
// ============================================

export type PingStatus = 'ONLINE' | 'OFFLINE' | 'UNKNOWN';

export interface ServerPingResult {
  serverId: number;
  ipAddress: string;
  hostname: string;
  serialNumber?: string;
  apkSerialNumber?: string;
  serverStatus?: string;
  batchId?: number;
  online: boolean;
  latency: number | null;
  error: string | null;
  checkedAt: string;
}

export interface MonitoringStats {
  byStatus: Record<PingStatus, number>;
  total: number;
  online: number;
  offline: number;
  unknown: number;
  staleServers: number;
  avgLatency: string | null;
  lastFullScan: string | null;
}

export interface PingAllResult {
  total: number;
  online: number;
  offline: number;
  checkedAt: string;
  cached?: boolean;
  servers: ServerPingResult[];
}

// ============================================
// LABELS (RU)
// ============================================

export const DEFECT_CATEGORY_LABELS: Record<DefectCategory, string> = {
  HARDWARE: 'Железо',
  SOFTWARE: 'Софт',
  ASSEMBLY: 'Сборка',
  COMPONENT: 'Компонент',
  OTHER: 'Другое'
};

export const DEFECT_PRIORITY_LABELS: Record<DefectPriority, string> = {
  LOW: 'Низкий',
  MEDIUM: 'Средний',
  HIGH: 'Высокий',
  CRITICAL: 'Критический'
};

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  NEW: 'Новый',
  IN_PROGRESS: 'В работе',
  RESOLVED: 'Решён',
  WONT_FIX: 'Не будет исправлен'
};

export const PING_STATUS_LABELS: Record<PingStatus, string> = {
  ONLINE: 'Онлайн',
  OFFLINE: 'Оффлайн',
  UNKNOWN: 'Неизвестно'
};

// ============================================
// COLORS
// ============================================

export const PRIORITY_COLORS: Record<DefectPriority, string> = {
  LOW: '#4caf50',
  MEDIUM: '#ff9800',
  HIGH: '#f44336',
  CRITICAL: '#9c27b0'
};

export const STATUS_COLORS: Record<DefectStatus, string> = {
  NEW: '#2196f3',
  IN_PROGRESS: '#ff9800',
  RESOLVED: '#4caf50',
  WONT_FIX: '#9e9e9e'
};

export const PING_STATUS_COLORS: Record<PingStatus, string> = {
  ONLINE: '#4caf50',
  OFFLINE: '#f44336',
  UNKNOWN: '#9e9e9e'
};
