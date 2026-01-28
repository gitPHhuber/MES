/**
 * ================================================================================
 * passportsExportApi.ts
 * ================================================================================
 * 
 * API клиент для экспорта и объединения паспортов серверов
 * 
 * ================================================================================
 */

import { $authHost } from "./index";

const BASE_URL = "api/beryll/export/passports";

// ============================================================================
// Типы
// ============================================================================

export interface ExportOptions {
  serverIds?: number[];
  batchId?: number | string | null;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  includeArchived?: boolean;
}

export interface ComponentsSummary {
  total: number;
  hdd: number;
  ssd: number;
  ram: number;
  psu: number;
  motherboard: number;
  bmc: number;
  nic: number;
  raid: number;
}

export interface ServerPreview {
  id: number;
  apkSerialNumber: string;
  serialNumber?: string;
  status: string;
  batchName: string | null;
  createdAt: string;
  componentsSummary: ComponentsSummary;
  completeness: number;
}

export interface MissingComponent {
  serverId: number;
  apkSerialNumber: string;
  missing: string[];
}

export interface ExportStats {
  totalServers: number;
  totalComponents: number;
  byComponentType: Record<string, number>;
  byBatch: Record<string, number>;
  byStatus: Record<string, number>;
  missingComponents: MissingComponent[];
}

export interface PreviewResponse {
  success: boolean;
  total: number;
  showing: number;
  preview: ServerPreview[];
}

export interface StatsResponse {
  success: boolean;
  stats: ExportStats;
}

// ============================================================================
// API функции
// ============================================================================

/**
 * Экспорт паспортов серверов в Excel
 * Возвращает Blob для скачивания
 */
export async function exportPassports(options: ExportOptions = {}): Promise<Blob> {
  const response = await $authHost.post(BASE_URL, options, {
    responseType: "blob"
  });
  return response.data;
}

/**
 * Получение статистики для экспорта
 */
export async function getExportStats(options: ExportOptions = {}): Promise<StatsResponse> {
  const params: Record<string, string> = {};
  
  if (options.batchId !== undefined && options.batchId !== null) {
    params.batchId = String(options.batchId);
  }
  if (options.status) params.status = options.status;
  if (options.dateFrom) params.dateFrom = options.dateFrom;
  if (options.dateTo) params.dateTo = options.dateTo;
  if (options.search) params.search = options.search;
  if (options.includeArchived) params.includeArchived = "true";
  
  const { data } = await $authHost.get<StatsResponse>(`${BASE_URL}/stats`, { params });
  return data;
}

/**
 * Предпросмотр данных для экспорта
 */
export async function getExportPreview(
  options: ExportOptions = {},
  limit = 10
): Promise<PreviewResponse> {
  const params: Record<string, string | number> = { limit };
  
  if (options.batchId !== undefined && options.batchId !== null) {
    params.batchId = String(options.batchId);
  }
  if (options.status) params.status = options.status;
  if (options.dateFrom) params.dateFrom = options.dateFrom;
  if (options.dateTo) params.dateTo = options.dateTo;
  if (options.search) params.search = options.search;
  if (options.includeArchived) params.includeArchived = "true";
  
  const { data } = await $authHost.get<PreviewResponse>(`${BASE_URL}/preview`, { params });
  return data;
}

/**
 * Экспорт паспорта одного сервера
 */
export async function exportSinglePassport(serverId: number): Promise<Blob> {
  const response = await $authHost.get(`${BASE_URL}/single/${serverId}`, {
    responseType: "blob"
  });
  return response.data;
}

/**
 * Экспорт выбранных серверов
 */
export async function exportSelectedPassports(serverIds: number[]): Promise<Blob> {
  const response = await $authHost.post(
    `${BASE_URL}/selected`,
    { serverIds },
    { responseType: "blob" }
  );
  return response.data;
}

/**
 * Экспорт по партии
 */
export async function exportBatchPassports(batchId: number | string): Promise<Blob> {
  const response = await $authHost.get(`${BASE_URL}/batch/${batchId}`, {
    responseType: "blob"
  });
  return response.data;
}

// ============================================================================
// Утилиты
// ============================================================================

/**
 * Скачивание Blob как файла
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

/**
 * Генерация имени файла
 */
export function generateFilename(options: {
  prefix?: string;
  batchId?: number | string | null;
  status?: string;
  count?: number;
}): string {
  const timestamp = new Date().toISOString().split("T")[0];
  let filename = options.prefix || "Состав_серверов";
  
  if (options.batchId) {
    filename += options.batchId === "null" 
      ? "_без_партии"
      : `_партия_${options.batchId}`;
  }
  
  if (options.status) {
    filename += `_${options.status}`;
  }
  
  if (options.count) {
    filename += `_${options.count}шт`;
  }
  
  filename += `_${timestamp}.xlsx`;
  
  return filename;
}

/**
 * Экспорт с автоматическим скачиванием
 */
export async function exportAndDownload(
  options: ExportOptions = {},
  filenameOptions?: Parameters<typeof generateFilename>[0]
): Promise<void> {
  const blob = await exportPassports(options);
  const filename = generateFilename(filenameOptions || {});
  downloadBlob(blob, filename);
}

/**
 * Экспорт выбранных с автоматическим скачиванием
 */
export async function exportSelectedAndDownload(serverIds: number[]): Promise<void> {
  const blob = await exportSelectedPassports(serverIds);
  const filename = generateFilename({
    prefix: "Состав_серверов_выбранные",
    count: serverIds.length
  });
  downloadBlob(blob, filename);
}

/**
 * Экспорт партии с автоматическим скачиванием
 */
export async function exportBatchAndDownload(batchId: number | string): Promise<void> {
  const blob = await exportBatchPassports(batchId);
  const filename = generateFilename({ batchId });
  downloadBlob(blob, filename);
}

export default {
  exportPassports,
  getExportStats,
  getExportPreview,
  exportSinglePassport,
  exportSelectedPassports,
  exportBatchPassports,
  downloadBlob,
  generateFilename,
  exportAndDownload,
  exportSelectedAndDownload,
  exportBatchAndDownload
};
