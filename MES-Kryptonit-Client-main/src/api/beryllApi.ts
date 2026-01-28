/**
 * API функции для модуля АПК Берилл
 * Улучшенная версия с поддержкой чек-листов, доказательств и мониторинга
 * + Параметр assignedToId для фильтра "Мои серверы"
 * 
 * Заменить: src/api/beryllApi.ts
 */

import { $authHost } from "./index";

// ============================================
// ТИПЫ
// ============================================

export type ServerStatus = "NEW" | "IN_WORK" | "CLARIFYING" | "DEFECT" | "DONE" | "ARCHIVED";
export type BatchStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";
export type ChecklistGroup = "VISUAL" | "TESTING" | "QC_PRIMARY" | "BURN_IN" | "QC_FINAL";
export type PingStatus = "ONLINE" | "OFFLINE" | "UNKNOWN";
export type HistoryAction = 
  | "CREATED" | "TAKEN" | "RELEASED" | "STATUS_CHANGED" | "NOTE_ADDED"
  | "CHECKLIST_COMPLETED" | "BATCH_ASSIGNED" | "BATCH_REMOVED" | "DELETED"
  | "ARCHIVED" | "UNARCHIVED" | "FILE_UPLOADED" | "FILE_DELETED" | "SERIAL_ASSIGNED";

export interface BeryllServerUser {
  id: number;
  login: string;
  name: string | null;
  surname: string | null;
}

export interface BeryllChecklistFile {
  id: number;
  serverChecklistId: number;
  fileName: string;
  originalName: string;
  mimetype?: string;
  fileSize: number;
  uploadedById: number;
  uploadedAt: string;
  createdAt?: string;
  uploadedBy?: BeryllServerUser;
}

