import { $authHost } from "./index";

export interface AbilityModel {
    id: number;
    code: string;       // "warehouse.view"
    description: string; // "Просмотр склада" (Русский текст)
}

export interface RoleModel {
    id: number;
    name: string;       // "WAREHOUSE_MASTER"
    description: string; // "Кладовщик"
    abilities: AbilityModel[];
}

export const fetchAllRoles = async () => {
    const { data } = await $authHost.get("api/rbac/roles");
    return data as RoleModel[];
};

export const fetchAllAbilities = async () => {
    const { data } = await $authHost.get("api/rbac/abilities");
    return data as AbilityModel[];
};

export const updateRoleAbilities = async (roleId: number, abilityIds: number[]) => {
    const { data } = await $authHost.post(`api/rbac/role/${roleId}`, { abilityIds });
    return data;
};