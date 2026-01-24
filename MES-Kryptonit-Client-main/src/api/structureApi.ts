import { $authHost } from "src/api";
import { userGetModel } from "src/types/UserModel";

export const fetchStructure = async () => {
    const { data } = await $authHost.get("api/structure");
    return data;
};

// Получение списка нераспределенных
export const fetchUnassignedUsers = async () => {
    const { data } = await $authHost.get("api/structure/users/unassigned");
    return data as userGetModel[];
};

export const createSection = async (title: string) => {
    const { data } = await $authHost.post("api/structure/section", { title });
    return data;
};

export const createTeam = async (title: string, sectionId: number) => {
    const { data } = await $authHost.post("api/structure/team", { title, sectionId });
    return data;
};

export const assignSectionManager = async (sectionId: number, userId: number) => {
    const { data } = await $authHost.put("api/structure/section/manager", { sectionId, userId });
    return data;
};

export const assignTeamLead = async (teamId: number, userId: number) => {
    const { data } = await $authHost.put("api/structure/team/lead", { teamId, userId });
    return data;
};

export const addUserToTeam = async (teamId: number, userId: number) => {
    const { data } = await $authHost.put("api/structure/user/assign", { teamId, userId });
    return data;
};

export const removeUserFromTeam = async (userId: number) => {
    const { data } = await $authHost.put("api/structure/user/remove", { userId });
    return data;
};