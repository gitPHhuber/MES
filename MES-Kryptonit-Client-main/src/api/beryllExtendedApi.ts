/**
 * beryllExtendedApi.ts - API клиент для расширенных функций Beryll
 */

import { apiClient } from "../apiClient";

// ============================================
// ТИПЫ
// ============================================

export interface ComponentCatalog {
  id: number;
  type: string;
  manufacturer: string | null;
  model: string;
  revision: string | null;
  partNumber: string | null;
  specifications: Record<string, any>;
  serialNumberPattern: string | null;
  isActive: boolean;
  notes: string | null;
}

export interface ComponentInventory {
  id: number;
  catalogId: number | null;
  type: string;
  serialNumber: string;
  serialNumberYadro: string | null;
  manufacturer: string | null;
  model: string | null;
  status: InventoryStatus;
  condition: ComponentCondition;
  location: string | null;
  currentServerId: number | null;
  reservedForDefectId: number | null;
  purchaseDate: string | null;
  warrantyExpires: string | null;
  lastTestedAt: string | null;
  metadata: Record<string, any>;
  notes: string | null;
  catalog?: ComponentCatalog;
  currentServer?: { id: number; apkSerialNumber: string; hostname: string };
}

export interface ComponentHistory {
  id: number;
  serverComponentId: number | null;
  inventoryComponentId: number | null;
  action: string;
  fromServerId: number | null;
  toServerId: number | null;
  fromLocation: string | null;
  toLocation: string | null;
  relatedDefectId: number | null;
  yadroTicketNumber: string | null;
  performedById: number | null;
  performedAt: string;
  metadata: Record<string, any>;
  notes: string | null;
  performedBy?: { id: number; name: string; surname: string };
}

export interface DefectRecord {
  id: number;
  serverId: number;
  yadroTicketNumber: string | null;
  hasSPISI: boolean;
  clusterCode: string | null;
  problemDescription: string | null;
  detectedAt: string;
  detectedById: number | null;
  diagnosticianId: number | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  repairPartType: string | null;
  defectPartSerialYadro: string | null;
  defectPartSerialManuf: string | null;
  replacementPartSerialYadro: string | null;
  replacementPartSerialManuf: string | null;
  status: DefectRecordStatus;
  isRepeatedDefect: boolean;
  previousDefectId: number | null;
  repeatedDefectReason: string | null;
  substituteServerId: number | null;
  substituteServerSerial: string | null;
  sentToYadroRepair: boolean;
  sentToYadroAt: string | null;
  returnedFromYadro: boolean;
  returnedFromYadroAt: string | null;
  resolution: string | null;
  repairDetails: string | null;
  slaDeadline: string | null;
  diagnosisStartedAt: string | null;
  diagnosisCompletedAt: string | null;
  repairStartedAt: string | null;
  repairCompletedAt: string | null;
  totalDowntimeMinutes: number | null;
  notes: string | null;
  server?: { id: number; ipAddress: string; apkSerialNumber: string; hostname: string; status: string };
  detectedBy?: { id: number; name: string; surname: string };
  diagnostician?: { id: number; name: string; surname: string };
  resolvedBy?: { id: number; name: string; surname: string };
  substituteServer?: { id: number; apkSerialNumber: string; hostname: string };
  previousDefect?: DefectRecord;
  yadroLogs?: YadroTicketLog[];
}

export interface YadroTicketLog {
  id: number;
  ticketNumber: string;
  defectRecordId: number | null;
  serverId: number | null;
  requestType: YadroRequestType;
  status: YadroLogStatus;
  componentType: string | null;
  sentComponentSerialYadro: string | null;
  sentComponentSerialManuf: string | null;
  receivedComponentSerialYadro: string | null;
  receivedComponentSerialManuf: string | null;
  sentAt: string | null;
  receivedAt: string | null;
  problemDescription: string | null;
  yadroResponse: string | null;
  notes: string | null;
  server?: { id: number; apkSerialNumber: string; hostname: string };
  defectRecord?: DefectRecord;
}

export interface SubstituteServer {
  id: number;
  serverId: number;
  status: SubstituteStatus;
  currentDefectId: number | null;
  issuedAt: string | null;
  issuedToUserId: number | null;
  returnedAt: string | null;
  usageCount: number;
  notes: string | null;
  server?: { id: number; apkSerialNumber: string; hostname: string; ipAddress: string };
  issuedTo?: { id: number; name: string; surname: string };
}

export interface SlaConfig {
  id: number;
  name: string;
  defectType: string | null;
  priority: string | null;
  maxDiagnosisHours: number;
  maxRepairHours: number;
  maxTotalHours: number;
  escalationAfterHours: number | null;
  isActive: boolean;
}

