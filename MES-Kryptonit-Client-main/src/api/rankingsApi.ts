import { $authHost } from "./index";

/**
 * Типы периодов для рейтинга
 */
export type Period = "day" | "week" | "month" | "year" | "all" | "custom";

/**
 * Точка данных для спарклайна
 */
export interface SparklinePoint {
  date: string;
  value: number;
}

/**
 * Изменение за день
 */
export interface DailyChange {
  change: number;      // Абсолютное изменение
  percent: number;     // Процентное изменение
  today: number;       // Значение за сегодня
  yesterday: number;   // Значение за вчера
}

export interface RankingUser {
  id: number;
  name: string;
  surname: string;
  avatar: string | null;
  
  teamName: string;
  teamId: number | null;
  sectionName: string;
  teamLeadName: string;
  
  warehouseOutput: number;
  productionOutput: number;
  
  output: number;
  defects: number;
  efficiency: number;
  place: number;
  
  // Новые поля для графиков
  sparkline: SparklinePoint[];
  dailyChange: DailyChange;
}

export interface RankingTeam {
  id: number;
  title: string;
  section: string;
  teamLead: string;
  
  totalOutput: number;
  warehouseOutput: number;
  productionOutput: number;
  avgEfficiency: number;
  membersCount: number;
  progress: number;
}

export interface RankingTotals {
  totalOutput: number;
  warehouseOutput: number;
  productionOutput: number;
  totalDefects: number;
  usersCount: number;
  teamsCount: number;
}

export interface RankingResponse {
  users: RankingUser[];
  teams: RankingTeam[];
  totals: RankingTotals;
  period: string;
  startDate: string;
  endDate?: string;
}

export interface UserDailyStats {
  date: string;
  warehouse: number;
  production: number;
  total: number;
}

export interface UserDetailsResponse {
  user: {
    id: number;
    name: string;
    surname: string;
    avatar: string | null;
    team: string | null;
    section: string | null;
  };
  period: string;
  startDate: string;
  endDate?: string;
  dailyStats: UserDailyStats[];
  byOperation: {
    operation: string;
    code: string;
    total: number;
  }[];
  totals: {
    warehouse: number;
    production: number;
    total: number;
  };
}

export interface RankingsParams {
  period?: Period;
  startDate?: string;
  endDate?: string;
}

/**
 * Получить рейтинг сотрудников и бригад
 */
export const fetchRankings = async (
  params: RankingsParams | Period = "week"
): Promise<RankingResponse> => {
  const queryParams: RankingsParams = typeof params === "string" 
    ? { period: params } 
    : params;

  const { data } = await $authHost.get("/api/warehouse/rankings", {
    params: queryParams
  });
  return data;
};

/**
 * Получить детальную статистику пользователя
 */
export const fetchUserRankingDetails = async (
  userId: number,
  params: RankingsParams | Period = "week"
): Promise<UserDetailsResponse> => {
  const queryParams: RankingsParams = typeof params === "string" 
    ? { period: params } 
    : params;

  const { data } = await $authHost.get(`/api/warehouse/rankings/user/${userId}`, {
    params: queryParams
  });
  return data;
};

/**
 * Получить историю рейтинга пользователя
 */
export const fetchRankingsHistory = async (
  userId: number,
  periods: number = 7
): Promise<{ date: string; output: number }[]> => {
  const { data } = await $authHost.get(`/api/warehouse/rankings/history/${userId}`, {
    params: { periods }
  });
  return data;
};