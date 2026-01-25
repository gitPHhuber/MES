/**
 * beryllExtendedApi.ts
 * 
 * API функции для расширенных модулей Beryll:
 * - Стойки (физическое размещение)
 * - Кластеры и Комплекты (логическая группировка)
 * - Учёт брака (журнал дефектов)
 * 
 * Положить в: src/api/beryll/beryllExtendedApi.ts
 */

import { $authHost } from "../index";

// ============================================
// ТИПЫ - СТОЙКИ
// ============================================

export type RackStatus = "ACTIVE" | "MAINTENANCE" | "DECOMMISSIONED";

export interface BeryllRack {
  id: number;
  name: string;
  location: string | null;
  totalUnits: number;
  networkSubnet: string | null;
  gateway: string | null;
  status: RackStatus;
  notes: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Дополнительные поля от API
  filledUnits?: number;
  totalUnitsCount?: number;
  occupancyPercent?: number;
  units?: BeryllRackUnit[];
}

export interface BeryllRackUnit {
  id: number;
  rackId: number;
  serverId: number | null;
  unitNumber: number;
  hostname: string | null;
  mgmtMacAddress: string | null;
  mgmtIpAddress: string | null;
  dataMacAddress: string | null;
  dataIpAddress: string | null;
  accessLogin: string | null;
  accessPassword: string | null;
  notes: string | null;
  installedAt: string | null;
  installedById: number | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  rack?: BeryllRack;
  server?: {
    id: number;
    ipAddress: string;
    apkSerialNumber: string;
    hostname: string;
    status: string;
    macAddress?: string;
  };
  installedBy?: { id: number; login: string; name: string; surname: string };
}

// ============================================
// ТИПЫ - КОМПЛЕКТЫ/ОТГРУЗКИ
// ============================================

export type ShipmentStatus = "FORMING" | "READY" | "SHIPPED" | "IN_TRANSIT" | "DELIVERED" | "ACCEPTED";

export interface BeryllShipment {
  id: number;
  name: string;
  destinationCity: string | null;
  destinationAddress: string | null;
  contactPerson: string | null;
  contactPhone: string | null;
  expectedCount: number;
  status: ShipmentStatus;
  plannedShipDate: string | null;
  actualShipDate: string | null;
  deliveredAt: string | null;
  acceptedAt: string | null;
  waybillNumber: string | null;
  carrier: string | null;
  notes: string | null;
  createdById: number | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations & computed
  createdBy?: { id: number; login: string; name: string; surname: string };
  clusters?: BeryllCluster[];
  clustersCount?: number;
  totalServers?: number;
  completionPercent?: number;
}

// ============================================
// ТИПЫ - КЛАСТЕРЫ
// ============================================

export type ClusterStatus = "FORMING" | "READY" | "SHIPPED" | "DEPLOYED";
export type ServerRole = "MASTER" | "WORKER" | "STORAGE" | "GATEWAY";

export interface BeryllCluster {
  id: number;
  name: string;
  description: string | null;
  shipmentId: number | null;
  expectedCount: number;
  status: ClusterStatus;
  configVersion: string | null;
  notes: string | null;
  createdById: number | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations & computed
  shipment?: BeryllShipment;
  createdBy?: { id: number; login: string; name: string; surname: string };
  clusterServers?: BeryllClusterServer[];
  serversCount?: number;
  masterCount?: number;
  workerCount?: number;
  completionPercent?: number;
}

export interface BeryllClusterServer {
  id: number;
  clusterId: number;
  serverId: number;
  role: ServerRole;
  orderNumber: number | null;
  clusterHostname: string | null;
  clusterIpAddress: string | null;
  notes: string | null;
  addedAt: string;
  addedById: number | null;
  createdAt: string;
  updatedAt: string;
  // Relations
  cluster?: BeryllCluster;
  server?: {
    id: number;
    ipAddress: string;
    apkSerialNumber: string;
    hostname: string;
    status: string;
    macAddress?: string;
  };
  addedBy?: { id: number; login: string; name: string; surname: string };
}

