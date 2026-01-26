import { $authHost } from "./index";
import {
  DefectCategory,
  CreateDefectCategoryDto,
  UpdateDefectCategoryDto,
  BoardDefect,
  CreateDefectDto,
  DefectsResponse,
  DefectDetailResponse,
  RepairAction,
  CreateRepairActionDto,
  MarkRepairedDto,
  MarkScrappedDto,
  DefectStatistics,
  BoardType,
  DefectStatus
} from "../types/DefectTypes";

// =========================================================
// КАТЕГОРИИ ДЕФЕКТОВ
// =========================================================

export const fetchDefectCategories = async (
  boardType?: BoardType,
  activeOnly: boolean = true
): Promise<DefectCategory[]> => {
  const params = new URLSearchParams();
  if (boardType) params.append("boardType", boardType);
  if (activeOnly) params.append("activeOnly", "true");
  
  const { data } = await $authHost.get(`api/defects/categories?${params}`);
  return data;
};

export const createDefectCategory = async (
  dto: CreateDefectCategoryDto
): Promise<DefectCategory> => {
  const { data } = await $authHost.post("api/defects/categories", dto);
  return data;
};

export const updateDefectCategory = async (
  id: number,
  dto: UpdateDefectCategoryDto
): Promise<DefectCategory> => {
  const { data } = await $authHost.put(`api/defects/categories/${id}`, dto);
  return data;
};

export const deleteDefectCategory = async (id: number): Promise<void> => {
  await $authHost.delete(`api/defects/categories/${id}`);
};

// =========================================================
// ДЕФЕКТЫ (БРАК)
// =========================================================

export interface FetchDefectsParams {
  page?: number;
  limit?: number;
  status?: DefectStatus | "ACTIVE";
  boardType?: BoardType;
  categoryId?: number;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export const fetchDefects = async (
  params: FetchDefectsParams = {}
): Promise<DefectsResponse> => {
  const searchParams = new URLSearchParams();
  
  if (params.page) searchParams.append("page", String(params.page));
  if (params.limit) searchParams.append("limit", String(params.limit));
  if (params.status) searchParams.append("status", params.status);
  if (params.boardType) searchParams.append("boardType", params.boardType);
  if (params.categoryId) searchParams.append("categoryId", String(params.categoryId));
  if (params.search) searchParams.append("search", params.search);
  if (params.startDate) searchParams.append("startDate", params.startDate);
  if (params.endDate) searchParams.append("endDate", params.endDate);
  
  const { data } = await $authHost.get(`api/defects?${searchParams}`);
  return data;
};

export const fetchDefectById = async (id: number): Promise<DefectDetailResponse> => {
  const { data } = await $authHost.get(`api/defects/${id}`);
  return data;
};

export const createDefect = async (dto: CreateDefectDto): Promise<BoardDefect> => {
  const { data } = await $authHost.post("api/defects", dto);
  return data;
};

export const updateDefectStatus = async (
  id: number,
  status: DefectStatus,
  finalResult?: string
): Promise<BoardDefect> => {
  const { data } = await $authHost.patch(`api/defects/${id}/status`, {
    status,
    finalResult
  });
  return data;
};

// =========================================================
// ДЕЙСТВИЯ ПО РЕМОНТУ
// =========================================================

export const fetchRepairHistory = async (defectId: number): Promise<RepairAction[]> => {
  const { data } = await $authHost.get(`api/defects/${defectId}/repairs`);
  return data;
};

export const addRepairAction = async (
  defectId: number,
  dto: CreateRepairActionDto
): Promise<RepairAction> => {
  const { data } = await $authHost.post(`api/defects/${defectId}/repairs`, dto);
  return data;
};

// =========================================================
// БЫСТРЫЕ ДЕЙСТВИЯ
// =========================================================

export const markDefectRepaired = async (
  id: number,
  dto?: MarkRepairedDto
): Promise<{ message: string; defect: BoardDefect }> => {
  const { data } = await $authHost.post(`api/defects/${id}/repaired`, dto || {});
  return data;
};

export const markDefectScrapped = async (
  id: number,
  dto?: MarkScrappedDto
): Promise<{ message: string; defect: BoardDefect }> => {
  const { data } = await $authHost.post(`api/defects/${id}/scrap`, dto || {});
  return data;
};

export const verifyDefectRepair = async (
  id: number
): Promise<{ message: string; defect: BoardDefect }> => {
  const { data } = await $authHost.post(`api/defects/${id}/verify`);
  return data;
};

// =========================================================
// СТАТИСТИКА
// =========================================================

export interface FetchStatisticsParams {
  startDate?: string;
  endDate?: string;
  boardType?: BoardType;
}

export const fetchDefectStatistics = async (
  params: FetchStatisticsParams = {}
): Promise<DefectStatistics> => {
  const searchParams = new URLSearchParams();
  
  if (params.startDate) searchParams.append("startDate", params.startDate);
  if (params.endDate) searchParams.append("endDate", params.endDate);
  if (params.boardType) searchParams.append("boardType", params.boardType);
  
  const { data } = await $authHost.get(`api/defects/statistics?${searchParams}`);
  return data;
};