export interface UserAlias {
  id: number;
  userId: number;
  alias: string;
  source: string | null;
  isActive: boolean;
  user?: { id: number; name: string; surname: string; login: string };
}

// Enums
export type InventoryStatus = "AVAILABLE" | "RESERVED" | "IN_USE" | "IN_REPAIR" | "DEFECTIVE" | "SCRAPPED" | "RETURNED";
export type ComponentCondition = "NEW" | "REFURBISHED" | "USED" | "DAMAGED";
export type DefectRecordStatus =
  | "PENDING_DIAGNOSIS"
  | "DIAGNOSED"
  | "WAITING_APPROVAL"
  | "PARTS_RESERVED"
  | "REPAIRED_LOCALLY"
  | "IN_YADRO_REPAIR"
  | "SUBSTITUTE_ISSUED"
  | "SCRAPPED"
  | "CANCELLED"
  | "NEW"
  | "DIAGNOSING"
  | "WAITING_PARTS"
  | "REPAIRING"
  | "SENT_TO_YADRO"
  | "RETURNED"
  | "RESOLVED"
  | "REPEATED"
  | "CLOSED";
export type YadroRequestType = "COMPONENT_REPAIR" | "COMPONENT_EXCHANGE" | "WARRANTY_CLAIM" | "CONSULTATION";
export type YadroLogStatus = "SENT" | "IN_PROGRESS" | "COMPLETED" | "RECEIVED" | "CLOSED";
export type SubstituteStatus = "AVAILABLE" | "IN_USE" | "MAINTENANCE" | "RETIRED";

// ============================================
// ИНВЕНТАРЬ КОМПОНЕНТОВ
// ============================================

export const inventoryApi = {
  // Справочник
  getCatalog: (type?: string) => 
    apiClient.get<ComponentCatalog[]>("/beryll/extended/inventory/catalog", { params: { type } }),
  
  createCatalogEntry: (data: Partial<ComponentCatalog>) => 
    apiClient.post<{ catalog: ComponentCatalog; created: boolean }>("/beryll/extended/inventory/catalog", data),
  
  updateCatalogEntry: (id: number, data: Partial<ComponentCatalog>) => 
    apiClient.put<ComponentCatalog>(`/beryll/extended/inventory/catalog/${id}`, data),
  
  // Список
  getAll: (params: {
    type?: string;
    status?: InventoryStatus;
    condition?: ComponentCondition;
    manufacturer?: string;
    model?: string;
    search?: string;
    serverId?: number;
    location?: string;
    warrantyExpired?: boolean;
    limit?: number;
    offset?: number;
  }) => apiClient.get<{ rows: ComponentInventory[]; count: number }>("/beryll/extended/inventory", { params }),
  
  getById: (id: number) => 
    apiClient.get<ComponentInventory>(`/beryll/extended/inventory/${id}`),
  
  getBySerial: (serial: string) => 
    apiClient.get<ComponentInventory>(`/beryll/extended/inventory/serial/${serial}`),
  
  getAvailableByType: (type: string, count?: number) => 
    apiClient.get<ComponentInventory[]>(`/beryll/extended/inventory/available/${type}`, { params: { count } }),
  
  getStats: () => 
    apiClient.get<{
      byType: Record<string, Record<string, number>>;
      totals: { total: number; available: number; inUse: number; defective: number; inRepair: number };
      warrantyExpiringSoon: number;
    }>("/beryll/extended/inventory/stats"),
  
  getWarrantyExpiring: (days?: number) => 
    apiClient.get<ComponentInventory[]>("/beryll/extended/inventory/warranty-expiring", { params: { days } }),
  
  getHistory: (id: number) => 
    apiClient.get<ComponentHistory[]>(`/beryll/extended/inventory/${id}/history`),
  
  // Создание
  create: (data: {
    type: string;
    serialNumber: string;
    serialNumberYadro?: string;
    manufacturer?: string;
    model?: string;
    condition?: ComponentCondition;
    location?: string;
    purchaseDate?: string;
    warrantyExpires?: string;
    notes?: string;
  }) => apiClient.post<ComponentInventory>("/beryll/extended/inventory", data),
  
  bulkCreate: (items: Array<{
    type: string;
    serialNumber: string;
    serialNumberYadro?: string;
    manufacturer?: string;
    model?: string;
    condition?: ComponentCondition;
    location?: string;
  }>) => apiClient.post<{ success: Array<{ serialNumber: string; id: number }>; errors: Array<{ serialNumber: string; error: string }> }>("/beryll/extended/inventory/bulk", { items }),
  
  // Операции
  reserve: (id: number, defectId: number) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/reserve`, { defectId }),
  
  release: (id: number, notes?: string) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/release`, { notes }),
  
  installToServer: (id: number, serverId: number, defectId?: number) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/install`, { serverId, defectId }),
  
  removeFromServer: (id: number, reason?: string, defectId?: number) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/remove`, { reason, defectId }),
  
  sendToYadro: (id: number, ticketNumber: string) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/send-to-yadro`, { ticketNumber }),
  
  returnFromYadro: (id: number, condition?: ComponentCondition) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/return-from-yadro`, { condition }),
  
  scrap: (id: number, reason: string) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/scrap`, { reason }),
  
  updateLocation: (id: number, location: string) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/location`, { location }),
  
  markTested: (id: number, passed: boolean, notes?: string) => 
    apiClient.post<ComponentInventory>(`/beryll/extended/inventory/${id}/test`, { passed, notes }),
};

