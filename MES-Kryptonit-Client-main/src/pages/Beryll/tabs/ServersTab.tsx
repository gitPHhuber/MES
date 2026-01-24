
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Server,
  Search,
  Filter,
  RefreshCw,
  Play,
  Square,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  MoreVertical,
  Trash2,
  ExternalLink,
  Package,
  User,
  Network,
  Copy,
  MessageSquare,
  Archive,
  FileSpreadsheet,
  AlertCircle,
  Settings,
  Edit,
  ChevronDown
} from "lucide-react";
import { Context } from "src/main";
import {
  getServers,
  getBatches,
  takeServer,
  releaseServer,
  updateServerStatus,
  deleteServer,
  archiveServer,
  assignServersToBatch,
  generatePassport,
  BeryllServer,
  BeryllBatch,
  ServerStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDateTime
} from "src/api/beryllApi";

interface ServersTabProps {
  onStatsUpdate?: () => void;
}

export const ServersTab: React.FC<ServersTabProps> = observer(({ onStatsUpdate }) => {
  const navigate = useNavigate();
  const context = useContext(Context);
  const currentUser = context?.user?.user;

  const [servers, setServers] = useState<BeryllServer[]>([]);
  const [batches, setBatches] = useState<BeryllBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Фильтры
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServerStatus | "ALL">("ALL");
  const [batchFilter, setBatchFilter] = useState<number | "ALL" | "UNASSIGNED">("ALL");
  const [onlyActive, setOnlyActive] = useState(false);

  // Выбор серверов для групповых операций
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Контекстное меню
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [serversData, batchesData] = await Promise.all([
        getServers({
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: search || undefined,
          onlyActive: onlyActive || undefined,
          batchId: batchFilter === "ALL" ? undefined : batchFilter === "UNASSIGNED" ? "null" : batchFilter
        }),
        getBatches({ status: "ACTIVE" })
      ]);
      setServers(serversData);
      setBatches(batchesData);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter, onlyActive, batchFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadData(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Закрытие меню при клике вне
  useEffect(() => {
    const handleClickOutside = () => setOpenMenuId(null);
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  // ============================================
  // ДЕЙСТВИЯ
  // ============================================

  const handleTake = async (server: BeryllServer) => {
    setActionLoading(server.id);
    try {
      await takeServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const handleRelease = async (server: BeryllServer) => {
    setActionLoading(server.id);
    try {
      await releaseServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const handleStatusChange = async (server: BeryllServer, status: ServerStatus) => {
    setActionLoading(server.id);
    try {
      await updateServerStatus(server.id, status);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (server: BeryllServer) => {
    if (!server.apkSerialNumber) {
      alert("Для переноса в архив необходимо присвоить серийный номер АПК");
      return;
    }
    
    if (server.status !== "DONE") {
      alert("Перенести в архив можно только серверы со статусом \"Готово\"");
      return;
    }
    
    if (!confirm(`Перенести сервер ${server.apkSerialNumber || server.ipAddress} в архив?`)) {
      return;
    }
    
    setActionLoading(server.id);
    try {
      await archiveServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка архивации");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (server: BeryllServer) => {
    if (!confirm(`Удалить сервер ${server.ipAddress}?`)) return;
    
    setActionLoading(server.id);
    try {
      await deleteServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadPassport = async (server: BeryllServer) => {
    try {
      const blob = await generatePassport(server.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Паспорт_${server.apkSerialNumber || server.id}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Ошибка скачивания паспорта:", e);
      alert("Ошибка при генерации паспорта");
    }
  };

  const handleAssignToBatch = async (batchId: number) => {
    if (selectedServers.length === 0) return;
    
    try {
      await assignServersToBatch(batchId, selectedServers);
      setSelectedServers([]);
      setShowBatchModal(false);
      await loadData();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  const toggleSelectAll = () => {
    if (selectedServers.length === servers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(servers.map(s => s.id));
    }
  };

  const toggleSelect = (id: number) => {
    setSelectedServers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================
  // ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
  // ============================================

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case "NEW": return <Clock className="w-4 h-4" />;
      case "IN_WORK": return <RefreshCw className="w-4 h-4" />;
      case "CLARIFYING": return <HelpCircle className="w-4 h-4" />;
      case "DEFECT": return <XCircle className="w-4 h-4" />;
      case "DONE": return <CheckCircle2 className="w-4 h-4" />;
      case "ARCHIVED": return <Archive className="w-4 h-4" />;
    }
  };

  const canArchive = (server: BeryllServer): boolean => {
    return server.status === "DONE" && !!server.apkSerialNumber;
  };

  // ============================================
  // РЕНДЕР
  // ============================================

  return (
    <div className="space-y-4">
      {/* Панель фильтров */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по IP, hostname, серийному номеру..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        {/* Фильтры */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Статус */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as ServerStatus | "ALL")}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">Все статусы</option>
            {Object.entries(STATUS_LABELS)
              .filter(([key]) => key !== "ARCHIVED")
              .map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
          </select>

          {/* Партия */}
          <select
            value={batchFilter}
            onChange={(e) => {
              const val = e.target.value;
              setBatchFilter(val === "ALL" ? "ALL" : val === "UNASSIGNED" ? "UNASSIGNED" : parseInt(val));
            }}
            className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
          >
            <option value="ALL">Все партии</option>
            <option value="UNASSIGNED">Без партии</option>
            {batches.map(batch => (
              <option key={batch.id} value={batch.id}>{batch.title}</option>
            ))}
          </select>

          {/* Только активные */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
            <input
              type="checkbox"
              checked={onlyActive}
              onChange={(e) => setOnlyActive(e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Только активные
          </label>
        </div>
      </div>

      {/* Панель выбранных */}
      {selectedServers.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-indigo-50 rounded-lg border border-indigo-200">
          <span className="text-sm font-medium text-indigo-700">
            Выбрано: {selectedServers.length}
          </span>
          <button
            onClick={() => setShowBatchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Package className="w-4 h-4" />
            Привязать к партии
          </button>
          <button
            onClick={() => setSelectedServers([])}
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Снять выделение
          </button>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Server className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Серверы не найдены</p>
            <p className="text-sm mt-1">
              Нажмите "Синхронизация с DHCP" для получения списка
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedServers.length === servers.length && servers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Hostname</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Партия</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Исполнитель</th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">Обновлён</th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servers.map((server) => {
                  const isAssignedToMe = server.assignedToId === currentUser?.id;
                  const canWork = server.status === "IN_WORK" && isAssignedToMe;
                  const isLoading = actionLoading === server.id;

                  return (
                    <tr
                      key={server.id}
                      className={`hover:bg-gray-50 transition-colors ${
                        !server.leaseActive ? "opacity-60" : ""
                      } ${selectedServers.includes(server.id) ? "bg-indigo-50/50" : ""}`}
                    >
                      {/* Чекбокс */}
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={selectedServers.includes(server.id)}
                          onChange={() => toggleSelect(server.id)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                      </td>

                      {/* IP */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => navigate(`/beryll/server/${server.id}`)}
                            className="font-mono text-sm font-medium text-indigo-600 hover:underline"
                          >
                            {server.ipAddress}
                          </button>
                          <button
                            onClick={() => copyToClipboard(server.ipAddress || "")}
                            className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            title="Копировать"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {!server.leaseActive && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                              OFFLINE
                            </span>
                          )}
                        </div>
                        {/* Серийный номер АПК под IP */}
                        {server.apkSerialNumber && (
                          <div className="text-xs text-purple-600 font-mono mt-0.5">
                            АПК: {server.apkSerialNumber}
                          </div>
                        )}
                      </td>

                      {/* Hostname */}
                      <td className="p-3">
                        <span className="text-sm text-gray-600 font-mono">
                          {server.hostname || "-"}
                        </span>
                      </td>

                      {/* Статус */}
                      <td className="p-3">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${STATUS_COLORS[server.status]}`}>
                          {getStatusIcon(server.status)}
                          {STATUS_LABELS[server.status]}
                        </span>
                      </td>

                      {/* Партия */}
                      <td className="p-3">
                        {server.batch ? (
                          <button
                            onClick={() => navigate(`/beryll/batch/${server.batch!.id}`)}
                            className="text-sm text-indigo-600 hover:underline flex items-center gap-1"
                          >
                            <Package className="w-3.5 h-3.5" />
                            {server.batch.title}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Исполнитель */}
                      <td className="p-3">
                        {server.assignedTo ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center ${
                              isAssignedToMe ? "bg-green-100" : "bg-indigo-100"
                            }`}>
                              <User className={`w-3.5 h-3.5 ${
                                isAssignedToMe ? "text-green-600" : "text-indigo-600"
                              }`} />
                            </div>
                            <span className="text-sm text-gray-700">
                              {server.assignedTo.surname} {server.assignedTo.name?.charAt(0)}.
                              {isAssignedToMe && (
                                <span className="text-green-600 text-xs ml-1">(вы)</span>
                              )}
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Обновлён */}
                      <td className="p-3">
                        <span className="text-xs text-gray-500">
                          {formatDateTime(server.updatedAt)}
                        </span>
                      </td>

                      {/* Действия */}
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* Открыть карточку */}
                          <button
                            onClick={() => navigate(`/beryll/server/${server.id}`)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Открыть карточку"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </button>

                          {/* Взять в работу */}
                          {server.status === "NEW" && (
                            <button
                              onClick={() => handleTake(server)}
                              disabled={isLoading}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-50 transition-colors"
                              title="Взять в работу"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Действия для взятого сервера */}
                          {canWork && (
                            <>
                              <button
                                onClick={() => handleRelease(server)}
                                disabled={isLoading}
                                className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                                title="Отпустить"
                              >
                                <Square className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleStatusChange(server, "DONE")}
                                disabled={isLoading}
                                className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Завершить"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* НОВОЕ: Перенести в архив */}
                          {canArchive(server) && (
                            <button
                              onClick={() => handleArchive(server)}
                              disabled={isLoading}
                              className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Перенести в архив"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <Archive className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Скачать паспорт (для готовых) */}
                          {(server.status === "DONE" || server.status === "ARCHIVED") && server.apkSerialNumber && (
                            <button
                              onClick={() => handleDownloadPassport(server)}
                              className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Скачать паспорт"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                          )}

                          {/* Удалить (только для админа) */}
                          {currentUser?.role === "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleDelete(server)}
                              disabled={isLoading}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Легенда действий */}
      <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 px-2">
        <div className="flex items-center gap-1">
          <Play className="w-3.5 h-3.5 text-blue-600" />
          <span>Взять в работу</span>
        </div>
        <div className="flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
          <span>Завершить</span>
        </div>
        <div className="flex items-center gap-1">
          <Archive className="w-3.5 h-3.5 text-purple-500" />
          <span>В архив</span>
        </div>
        <div className="flex items-center gap-1">
          <FileSpreadsheet className="w-3.5 h-3.5 text-green-600" />
          <span>Паспорт</span>
        </div>
      </div>

      {/* Модальное окно выбора партии */}
      {showBatchModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Package className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Выберите партию
                  </h3>
                  <p className="text-sm text-gray-500">
                    {selectedServers.length} {
                      selectedServers.length === 1 ? "сервер будет привязан" : 
                      selectedServers.length < 5 ? "сервера будут привязаны" : "серверов будут привязаны"
                    } к партии
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {batches.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Package className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Нет активных партий</p>
                  <p className="text-sm mt-1">Создайте партию во вкладке "Партии"</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {batches.map(batch => (
                    <button
                      key={batch.id}
                      onClick={() => handleAssignToBatch(batch.id)}
                      className="w-full p-3 text-left rounded-lg border border-gray-200 hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                    >
                      <div className="font-medium text-gray-800 group-hover:text-indigo-700">
                        {batch.title}
                      </div>
                      {batch.supplier && (
                        <div className="text-sm text-gray-500">{batch.supplier}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setShowBatchModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ServersTab;