export interface BeryllChecklistTemplate {
  id: number;
  title: string;
  description: string | null;
  sortOrder: number;
  isRequired: boolean;
  estimatedMinutes: number;
  groupCode: ChecklistGroup;
  fileCode: string | null;
  requiresFile: boolean;  // Требуется ли загрузка доказательства (скриншота)
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface BeryllBatch {
  id: number;
  title: string;
  supplier: string | null;
  deliveryDate: string | null;
  expectedCount: number | null;
  notes: string | null;
  status: BatchStatus;
  createdById: number | null;
  createdBy?: BeryllServerUser | null;
  createdAt: string;
}

export interface BeryllServerChecklist {
  id: number;
  serverId: number;
  checklistTemplateId: number;
  completed: boolean;
  completedById: number | null;
  completedAt: string | null;
  notes: string | null;
  template?: BeryllChecklistTemplate;
  completedBy?: BeryllServerUser | null;
  files?: BeryllChecklistFile[];
}

export interface BeryllHistoryItem {
  id: number;
  serverId: number | null;
  serverIp: string | null;
  serverHostname: string | null;
  userId: number | null;
  action: HistoryAction;
  fromStatus: string | null;
  toStatus: string | null;
  checklistItemId: number | null;
  comment: string | null;
  metadata: Record<string, any> | null;
  durationMinutes: number | null;
  createdAt: string;
  user?: BeryllServerUser | null;
  server?: { id: number; ipAddress: string; hostname: string | null } | null;
}

export interface BeryllServer {
  id: number;
  ipAddress: string | null;
  macAddress: string | null;
  hostname: string | null;
  serialNumber: string | null;
  apkSerialNumber: string | null;
  status: ServerStatus;
  batchId: number | null;
  assignedToId: number | null;
  assignedAt: string | null;
  notes: string | null;
  leaseStart: string | null;
  leaseEnd: string | null;
  leaseActive: boolean;
  lastSyncAt: string | null;
  completedAt: string | null;
  archivedAt: string | null;
  archivedById: number | null;
  burnInStartAt: string | null;
  burnInEndAt: string | null;
  createdAt: string;
  updatedAt: string;
  assignedTo?: BeryllServerUser | null;
  archivedBy?: BeryllServerUser | null;
  batch?: { id: number; title: string; status: BatchStatus } | null;
  checklists?: BeryllServerChecklist[];
  history?: BeryllHistoryItem[];
}

export interface BeryllStats {
  total: number;
  active: number;
  byStatus: Record<ServerStatus, number>;
}

export interface BeryllAnalytics {
  overview: {
    totalServers: number;
    activeServers: number;
    byStatus: Record<ServerStatus, number>;
  };
  dailyCompleted: Array<{ date: string; count: number }>;
  topPerformers: Array<{
    userId: number;
    completedCount: number;
    avgDuration: number | null;
    user: BeryllServerUser;
  }>;
  avgProcessingTime: number | null;
  activeBatches: Array<{
    id: number;
    title: string;
    status: BatchStatus;
    serverCount: number;
    completedCount: number;
  }>;
}

export interface SyncResult {
  success: boolean;
  message: string;
  results: {
    created: number;
    updated: number;
    total: number;
  };
}

export interface HistoryResponse {
  count: number;
  rows: BeryllHistoryItem[];
  page: number;
  totalPages: number;
}

export interface ArchivedServersResponse {
  servers: BeryllServer[];
  total: number;
  page: number;
  totalPages: number;
}

// ============================================
// ТИПЫ МОНИТОРИНГА (ПИНГ)
// ============================================

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
// КОНСТАНТЫ
// ============================================

export const STATUS_LABELS: Record<ServerStatus, string> = {
  NEW: "Новый",
  IN_WORK: "В работе",
  CLARIFYING: "Уточняется",
  DEFECT: "Брак",
  DONE: "Готово",
  ARCHIVED: "В архиве"
};

export const STATUS_COLORS: Record<ServerStatus, string> = {
  NEW: "bg-gray-100 text-gray-700 border-gray-300",
  IN_WORK: "bg-blue-100 text-blue-700 border-blue-300",
  CLARIFYING: "bg-yellow-100 text-yellow-700 border-yellow-300",
  DEFECT: "bg-red-100 text-red-700 border-red-300",
  DONE: "bg-green-100 text-green-700 border-green-300",
  ARCHIVED: "bg-purple-100 text-purple-700 border-purple-300"
};

export const CHECKLIST_GROUP_LABELS: Record<ChecklistGroup, string> = {
  VISUAL: "1. Визуальный осмотр",
  TESTING: "2. Проверка работоспособности",
  QC_PRIMARY: "3. Контрольная (ОТК) — первичная",
  BURN_IN: "4. Испытательная",
  QC_FINAL: "5. Контрольная (ОТК) — финальная"
};

export const CHECKLIST_GROUP_NUMBERS: Record<ChecklistGroup, number> = {
  VISUAL: 1,
  TESTING: 2,
  QC_PRIMARY: 3,
  BURN_IN: 4,
  QC_FINAL: 5
};

export const BATCH_STATUS_LABELS: Record<BatchStatus, string> = {
  ACTIVE: "Активна",
  COMPLETED: "Завершена",
  CANCELLED: "Отменена"
};

export const BATCH_STATUS_COLORS: Record<BatchStatus, string> = {
  ACTIVE: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-500"
};

export const HISTORY_ACTION_LABELS: Record<HistoryAction, string> = {
  CREATED: "Создан",
  TAKEN: "Взят в работу",
  RELEASED: "Освобождён",
  STATUS_CHANGED: "Изменён статус",
  NOTE_ADDED: "Добавлено примечание",
  CHECKLIST_COMPLETED: "Выполнен этап",
  BATCH_ASSIGNED: "Привязан к партии",
  BATCH_REMOVED: "Отвязан от партии",
  DELETED: "Удалён",
  ARCHIVED: "Перенесён в архив",
  UNARCHIVED: "Восстановлен из архива",
  FILE_UPLOADED: "Загружен файл",
  FILE_DELETED: "Удалён файл",
  SERIAL_ASSIGNED: "Присвоен серийник"
};

// ============================================
// УТИЛИТЫ
// ============================================

export const formatDuration = (minutes: number | null): string => {
  if (!minutes) return "-";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}м`;
  return `${hours}ч ${mins}м`;
};

export const formatDateTime = (date: string | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export const formatDate = (date: string | null): string => {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
};

export const getStatusProgress = (stats: Record<ServerStatus, number> | undefined): number => {
  if (!stats) return 0;
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  if (total === 0) return 0;
  return Math.round((stats.DONE / total) * 100);
};

// ============================================
// API ФУНКЦИИ - СИНХРОНИЗАЦИЯ
// ============================================

export const syncWithDhcp = async (): Promise<SyncResult> => {
  const { data } = await $authHost.post<SyncResult>("/api/beryll/sync");
  return data;
};

// ============================================
// API ФУНКЦИИ - СЕРВЕРЫ
// ============================================

/**
 * Получить список серверов с фильтрами
 * 
 * ДОБАВЛЕНО: параметр assignedToId для фильтра "Мои серверы"
 */
export const getServers = async (params?: {
  status?: ServerStatus;
  search?: string;
  onlyActive?: boolean;
  batchId?: number | "null";
  assignedToId?: number;  // ДОБАВЛЕНО: фильтр по исполнителю
}): Promise<BeryllServer[]> => {
  const { data } = await $authHost.get<BeryllServer[]>("/api/beryll/servers", { params });
  return data;
};

export const getStats = async (): Promise<BeryllStats> => {
  const { data } = await $authHost.get<BeryllStats>("/api/beryll/stats");
  return data;
};

export const getAnalytics = async (params?: {
  dateFrom?: string;
  dateTo?: string;
}): Promise<BeryllAnalytics> => {
  const { data } = await $authHost.get<BeryllAnalytics>("/api/beryll/analytics", { params });
  return data;
};

export const getServerById = async (id: number): Promise<BeryllServer> => {
  const { data } = await $authHost.get<BeryllServer>(`/api/beryll/servers/${id}`);
  return data;
};

export const takeServer = async (id: number): Promise<BeryllServer> => {
  const { data } = await $authHost.post<BeryllServer>(`/api/beryll/servers/${id}/take`);
  return data;
};

export const releaseServer = async (id: number): Promise<BeryllServer> => {
  const { data } = await $authHost.post<BeryllServer>(`/api/beryll/servers/${id}/release`);
  return data;
};

export const updateServerStatus = async (
  id: number,
  status: ServerStatus,
  notes?: string
): Promise<BeryllServer> => {
  const { data } = await $authHost.put<BeryllServer>(`/api/beryll/servers/${id}/status`, {
    status,
    notes
  });
  return data;
};

export const updateServerNotes = async (
  id: number,
  notes: string
): Promise<BeryllServer> => {
  const { data } = await $authHost.put<BeryllServer>(`/api/beryll/servers/${id}/notes`, { notes });
  return data;
};

export const deleteServer = async (id: number): Promise<{ success: boolean }> => {
  const { data } = await $authHost.delete(`/api/beryll/servers/${id}`);
  return data;
};

// ============================================
// API ФУНКЦИИ - МОНИТОРИНГ (ПИНГ)
// ============================================

/**
 * Получить кэшированный статус всех серверов
 */
export const getCachedStatus = async (): Promise<PingAllResult> => {
  const { data } = await $authHost.get<PingAllResult>("/api/beryll/monitoring/status");
  return data;
};

/**
 * Пинг одного сервера по ID
 */
export const pingServer = async (serverId: number): Promise<ServerPingResult> => {
  const { data } = await $authHost.get<ServerPingResult>(`/api/beryll/monitoring/ping/${serverId}`);
  return data;
};

/**
 * Пинг всех серверов
 */
export const pingAllServers = async (params?: { forceRefresh?: boolean }): Promise<PingAllResult> => {
  const { data } = await $authHost.post<PingAllResult>("/api/beryll/monitoring/ping-all", null, { params });
  return data;
};

/**
 * Получить статистику мониторинга
 */
export const getMonitoringStats = async (): Promise<MonitoringStats> => {
  const { data } = await $authHost.get<MonitoringStats>("/api/beryll/monitoring/stats");
  return data;
};

/**
 * Получить онлайн серверы
 */
export const getOnlineServers = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{ servers: ServerPingResult[]; total: number }> => {
  const { data } = await $authHost.get("/api/beryll/monitoring/online", { params });
  return data;
};

/**
 * Получить офлайн серверы
 */
export const getOfflineServers = async (params?: {
  page?: number;
  limit?: number;
}): Promise<{ servers: ServerPingResult[]; total: number }> => {
  const { data } = await $authHost.get("/api/beryll/monitoring/offline", { params });
  return data;
};

// ============================================
// API ФУНКЦИИ - ЧЕК-ЛИСТЫ (ШАБЛОНЫ)
// ============================================

/**
 * Получить шаблоны чек-листов
 * @param includeInactive Включить неактивные (удалённые) шаблоны
 */
export const getChecklistTemplates = async (
  includeInactive = false
): Promise<BeryllChecklistTemplate[]> => {
  const { data } = await $authHost.get<BeryllChecklistTemplate[]>(
    "/api/beryll/checklists/templates",
    { params: { includeInactive } }
  );
  return data;
};

/**
 * Создать шаблон чек-листа
 */
export const createChecklistTemplate = async (template: {
  title: string;
  description?: string;
  sortOrder?: number;
  isRequired?: boolean;
  estimatedMinutes?: number;
  groupCode?: ChecklistGroup;
  fileCode?: string;
  requiresFile?: boolean;
}): Promise<BeryllChecklistTemplate> => {
  const { data } = await $authHost.post<BeryllChecklistTemplate>(
    "/api/beryll/checklists/templates",
    template
  );
  return data;
};

/**
 * Обновить шаблон чек-листа
 */
export const updateChecklistTemplate = async (
  id: number,
  template: Partial<BeryllChecklistTemplate>
): Promise<BeryllChecklistTemplate> => {
  const { data } = await $authHost.put<BeryllChecklistTemplate>(
    `/api/beryll/checklists/templates/${id}`,
    template
  );
  return data;
};

/**
 * Удалить/деактивировать шаблон чек-листа
 * @param hardDelete true - полное удаление (если не используется), false - деактивация
 */
export const deleteChecklistTemplate = async (
  id: number,
  hardDelete = false
): Promise<{ success: boolean }> => {
  const { data } = await $authHost.delete(
    `/api/beryll/checklists/templates/${id}`,
    { params: { hardDelete } }
  );
  return data;
};

/**
 * Восстановить деактивированный шаблон
 */
export const restoreChecklistTemplate = async (
  id: number
): Promise<BeryllChecklistTemplate> => {
  const { data } = await $authHost.post<BeryllChecklistTemplate>(
    `/api/beryll/checklists/templates/${id}/restore`
  );
  return data;
};

/**
 * Изменить порядок шаблонов (Drag & Drop)
 * @param orderedIds Массив ID шаблонов в новом порядке
 */
export const reorderChecklistTemplates = async (
  orderedIds: number[]
): Promise<{ success: boolean }> => {
  const { data } = await $authHost.put(
    "/api/beryll/checklists/templates/reorder",
    { orderedIds }
  );
  return data;
};

// ============================================
// API ФУНКЦИИ - ЧЕК-ЛИСТ СЕРВЕРА
// ============================================

/**
 * Получить чек-лист сервера с файлами
 */
export const getServerChecklist = async (
  serverId: number
): Promise<BeryllServerChecklist[]> => {
  const { data } = await $authHost.get<BeryllServerChecklist[]>(
    `/api/beryll/servers/${serverId}/checklist`
  );
  return data;
};

/**
 * Переключить статус пункта чек-листа
 * @throws Ошибка если requiresFile=true и нет загруженных файлов
 */
export const toggleChecklistItem = async (
  serverId: number,
  checklistId: number,
  completed: boolean,
  notes?: string
): Promise<BeryllServerChecklist> => {
  const { data } = await $authHost.put<BeryllServerChecklist>(
    `/api/beryll/servers/${serverId}/checklist/${checklistId}`,
    { completed, notes }
  );
  return data;
};

// ============================================
// API ФУНКЦИИ - ФАЙЛЫ ЧЕК-ЛИСТА
// ============================================

/**
 * Загрузить файл (доказательство) к пункту чек-листа
 */
export const uploadChecklistFile = async (
  serverId: number,
  checklistId: number,
  file: File
): Promise<BeryllChecklistFile> => {
  const formData = new FormData();
  formData.append("file", file, file.name);
  
  // Используем XMLHttpRequest напрямую для гарантированной работы с FormData
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const baseURL = import.meta.env.VITE_API_URL || "";
    const url = `${baseURL}/api/beryll/servers/${serverId}/checklist/${checklistId}/file`;
    
    xhr.open("POST", url, true);
    
    // Добавляем токен
    const token = localStorage.getItem("token");
    if (token) {
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    }
    
    xhr.onload = function() {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } catch (e) {
          resolve({ success: true } as any);
        }
      } else {
        try {
          const error = JSON.parse(xhr.responseText);
          reject(new Error(error.message || "Ошибка загрузки"));
        } catch (e) {
          reject(new Error("Непредвиденная ошибка сервера"));
        }
      }
    };
    
    xhr.onerror = function() {
      reject(new Error("Ошибка сети"));
    };
    
    // НЕ устанавливаем Content-Type - браузер сам добавит с boundary
    xhr.send(formData);
  });
};

/**
 * Получить все файлы сервера
 */
export const getServerFiles = async (serverId: number): Promise<BeryllChecklistFile[]> => {
  const { data } = await $authHost.get<BeryllChecklistFile[]>(`/api/beryll/servers/${serverId}/files`);
  return data;
};

/**
 * Получить URL для скачивания/просмотра файла
 */
export const downloadFile = (fileId: number): string => {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/beryll/files/${fileId}`;
};

