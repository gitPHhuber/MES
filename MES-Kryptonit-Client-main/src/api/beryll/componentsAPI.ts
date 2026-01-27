/**
 * componentsAPI.ts
 * 
 * Расширенный API для работы с комплектующими серверов
 * Включает: добавление, редактирование, замену, удаление, BMC синхронизация
 * 
 * Положить в: src/api/beryll/componentsAPI.ts
 */

import { $authHost } from "../index";
import type { 
  ComponentsResponse, 
  BMCCheckResponse, 
  FetchComponentsResponse,
  ServerComponent
} from "../../types/beryll/components";

const BASE_URL = "/api/beryll";

// ============================================
// БАЗОВЫЕ ОПЕРАЦИИ
// ============================================

/**
 * Проверить доступность BMC
 */
export async function checkBMC(serverId: number): Promise<BMCCheckResponse> {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/bmc/check`);
  return data;
}

/**
 * Выгрузить комплектующие с BMC (старый метод - простая перезапись)
 * @deprecated Используйте syncComponentsWithBMC с режимами
 */
export async function fetchComponents(serverId: number): Promise<FetchComponentsResponse> {
  const { data } = await $authHost.post(`${BASE_URL}/servers/${serverId}/components/fetch`);
  return data;
}

/**
 * Получить комплектующие сервера
 */
export async function getServerComponents(serverId: number): Promise<ComponentsResponse> {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/components`);
  return data;
}

/**
 * Получить один компонент (детали)
 */
export async function getComponentById(componentId: number): Promise<ServerComponent> {
  const { data } = await $authHost.get(`${BASE_URL}/components/${componentId}`);
  return data;
}

/**
 * Удалить все комплектующие сервера
 */
export async function deleteServerComponents(serverId: number): Promise<{ success: boolean; message: string }> {
  const { data } = await $authHost.delete(`${BASE_URL}/servers/${serverId}/components`);
  return data;
}

/**
 * Обновить BMC адрес сервера
 */
export async function updateBMCAddress(
  serverId: number, 
  bmcAddress: string
): Promise<{ success: boolean; bmcAddress: string }> {
  const { data } = await $authHost.put(`${BASE_URL}/servers/${serverId}/bmc-address`, { bmcAddress });
  return data;
}

// ============================================
// BMC СИНХРОНИЗАЦИЯ (НОВОЕ)
// ============================================

export type SyncMode = 'compare' | 'force' | 'merge';

export interface BMCCompareResponse {
  success: boolean;
  mode: 'compare';
  hasDiscrepancies: boolean;
  summary: {
    total: { inDb: number; inBmc: number };
    matched: number;
    missingInBmc: number;
    newInBmc: number;
    mismatches: number;
  };
  details: {
    matched: Array<{ dbComponent: ServerComponent; bmcComponent: any }>;
    missingInBmc: Array<{ dbComponent: ServerComponent; isManual: boolean; reason: string }>;
    newInBmc: Array<{ bmcComponent: any; reason: string }>;
    mismatches: Array<{ 
      dbComponent: ServerComponent; 
      bmcComponent: any; 
      differences: Array<{ field: string; db: string | null; bmc: string | null }>;
    }>;
  };
  message?: string;
}

export interface BMCForceResponse {
  success: boolean;
  mode: 'force';
  message: string;
  manualPreserved: number;
  components: ServerComponent[];
}

export interface BMCMergeResponse {
  success: boolean;
  mode: 'merge';
  message: string;
  actions: {
    updated: Array<{ id: number; serialNumber: string | null; changes: any[] }>;
    added: ServerComponent[];
    preserved: ServerComponent[];
    flaggedForReview: Array<{ id: number; serialNumber: string | null; reason: string }>;
  };
}

export type BMCSyncResponse = BMCCompareResponse | BMCForceResponse | BMCMergeResponse;

/**
 * Сравнить компоненты с BMC (только чтение, без изменений)
 */
