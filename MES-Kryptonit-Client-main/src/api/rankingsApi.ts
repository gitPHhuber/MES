import { $authHost } from "./index";

// ═══════════════════════════════════════════════════════════════════════════
// ТИПЫ ДЛЯ РЕЙТИНГОВ (расширенные)
// ═══════════════════════════════════════════════════════════════════════════

export interface RankingUser {
  id: number;
  name: string;
  surname: string;
  avatar: string | null;
  
  teamName: string;
  teamId: number | null;
  sectionName: string;
  teamLeadName: string;
  
  // Разбивка по источникам
  warehouseOutput: number;  // Склад (коробки)
  productionOutput: number; // Производство (до упаковки)
  
  // Итого
  output: number;           // warehouseOutput + productionOutput
  defects: number;
  efficiency: number;
  place: number;
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

// ═══════════════════════════════════════════════════════════════════════════
// API МЕТОДЫ
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Получить общий рейтинг сотрудников и бригад
 * @param period - 'day' | 'week' | 'month'
 */
export const fetchRankings = async (
  period: "day" | "week" | "month" = "week"
): Promise<RankingResponse> => {
  const { data } = await $authHost.get("api/warehouse/rankings", {
    params: { period }
  });
  return data;
};

/**
 * Получить детальную статистику пользователя
 * @param userId - ID пользователя
 * @param period - 'day' | 'week' | 'month'
 */
export const fetchUserRankingDetails = async (
  userId: number,
  period: "day" | "week" | "month" = "week"
): Promise<UserDetailsResponse> => {
  const { data } = await $authHost.get(`api/warehouse/rankings/user/${userId}`, {
    params: { period }
  });
  return data;
};

/**
 * Получить рейтинг за несколько периодов (для графиков)
 */
export const fetchRankingsHistory = async (
  userId: number,
  periods: number = 7 // дней
): Promise<{ date: string; output: number }[]> => {
  const { data } = await $authHost.get(`api/warehouse/rankings/history/${userId}`, {
    params: { periods }
  });
  return data;
};