/**
 * Удалить файл чек-листа
 * Если это последний файл для этапа с requiresFile=true, отметка выполнения снимается
 */
export const deleteChecklistFile = async (
  fileId: number
): Promise<{ success: boolean }> => {
  const { data } = await $authHost.delete(`/api/beryll/checklists/files/${fileId}`);
  return data;
};

// ============================================
// API ФУНКЦИИ - ПАРТИИ
// ============================================

export const getBatches = async (params?: {
  status?: BatchStatus;
  search?: string;
}): Promise<BeryllBatch[]> => {
  const { data } = await $authHost.get<BeryllBatch[]>("/api/beryll/batches", { params });
  return data;
};

export const getBatchById = async (id: number): Promise<BeryllBatch> => {
  const { data } = await $authHost.get<BeryllBatch>(`/api/beryll/batches/${id}`);
  return data;
};

export const createBatch = async (batch: {
  title: string;
  supplier?: string;
  deliveryDate?: string;
  expectedCount?: number;
  notes?: string;
}): Promise<BeryllBatch> => {
  const { data } = await $authHost.post<BeryllBatch>("/api/beryll/batches", batch);
  return data;
};

export const updateBatch = async (
  id: number,
  batch: Partial<BeryllBatch>
): Promise<BeryllBatch> => {
  const { data } = await $authHost.put<BeryllBatch>(`/api/beryll/batches/${id}`, batch);
  return data;
};

