import { useState, useEffect } from "react";
import {
  BarChart3,
  TrendingUp,
  Users,
  Clock,
  Server,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Calendar,
  Award,
  Package
} from "lucide-react";
import {
  getAnalytics,
  BeryllAnalytics,
  STATUS_LABELS,
  formatDuration
} from "src/api/beryllApi";

export const AnalyticsTab: React.FC = () => {
  const [analytics, setAnalytics] = useState<BeryllAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState<"week" | "month" | "all">("week");

  const loadAnalytics = async () => {
    setLoading(true);
    try {
      const params: { dateFrom?: string; dateTo?: string } = {};
      
      const now = new Date();
      if (dateRange === "week") {
        const weekAgo = new Date(now);
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.dateFrom = weekAgo.toISOString();
      } else if (dateRange === "month") {
        const monthAgo = new Date(now);
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.dateFrom = monthAgo.toISOString();
      }

      const data = await getAnalytics(params);
      setAnalytics(data);
    } catch (e) {
      console.error("Ошибка загрузки аналитики:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
  }, [dateRange]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        <span className="ml-2 text-gray-500">Загрузка аналитики...</span>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="text-center py-12 text-gray-400">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>Не удалось загрузить аналитику</p>
      </div>
    );
  }

  const { overview, dailyCompleted, topPerformers, avgProcessingTime, activeBatches } = analytics;

  // Максимальное значение для графика
  const maxDaily = Math.max(...dailyCompleted.map(d => parseInt(String(d.count))), 1);

  return (
    <div className="space-y-6">
      {/* Заголовок и период */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">Аналитика</h2>
        </div>

        {/* Выбор периода */}
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <div className="flex bg-gray-100 rounded-lg p-1">
            {[
              { value: "week", label: "Неделя" },
              { value: "month", label: "Месяц" },
              { value: "all", label: "Всё время" }
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setDateRange(option.value as typeof dateRange)}
                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  dateRange === option.value
                    ? "bg-white text-indigo-600 shadow-sm"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Карточки обзора */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <MetricCard
          icon={Server}
          label="Всего серверов"
          value={overview.totalServers}
          color="bg-gray-100 text-gray-600"
        />
        <MetricCard
          icon={RefreshCw}
          label="В работе"
          value={overview.byStatus.IN_WORK || 0}
          color="bg-blue-100 text-blue-600"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Завершено"
          value={overview.byStatus.DONE || 0}
          color="bg-green-100 text-green-600"
          trend={dailyCompleted.length > 1 ? `+${dailyCompleted[dailyCompleted.length - 1]?.count || 0} сегодня` : undefined}
        />
        <MetricCard
          icon={Clock}
          label="Среднее время"
          value={avgProcessingTime ? formatDuration(avgProcessingTime) : "-"}
          color="bg-purple-100 text-purple-600"
          isText
        />
      </div>

      {/* Графики и таблицы */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* График завершённых за неделю */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">Динамика завершения</h3>
          </div>

          {dailyCompleted.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Нет данных за выбранный период
            </div>
          ) : (
            <div className="space-y-2">
              {dailyCompleted.map((day, index) => {
                const count = parseInt(String(day.count));
                const percentage = (count / maxDaily) * 100;
                const date = new Date(day.date).toLocaleDateString("ru-RU", {
                  day: "2-digit",
                  month: "short"
                });

                return (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-xs text-gray-500 w-16">{date}</span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-300 flex items-center justify-end pr-2"
                        style={{ width: `${Math.max(percentage, 10)}%` }}
                      >
                        {count > 0 && (
                          <span className="text-xs text-white font-medium">
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Топ исполнителей */}
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">Топ исполнителей</h3>
          </div>

          {topPerformers.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Нет данных за выбранный период
            </div>
          ) : (
            <div className="space-y-3">
              {topPerformers.slice(0, 5).map((performer, index) => (
                <div
                  key={performer.userId}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50"
                >
                  {/* Место */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                    index === 0 ? "bg-yellow-100 text-yellow-700" :
                    index === 1 ? "bg-gray-200 text-gray-700" :
                    index === 2 ? "bg-orange-100 text-orange-700" :
                    "bg-gray-100 text-gray-500"
                  }`}>
                    {index + 1}
                  </div>

                  {/* Имя */}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-800 truncate">
                      {performer.user.surname} {performer.user.name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {performer.user.login}
                    </div>
                  </div>

                  {/* Статистика */}
                  <div className="text-right">
                    <div className="font-bold text-indigo-600">
                      {performer.completedCount}
                    </div>
                    <div className="text-xs text-gray-500">
                      {performer.avgDuration
                        ? `~${formatDuration(Math.round(performer.avgDuration))}`
                        : "-"
                      }
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Активные партии */}
      {activeBatches.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-gray-400" />
            <h3 className="font-semibold text-gray-800">Активные партии</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase border-b border-gray-100">
                  <th className="pb-3 font-medium">Партия</th>
                  <th className="pb-3 font-medium text-center">Серверов</th>
                  <th className="pb-3 font-medium text-center">Завершено</th>
                  <th className="pb-3 font-medium">Прогресс</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {activeBatches.map((batch) => {
                  const progress = batch.serverCount > 0
                    ? Math.round((batch.completedCount / batch.serverCount) * 100)
                    : 0;

                  return (
                    <tr key={batch.id} className="hover:bg-gray-50">
                      <td className="py-3">
                        <span className="font-medium text-gray-800">{batch.title}</span>
                      </td>
                      <td className="py-3 text-center text-gray-600">
                        {batch.serverCount}
                      </td>
                      <td className="py-3 text-center">
                        <span className="text-green-600 font-medium">
                          {batch.completedCount}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-indigo-500 rounded-full"
                              style={{ width: `${progress}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-500 w-10">
                            {progress}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Распределение по статусам */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-gray-400" />
          <h3 className="font-semibold text-gray-800">Распределение по статусам</h3>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(STATUS_LABELS).map(([status, label]) => {
            const count = overview.byStatus[status as keyof typeof overview.byStatus] || 0;
            const percentage = overview.totalServers > 0
              ? Math.round((count / overview.totalServers) * 100)
              : 0;

            const colors: Record<string, string> = {
              NEW: "bg-gray-100 text-gray-700",
              IN_WORK: "bg-blue-100 text-blue-700",
              CLARIFYING: "bg-yellow-100 text-yellow-700",
              DEFECT: "bg-red-100 text-red-700",
              DONE: "bg-green-100 text-green-700"
            };

            return (
              <div
                key={status}
                className={`p-4 rounded-xl ${colors[status]}`}
              >
                <div className="text-2xl font-bold">{count}</div>
                <div className="text-sm opacity-80">{label}</div>
                <div className="text-xs mt-1 opacity-60">{percentage}%</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// Компонент карточки метрики
interface MetricCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  color: string;
  trend?: string;
  isText?: boolean;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon: Icon,
  label,
  value,
  color,
  trend,
  isText
}) => (
  <div className="bg-white rounded-xl border border-gray-200 p-4">
    <div className="flex items-start justify-between">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      {trend && (
        <span className="text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
          {trend}
        </span>
      )}
    </div>
    <div className={`mt-3 ${isText ? "text-xl" : "text-2xl"} font-bold text-gray-800`}>
      {value}
    </div>
    <div className="text-sm text-gray-500">{label}</div>
  </div>
);

export default AnalyticsTab;