// ============================================
// ТИПЫ - УЧЁТ БРАКА
// ============================================

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

export type RepairPartType = 
  | "RAM" 
  | "RAM_ECC" 
  | "MOTHERBOARD" 
  | "CPU" 
  | "CPU_SOCKET" 
  | "HDD" 
  | "SSD" 
  | "PSU" 
  | "FAN" 
  | "THERMAL" 
  | "RAID" 
  | "NIC" 
  | "BACKPLANE" 
  | "BMC" 
  | "CABLE" 
  | "PCIE_SLOT" 
  | "RAM_SOCKET" 
  | "CHASSIS" 
  | "OTHER";

export interface BeryllDefectRecord {
  id: number;
  serverId: number;
  yadroTicketNumber: string | null;
  hasSPISI: boolean;
  clusterCode: string | null;
  problemDescription: string;
  detectedAt: string;
  detectedById: number | null;
  diagnosticianId: number | null;
  repairPartType: RepairPartType | null;
  defectPartSerialYadro: string | null;
  defectPartSerialManuf: string | null;
  replacementPartSerialYadro: string | null;
  replacementPartSerialManuf: string | null;
  repairDetails: string | null;
  status: DefectRecordStatus;
  isRepeatedDefect: boolean;
  repeatedDefectReason: string | null;
  repeatedDefectDate: string | null;
  sentToYadroRepair: boolean;
  sentToYadroAt: string | null;
  returnedFromYadro: boolean;
  returnedFromYadroAt: string | null;
  substituteServerSerial: string | null;
  resolvedAt: string | null;
  resolvedById: number | null;
  resolution: string | null;
  notes: string | null;
  metadata: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  // Relations
  server?: {
    id: number;
    apkSerialNumber: string;
    hostname: string;
    ipAddress: string;
    status?: string;
  };
  detectedBy?: { id: number; login: string; name: string; surname: string };
  diagnostician?: { id: number; login: string; name: string; surname: string };
  resolvedBy?: { id: number; login: string; name: string; surname: string };
  files?: BeryllDefectRecordFile[];
}

export interface BeryllDefectRecordFile {
  id: number;
  defectRecordId: number;
  originalName: string;
  fileName: string;
  fileSize: number;
  mimeType: string | null;
  uploadedById: number | null;
  createdAt: string;
  uploadedBy?: { id: number; login: string; name: string; surname: string };
}

export interface DefectRecordStats {
  total: number;
  byStatus: Record<string, number>;
  byPartType: Record<string, number>;
  repeatedCount: number;
  repeatedPercent: number;
  sentToYadroCount: number;
  topDiagnosticians: Array<{
    user: { id: number; login: string; name: string; surname: string };
    count: number;
  }>;
  byMonth: Array<{ month: string; count: number }>;
}

// ============================================
// ТИПЫ - ОБЩИЕ
// ============================================

interface HistoryRecord {
  id: number;
  entityType: string;
  entityId: number;
  action: string;
  userId: number | null;
  comment: string | null;
  changes: Record<string, any> | null;
  metadata: Record<string, any> | null;
  createdAt: string;
  user?: { id: number; login: string; name: string; surname: string };
}

interface PaginatedResponse<T> {
  count: number;
  rows: T[];
  page: number;
  totalPages: number;
}

// ============================================
// API - СТОЙКИ
// ============================================

export const getRacks = async (params?: {
  status?: RackStatus;
  search?: string;
  includeUnits?: boolean;
}): Promise<BeryllRack[]> => {
  const { data } = await $authHost.get("/api/beryll/racks", { params });
  return data;
};

export const getRackById = async (id: number): Promise<BeryllRack> => {
  const { data } = await $authHost.get(`/api/beryll/racks/${id}`);
  return data;
};

