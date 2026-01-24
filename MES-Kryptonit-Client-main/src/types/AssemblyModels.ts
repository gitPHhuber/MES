export interface AssemblyRouteStepModel {
  id: number;
  routeId: number;
  order: number;
  title: string;
  operation: string;
  sectionId: number | null;
  teamId: number | null;
  description: string | null;

  section?: {
    id: number;
    title: string;
  } | null;

  team?: {
    id: number;
    title: string;
  } | null;
}

export interface AssemblyRouteModel {
  id: number;
  title: string;
  productName: string | null;
  description: string | null;
  isActive: boolean;
  createdById: number;
  createdAt: string;
  updatedAt: string;

  steps?: AssemblyRouteStepModel[];
}

// DTO для сохранения/обновления
export interface SaveAssemblyRouteDto {
  id?: number;
  title: string;
  productName?: string;
  description?: string;
  isActive?: boolean;
  steps?: {
    id?: number;
    order: number;
    title: string;
    operation: string;
    sectionId?: number | null;
    teamId?: number | null;
    description?: string | null;
  }[];
}