export const deleteBatch = async (id: number): Promise<{ success: boolean }> => {
  const { data } = await $authHost.delete(`/api/beryll/batches/${id}`);
  return data;
};

export const assignServersToBatch = async (
  serverIds: number[],
  batchId: number
): Promise<{ success: boolean; assigned: number }> => {
  const { data } = await $authHost.post(`/api/beryll/batches/${batchId}/assign`, { serverIds });
  return data;
};

export const removeServersFromBatch = async (
  batchId: number,
  serverIds: number[]
): Promise<{ success: boolean; removed: number }> => {
  const { data } = await $authHost.post(`/api/beryll/batches/${batchId}/remove`, { serverIds });
  return data;
};

// ============================================
// API ФУНКЦИИ - ИСТОРИЯ
// ============================================

export const getHistory = async (params?: {
  serverId?: number;
  userId?: number;
  action?: HistoryAction;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}): Promise<HistoryResponse> => {
  const { data } = await $authHost.get<HistoryResponse>("/api/beryll/history", { params });
  return data;
};

// ============================================
// API ФУНКЦИИ - АРХИВ
// ============================================

export const getArchivedServers = async (params?: {
  search?: string;
  batchId?: number | "null";
  page?: number;
  limit?: number;
}): Promise<ArchivedServersResponse> => {
  const { data } = await $authHost.get<ArchivedServersResponse>("/api/beryll/archive", { params });
  return data;
};