export const createRack = async (rack: {
  name: string;
  location?: string;
  totalUnits?: number;
  networkSubnet?: string;
  gateway?: string;
  notes?: string;
}): Promise<BeryllRack> => {
  const { data } = await $authHost.post("/api/beryll/racks", rack);
  return data;
};

export const updateRack = async (
  id: number,
  rack: Partial<BeryllRack>
): Promise<BeryllRack> => {
  const { data } = await $authHost.put(`/api/beryll/racks/${id}`, rack);
  return data;
};

export const deleteRack = async (id: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/racks/${id}`);
  return data;
};

export const getRackHistory = async (
  id: number,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<HistoryRecord>> => {
  const { data } = await $authHost.get(`/api/beryll/racks/${id}/history`, { params });
  return data;
};

export const getFreeUnits = async (rackId: number): Promise<BeryllRackUnit[]> => {
  const { data } = await $authHost.get(`/api/beryll/racks/${rackId}/free-units`);
  return data;
};

export const installServerInRack = async (
  rackId: number,
  unitNumber: number,
  params: {
    serverId: number;
    hostname?: string;
    mgmtMacAddress?: string;
    mgmtIpAddress?: string;
    dataMacAddress?: string;
    dataIpAddress?: string;
    accessLogin?: string;
    accessPassword?: string;
    notes?: string;
  }
): Promise<BeryllRackUnit> => {
  const { data } = await $authHost.post(
    `/api/beryll/racks/${rackId}/units/${unitNumber}/install`,
    params
  );
  return data;
};

export const removeServerFromRack = async (
  rackId: number,
  unitNumber: number
): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.post(`/api/beryll/racks/${rackId}/units/${unitNumber}/remove`);
  return data;
};

export const updateRackUnit = async (
  unitId: number,
  params: Partial<BeryllRackUnit>
): Promise<BeryllRackUnit> => {
  const { data } = await $authHost.put(`/api/beryll/rack-units/${unitId}`, params);
  return data;
};

export const moveServerInRack = async (params: {
  fromRackId: number;
  fromUnit: number;
  toRackId: number;
  toUnit: number;
}): Promise<BeryllRackUnit> => {
  const { data } = await $authHost.post("/api/beryll/rack-units/move", params);
  return data;
};

export const findServerRackLocation = async (
  serverId: number
): Promise<BeryllRackUnit | { found: false }> => {
  const { data } = await $authHost.get(`/api/beryll/servers/${serverId}/rack-location`);
  return data;
};

// ============================================
// API - КОМПЛЕКТЫ/ОТГРУЗКИ
// ============================================

export const getShipments = async (params?: {
  status?: ShipmentStatus;
  search?: string;
  city?: string;
}): Promise<BeryllShipment[]> => {
  const { data } = await $authHost.get("/api/beryll/shipments", { params });
  return data;
};

export const getShipmentById = async (id: number): Promise<BeryllShipment> => {
  const { data } = await $authHost.get(`/api/beryll/shipments/${id}`);
  return data;
};

export const createShipment = async (shipment: {
  name: string;
  destinationCity?: string;
  destinationAddress?: string;
  contactPerson?: string;
  contactPhone?: string;
  expectedCount?: number;
  plannedShipDate?: string;
  waybillNumber?: string;
  carrier?: string;
  notes?: string;
}): Promise<BeryllShipment> => {
  const { data } = await $authHost.post("/api/beryll/shipments", shipment);
  return data;
};

export const updateShipment = async (
  id: number,
  shipment: Partial<BeryllShipment>
): Promise<BeryllShipment> => {
  const { data } = await $authHost.put(`/api/beryll/shipments/${id}`, shipment);
  return data;
};

export const deleteShipment = async (id: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/shipments/${id}`);
  return data;
};

