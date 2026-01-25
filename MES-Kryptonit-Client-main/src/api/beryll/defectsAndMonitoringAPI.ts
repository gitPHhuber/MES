/**
 * defectsAndMonitoringAPI.ts
 * 
 * Положить в: src/api/beryll/defectsAndMonitoringAPI.ts
 */

import { $authHost } from "../index";
import type {
  DefectComment,
  DefectStats,
  DefectCategory,
  DefectPriority,
  DefectStatus,
  MonitoringStats,
  PingAllResult,
  ServerPingResult
} from "../../types/beryll/defectsAndMonitoring";

// ============================================
// ДЕФЕКТЫ
// ============================================

interface GetDefectsParams {
  status?: DefectStatus;
  category?: DefectCategory;
  limit?: number;
  offset?: number;
}

interface GetDefectsResponse {
  count: number;
  rows: DefectComment[];
  page: number;
  totalPages: number;
}

export const getServerDefects = async (
  serverId: number,
  params?: GetDefectsParams
): Promise<GetDefectsResponse> => {
  const { data } = await $authHost.get(`api/beryll/servers/${serverId}/defects`, { params });
  return data;
};

export const getDefectById = async (defectId: number): Promise<DefectComment> => {
  const { data } = await $authHost.get(`api/beryll/defects/${defectId}`);
  return data;
};

interface CreateDefectParams {
  text: string;
  defectCategory?: DefectCategory;
  priority?: DefectPriority;
}

export const createDefect = async (
  serverId: number,
  params: CreateDefectParams
): Promise<DefectComment> => {
  const { data } = await $authHost.post(`api/beryll/servers/${serverId}/defects`, params);
  return data;
};

interface UpdateDefectParams {
  text?: string;
  defectCategory?: DefectCategory;
  priority?: DefectPriority;
  status?: DefectStatus;
  resolution?: string;
}

export const updateDefect = async (
  defectId: number,
  params: UpdateDefectParams
): Promise<DefectComment> => {
  const { data } = await $authHost.put(`api/beryll/defects/${defectId}`, params);
  return data;
};

export const deleteDefect = async (defectId: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`api/beryll/defects/${defectId}`);
  return data;
};

interface ResolveDefectParams {
  resolution?: string;
  status?: 'RESOLVED' | 'WONT_FIX';
}

export const resolveDefect = async (
  defectId: number,
  params?: ResolveDefectParams
): Promise<DefectComment> => {
  const { data } = await $authHost.put(`api/beryll/defects/${defectId}/resolve`, params || {});
  return data;
};

export const uploadDefectFile = async (
  defectId: number,
  file: File
): Promise<{ success: boolean; file: { id: number; fileName: string; originalName: string; fileSize: number } }> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await $authHost.post(`api/beryll/defects/${defectId}/files`, formData, {
    headers: { "Content-Type": "multipart/form-data" }
  });
  return data;
};

export const downloadDefectFile = async (fileId: number): Promise<Blob> => {
  const { data } = await $authHost.get(`api/beryll/defects/files/${fileId}`, {
    responseType: "blob"
  });
  return data;
};

export const deleteDefectFile = async (fileId: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`api/beryll/defects/files/${fileId}`);
  return data;
};

interface GetDefectStatsParams {
  serverId?: number;
  batchId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export const getDefectStats = async (params?: GetDefectStatsParams): Promise<DefectStats> => {
  const { data } = await $authHost.get("api/beryll/defects-stats", { params });
  return data;
};

// ============================================
// МОНИТОРИНГ
// ============================================

export const getMonitoringStats = async (): Promise<MonitoringStats> => {
  const { data } = await $authHost.get("api/beryll/monitoring/stats");
  return data;
};

export const getCachedStatus = async (): Promise<PingAllResult> => {
  const { data } = await $authHost.get("api/beryll/monitoring/status");
  return data;
};

export const pingServer = async (serverId: number): Promise<ServerPingResult> => {
  const { data } = await $authHost.get(`api/beryll/monitoring/ping/${serverId}`);
  return data;
};

interface PingAllParams {
  batchId?: number;
  status?: string;
  forceRefresh?: boolean;
}

export const pingAllServers = async (params?: PingAllParams): Promise<PingAllResult> => {
  const { data } = await $authHost.post("api/beryll/monitoring/ping-all", null, { params });
  return data;
};

interface GetServersByPingParams {
  batchId?: number;
  limit?: number;
  offset?: number;
}

interface GetServersResponse {
  count: number;
  rows: any[];
  page: number;
  totalPages: number;
}

export const getOnlineServers = async (params?: GetServersByPingParams): Promise<GetServersResponse> => {
  const { data } = await $authHost.get("api/beryll/monitoring/servers/online", { params });
  return data;
};

export const getOfflineServers = async (params?: GetServersByPingParams): Promise<GetServersResponse> => {
  const { data } = await $authHost.get("api/beryll/monitoring/servers/offline", { params });
  return data;
};

export const clearMonitoringCache = async (): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.post("api/beryll/monitoring/clear-cache");
  return data;
};
