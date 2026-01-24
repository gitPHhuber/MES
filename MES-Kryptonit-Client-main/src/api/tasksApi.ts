import { $authHost } from "./index";
import { InventoryBoxModel } from "src/types/WarehouseModels";

export interface TaskStats {
  total: number;
  done: number;
  inWork: number;
  onStock: number;
}

export interface ProductionTask {
  id: number;
  title: string;
  originType?: string | null;
  originId?: number | null;
  targetQty: number;
  unit: string;
  dueDate?: string | null;
  status: string;
  priority?: number | null;
  comment?: string | null;
  
  responsibleId?: number | null;
  sectionId?: number | null;
  projectId?: number | null;
  
  responsible?: { id: number; name: string; surname: string } | null;
  targetSection?: { id: number; title: string } | null;
  project?: { id: number; title: string } | null;

  stats?: TaskStats;
  progressPercent?: number;
}

export interface TaskListResponse {
  rows: ProductionTask[];
  count: number;
  page: number;
  limit: number;
}

export interface TaskBreakdownItem {
  status: string;
  sectionId: number | null;
  sectionTitle: string | null;
  qty: number;
}

export interface TaskDetailResponse {
  task: ProductionTask;
  totalQty: number;
  breakdown: TaskBreakdownItem[];
  boxes: InventoryBoxModel[];
}

export const createTask = async (payload: {
  title: string;
  originType?: string;
  originId?: number;
  targetQty: number;
  unit: string;
  dueDate?: string;
  priority?: number;
  comment?: string;
  responsibleId?: number;
  sectionId?: number;
  projectId?: number;
}) => {
  const { data } = await $authHost.post("api/tasks", payload);
  return data as ProductionTask;
};

export const fetchTasks = async (params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  originType?: string;
}) => {
  const { data } = await $authHost.get("api/tasks", { params });
  return data as TaskListResponse;
};

export const fetchTaskById = async (id: number) => {
  const { data } = await $authHost.get(`api/tasks/${id}`);
  return data as TaskDetailResponse;
};

export const updateTaskStatus = async (id: number, status: string) => {
  const { data } = await $authHost.patch(`api/tasks/${id}/status`, { status });
  return data as ProductionTask;
};

export const updateTask = async (id: number, payload: any) => {
    const { data } = await $authHost.put(`api/tasks/${id}`, payload);
    return data as ProductionTask;
};

export const deleteTask = async (id: number) => {
    const { data } = await $authHost.delete(`api/tasks/${id}`);
    return data;
};