export const archiveServer = async (id: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.post(`/api/beryll/servers/${id}/archive`);
  return data;
};

/**
 * Восстановление сервера из архива
 * Возвращает сервер в статус DONE с возможностью продолжить работу
 */
export const unarchiveServer = async (id: number): Promise<BeryllServer> => {
  const { data } = await $authHost.post<BeryllServer>(`/api/beryll/servers/${id}/unarchive`);
  return data;
};

// ============================================
// API ФУНКЦИИ - СЕРИЙНЫЙ НОМЕР АПК
// ============================================

export const updateApkSerialNumber = async (
  id: number,
  apkSerialNumber: string
): Promise<{ success: boolean; apkSerialNumber: string }> => {
  const { data } = await $authHost.put(`/api/beryll/servers/${id}/apk-serial`, { apkSerialNumber });
  return data;
};

// ============================================
// API ФУНКЦИИ - ГЕНЕРАЦИЯ ПАСПОРТА
// ============================================

export const downloadPassport = (serverId: number): string => {
  return `/api/beryll/servers/${serverId}/passport`;
};

export const generatePassport = async (serverId: number): Promise<Blob> => {
  const { data } = await $authHost.get(`/api/beryll/servers/${serverId}/passport`, {
    responseType: "blob"
  });
  return data;
};


