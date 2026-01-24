/**
 * DefectRecordsPage.tsx - Страница управления записями о браке
 */

import React, { useState, useEffect, useCallback } from "react";
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Truck,
  Wrench,
  Eye,
  ChevronRight,
  AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";
import { defectRecordApi, DefectRecord, DefectRecordStatus } from "../../api/beryllExtendedApi";
import DefectRecordModal from "./DefectRecordModal";
import DefectRecordDetails from "./DefectRecordDetails";

const STATUS_COLORS: Record<DefectRecordStatus, string> = {
  NEW: "bg-blue-100 text-blue-800",
  DIAGNOSING: "bg-yellow-100 text-yellow-800",
  WAITING_PARTS: "bg-orange-100 text-orange-800",
  REPAIRING: "bg-purple-100 text-purple-800",
  SENT_TO_YADRO: "bg-indigo-100 text-indigo-800",
  RETURNED: "bg-cyan-100 text-cyan-800",
  RESOLVED: "bg-green-100 text-green-800",
  REPEATED: "bg-red-100 text-red-800",
  CLOSED: "bg-gray-100 text-gray-800"
};

const STATUS_LABELS: Record<DefectRecordStatus, string> = {
  NEW: "Новый",
  DIAGNOSING: "Диагностика",
  WAITING_PARTS: "Ожидание запчастей",
  REPAIRING: "Ремонт",
  SENT_TO_YADRO: "Отправлен в Ядро",
  RETURNED: "Возвращён",
  RESOLVED: "Решён",
  REPEATED: "Повторный",
  CLOSED: "Закрыт"
};

