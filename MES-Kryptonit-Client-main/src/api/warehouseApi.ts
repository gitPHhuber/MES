import { $authHost } from "./index";
import { 
  SupplyModel, 
  InventoryBoxModel, 
  WarehouseMovement, 
  WarehouseDocument,
  StockBalanceItem 
} from "src/types/WarehouseModels";

export interface SupplyCreateDto {
  supplier?: string;
  docNumber?: string;
  expectedDate?: string;
  comment?: string;
}

export interface BoxCreateDto {
  supplyId: number;
  sectionId: number;
  itemName: string;
  quantity: number;
  unit: string;
  kitNumber?: string;
  comment?: string;
}

export interface CreateBoxesBatchPayload {
  label: string;
  projectName?: string;
  batchName?: string;
  originType?: string;      
  originId?: number | null; 
  quantity: number;         
  itemsPerBox: number;      
  unit: string;             
  status?: string;
  currentSectionId?: number | null;
  currentTeamId?: number | null;
  notes?: string;
}

export interface FetchBoxesParams {
  page?: number;
  limit?: number;
  search?: string;
  batchName?: string;
  projectName?: string;
  originType?: string;
  status?: string;
  sectionId?: number;
  teamId?: number;
  supplyId?: number;
}

export interface MoveBoxPayload {
  boxId: number;
  toSectionId?: number | null;
  toTeamId?: number | null;
  operation: string;
  statusAfter?: string;
  comment?: string;
  goodQty?: number;
  scrapQty?: number;
  deltaQty?: number; 
}

export interface BatchMovePayload {
    movements: Array<{
        boxId: number;
        operation: string;
        toSectionId?: number | null;
        toTeamId?: number | null;
        statusAfter?: string;
        deltaQty?: number;
        goodQty?: number;
        scrapQty?: number;
        comment?: string;
    }>;
    documentData?: {
        createNew: boolean;
        number?: string;
        type?: string;
        comment?: string;
        documentId?: number; 
    };
}

export interface FetchDocumentsParams {
  page?: number;
  limit?: number;
  search?: string;
  type?: string;
  boxId?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface CreateDocumentPayload {
  boxId?: number | null;
  number: string;
  type?: string;
  date?: string;
  fileUrl?: string;
  comment?: string;
}

export interface InventoryLimitModel {
    id: number;
    label: string;
    originType?: string;
    originId?: number;
    minQuantity: number;
}

export interface StockAlertModel {
    id: number;
    label: string;
    min: number;
    current: number;
    deficit: number;
}

export interface RankingResponse {
    users: {
        id: number;
        name: string;
        surname: string;
        teamName: string;
        avatar: string | null;
        output: number;
        defects: number;
        efficiency: number;
        place: number;
    }[];
    teams: {
        id: number;
        title: string;
        section: string;
        teamLead: string;
        totalOutput: number;
        avgEfficiency: number;
        progress: number;
        membersCount: number;
    }[];
}

// ================= API ФУНКЦИИ =================

export const createSupply = async (data: SupplyCreateDto): Promise<SupplyModel> => {
  const { data: response } = await $authHost.post('api/warehouse/supplies', data);
  return response;
};

export const fetchSupplies = async (): Promise<SupplyModel[]> => {
  const { data } = await $authHost.get('api/warehouse/supplies');
  return data;
};

export const createBox = async (data: BoxCreateDto): Promise<InventoryBoxModel> => {
  const { data: response } = await $authHost.post('api/warehouse/boxes/single', data);
  return response;
};

export const createBoxesBatch = async (payload: CreateBoxesBatchPayload) => {
  const { data } = await $authHost.post("api/warehouse/boxes/batch", payload);
  return data as { boxes: InventoryBoxModel[] };
};

export const updateBoxesBatch = async (ids: number[], updates: Partial<InventoryBoxModel>) => {
    const { data } = await $authHost.put("api/warehouse/boxes/batch", { ids, updates });
    return data;
};

export const fetchBoxes = async (params: FetchBoxesParams): Promise<any> => {
  const { data } = await $authHost.get("api/warehouse/boxes", { params });
  if (Array.isArray(data)) return data;
  return data as { rows: InventoryBoxModel[]; count: number; page: number; limit: number };
};

export const fetchBoxById = async (id: number) => {
  const { data } = await $authHost.get(`api/warehouse/boxes/${id}`);
  return data as {
    box: InventoryBoxModel;
    movements: WarehouseMovement[];
    documents: WarehouseDocument[];
  };
};

export const fetchBoxByQr = async (qrCode: string) => {
  const encoded = encodeURIComponent(qrCode);
  const { data } = await $authHost.get(`api/warehouse/boxes/by-qr/${encoded}`);
  return data as {
    box: InventoryBoxModel;
    movements: WarehouseMovement[];
    documents: WarehouseDocument[];
  };
};

// Остатки
export const fetchStockBalance = async () => {
    const { data } = await $authHost.get("api/warehouse/balance");
    return data as StockBalanceItem[];
};

// Аналитика
export const fetchDashboardStats = async () => {
    const { data } = await $authHost.get("api/warehouse/analytics/dashboard");
    return data;
};

export const fetchAlerts = async () => {
    const { data } = await $authHost.get("api/warehouse/alerts");
    return data as StockAlertModel[];
};

export const fetchAllLimits = async () => {
    const { data } = await $authHost.get("api/warehouse/limits");
    return data as InventoryLimitModel[];
};

export const saveLimit = async (payload: { label: string, min: number, originType?: string, originId?: number }) => {
    const { data } = await $authHost.post("api/warehouse/limits", payload);
    return data;
};

// Движения
export const moveBox = async (payload: MoveBoxPayload) => {
  const { data } = await $authHost.post("api/warehouse/movements", payload);
  return data as { box: InventoryBoxModel; movement: WarehouseMovement };
};

export const moveBoxesBatch = async (payload: BatchMovePayload) => {
    const { data } = await $authHost.post("api/warehouse/movements/batch", payload);
    return data; 
};

// Экспорт / Печать
export const downloadBoxesExcel = async (ids: number[]) => {
  const { data } = await $authHost.post(
    "api/warehouse/boxes/export", 
    { ids }, 
    { responseType: 'blob' }
  );
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `labels_export_${date}.csv`);
  document.body.appendChild(link); link.click(); link.remove();
};