// ============================================
// API ФУНКЦИИ - ЭКСПОРТ ПАСПОРТОВ
// ============================================

export interface ExportPassportsOptions {
  serverIds?: number[];
  batchId?: number | string | null;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeArchived?: boolean;
}

export const exportPassports = async (options: ExportPassportsOptions = {}): Promise<Blob> => {
  const { data } = await $authHost.post("/api/beryll/export/passports", options, {
    responseType: "blob"
  });
  return data;
};

export const exportSelectedPassports = async (serverIds: number[]): Promise<Blob> => {
  const { data } = await $authHost.post("/api/beryll/export/passports/selected", { serverIds }, {
    responseType: "blob"
  });
  return data;
};

export const exportBatchPassports = async (batchId: number | string): Promise<Blob> => {
  const { data } = await $authHost.get(`/api/beryll/export/passports/batch/${batchId}`, {
    responseType: "blob"
  });
  return data;
};

// ============================================
// ЭКСПОРТ ПО УМОЛЧАНИЮ
// ============================================

export default {
  // Синхронизация
  syncWithDhcp,
  // Серверы
  getServers,
  getStats,
  getAnalytics,
  getServerById,
  takeServer,
  releaseServer,
  updateServerStatus,
  updateServerNotes,
  deleteServer,
  // Мониторинг
  getCachedStatus,
  pingServer,
  pingAllServers,
  getMonitoringStats,
  getOnlineServers,
  getOfflineServers,
  // Чек-листы (шаблоны)
  getChecklistTemplates,
  createChecklistTemplate,
  updateChecklistTemplate,
  deleteChecklistTemplate,
  restoreChecklistTemplate,
  reorderChecklistTemplates,
  // Чек-лист сервера
  getServerChecklist,
  toggleChecklistItem,
  // Файлы чек-листа
  uploadChecklistFile,
  getServerFiles,
  downloadFile,
  deleteChecklistFile,
  // Партии
  getBatches,
  getBatchById,
  createBatch,
  updateBatch,
  deleteBatch,
  assignServersToBatch,
  removeServersFromBatch,
  // История
  getHistory,
  // Архив
  getArchivedServers,
  archiveServer,
  unarchiveServer,
  // Серийный номер
  updateApkSerialNumber,
  // Паспорт
  downloadPassport,
  generatePassport,
  // Экспорт паспортов
  exportPassports,
  exportSelectedPassports,
  exportBatchPassports,
  // Утилиты
  formatDuration,
  formatDateTime,
  formatDate,
  getStatusProgress
};