const DefectRecordsPage: React.FC = () => {
  const [records, setRecords] = useState<DefectRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  
  // Фильтры
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<DefectRecordStatus | "">("");
  const [partTypeFilter, setPartTypeFilter] = useState("");
  const [showSlaBreached, setShowSlaBreached] = useState(false);
  const [showRepeated, setShowRepeated] = useState(false);
  
  // Пагинация
  const [page, setPage] = useState(0);
  const [limit] = useState(20);
  
  // Модальные окна
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<DefectRecord | null>(null);
  
  // Справочники
  const [partTypes, setPartTypes] = useState<Array<{ value: string; label: string }>>([]);
  const [stats, setStats] = useState<any>(null);

  // Загрузка данных
  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await defectRecordApi.getAll({
        search: search || undefined,
        status: statusFilter || undefined,
        repairPartType: partTypeFilter || undefined,
        slaBreached: showSlaBreached || undefined,
        isRepeatedDefect: showRepeated || undefined,
        limit,
        offset: page * limit
      });
      
      setRecords(response.data.rows);
      setTotalCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, partTypeFilter, showSlaBreached, showRepeated, page, limit]);

  const loadPartTypes = async () => {
    try {
      const response = await defectRecordApi.getPartTypes();
      setPartTypes(response.data);
    } catch (error) {
      console.error("Error loading part types:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await defectRecordApi.getStats({});
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    loadPartTypes();
    loadStats();
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Сброс фильтров
  const resetFilters = () => {
    setSearch("");
    setStatusFilter("");
    setPartTypeFilter("");
    setShowSlaBreached(false);
    setShowRepeated(false);
    setPage(0);
  };

  // Проверка SLA
  const isSlaBreached = (record: DefectRecord): boolean => {
    if (!record.slaDeadline) return false;
    if (record.status === "RESOLVED" || record.status === "CLOSED") return false;
    return new Date(record.slaDeadline) < new Date();
  };

  // Форматирование времени
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const formatDowntime = (minutes: number | null): string => {
    if (!minutes) return "—";
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}д ${hours % 24}ч`;
    if (hours > 0) return `${hours}ч ${minutes % 60}м`;
    return `${minutes}м`;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-red-500" />
            Учёт брака серверов
          </h1>
          <p className="text-gray-500 mt-1">
            Управление записями о дефектах и ремонте серверов Beryll
          </p>
        </div>
        
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Новая запись
        </button>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Всего записей</div>
            <div className="text-2xl font-bold text-gray-900">{totalCount}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">В работе</div>
            <div className="text-2xl font-bold text-blue-600">
              {stats.byStatus?.filter((s: any) => 
                !["RESOLVED", "CLOSED"].includes(s.status)
              ).reduce((sum: number, s: any) => sum + parseInt(s.count), 0) || 0}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Повторный брак</div>
            <div className="text-2xl font-bold text-red-600">{stats.repeatedCount || 0}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Просрочено SLA</div>
            <div className="text-2xl font-bold text-orange-600">{stats.slaBreachedCount || 0}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Ср. время ремонта</div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgRepairTimeHours ? `${stats.avgRepairTimeHours}ч` : "—"}
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Решено</div>
            <div className="text-2xl font-bold text-green-600">
              {stats.byStatus?.find((s: any) => s.status === "RESOLVED")?.count || 0}
            </div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Поиск по заявке, описанию, серийному номеру..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as DefectRecordStatus | ""); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
          
          <select
            value={partTypeFilter}
            onChange={(e) => { setPartTypeFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все типы</option>
            {partTypes.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showSlaBreached}
              onChange={(e) => { setShowSlaBreached(e.target.checked); setPage(0); }}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm text-gray-700">Просрочено SLA</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showRepeated}
              onChange={(e) => { setShowRepeated(e.target.checked); setPage(0); }}
              className="w-4 h-4 text-red-600 rounded"
            />
            <span className="text-sm text-gray-700">Повторный брак</span>
          </label>
          
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
          </button>
          
          <button
            onClick={loadRecords}
            disabled={loading}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Таблица */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сервер
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Заявка Ядро
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Тип дефекта
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Обнаружен
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                SLA
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Простой
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : records.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                  Записи не найдены
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr 
                  key={record.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${
                    record.isRepeatedDefect ? "bg-red-50" : ""
                  } ${
                    isSlaBreached(record) ? "bg-orange-50" : ""
                  }`}
                  onClick={() => setSelectedRecord(record)}
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">
                      {record.server?.apkSerialNumber || `ID: ${record.serverId}`}
                    </div>
                    <div className="text-sm text-gray-500">
                      {record.server?.hostname || record.server?.ipAddress}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {record.yadroTicketNumber ? (
                      <span className="font-mono text-sm text-blue-600">
                        {record.yadroTicketNumber}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {record.repairPartType ? (
                        <>
                          <Wrench className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">
                            {partTypes.find(t => t.value === record.repairPartType)?.label || record.repairPartType}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400">Не определён</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[record.status]}`}>
                        {STATUS_LABELS[record.status]}
                      </span>
                      {record.isRepeatedDefect && (
                        <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                          Повторный
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDate(record.detectedAt)}
                  </td>
                  <td className="px-4 py-3">
                    {record.slaDeadline ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        isSlaBreached(record) ? "text-red-600" : "text-gray-500"
                      }`}>
                        {isSlaBreached(record) ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Clock className="w-4 h-4" />
                        )}
                        {formatDate(record.slaDeadline)}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {formatDowntime(record.totalDowntimeMinutes)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button 
                      onClick={(e) => { e.stopPropagation(); setSelectedRecord(record); }}
                      className="p-1 text-gray-400 hover:text-gray-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Пагинация */}
        {totalCount > limit && (
          <div className="px-4 py-3 bg-gray-50 border-t flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Показано {page * limit + 1}—{Math.min((page + 1) * limit, totalCount)} из {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Назад
              </button>
              <span className="text-sm text-gray-600">
                Страница {page + 1} из {Math.ceil(totalCount / limit)}
              </span>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * limit >= totalCount}
                className="px-3 py-1 border rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Вперёд
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Модальные окна */}
      {showCreateModal && (
        <DefectRecordModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadRecords();
            loadStats();
          }}
          partTypes={partTypes}
        />
      )}

      {selectedRecord && (
        <DefectRecordDetails
          record={selectedRecord}
          partTypes={partTypes}
          onClose={() => setSelectedRecord(null)}
          onUpdate={() => {
            loadRecords();
            loadStats();
          }}
        />
      )}
    </div>
  );
};

export default DefectRecordsPage;