// ============================================
// ЗАПИСИ О ДЕФЕКТАХ
// ============================================

export const defectRecordApi = {
  // Справочники
  getPartTypes: () => 
    apiClient.get<Array<{ value: string; label: string }>>("/beryll/defect-records/part-types"),
  
  getStatuses: () => 
    apiClient.get<Array<{ value: string; label: string }>>("/beryll/defect-records/statuses"),
  
  getStats: (params?: { dateFrom?: string; dateTo?: string; serverId?: number }) => 
    apiClient.get<{
      byStatus: Array<{ status: string; count: string }>;
      byType: Array<{ repairPartType: string; count: string }>;
      repeatedCount: number;
      slaBreachedCount: number;
      avgRepairTimeMinutes: number;
      avgRepairTimeHours: number;
    }>("/beryll/defect-records/stats", { params }),
  
  // CRUD
  getAll: (params: {
    serverId?: number;
    status?: DefectRecordStatus;
    repairPartType?: string;
    diagnosticianId?: number;
    isRepeatedDefect?: boolean;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    slaBreached?: boolean;
    limit?: number;
    offset?: number;
  }) => apiClient.get<{ rows: DefectRecord[]; count: number }>("/beryll/defect-records", { params }),
  
  getById: (id: number) => 
    apiClient.get<DefectRecord>(`/beryll/defect-records/${id}`),
  
  create: (data: {
    serverId: number;
    yadroTicketNumber?: string;
    hasSPISI?: boolean;
    clusterCode?: string;
    problemDescription?: string;
    repairPartType?: string;
    defectPartSerialYadro?: string;
    defectPartSerialManuf?: string;
    notes?: string;
    priority?: TicketPriority;
  }) => apiClient.post<DefectRecord>("/beryll/defect-records", data),
  
  // Workflow
  startDiagnosis: (id: number) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/start-diagnosis`),
  
  completeDiagnosis: (id: number, data: {
    repairPartType?: string;
    defectPartSerialYadro?: string;
    defectPartSerialManuf?: string;
    problemDescription?: string;
    notes?: string;
  }) => apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/complete-diagnosis`, data),
  
  setWaitingParts: (id: number, notes?: string) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/waiting-parts`, { notes }),
  
  reserveComponent: (id: number, inventoryId: number) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/reserve-component`, { inventoryId }),
  
  startRepair: (id: number) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/start-repair`),
  
  performReplacement: (id: number, data: {
    replacementPartSerialYadro?: string;
    replacementPartSerialManuf?: string;
    replacementInventoryId?: number;
    repairDetails?: string;
  }) => apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/perform-replacement`, data),
  
  sendToYadro: (id: number, data: {
    ticketNumber?: string;
    subject?: string;
    description?: string;
    trackingNumber?: string;
  }) => apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/send-to-yadro`, data),
  
  returnFromYadro: (id: number, data: {
    resolution?: string;
    replacementSerialYadro?: string;
    replacementSerialManuf?: string;
    condition?: ComponentCondition;
  }) => apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/return-from-yadro`, data),
  
  issueSubstitute: (id: number, substituteServerId?: number) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/issue-substitute`, { substituteServerId }),
  
  returnSubstitute: (id: number) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/return-substitute`),
  
  resolve: (id: number, data: { resolution: string; notes?: string }) => 
    apiClient.post<DefectRecord>(`/beryll/defect-records/${id}/resolve`, data),
};

// ============================================
// ЗАЯВКИ ЯДРО
// ============================================