export const getShipmentHistory = async (
  id: number,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<HistoryRecord>> => {
  const { data } = await $authHost.get(`/api/beryll/shipments/${id}/history`, { params });
  return data;
};

// ============================================
// API - КЛАСТЕРЫ
// ============================================

export const getClusters = async (params?: {
  status?: ClusterStatus;
  shipmentId?: number | "null";
  search?: string;
}): Promise<BeryllCluster[]> => {
  const { data } = await $authHost.get("/api/beryll/clusters", { params });
  return data;
};

export const getClusterById = async (id: number): Promise<BeryllCluster> => {
  const { data } = await $authHost.get(`/api/beryll/clusters/${id}`);
  return data;
};

export const createCluster = async (cluster: {
  name: string;
  description?: string;
  shipmentId?: number;
  expectedCount?: number;
  configVersion?: string;
  notes?: string;
}): Promise<BeryllCluster> => {
  const { data } = await $authHost.post("/api/beryll/clusters", cluster);
  return data;
};

export const updateCluster = async (
  id: number,
  cluster: Partial<BeryllCluster>
): Promise<BeryllCluster> => {
  const { data } = await $authHost.put(`/api/beryll/clusters/${id}`, cluster);
  return data;
};

export const deleteCluster = async (id: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/clusters/${id}`);
  return data;
};

export const getClusterHistory = async (
  id: number,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<HistoryRecord>> => {
  const { data } = await $authHost.get(`/api/beryll/clusters/${id}/history`, { params });
  return data;
};

export const addServerToCluster = async (
  clusterId: number,
  params: {
    serverId: number;
    role?: ServerRole;
    orderNumber?: number;
    clusterHostname?: string;
    clusterIpAddress?: string;
    notes?: string;
  }
): Promise<BeryllClusterServer> => {
  const { data } = await $authHost.post(`/api/beryll/clusters/${clusterId}/servers`, params);
  return data;
};

export const addServersToCluster = async (
  clusterId: number,
  params: {
    serverIds: number[];
    role?: ServerRole;
  }
): Promise<{ added: number; results: Array<{ serverId: number; success: boolean; id?: number; error?: string }> }> => {
  const { data } = await $authHost.post(`/api/beryll/clusters/${clusterId}/servers/bulk`, params);
  return data;
};

export const removeServerFromCluster = async (
  clusterId: number,
  serverId: number
): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/clusters/${clusterId}/servers/${serverId}`);
  return data;
};

export const updateClusterServer = async (
  id: number,
  params: Partial<BeryllClusterServer>
): Promise<BeryllClusterServer> => {
  const { data } = await $authHost.put(`/api/beryll/cluster-servers/${id}`, params);
  return data;
};

export const getUnassignedServers = async (params?: {
  status?: string;
  batchId?: number;
  search?: string;
  limit?: number;
}): Promise<Array<{ id: number; apkSerialNumber: string; hostname: string; ipAddress: string; status: string }>> => {
  const { data } = await $authHost.get("/api/beryll/servers/unassigned", { params });
  return data;
};

export const getServerClusters = async (serverId: number): Promise<BeryllClusterServer[]> => {
  const { data } = await $authHost.get(`/api/beryll/servers/${serverId}/clusters`);
  return data;
};

// ============================================
// API - УЧЁТ БРАКА
// ============================================

