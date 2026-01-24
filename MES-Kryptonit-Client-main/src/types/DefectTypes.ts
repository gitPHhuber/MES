// ========================================
// КАТЕГОРИИ ДЕФЕКТОВ
// ========================================
export interface DefectCategory {
  id: number;
  code: string;
  title: string;
  description: string | null;
  severity: "CRITICAL" | "MAJOR" | "MINOR";
  applicableTypes: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDefectCategoryDto {
  code: string;
  title: string;
  description?: string;
  severity?: "CRITICAL" | "MAJOR" | "MINOR";
  applicableTypes?: string[];
}

export interface UpdateDefectCategoryDto {
  code?: string;
  title?: string;
  description?: string;
  severity?: "CRITICAL" | "MAJOR" | "MINOR";
  applicableTypes?: string[];
  isActive?: boolean;
}

// ========================================
// ДЕФЕКТЫ (БРАК)
// ========================================
export type BoardType = "FC" | "ELRS_915" | "ELRS_2_4" | "CORAL_B" | "SMARAGD";

export type DefectStatus = 
  | "OPEN" 
  | "IN_REPAIR" 
  | "REPAIRED" 
  | "VERIFIED" 
  | "SCRAPPED" 
  | "RETURNED" 
  | "CLOSED";

export type FinalResult = 
  | "FIXED" 
  | "SCRAPPED" 
  | "RETURNED_TO_SUPPLIER" 
  | "FALSE_POSITIVE";

export interface UserShort {
  id: number;
  name: string;
  surname: string;
}

export interface BoardDefect {
  id: number;
  boardType: BoardType;
  boardId: number | null;
  serialNumber: string | null;
  categoryId: number;
  description: string | null;
  detectedById: number;
  detectedAt: string;
  status: DefectStatus;
  closedById: number | null;
  closedAt: string | null;
  finalResult: FinalResult | null;
  totalRepairMinutes: number;
  createdAt: string;
  updatedAt: string;
  
  // Связи
  category?: DefectCategory;
  detectedBy?: UserShort;
  closedBy?: UserShort;
  repairs?: RepairAction[];
}

export interface CreateDefectDto {
  boardType: BoardType;
  boardId?: number | null;
  serialNumber?: string | null;
  categoryId: number;
  description?: string;
}

export interface DefectsResponse {
  defects: BoardDefect[];
  total: number;
  page: number;
  totalPages: number;
  stats: Record<DefectStatus, number>;
}

export interface DefectDetailResponse {
  defect: BoardDefect;
  boardInfo: any | null;
}

// ========================================
// ДЕЙСТВИЯ ПО РЕМОНТУ
// ========================================
export type ActionType = 
  | "DIAGNOSIS" 
  | "SOLDER" 
  | "REPLACE" 
  | "FLASH" 
  | "TEST" 
  | "CLEAN" 
  | "CLONE_DISK" 
  | "CABLE_REPLACE" 
  | "OTHER";

export type ActionResult = "SUCCESS" | "PARTIAL" | "FAILED" | "PENDING";

export interface RepairAction {
  id: number;
  boardDefectId: number;
  actionType: ActionType;
  performedById: number;
  performedAt: string;
  description: string;
  timeSpentMinutes: number | null;
  result: ActionResult;
  createdAt: string;
  updatedAt: string;
  
  // Связи
  performedBy?: UserShort;
}

export interface CreateRepairActionDto {
  actionType: ActionType;
  description: string;
  timeSpentMinutes?: number;
  result?: ActionResult;
}

export interface MarkRepairedDto {
  repairNote?: string;
  timeSpentMinutes?: number;
}

export interface MarkScrappedDto {
  reason?: string;
}

// ========================================
// СТАТИСТИКА
// ========================================
export interface DefectStatistics {
  byStatus: Array<{ status: DefectStatus; count: number }>;
  byCategory: Array<{ categoryId: number; count: number; "category.title"?: string }>;
  byBoardType: Array<{ boardType: BoardType; count: number }>;
  avgRepairTime: number | null;
}

// ========================================
// КОНСТАНТЫ ДЛЯ UI
// ========================================
export const BOARD_TYPE_LABELS: Record<BoardType, string> = {
  FC: "Полётный контроллер (FC)",
  ELRS_915: "ELRS 915 МГц",
  ELRS_2_4: "ELRS 2.4 ГГц",
  CORAL_B: "Coral B",
  SMARAGD: "Смарагд"
};

export const BOARD_TYPE_SHORT: Record<BoardType, string> = {
  FC: "FC",
  ELRS_915: "ELRS 915",
  ELRS_2_4: "ELRS 2.4",
  CORAL_B: "Coral B",
  SMARAGD: "Смарагд"
};

export const DEFECT_STATUS_LABELS: Record<DefectStatus, string> = {
  OPEN: "Ждёт ремонта",
  IN_REPAIR: "В ремонте",
  REPAIRED: "Отремонтировано",
  VERIFIED: "Проверено ОТК",
  SCRAPPED: "Списано",
  RETURNED: "Возврат поставщику",
  CLOSED: "Закрыто"
};

export const DEFECT_STATUS_COLORS: Record<DefectStatus, string> = {
  OPEN: "bg-red-100 text-red-700",
  IN_REPAIR: "bg-yellow-100 text-yellow-700",
  REPAIRED: "bg-blue-100 text-blue-700",
  VERIFIED: "bg-green-100 text-green-700",
  SCRAPPED: "bg-gray-100 text-gray-700",
  RETURNED: "bg-purple-100 text-purple-700",
  CLOSED: "bg-gray-100 text-gray-500"
};

export const SEVERITY_LABELS: Record<string, string> = {
  CRITICAL: "Критический",
  MAJOR: "Серьёзный",
  MINOR: "Незначительный"
};

export const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: "bg-red-100 text-red-700",
  MAJOR: "bg-yellow-100 text-yellow-700",
  MINOR: "bg-gray-100 text-gray-600"
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  DIAGNOSIS: "Диагностика",
  SOLDER: "Пайка",
  REPLACE: "Замена компонента",
  FLASH: "Прошивка",
  TEST: "Тестирование",
  CLEAN: "Чистка",
  CLONE_DISK: "Клонирование диска",
  CABLE_REPLACE: "Замена кабеля",
  OTHER: "Другое"
};

export const ACTION_TYPE_ICONS: Record<ActionType, string> = {
  DIAGNOSIS: "🔍",
  SOLDER: "🔧",
  REPLACE: "🔄",
  FLASH: "💾",
  TEST: "🧪",
  CLEAN: "🧹",
  CLONE_DISK: "💿",
  CABLE_REPLACE: "🔌",
  OTHER: "📝"
};

export const ACTION_RESULT_LABELS: Record<ActionResult, string> = {
  SUCCESS: "Успешно",
  PARTIAL: "Частично",
  FAILED: "Неудача",
  PENDING: "В процессе"
};

export const ACTION_RESULT_COLORS: Record<ActionResult, string> = {
  SUCCESS: "text-green-600",
  PARTIAL: "text-yellow-600",
  FAILED: "text-red-600",
  PENDING: "text-gray-500"
};