export const yadroApi = {
  // Справочники
  getRequestTypes: () => 
    apiClient.get<Array<{ value: string; label: string }>>("/beryll/extended/yadro/request-types"),
  
  getLogStatuses: () => 
    apiClient.get<Array<{ value: string; label: string }>>("/beryll/extended/yadro/log-statuses"),
  
  // Журнал учёта заявок (номера присваивает поставщик Ядро)
  getAllLogs: (params: {
    status?: YadroLogStatus;
    requestType?: YadroRequestType;
    defectRecordId?: number;
    serverId?: number;
    dateFrom?: string;
    dateTo?: string;
    search?: string;
    limit?: number;
    offset?: number;
  }) => apiClient.get<{ rows: YadroTicketLog[]; count: number }>("/beryll/extended/yadro/logs", { params }),
  
  getOpenLogs: () => 
    apiClient.get<YadroTicketLog[]>("/beryll/extended/yadro/logs/open"),
  
  getLogStats: (params?: { dateFrom?: string; dateTo?: string }) => 
    apiClient.get<Array<{ status: string; requestType: string; componentType: string; count: string }>>("/beryll/extended/yadro/logs/stats", { params }),
  
  getLogById: (id: number) => 
    apiClient.get<YadroTicketLog>(`/beryll/extended/yadro/logs/${id}`),
  
  // Создать запись в журнале (зарегистрировать заявку от Ядро)
  createLog: (data: {
    ticketNumber: string; // Номер от поставщика Ядро (обязательно)
    defectRecordId?: number;
    serverId?: number;
    requestType?: YadroRequestType;
    componentType?: string;
    sentComponentSerialYadro?: string;
    sentComponentSerialManuf?: string;
    sentAt?: string;
    problemDescription?: string;
    notes?: string;
  }) => apiClient.post<YadroTicketLog>("/beryll/extended/yadro/logs", data),
  
  // Обновить статус записи
  updateLogStatus: (id: number, data: {
    status: YadroLogStatus;
    yadroResponse?: string;
    receivedComponentSerialYadro?: string;
    receivedComponentSerialManuf?: string;
    notes?: string;
  }) => apiClient.put<YadroTicketLog>(`/beryll/extended/yadro/logs/${id}/status`, data),
};

// ============================================
// ПОДМЕННЫЕ СЕРВЕРЫ
// ============================================

export const substituteApi = {
  getAll: (status?: SubstituteStatus) => 
    apiClient.get<SubstituteServer[]>("/beryll/extended/substitutes", { params: { status } }),
  
  getAvailable: () => 
    apiClient.get<SubstituteServer[]>("/beryll/extended/substitutes/available"),
  
  getStats: () => 
    apiClient.get<{
      total: number;
      available: number;
      inUse: number;
      maintenance: number;
      avgUsageCount: number;
    }>("/beryll/extended/substitutes/stats"),
  
  addToPool: (serverId: number, notes?: string) => 
    apiClient.post<SubstituteServer>("/beryll/extended/substitutes", { serverId, notes }),
  
  removeFromPool: (id: number) => 
    apiClient.delete(`/beryll/extended/substitutes/${id}`),
  
  issue: (id: number, defectId: number) => 
    apiClient.post<SubstituteServer>(`/beryll/extended/substitutes/${id}/issue`, { defectId }),
  
  return: (id: number) => 
    apiClient.post<SubstituteServer>(`/beryll/extended/substitutes/${id}/return`),
  
  setMaintenance: (id: number, notes?: string) => 
    apiClient.post<SubstituteServer>(`/beryll/extended/substitutes/${id}/maintenance`, { notes }),
};

// ============================================
// SLA КОНФИГУРАЦИЯ
// ============================================

export const slaApi = {
  getAll: () => 
    apiClient.get<SlaConfig[]>("/beryll/extended/sla"),
  
  create: (data: Partial<SlaConfig>) => 
    apiClient.post<SlaConfig>("/beryll/extended/sla", data),
  
  update: (id: number, data: Partial<SlaConfig>) => 
    apiClient.put<SlaConfig>(`/beryll/extended/sla/${id}`, data),
  
  delete: (id: number) => 
    apiClient.delete(`/beryll/extended/sla/${id}`),
};

// ============================================
// АЛИАСЫ ПОЛЬЗОВАТЕЛЕЙ
// ============================================

export const aliasApi = {
  getAll: (userId?: number) => 
    apiClient.get<UserAlias[]>("/beryll/extended/aliases", { params: { userId } }),
  
  findUserByAlias: (alias: string) => 
    apiClient.get<{ id: number; name: string; surname: string; login: string }>(`/beryll/extended/aliases/find/${encodeURIComponent(alias)}`),
  
  create: (userId: number, alias: string, source?: string) => 
    apiClient.post<UserAlias>("/beryll/extended/aliases", { userId, alias, source }),
  
  delete: (id: number) => 
    apiClient.delete(`/beryll/extended/aliases/${id}`),
  
  generateForUser: (userId: number) => 
    apiClient.post<UserAlias[]>(`/beryll/extended/aliases/generate/${userId}`),
};
