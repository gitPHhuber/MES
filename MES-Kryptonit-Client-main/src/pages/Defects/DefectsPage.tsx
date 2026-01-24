import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  AlertTriangle, 
  Search, 
  Plus, 
  Filter, 
  Wrench,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { fetchDefects, FetchDefectsParams } from "src/api/defectApi";
import {
  BoardDefect,
  DefectStatus,
  BoardType,
  BOARD_TYPE_SHORT,
  DEFECT_STATUS_LABELS,
  DEFECT_STATUS_COLORS,
  SEVERITY_COLORS
} from "src/types/DefectTypes";
import { CreateDefectModal } from "./components/CreateDefectModal";

// Вкладки статусов
const STATUS_TABS: Array<{ key: DefectStatus | "ACTIVE" | "ALL"; label: string; icon: React.ReactNode }> = [
  { key: "OPEN", label: "Ждут ремонта", icon: <AlertTriangle size={16} /> },
  { key: "IN_REPAIR", label: "В ремонте", icon: <Wrench size={16} /> },
  { key: "REPAIRED", label: "Отремонтировано", icon: <Clock size={16} /> },
  { key: "ACTIVE", label: "Все активные", icon: <RefreshCw size={16} /> },
  { key: "ALL", label: "Все", icon: null },
];