export const getDefectRecords = async (params?: {
  serverId?: number;
  status?: DefectRecordStatus;
  repairPartType?: RepairPartType;
  diagnosticianId?: number;
  isRepeatedDefect?: boolean;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<PaginatedResponse<BeryllDefectRecord>> => {
  const { data } = await $authHost.get("/api/beryll/defect-records", { params });
  return data;
};

export const getDefectRecordById = async (id: number): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.get(`/api/beryll/defect-records/${id}`);
  return data;
};

export const getServerDefectRecords = async (
  serverId: number,
  params?: { status?: DefectRecordStatus; limit?: number; offset?: number }
): Promise<PaginatedResponse<BeryllDefectRecord>> => {
  const { data } = await $authHost.get(`/api/beryll/servers/${serverId}/defect-records`, { params });
  return data;
};

export const createDefectRecord = async (record: {
  serverId: number;
  problemDescription: string;
  yadroTicketNumber?: string;
  hasSPISI?: boolean;
  clusterCode?: string;
  detectedAt?: string;
  diagnosticianId?: number;
  repairPartType?: RepairPartType;
  defectPartSerialYadro?: string;
  defectPartSerialManuf?: string;
  replacementPartSerialYadro?: string;
  replacementPartSerialManuf?: string;
  repairDetails?: string;
  notes?: string;
}): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.post("/api/beryll/defect-records", record);
  return data;
};

export const updateDefectRecord = async (
  id: number,
  record: Partial<BeryllDefectRecord>
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.put(`/api/beryll/defect-records/${id}`, record);
  return data;
};

export const deleteDefectRecord = async (id: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/defect-records/${id}`);
  return data;
};

export const changeDefectRecordStatus = async (
  id: number,
  status: DefectRecordStatus,
  comment?: string
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.put(`/api/beryll/defect-records/${id}/status`, { status, comment });
  return data;
};

export const sendDefectToYadro = async (
  id: number,
  params?: { substituteServerSerial?: string; notes?: string }
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.post(`/api/beryll/defect-records/${id}/send-to-yadro`, params);
  return data;
};

export const returnDefectFromYadro = async (
  id: number,
  params?: { notes?: string }
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.post(`/api/beryll/defect-records/${id}/return-from-yadro`, params);
  return data;
};

export const resolveDefectRecord = async (
  id: number,
  resolution?: string
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.post(`/api/beryll/defect-records/${id}/resolve`, { resolution });
  return data;
};

export const markDefectAsRepeated = async (
  id: number,
  reason?: string
): Promise<BeryllDefectRecord> => {
  const { data } = await $authHost.post(`/api/beryll/defect-records/${id}/mark-repeated`, { reason });
  return data;
};

export const getDefectRecordHistory = async (
  id: number,
  params?: { limit?: number; offset?: number }
): Promise<PaginatedResponse<HistoryRecord>> => {
  const { data } = await $authHost.get(`/api/beryll/defect-records/${id}/history`, { params });
  return data;
};

export const getDefectRecordStats = async (params?: {
  dateFrom?: string;
  dateTo?: string;
  serverId?: number;
}): Promise<DefectRecordStats> => {
  const { data } = await $authHost.get("/api/beryll/defect-records/stats", { params });
  return data;
};

// Справочники
export const getRepairPartTypes = async (): Promise<Array<{ value: RepairPartType; label: string }>> => {
  const { data } = await $authHost.get("/api/beryll/defect-records/part-types");
  return data;
};

export const getDefectStatuses = async (): Promise<Array<{ value: DefectRecordStatus; label: string }>> => {
  const { data } = await $authHost.get("/api/beryll/defect-records/statuses");
  return data;
};

// Файлы
export const uploadDefectRecordFile = async (
  defectRecordId: number,
  file: File
): Promise<{ success: boolean; file: BeryllDefectRecordFile }> => {
  const formData = new FormData();
  formData.append("file", file);
  const { data } = await $authHost.post(
    `/api/beryll/defect-records/${defectRecordId}/files`,
    formData,
    { headers: { "Content-Type": "multipart/form-data" } }
  );
  return data;
};

export const downloadDefectRecordFile = async (fileId: number): Promise<Blob> => {
  const { data } = await $authHost.get(`/api/beryll/defect-record-files/${fileId}`, {
    responseType: "blob"
  });
  return data;
};

export const deleteDefectRecordFile = async (fileId: number): Promise<{ success: boolean; message: string }> => {
  const { data } = await $authHost.delete(`/api/beryll/defect-record-files/${fileId}`);
  return data;
};
