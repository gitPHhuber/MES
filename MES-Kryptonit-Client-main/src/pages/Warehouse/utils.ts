export const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ru-RU", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit"
  });
};

export const getStatusBadge = (status: string) => {
  switch (status) {
    case "ON_STOCK": return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "IN_WORK": return "bg-blue-100 text-blue-700 border-blue-200";
    case "DONE": return "bg-purple-100 text-purple-700 border-purple-200";
    case "SCRAP": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
};

/**
 * Калькулятор мест для приемки (партий)
 * @param total Общее количество (шт или метры)
 * @param capacity Вместимость одной тары
 */
export const calculateBatch = (total: number, capacity: number) => {
    // Приводим к числам и защищаемся от отрицательных значений
    const safeTotal = Math.max(0, Number(total) || 0);
    
    // Защита от деления на 0 (вместимость не может быть меньше 1)
    const safeCapacity = Math.max(1, Number(capacity) || 1);

    if (safeTotal === 0) {
        return { fullUnits: 0, remainder: 0, totalUnits: 0 };
    }

    const fullUnits = Math.floor(safeTotal / safeCapacity);
    const remainder = safeTotal % safeCapacity;
    
    // Если есть остаток, добавляем еще 1 место (коробку)
    const totalUnits = fullUnits + (remainder > 0 ? 1 : 0);

    return { fullUnits, remainder, totalUnits };
};