export const DefectsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // Состояние
  const [defects, setDefects] = useState<BoardDefect[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<Record<string, number>>({});
  
  // Пагинация
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  
  // Фильтры
  const [activeTab, setActiveTab] = useState<DefectStatus | "ACTIVE" | "ALL">("OPEN");
  const [boardType, setBoardType] = useState<BoardType | "">("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  
  // Модалка создания
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Загрузка данных
  const loadDefects = useCallback(async () => {
    setLoading(true);
    try {
      const params: FetchDefectsParams = {
        page,
        limit: 30,
      };
      
      if (activeTab !== "ALL") {
        params.status = activeTab;
      }
      if (boardType) {
        params.boardType = boardType;
      }
      if (search) {
        params.search = search;
      }
      
      const response = await fetchDefects(params);
      setDefects(response.defects);
      setTotalPages(response.totalPages);
      setTotal(response.total);
      setStats(response.stats);
    } catch (e) {
      console.error("Ошибка загрузки дефектов:", e);
    } finally {
      setLoading(false);
    }
  }, [page, activeTab, boardType, search]);

  useEffect(() => {
    loadDefects();
  }, [loadDefects]);

  // Сброс страницы при смене фильтров
  useEffect(() => {
    setPage(1);
  }, [activeTab, boardType, search]);

  // Поиск с задержкой
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
    }, 500);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Переход к карточке дефекта
  const openDefect = (id: number) => {
    navigate(`/defects/${id}`);
  };

  // После создания
  const handleCreated = () => {
    setShowCreateModal(false);
    loadDefects();
  };

  // Форматирование даты
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Подсчёт для вкладок
  const getTabCount = (key: string) => {
    if (key === "ALL") return total;
    if (key === "ACTIVE") {
      return (stats["OPEN"] || 0) + (stats["IN_REPAIR"] || 0) + (stats["REPAIRED"] || 0);
    }
    return stats[key] || 0;
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-500 rounded-2xl shadow-lg shadow-orange-200 text-white">
              <AlertTriangle size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Учёт брака и ремонт</h1>
              <p className="text-gray-500 font-medium">Регистрация дефектов и история ремонта</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-5 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold shadow-lg shadow-orange-200 transition-all"
          >
            <Plus size={20} />
            Зарегистрировать брак
          </button>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-red-600 font-medium">Ждут ремонта</span>
              <AlertTriangle className="text-red-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-red-600 mt-1">{stats["OPEN"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-yellow-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-yellow-600 font-medium">В ремонте</span>
              <Wrench className="text-yellow-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-yellow-600 mt-1">{stats["IN_REPAIR"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-blue-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-blue-600 font-medium">Отремонтировано</span>
              <Clock className="text-blue-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-blue-600 mt-1">{stats["REPAIRED"] || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-green-200 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-green-600 font-medium">Проверено ОТК</span>
              <CheckCircle2 className="text-green-400" size={20} />
            </div>
            <p className="text-3xl font-bold text-green-600 mt-1">{stats["VERIFIED"] || 0}</p>
          </div>
        </div>

        {/* Вкладки и фильтры */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
          {/* Вкладки */}
          <div className="flex border-b border-gray-200">
            {STATUS_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3 font-medium transition-all border-b-2 -mb-[2px] ${
                  activeTab === tab.key
                    ? "border-orange-500 text-orange-600 bg-orange-50/50"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                {tab.icon}
                {tab.label}
                <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
                  activeTab === tab.key ? "bg-orange-100 text-orange-600" : "bg-gray-100 text-gray-500"
                }`}>
                  {getTabCount(tab.key)}
                </span>
              </button>
            ))}
          </div>
          
          {/* Фильтры */}
          <div className="p-4 flex items-center gap-4">
            <div className="flex items-center gap-2 text-gray-500">
              <Filter size={18} />
              <span className="text-sm font-medium">Фильтры:</span>
            </div>
            
            <select
              value={boardType}
              onChange={e => setBoardType(e.target.value as BoardType | "")}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">Все типы плат</option>
              <option value="FC">Полётный контроллер (FC)</option>
              <option value="ELRS_915">ELRS 915 МГц</option>
              <option value="ELRS_2_4">ELRS 2.4 ГГц</option>
              <option value="CORAL_B">Coral B</option>
              <option value="SMARAGD">Смарагд</option>
            </select>
            
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Поиск по серийнику..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
              />
            </div>
            
            <button
              onClick={loadDefects}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-all"
              title="Обновить"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Таблица */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {loading && defects.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <RefreshCw className="animate-spin mx-auto mb-4" size={32} />
              <p>Загрузка...</p>
            </div>
          ) : defects.length === 0 ? (
            <div className="p-12 text-center text-gray-500">
              <AlertTriangle className="mx-auto mb-4 text-gray-300" size={48} />
              <p className="text-lg font-medium">Дефекты не найдены</p>
              <p className="text-sm mt-1">Попробуйте изменить фильтры</p>
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Плата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Серийник</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дефект</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Обнаружил</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Время</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {defects.map(defect => (
                  <tr
                    key={defect.id}
                    onClick={() => openDefect(defect.id)}
                    className="hover:bg-orange-50/50 cursor-pointer transition-all"
                  >
                    <td className="px-4 py-3 text-sm font-mono text-gray-500">
                      #{defect.id}
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-gray-100 rounded text-sm font-medium">
                        {BOARD_TYPE_SHORT[defect.boardType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-sm">
                      {defect.serialNumber || <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {defect.category && (
                          <>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                              SEVERITY_COLORS[defect.category.severity]
                            }`}>
                              {defect.category.severity === "CRITICAL" ? "!" : 
                               defect.category.severity === "MAJOR" ? "•" : "○"}
                            </span>
                            <span className="text-sm">{defect.category.title}</span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        DEFECT_STATUS_COLORS[defect.status]
                      }`}>
                        {DEFECT_STATUS_LABELS[defect.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {defect.detectedBy 
                        ? `${defect.detectedBy.surname} ${defect.detectedBy.name?.charAt(0)}.`
                        : "—"
                      }
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatDate(defect.detectedAt)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {defect.totalRepairMinutes > 0 
                        ? `${defect.totalRepairMinutes} мин`
                        : "—"
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Показано {defects.length} из {total}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={18} />
                </button>
                <span className="text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Модалка создания */}
      {showCreateModal && (
        <CreateDefectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleCreated}
        />
      )}
    </div>
  );
};