export const printBoxesPdf = async (ids: number[]) => {
  const { data } = await $authHost.post(
    "api/warehouse/boxes/print-pdf", 
    { ids }, 
    { responseType: 'blob' }
  );
  const url = window.URL.createObjectURL(new Blob([data], { type: 'application/pdf' }));
  const link = document.createElement('a');
  link.href = url;
  const date = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `labels_print_${date}.pdf`);
  document.body.appendChild(link); link.click(); link.remove();
};

export const printSpecialLabel = async (data: any) => {
  const response = await $authHost.post("api/warehouse/boxes/print-special", data, {
    responseType: 'blob'
  });
  
  const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
  
  const iframe = document.createElement('iframe');
  iframe.style.display = 'none';
  iframe.src = url;
  document.body.appendChild(iframe);
  
  iframe.onload = () => {
      iframe.contentWindow?.print();
  };
};

// --- История печати ---
export const fetchPrintHistory = async (params: { 
    page?: number; 
    limit?: number; 
    search?: string;
    template?: string;
    dateFrom?: string;
    dateTo?: string;
}) => {
    const { data } = await $authHost.get("api/warehouse/print-history", { params });
    return data as { rows: any[]; count: number; page: number; limit: number };
};

// Документы
export const fetchDocuments = async (params: FetchDocumentsParams) => {
  const { data } = await $authHost.get("api/warehouse/documents", { params });
  return data as { rows: WarehouseDocument[]; count: number; page: number; limit: number };
};

export const createDocument = async (payload: CreateDocumentPayload) => {
  const { data } = await $authHost.post("api/warehouse/documents", payload);
  return data as WarehouseDocument;
};

export const exportLabelsCsv = async (supplyId: number): Promise<Blob> => {
  const { data } = await $authHost.get(`api/warehouse/supplies/${supplyId}/export-csv`, {
    responseType: 'blob',
  });
  return data;
};

export const fetchRankings = async (period: 'day' | 'week' | 'month') => {
    const { data } = await $authHost.get("api/warehouse/rankings", {
        params: { period }
    });
    return data as RankingResponse;
};