export async function compareWithBMC(serverId: number): Promise<BMCCompareResponse> {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/components/compare`);
  return data;
}

/**
 * Синхронизировать компоненты с BMC
 * 
 * @param serverId - ID сервера
 * @param mode - Режим синхронизации:
 *   - 'compare' - только сравнение, без изменений (по умолчанию)
 *   - 'force' - полная перезапись данными с BMC
 *   - 'merge' - умное слияние (обновление существующих, добавление новых)
 * @param preserveManual - сохранять ли компоненты, добавленные вручную (только для mode='force')
 */
export async function syncComponentsWithBMC(
  serverId: number, 
  mode: SyncMode = 'compare',
  preserveManual: boolean = true
): Promise<BMCSyncResponse> {
  const { data } = await $authHost.post<BMCSyncResponse>(
    `${BASE_URL}/servers/${serverId}/components/fetch`,
    { mode, preserveManual }
  );
  return data;
}

/**
 * Разрешить расхождение для компонента
 * 
 * @param serverId - ID сервера
 * @param componentId - ID компонента
 * @param resolution - Действие: 'keep' - оставить компонент, 'delete' - удалить
 */
export async function resolveDiscrepancy(
  serverId: number,
  componentId: number,
  resolution: 'keep' | 'delete'
): Promise<{ success: boolean; action: 'kept' | 'deleted'; component?: ServerComponent }> {
  const { data } = await $authHost.put(
    `${BASE_URL}/servers/${serverId}/components/${componentId}/resolve-discrepancy`,
    { resolution }
  );
  return data;
}

// Хелперы для определения типа ответа
export function isCompareResponse(response: BMCSyncResponse): response is BMCCompareResponse {
  return response.mode === 'compare';
}

export function isMergeResponse(response: BMCSyncResponse): response is BMCMergeResponse {
  return response.mode === 'merge';
}

export function isForceResponse(response: BMCSyncResponse): response is BMCForceResponse {
  return response.mode === 'force';
}

// ============================================
// ДОБАВЛЕНИЕ КОМПЛЕКТУЮЩИХ
// ============================================

export interface AddComponentData {
  componentType: string;
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  status?: string;
  capacity?: number;
  speed?: string;
  firmwareVersion?: string;
  metadata?: Record<string, any>;
}

/**
 * Добавить новое комплектующее к серверу
 */
export async function addServerComponent(
  serverId: number, 
  componentData: AddComponentData
): Promise<{ success: boolean; component: ServerComponent; message: string }> {
  const { data } = await $authHost.post(
    `${BASE_URL}/servers/${serverId}/components`,
    componentData
  );
  return data;
}

/**
 * Добавить несколько комплектующих за раз
 */
export async function addServerComponentsBatch(
  serverId: number, 
  components: AddComponentData[]
): Promise<{ success: boolean; components: ServerComponent[]; count: number }> {
  const { data } = await $authHost.post(
    `${BASE_URL}/servers/${serverId}/components/batch`,
    { components }
  );
  return data;
}

// ============================================
// РЕДАКТИРОВАНИЕ КОМПЛЕКТУЮЩИХ
// ============================================

export interface UpdateComponentData {
  name?: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  status?: string;
  firmwareVersion?: string;
  capacity?: number;
  speed?: string;
  metadata?: Record<string, any>;
}

/**
 * Обновить комплектующее
 */
export async function updateServerComponent(
  componentId: number, 
  updates: UpdateComponentData
): Promise<{ success: boolean; component: ServerComponent; message: string }> {
  const { data } = await $authHost.put(
    `${BASE_URL}/components/${componentId}`,
    updates
  );
  return data;
}

/**
 * Обновить только серийные номера комплектующего
 */
export async function updateComponentSerials(
  componentId: number, 
  serials: { serialNumber?: string; serialNumberYadro?: string }
): Promise<{ success: boolean; component: ServerComponent }> {
  const { data } = await $authHost.patch(
    `${BASE_URL}/components/${componentId}/serials`,
    serials
  );
  return data;
}

// ============================================
// ЗАМЕНА КОМПЛЕКТУЮЩИХ
// ============================================

export interface ReplaceComponentData {
  newSerialNumber?: string;
  newSerialNumberYadro?: string;
  newManufacturer?: string;
  newModel?: string;
  newPartNumber?: string;
  reason?: string;
  defectRecordId?: number;
  inventoryComponentId?: number;
}

/**
 * Заменить комплектующее
 * Создаёт запись в истории о замене
 */
export async function replaceServerComponent(
  componentId: number, 
  replacementData: ReplaceComponentData
): Promise<{ 
  success: boolean; 
  oldComponent: ServerComponent;
  newComponent: ServerComponent;
  historyId: number;
  message: string 
}> {
  const { data } = await $authHost.post(
    `${BASE_URL}/components/${componentId}/replace`,
    replacementData
  );
  return data;
}

// ============================================
// УДАЛЕНИЕ КОМПЛЕКТУЮЩИХ
// ============================================

/**
 * Удалить одно комплектующее
 */
export async function deleteComponent(
  componentId: number,
  reason?: string
): Promise<{ success: boolean; message: string }> {
  const { data } = await $authHost.delete(
    `${BASE_URL}/components/${componentId}`,
    { data: { reason } }
  );
  return data;
}

// ============================================
// ПОИСК И СКАНИРОВАНИЕ
// ============================================

export interface ComponentSearchParams {
  serialNumber?: string;
  serialNumberYadro?: string;
  componentType?: string;
  serverId?: number;
}

/**
 * Найти комплектующее по серийному номеру
 */
export async function findComponentBySerial(
  params: ComponentSearchParams
): Promise<{ found: boolean; component?: ServerComponent; server?: any }> {
  const { data } = await $authHost.get(`${BASE_URL}/components/search`, { params });
  return data;
}

/**
 * Сканировать серийный номер Yadro
 * Используется для быстрого поиска при сканировании штрих-кода
 */
export async function scanYadroSerial(
  serialNumberYadro: string
): Promise<{ 
  found: boolean; 
  component?: ServerComponent; 
  server?: { id: number; apkSerialNumber: string; hostname?: string };
  suggestions?: ServerComponent[];
}> {
  const { data } = await $authHost.get(
    `${BASE_URL}/components/scan`,
    { params: { serialNumberYadro } }
  );
  return data;
}

// ============================================
// ИСТОРИЯ ИЗМЕНЕНИЙ
// ============================================

export interface ComponentHistoryEntry {
  id: number;
  action: 'ADDED' | 'UPDATED' | 'REPLACED' | 'REMOVED' | 'SERIAL_CHANGED';
  componentId: number;
  serverId: number;
  userId: number;
  userName?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  reason?: string;
  performedAt: string;
}

/**
 * Получить историю изменений комплектующего
 */
export async function getComponentHistory(
  componentId: number
): Promise<{ history: ComponentHistoryEntry[] }> {
  const { data } = await $authHost.get(`${BASE_URL}/components/${componentId}/history`);
  return data;
}

/**
 * Получить историю изменений комплектующих сервера
 */
export async function getServerComponentsHistory(
  serverId: number,
  params?: { from?: string; to?: string; limit?: number }
): Promise<{ history: ComponentHistoryEntry[] }> {
  const { data } = await $authHost.get(
    `${BASE_URL}/servers/${serverId}/components/history`,
    { params }
  );
  return data;
}

// ============================================
// ВАЛИДАЦИЯ И ПРОВЕРКИ
// ============================================

/**
 * Проверить уникальность серийного номера
 */
export async function checkSerialUniqueness(
  serialNumber: string,
  serialNumberYadro?: string,
  excludeComponentId?: number
): Promise<{ 
  unique: boolean; 
  conflictsWith?: { componentId: number; serverId: number; serverSerial: string } 
}> {
  const { data } = await $authHost.post(`${BASE_URL}/components/check-serial`, {
    serialNumber,
    serialNumberYadro,
    excludeComponentId
  });
  return data;
}

/**
 * Валидация комплектующего перед добавлением
 */
export async function validateComponent(
  serverId: number,
  componentData: AddComponentData
): Promise<{ 
  valid: boolean; 
  errors?: string[]; 
  warnings?: string[] 
}> {
  const { data } = await $authHost.post(
    `${BASE_URL}/servers/${serverId}/components/validate`,
    componentData
  );
  return data;
}


export async function importComponentsFromExcel(
  serverId: number,
  file: File,
  options?: { skipExisting?: boolean; dryRun?: boolean }
): Promise<{ 
  success: boolean;
  imported: number;
  skipped: number;
  errors: { row: number; error: string }[];
  dryRun: boolean;
}> {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.skipExisting) formData.append('skipExisting', 'true');
  if (options?.dryRun) formData.append('dryRun', 'true');

  const { data } = await $authHost.post(
    `${BASE_URL}/servers/${serverId}/components/import`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return data;
}

/**
 * Экспортировать комплектующие в Excel
 */
export async function exportComponentsToExcel(
  serverId: number
): Promise<Blob> {
  const { data } = await $authHost.get(
    `${BASE_URL}/servers/${serverId}/components/export`,
    { responseType: 'blob' }
  );
  return data;
}