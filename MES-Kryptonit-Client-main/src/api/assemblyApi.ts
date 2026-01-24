import { $authHost } from "./index";
import {
  AssemblyRouteModel,
  SaveAssemblyRouteDto,
} from "src/types/AssemblyModels";

export interface FetchAssemblyRoutesParams {
  search?: string;
  productName?: string;
  isActive?: boolean;
}

export const fetchAssemblyRoutes = async (
  params?: FetchAssemblyRoutesParams
) => {
  const { data } = await $authHost.get("api/assembly/routes", {
    params: {
      ...params,
      isActive:
        typeof params?.isActive === "boolean"
          ? String(params.isActive)
          : undefined,
    },
  });
  return data as AssemblyRouteModel[];
};

export const fetchAssemblyRouteById = async (id: number) => {
  const { data } = await $authHost.get(`api/assembly/routes/${id}`);
  return data as AssemblyRouteModel;
};

export const createAssemblyRoute = async (payload: SaveAssemblyRouteDto) => {
  const { data } = await $authHost.post("api/assembly/routes", payload);
  return data as AssemblyRouteModel;
};

export const updateAssemblyRoute = async (
  id: number,
  payload: SaveAssemblyRouteDto
) => {
  const { data } = await $authHost.put(`api/assembly/routes/${id}`, payload);
  return data as AssemblyRouteModel;
};

export const deleteAssemblyRoute = async (id: number) => {
  const { data } = await $authHost.delete(`api/assembly/routes/${id}`);
  return data as { message: string };
};
