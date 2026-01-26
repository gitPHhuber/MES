/**
 * SubstituteServersPage.tsx - Страница управления подменными серверами
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Server,
  Search,
  Plus,
  RefreshCw,
  CheckCircle,
  XCircle,
  Wrench,
  ArrowRightLeft,
  BarChart3,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";
import { substituteApi, SubstituteServer, SubstituteStatus } from "../../api/beryll/beryllExtendedApi";

const STATUS_CONFIG: Record<SubstituteStatus, { label: string; color: string; icon: React.ComponentType<any> }> = {
  AVAILABLE: { label: "Доступен", color: "bg-green-100 text-green-800", icon: CheckCircle },
  IN_USE: { label: "Используется", color: "bg-blue-100 text-blue-800", icon: ArrowRightLeft },
  MAINTENANCE: { label: "На обслуживании", color: "bg-orange-100 text-orange-800", icon: Wrench },
  RETIRED: { label: "Выведен", color: "bg-gray-100 text-gray-800", icon: XCircle }
};

const SubstituteServersPage: React.FC = () => {
  const [substitutes, setSubstitutes] = useState<SubstituteServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<SubstituteStatus | "">("");
  const [stats, setStats] = useState<any>(null);
  
  // Модальные окна
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedSubstitute, setSelectedSubstitute] = useState<SubstituteServer | null>(null);

  const loadSubstitutes = useCallback(async () => {
    setLoading(true);
    try {
      const response = await substituteApi.getAll(statusFilter || undefined);
      setSubstitutes(response.data);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  const loadStats = async () => {
    try {
      const response = await substituteApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    loadSubstitutes();
    loadStats();
  }, [loadSubstitutes]);

  const handleReturn = async (id: number) => {
    if (!confirm("Вернуть подменный сервер в пул?")) return;
    
    try {
      await substituteApi.return(id);
      toast.success("Сервер возвращён в пул");
      loadSubstitutes();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    }
  };

  const handleSetMaintenance = async (id: number) => {
    const notes = prompt("Причина обслуживания:");
    if (notes === null) return;
    
    try {
      await substituteApi.setMaintenance(id, notes);
      toast.success("Сервер переведён на обслуживание");
      loadSubstitutes();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    }
  };

  const handleRemove = async (id: number) => {
    if (!confirm("Удалить сервер из пула подменных?")) return;
    
    try {
      await substituteApi.removeFromPool(id);
      toast.success("Сервер удалён из пула");
      loadSubstitutes();
      loadStats();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    }
  };

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

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowRightLeft className="w-7 h-7 text-purple-500" />
            Подменные серверы
          </h1>
          <p className="text-gray-500 mt-1">
            Пул серверов для временной замены на время ремонта
          </p>
        </div>
        
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Добавить в пул
        </button>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Всего в пуле</div>
            <div className="text-2xl font-bold text-gray-900">{stats.total}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Доступно</div>
            <div className="text-2xl font-bold text-green-600">{stats.available}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Используется</div>
            <div className="text-2xl font-bold text-blue-600">{stats.inUse}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">На обслуживании</div>
            <div className="text-2xl font-bold text-orange-600">{stats.maintenance}</div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <BarChart3 className="w-4 h-4" />
              Ср. использований
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {stats.avgUsageCount?.toFixed(1) || "0"}
            </div>
          </div>
        </div>
      )}

      {/* Фильтры */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center gap-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as SubstituteStatus | "")}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
          
          <button
            onClick={loadSubstitutes}
            disabled={loading}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Список */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Сервер
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Текущий дефект
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Выдан
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Использований
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                Действия
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : substitutes.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  Подменные серверы не найдены
                </td>
              </tr>
            ) : (
              substitutes.map((sub) => {
                const statusConfig = STATUS_CONFIG[sub.status];
                const StatusIcon = statusConfig.icon;
                
                return (
                  <tr key={sub.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Server className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{sub.server?.apkSerialNumber}</div>
                          <div className="text-sm text-gray-500">
                            {sub.server?.hostname} • {sub.server?.ipAddress}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {sub.currentDefect ? (
                        <div className="text-sm">
                          <div className="text-blue-600">#{sub.currentDefect.id}</div>
                          <div className="text-gray-500 truncate max-w-[200px]">
                            {sub.currentDefect.problemDescription}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {sub.issuedAt ? (
                        <div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            {formatDate(sub.issuedAt)}
                          </div>
                          {sub.issuedTo && (
                            <div className="text-gray-500">
                              {sub.issuedTo.surname} {sub.issuedTo.name}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="font-medium">{sub.usageCount}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {sub.status === "IN_USE" && (
                          <button
                            onClick={() => handleReturn(sub.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Вернуть
                          </button>
                        )}
                        {sub.status === "AVAILABLE" && (
                          <button
                            onClick={() => handleSetMaintenance(sub.id)}
                            className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded hover:bg-orange-200"
                          >
                            На обслуживание
                          </button>
                        )}
                        {sub.status === "MAINTENANCE" && (
                          <button
                            onClick={() => handleReturn(sub.id)}
                            className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200"
                          >
                            Доступен
                          </button>
                        )}
                        {sub.status !== "IN_USE" && (
                          <button
                            onClick={() => handleRemove(sub.id)}
                            className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200"
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Модальное окно добавления */}
      {showAddModal && (
        <AddSubstituteModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadSubstitutes();
            loadStats();
          }}
        />
      )}
    </div>
  );
};

// ============================================
// Модальное окно добавления подменного сервера
// ============================================

interface AddSubstituteModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AddSubstituteModal: React.FC<AddSubstituteModalProps> = ({ onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [serverSearch, setServerSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedServer, setSelectedServer] = useState<any>(null);
  const [notes, setNotes] = useState("");

  // Поиск серверов
  useEffect(() => {
    const search = async () => {
      if (serverSearch.length < 2) {
        setSearchResults([]);
        return;
      }
      
      setSearching(true);
      try {
        const response = await fetch(`/api/beryll/servers?search=${encodeURIComponent(serverSearch)}&limit=10`);
        const data = await response.json();
        setSearchResults(data.rows || []);
      } catch (error) {
        console.error("Error searching servers:", error);
      } finally {
        setSearching(false);
      }
    };
    
    const debounce = setTimeout(search, 300);
    return () => clearTimeout(debounce);
  }, [serverSearch]);

  const handleSubmit = async () => {
    if (!selectedServer) {
      toast.error("Выберите сервер");
      return;
    }
    
    setLoading(true);
    try {
      await substituteApi.addToPool(selectedServer.id, notes || undefined);
      toast.success("Сервер добавлен в пул подменных");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка добавления");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Добавить подменный сервер</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Выбор сервера */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сервер
            </label>
            {selectedServer ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Server className="w-5 h-5 text-gray-400" />
                <div className="flex-1">
                  <div className="font-medium">{selectedServer.apkSerialNumber}</div>
                  <div className="text-sm text-gray-500">{selectedServer.hostname}</div>
                </div>
                <button
                  onClick={() => setSelectedServer(null)}
                  className="text-red-500 hover:text-red-700"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  placeholder="Поиск по серийному номеру, IP..."
                  className="w-full pl-10 pr-4 py-2 border rounded-lg"
                />
                
                {searchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                    {searchResults.map((server) => (
                      <button
                        key={server.id}
                        onClick={() => {
                          setSelectedServer(server);
                          setServerSearch("");
                          setSearchResults([]);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Server className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{server.apkSerialNumber}</div>
                          <div className="text-sm text-gray-500">{server.hostname}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Примечания */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечания
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Дополнительная информация..."
            />
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !selectedServer}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
          >
            {loading ? "Добавление..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SubstituteServersPage;
