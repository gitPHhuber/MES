/**
 * defectExportApi.ts
 * 
 * API функции для экспорта дефектов в Excel
 * 
 * Добавить в существующий beryllExtendedApi.ts или использовать отдельно
 * 
 * Положить в: MES-Kryptonit-Client-main/src/api/beryll/defectExportApi.ts
 */

import { apiClient } from "../apiClient";

export interface DefectExportParams {
    status?: string;
    dateFrom?: string;  // ISO format: 2024-01-01
    dateTo?: string;    // ISO format: 2024-12-31
    serverId?: number;
    search?: string;
}

/**
 * Экспорт дефектов в Excel файл
 * @param params - параметры фильтрации
 * @returns Promise<Blob> - Excel файл
 */
export const exportDefectsToExcel = async (params: DefectExportParams = {}): Promise<Blob> => {
    const response = await apiClient.get("/beryll/extended/defects/export", {
        params,
        responseType: "blob"
    });
    return response.data;
};

/**
 * Экспорт статистики дефектов в Excel
 * @returns Promise<Blob> - Excel файл
 */
export const exportDefectStatsToExcel = async (): Promise<Blob> => {
    const response = await apiClient.get("/beryll/extended/defects/export/stats", {
        responseType: "blob"
    });
    return response.data;
};

/**
 * Хелпер для скачивания файла из Blob
 * @param blob - данные файла
 * @param filename - имя файла
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
};

/**
 * Экспорт и скачивание дефектов
 * @param params - параметры фильтрации
 */
export const downloadDefectsExcel = async (params: DefectExportParams = {}): Promise<void> => {
    const blob = await exportDefectsToExcel(params);
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadBlob(blob, `Брак_серверов_${date}.xlsx`);
};

/**
 * Экспорт и скачивание статистики
 */
export const downloadDefectStatsExcel = async (): Promise<void> => {
    const blob = await exportDefectStatsToExcel();
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    downloadBlob(blob, `Статистика_брака_${date}.xlsx`);
};