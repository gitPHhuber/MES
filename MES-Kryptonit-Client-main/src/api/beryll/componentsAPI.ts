/**
 * API для работы с комплектующими серверов
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

const BASE_URL = "api/beryll";

/**
 * Проверить доступность BMC
 */
export async function checkBMC(serverId: number): Promise<BMCCheckResponse> {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/bmc/check`);
  return data;
}

/**
 * Выгрузить комплектующие с BMC
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
