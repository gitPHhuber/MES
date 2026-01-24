import { $authHost } from "./index";

export interface ProjectModel {
    id: number;
    title: string;
    description: string;
    status: string;
    createdAt: string;
    author?: { name: string; surname: string };
}

export const fetchProjects = async () => {
    const { data } = await $authHost.get("api/projects");
    return data as ProjectModel[];
};

export const createProject = async (title: string, description: string) => {
    const { data } = await $authHost.post("api/projects", { title, description });
    return data;
};

export const deleteProject = async (id: number) => {
    await $authHost.delete(`api/projects/${id}`);
};