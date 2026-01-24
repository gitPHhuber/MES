import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  History,
  Search,
  Filter,
  Calendar,
  User,
  Server,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  ArrowRight,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Package,
  Trash2,
  FileText
} from "lucide-react";
import {
  getHistory,
  BeryllHistoryItem,
  HistoryAction,
  HISTORY_ACTION_LABELS,
  STATUS_LABELS,
  formatDateTime,
  formatDuration
} from "src/api/beryllApi";

export const HistoryTab: React.FC = () => {
  const navigate = useNavigate();
  
  const [history, setHistory] = useState<BeryllHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  
  // Фильтры
  const [actionFilter, setActionFilter] = useState<HistoryAction | "ALL">("ALL");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const data = await getHistory({
        action: actionFilter === "ALL" ? undefined : actionFilter,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page,
        limit: 50
      });
      setHistory(data.rows);
      setTotalPages(data.totalPages);
      setTotalCount(data.count);
    } catch (e) {
      console.error("Ошибка загрузки истории:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadHistory();
  }, [page, actionFilter, dateFrom, dateTo]);

  const resetFilters = () => {
    setActionFilter("ALL");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  };

  const getActionIcon = (action: HistoryAction) => {
    switch (action) {
      case "CREATED": return <Server className="w-4 h-4 text-gray-500" />;
      case "TAKEN": return <Play className="w-4 h-4 text-blue-500" />;
      case "RELEASED": return <Square className="w-4 h-4 text-gray-500" />;
      case "STATUS_CHANGED": return <RefreshCw className="w-4 h-4 text-indigo-500" />;
      case "NOTE_ADDED": return <MessageSquare className="w-4 h-4 text-yellow-500" />;
      case "CHECKLIST_COMPLETED": return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case "BATCH_ASSIGNED": return <Package className="w-4 h-4 text-purple-500" />;
      case "BATCH_REMOVED": return <Package className="w-4 h-4 text-gray-400" />;
      case "DELETED": return <Trash2 className="w-4 h-4 text-red-500" />;
      default: return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getActionColor = (action: HistoryAction) => {
    switch (action) {
      case "CREATED": return "bg-gray-100 text-gray-700";
      case "TAKEN": return "bg-blue-100 text-blue-700";
      case "RELEASED": return "bg-gray-100 text-gray-600";
      case "STATUS_CHANGED": return "bg-indigo-100 text-indigo-700";
      case "NOTE_ADDED": return "bg-yellow-100 text-yellow-700";
      case "CHECKLIST_COMPLETED": return "bg-green-100 text-green-700";
      case "BATCH_ASSIGNED": return "bg-purple-100 text-purple-700";
      case "BATCH_REMOVED": return "bg-gray-100 text-gray-600";
      case "DELETED": return "bg-red-100 text-red-700";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и фильтры */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <History className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">
            История операций
          </h2>
          <span className="text-sm text-gray-500">
            ({totalCount} записей)
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Фильтр по действию */}
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value as HistoryAction | "ALL");
              setPage(1);
            }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          >
            <option value="ALL">Все действия</option>
            {Object.entries(HISTORY_ACTION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Кнопка расширенных фильтров */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              showFilters || dateFrom || dateTo
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            <Filter className="w-4 h-4" />
            Фильтры
          </button>

          {/* Кнопка сброса */}
          {(actionFilter !== "ALL" || dateFrom || dateTo) && (
            <button
              onClick={resetFilters}
              className="px-3 py-2 text-sm text-gray-500 hover:text-gray-700"
            >
              Сбросить
            </button>
          )}
        </div>
      </div>

      {/* Расширенные фильтры */}
      {showFilters && (
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 flex flex-wrap gap-4">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Дата с
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">
              Дата по
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>
      )}

      {/* Таблица истории */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
            <span className="ml-2 text-gray-500">Загрузка...</span>
          </div>
        ) : history.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <History className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>История пуста</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {history.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start gap-4">
                  {/* Иконка действия */}
                  <div className={`p-2 rounded-lg ${getActionColor(item.action)}`}>
                    {getActionIcon(item.action)}
                  </div>

                  {/* Основная информация */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Действие */}
                      <span className="font-medium text-gray-800">
                        {HISTORY_ACTION_LABELS[item.action]}
                      </span>

                      {/* Изменение статуса */}
                      {item.action === "STATUS_CHANGED" && item.fromStatus && item.toStatus && (
                        <span className="flex items-center gap-1 text-sm text-gray-500">
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {STATUS_LABELS[item.fromStatus as keyof typeof STATUS_LABELS] || item.fromStatus}
                          </span>
                          <ArrowRight className="w-3 h-3" />
                          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
                            {STATUS_LABELS[item.toStatus as keyof typeof STATUS_LABELS] || item.toStatus}
                          </span>
                        </span>
                      )}

                      {/* Время выполнения */}
                      {item.durationMinutes && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {formatDuration(item.durationMinutes)}
                        </span>
                      )}
                    </div>

                    {/* Сервер */}
                    <div className="mt-1 flex items-center gap-2 text-sm">
                      <Server className="w-3 h-3 text-gray-400" />
                      {item.server ? (
                        <button
                          onClick={() => navigate(`/beryll/server/${item.server!.id}`)}
                          className="text-indigo-600 hover:underline"
                        >
                          {item.server.ipAddress}
                          {item.server.hostname && (
                            <span className="text-gray-400 ml-1">
                              ({item.server.hostname})
                            </span>
                          )}
                        </button>
                      ) : (
                        <span className="text-gray-400">
                          {item.serverIp || "Сервер удалён"}
                          {item.serverHostname && ` (${item.serverHostname})`}
                        </span>
                      )}
                    </div>

                    {/* Комментарий */}
                    {item.comment && (
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {item.comment}
                      </p>
                    )}
                  </div>

                  {/* Правая часть */}
                  <div className="text-right shrink-0">
                    {/* Время */}
                    <div className="text-sm text-gray-500">
                      {formatDateTime(item.createdAt)}
                    </div>
                    
                    {/* Исполнитель */}
                    {item.user && (
                      <div className="mt-1 flex items-center gap-1 justify-end text-xs text-gray-400">
                        <User className="w-3 h-3" />
                        {item.user.surname} {item.user.name?.charAt(0)}.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Пагинация */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Страница {page} из {totalPages}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Назад
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="flex items-center gap-1 px-3 py-2 text-sm font-medium rounded-lg border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              Далее
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default HistoryTab;
