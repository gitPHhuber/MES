/**
 * productionApi.ts - API для учёта выработки v2
 * 
 * Интеграция с Project, Task, Team, Section
 */

import { $authHost } from "./index";

// =========================================================================
// ТИПЫ
// =========================================================================

export interface OperationType {
    id: number;
    name: string;
    code: string | null;
    description: string | null;
    unit: string;
    normMinutes: number | null;
    sectionId: number | null;
    section?: { id: number; title: string } | null;
    isActive: boolean;
    sortOrder: number;
}

export interface ProductionOutput {
    id: number;
    date: string;
    userId: number;
    teamId: number | null;
    sectionId: number | null;
    projectId: number | null;
    taskId: number | null;
    operationTypeId: number | null;
    claimedQty: number;
    approvedQty: number;
    rejectedQty: number;
    status: 'pending' | 'approved' | 'rejected' | 'adjusted';
    approvedById: number | null;
    approvedAt: string | null;
    createdById: number | null;
    comment: string | null;
    rejectReason: string | null;
    
    // Связи
    user?: { id: number; name: string; surname: string; img?: string };
    approvedBy?: { id: number; name: string; surname: string };
    createdBy?: { id: number; name: string; surname: string };
    operationType?: { id: number; name: string; code: string; unit: string };
    team?: { id: number; title: string };
    section?: { id: number; title: string };
    project?: { id: number; title: string };
    task?: { id: number; title: string };
}

export interface OutputsListResponse {
    rows: ProductionOutput[];
    count: number;
    page: number;
    limit: number;
    totalPages: number;
}

export interface TeamMember {
    id: number;
    name: string;
    surname: string;
    img?: string;
    teamId: number | null;
    team?: { id: number; title: string };
}

export interface MatrixUser {
    userId: number;
    name: string;
    surname: string;
    days: Record<string, number>;
    total: number;
}

export interface MatrixResponse {
    period: { dateFrom: string; dateTo: string };
    dates: string[];
    matrix: MatrixUser[];
}

// =========================================================================
// СПРАВОЧНИК ОПЕРАЦИЙ
// =========================================================================

export const fetchOperationTypes = async (params?: { 
    includeInactive?: boolean; 
    sectionId?: number 
}): Promise<OperationType[]> => {
    const { data } = await $authHost.get("api/production/operation-types", { params });
    return data;
};

export const createOperationType = async (payload: {
    name: string;
    code?: string;
    description?: string;
    unit?: string;
    normMinutes?: number;
    sectionId?: number;
    sortOrder?: number;
}): Promise<OperationType> => {
    const { data } = await $authHost.post("api/production/operation-types", payload);
    return data;
};

export const updateOperationType = async (
    id: number, 
    payload: Partial<OperationType>
): Promise<OperationType> => {
    const { data } = await $authHost.put(`api/production/operation-types/${id}`, payload);
    return data;
};

export const deleteOperationType = async (id: number): Promise<{ message: string; deleted?: boolean; deactivated?: boolean }> => {
    const { data } = await $authHost.delete(`api/production/operation-types/${id}`);
    return data;
};

// =========================================================================
// ЗАПИСИ ВЫРАБОТКИ
// =========================================================================

export const fetchOutputs = async (params?: {
    page?: number;
    limit?: number;
    userId?: number;
    teamId?: number;
    sectionId?: number;
    projectId?: number;
    taskId?: number;
    operationTypeId?: number;
    status?: string;
    dateFrom?: string;
    dateTo?: string;
}): Promise<OutputsListResponse> => {
    const { data } = await $authHost.get("api/production/outputs", { params });
    return data;
};

export const fetchOutputById = async (id: number): Promise<ProductionOutput> => {
    const { data } = await $authHost.get(`api/production/outputs/${id}`);
    return data;
};

export const createOutput = async (payload: {
    date: string;
    userId: number;
    projectId?: number | null;
    taskId?: number | null;
    operationTypeId?: number | null;
    claimedQty: number;
    comment?: string;
}): Promise<ProductionOutput> => {
    const { data } = await $authHost.post("api/production/outputs", payload);
    return data;
};

export const updateOutput = async (id: number, payload: {
    date?: string;
    projectId?: number | null;
    taskId?: number | null;
    operationTypeId?: number | null;
    claimedQty?: number;
    comment?: string;
}): Promise<ProductionOutput> => {
    const { data } = await $authHost.put(`api/production/outputs/${id}`, payload);
    return data;
};

export const deleteOutput = async (id: number): Promise<{ message: string }> => {
    const { data } = await $authHost.delete(`api/production/outputs/${id}`);
    return data;
};

// =========================================================================
// ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
// =========================================================================

export const fetchPendingOutputs = async (params?: {
    teamId?: number;
    sectionId?: number;
    dateFrom?: string;
    dateTo?: string;
}): Promise<ProductionOutput[]> => {
    const { data } = await $authHost.get("api/production/pending", { params });
    return data;
};

export const approveOutputs = async (
    ids: number[], 
    adjustments?: Record<number, number>
): Promise<{ results: Array<{ id: number; status?: string; approvedQty?: number; error?: string }> }> => {
    const { data } = await $authHost.post("api/production/approve", { ids, adjustments });
    return data;
};

export const rejectOutputs = async (
    ids: number[], 
    reason?: string
): Promise<{ results: Array<{ id: number; status?: string; error?: string }> }> => {
    const { data } = await $authHost.post("api/production/reject", { ids, reason });
    return data;
};

// =========================================================================
// СТАТИСТИКА
// =========================================================================

export const fetchUserSummary = async (userId: number, params?: {
    dateFrom?: string;
    dateTo?: string;
}): Promise<{
    userId: number;
    period: { dateFrom: string; dateTo: string };
    stats: Array<{ status: string; totalClaimed: number; totalApproved: number; recordCount: number }>;
    byOperation: Array<{ operationTypeId: number; total: number; operationType?: { name: string; code: string; unit: string } }>;
    byDay: Array<{ date: string; total: number }>;
}> => {
    const { data } = await $authHost.get(`api/production/summary/${userId}`, { params });
    return data;
};

export const fetchMatrix = async (params?: {
    teamId?: number;
    sectionId?: number;
    projectId?: number;
    operationTypeId?: number;
    dateFrom?: string;
    dateTo?: string;
}): Promise<MatrixResponse> => {
    const { data } = await $authHost.get("api/production/matrix", { params });
    return data;
};

// =========================================================================
// МОЯ БРИГАДА
// =========================================================================

export const fetchMyTeamMembers = async (): Promise<TeamMember[]> => {
    const { data } = await $authHost.get("api/production/my-team");
    return data;
};

// =========================================================================
// ХЕЛПЕРЫ
// =========================================================================

export const OUTPUT_STATUS_LABELS: Record<string, string> = {
    pending: 'Ожидает',
    approved: 'Подтверждено',
    rejected: 'Отклонено',
    adjusted: 'Скорректировано'
};

export const OUTPUT_STATUS_COLORS: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    adjusted: 'bg-blue-100 text-blue-800'
};

export const formatUserName = (user?: { name: string; surname: string } | null): string => {
    if (!user) return '—';
    return `${user.surname} ${user.name?.[0] || ''}.`;
};

export const formatDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

export const formatShortDate = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
};

export const getDayOfWeek = (dateStr: string): string => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('ru-RU', { weekday: 'short' });
};
