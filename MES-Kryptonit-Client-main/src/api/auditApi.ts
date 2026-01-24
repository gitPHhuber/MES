import { $authHost } from "./index";
import { AuditLogModel } from "src/types/AuditLogModel";

export interface AuditLogFilter {
  page?: number;
  limit?: number;
  userId?: number;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string; 
}

export interface AuditLogResponse {
  count: number;
  rows: AuditLogModel[];
}

export const fetchAuditLogs = async (
  params: AuditLogFilter
): Promise<AuditLogResponse> => {
  const { data } = await $authHost.get<AuditLogResponse>("api/audit", {
    params,
  });
  return data;
};
