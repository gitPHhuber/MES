import React, { useEffect, useState } from "react";
import { 
  Factory, TrendingUp, Package, Wrench, Calendar,
  ChevronRight, Loader2, Award
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchUserSummary, fetchOutputs, ProductionOutput } from "src/api/productionApi";
import { PRODUCTION_ROUTE } from "src/utils/consts";

interface Props {
  userId: number;
}

interface TodaySummary {
  total: number;
  pending: number;
  approved: number;
  byOperation: { name: string; qty: number }[];
}

/**
 * Виджет для Dashboard - показывает выработку текущего пользователя за сегодня
 */
export const ProductionWidget: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<TodaySummary>({
    total: 0,
    pending: 0,
    approved: 0,
    byOperation: []
  });
  const [recentEntries, setRecentEntries] = useState<ProductionOutput[]>([]);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        
        // Загружаем записи за сегодня
        const res = await fetchOutputs({
          userId,
          dateFrom: today,
          dateTo: today,
          limit: 10
        });

        const entries = res.rows;
        setRecentEntries(entries.slice(0, 3));

        // Считаем статистику
        let total = 0;
        let pending = 0;
        let approved = 0;
        const opsMap = new Map<string, number>();

        entries.forEach(e => {
          const qty = e.status === "APPROVED" ? (e.approvedQty || 0) : e.quantity;
          total += qty;
          
          if (e.status === "PENDING") pending += e.quantity;
          if (e.status === "APPROVED") approved += (e.approvedQty || 0);

          const opName = e.operationType?.name || "Другое";
          opsMap.set(opName, (opsMap.get(opName) || 0) + qty);
        });

        setSummary({
          total,
          pending,
          approved,
          byOperation: [...opsMap.entries()]
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 3)
        });

      } catch (e) {
        console.error("Ошибка загрузки выработки:", e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin text-emerald-500" size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Заголовок */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Factory size={24} />
            <div>
              <h3 className="font-bold text-lg">Моя выработка</h3>
              <p className="text-emerald-100 text-sm">Сегодня</p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">{summary.total}</div>
            <div className="text-emerald-100 text-xs">единиц</div>
          </div>
        </div>
      </div>

      {/* Статус */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex gap-4">
          <div className="flex-1 text-center">
            <div className="text-2xl font-bold text-emerald-600">{summary.approved}</div>
            <div className="text-xs text-gray-500">Подтверждено</div>
          </div>
          {summary.pending > 0 && (
            <div className="flex-1 text-center">
              <div className="text-2xl font-bold text-yellow-600">{summary.pending}</div>
              <div className="text-xs text-gray-500">Ожидает</div>
            </div>
          )}
        </div>
      </div>

      {/* По операциям */}
      {summary.byOperation.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2 uppercase font-medium">По операциям</p>
          <div className="space-y-2">
            {summary.byOperation.map((op, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wrench size={14} className="text-gray-400" />
                  <span className="text-sm text-gray-700">{op.name}</span>
                </div>
                <span className="font-semibold text-gray-800">{op.qty}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Последние записи */}
      {recentEntries.length > 0 && (
        <div className="px-6 py-4 border-b border-gray-100">
          <p className="text-xs text-gray-400 mb-2 uppercase font-medium">Последние записи</p>
          <div className="space-y-2">
            {recentEntries.map(entry => (
              <div 
                key={entry.id} 
                className={`flex items-center justify-between text-sm p-2 rounded-lg ${
                  entry.status === "APPROVED" ? "bg-emerald-50" : "bg-yellow-50"
                }`}
              >
                <div>
                  <span className="font-medium text-gray-800">
                    {entry.productType?.name}
                  </span>
                  <span className="text-gray-400 mx-1">•</span>
                  <span className="text-gray-500">{entry.operationType?.name}</span>
                </div>
                <span className={`font-bold ${
                  entry.status === "APPROVED" ? "text-emerald-600" : "text-yellow-600"
                }`}>
                  {entry.status === "APPROVED" ? entry.approvedQty : entry.quantity}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Пустое состояние */}
      {summary.total === 0 && (
        <div className="px-6 py-8 text-center">
          <Package size={40} className="mx-auto text-gray-300 mb-2" />
          <p className="text-gray-500 text-sm">Нет записей за сегодня</p>
          <p className="text-gray-400 text-xs mt-1">Добавьте первую запись о выработке</p>
        </div>
      )}

      {/* Кнопка перехода */}
      <button
        onClick={() => navigate(PRODUCTION_ROUTE)}
        className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-center gap-2 text-gray-600 font-medium"
      >
        Перейти в Производство
        <ChevronRight size={18} />
      </button>
    </div>
  );
};

/**
 * Компактная версия виджета для узких колонок
 */
export const ProductionWidgetCompact: React.FC<Props> = ({ userId }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [todayTotal, setTodayTotal] = useState(0);
  const [weekTotal, setWeekTotal] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      if (!userId) return;
      
      setLoading(true);
      try {
        const today = new Date().toISOString().split("T")[0];
        
        // За сегодня
        const todayRes = await fetchOutputs({
          userId,
          dateFrom: today,
          dateTo: today,
          status: "APPROVED"
        });
        
        const todaySum = todayRes.rows.reduce((sum, e) => sum + (e.approvedQty || 0), 0);
        setTodayTotal(todaySum);

        // За неделю
        const weekStart = new Date();
        const day = weekStart.getDay() || 7;
        weekStart.setDate(weekStart.getDate() - day + 1);
        
        const weekRes = await fetchOutputs({
          userId,
          dateFrom: weekStart.toISOString().split("T")[0],
          dateTo: today,
          status: "APPROVED"
        });
        
        const weekSum = weekRes.rows.reduce((sum, e) => sum + (e.approvedQty || 0), 0);
        setWeekTotal(weekSum);

      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId]);

  return (
    <button
      onClick={() => navigate(PRODUCTION_ROUTE)}
      className="w-full bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white text-left hover:shadow-lg transition group"
    >
      <div className="flex items-center justify-between mb-3">
        <Factory size={20} />
        <ChevronRight size={18} className="opacity-0 group-hover:opacity-100 transition" />
      </div>
      
      {loading ? (
        <Loader2 className="animate-spin" size={20} />
      ) : (
        <>
          <div className="text-3xl font-black mb-1">{todayTotal}</div>
          <div className="text-emerald-100 text-sm">сегодня</div>
          
          <div className="mt-3 pt-3 border-t border-white/20 flex items-center gap-2">
            <TrendingUp size={14} />
            <span className="text-sm">{weekTotal} за неделю</span>
          </div>
        </>
      )}
    </button>
  );
};

/**
 * Виджет для лидерборда на Dashboard
 */
export const ProductionLeaderboardWidget: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [leaders, setLeaders] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        // Здесь можно использовать fetchRankings или создать отдельный endpoint
        // Пока используем заглушку
        // const res = await fetchRankings("day");
        // setLeaders(res.users.slice(0, 5));
        
        // Заглушка для демо
        setLeaders([]);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        <Loader2 className="animate-spin text-emerald-500 mx-auto" size={24} />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Award className="text-yellow-500" size={20} />
          <h3 className="font-bold text-gray-800">Лидеры дня</h3>
        </div>
        <span className="text-xs text-gray-400">Производство</span>
      </div>

      {leaders.length > 0 ? (
        <div className="divide-y divide-gray-100">
          {leaders.map((user, idx) => (
            <div key={user.id} className="px-6 py-3 flex items-center gap-3">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                idx === 0 ? "bg-yellow-100 text-yellow-700" :
                idx === 1 ? "bg-gray-200 text-gray-600" :
                idx === 2 ? "bg-orange-100 text-orange-700" :
                "bg-gray-100 text-gray-500"
              }`}>
                {idx + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-800 text-sm">
                  {user.surname} {user.name}
                </p>
                <p className="text-xs text-gray-400">{user.teamName}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-emerald-600">{user.output}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-6 py-8 text-center text-gray-500 text-sm">
          Данные за сегодня ещё не поступили
        </div>
      )}

      <button
        onClick={() => navigate(PRODUCTION_ROUTE)}
        className="w-full px-6 py-3 bg-gray-50 hover:bg-gray-100 transition text-gray-600 text-sm font-medium"
      >
        Смотреть все
      </button>
    </div>
  );
};
