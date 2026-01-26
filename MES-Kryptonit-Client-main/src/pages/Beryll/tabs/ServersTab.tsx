/**
 * ServersTab.tsx (обновлённый)
 * 
 * Вкладка "Серверы" для APK Beryll
 * + Пагинация
 * + Кнопка пинга
 * 
 * Заменить: src/pages/Beryll/tabs/ServersTab.tsx
 */

import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import toast from "react-hot-toast";
import {
  Server,
  Search,
  RefreshCw,
  Play,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  Trash2,
  ExternalLink,
  Package,
  User,
  Copy,
  Archive,
  FileSpreadsheet,
  Wifi,
  WifiOff,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Globe
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
  pingServer,
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

// Количество серверов на странице
const PAGE_SIZE_OPTIONS = [20, 50, 100];

export const ServersTab: React.FC<ServersTabProps> = observer(({ onStatsUpdate }) => {
  const navigate = useNavigate();
  const context = useContext(Context);
  const currentUser = context?.user?.user;

  const [servers, setServers] = useState<BeryllServer[]>([]);
  const [batches, setBatches] = useState<BeryllBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  // Пинг
  const [pingingServerId, setPingingServerId] = useState<number | null>(null);
  const [pingResults, setPingResults] = useState<Record<number, { online: boolean; latency: number | null }>>({});

  // Фильтры
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ServerStatus | "ALL">("ALL");
  const [batchFilter, setBatchFilter] = useState<number | "ALL" | "UNASSIGNED">("ALL");
  const [onlyActive, setOnlyActive] = useState(false);

  // Пагинация
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // Выбор серверов для групповых операций
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [showBatchModal, setShowBatchModal] = useState(false);
  
  // Контекстное меню
  const [openMenuId, setOpenMenuId] = useState<number | null>(null);

  // ============================================
  // ЗАГРУЗКА ДАННЫХ
  // ============================================

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
      // Сброс на первую страницу при изменении фильтров
      setCurrentPage(1);
    } catch (e) {
      console.error("Ошибка загрузки:", e);
      toast.error("Ошибка загрузки данных");
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
  // ПАГИНАЦИЯ
  // ============================================

  const totalPages = Math.ceil(servers.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedServers = servers.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      // Снять выделение при переходе на другую страницу
      setSelectedServers([]);
    }
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
    setSelectedServers([]);
  };

  // ============================================
  // ПИНГ
  // ============================================

  const handlePing = async (server: BeryllServer) => {
    setPingingServerId(server.id);
    try {
      const result = await pingServer(server.id);
      setPingResults(prev => ({
        ...prev,
        [server.id]: {
          online: result.online,
          latency: result.latency
        }
      }));
      
      if (result.online) {
        toast.success(`${server.ipAddress} доступен (${result.latency}ms)`, { duration: 2000 });
      } else {
        toast.error(`${server.ipAddress} недоступен`, { duration: 2000 });
      }
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка пинга");
      setPingResults(prev => ({
        ...prev,
        [server.id]: { online: false, latency: null }
      }));
    } finally {
      setPingingServerId(null);
    }
  };

  // ============================================
  // ДЕЙСТВИЯ
  // ============================================

  const handleTake = async (server: BeryllServer) => {
    setActionLoading(server.id);
    try {
      await takeServer(server.id);
      await loadData();
      onStatsUpdate?.();
      toast.success("Сервер взят в работу");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка");
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
      toast.success("Сервер освобождён");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка");
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
      toast.error(e.response?.data?.message || "Ошибка");
    } finally {
      setActionLoading(null);
    }
  };

  const handleArchive = async (server: BeryllServer) => {
    if (!server.apkSerialNumber) {
      toast.error("Для переноса в архив необходимо присвоить серийный номер АПК");
      return;
    }
    
    if (server.status !== "DONE") {
      toast.error("Перенести в архив можно только серверы со статусом 'Готово'");
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
      toast.success("Сервер перенесён в архив");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка архивации");
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (server: BeryllServer) => {
    if (!confirm(`Удалить сервер ${server.ipAddress}? Это действие нельзя отменить.`)) {
      return;
    }
    
    setActionLoading(server.id);
    try {
      await deleteServer(server.id);
      await loadData();
      onStatsUpdate?.();
      toast.success("Сервер удалён");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка удаления");
    } finally {
      setActionLoading(null);
    }
  };

  const handleGeneratePassport = async (server: BeryllServer) => {
    try {
      const blob = await generatePassport(server.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `passport_${server.apkSerialNumber || server.ipAddress}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success("Паспорт сгенерирован");
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка генерации паспорта");
    }
  };

  // ============================================
  // ВЫБОР СЕРВЕРОВ
  // ============================================

  const toggleSelect = (id: number) => {
    setSelectedServers(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedServers.length === paginatedServers.length) {
      setSelectedServers([]);
    } else {
      setSelectedServers(paginatedServers.map(s => s.id));
    }
  };

  const handleAssignToBatch = async (batchId: number) => {
    try {
      await assignServersToBatch(selectedServers, batchId);
      await loadData();
      onStatsUpdate?.();
      setShowBatchModal(false);
      setSelectedServers([]);
      toast.success(`Серверы привязаны к партии`);
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка");
    }
  };

  // ============================================
  // УТИЛИТЫ
  // ============================================

  // Копирование в буфер обмена (с fallback для http)
  const copyToClipboard = async (text: string) => {
    if (!text) {
      toast.error("Нечего копировать");
      return;
    }

    try {
      // Пробуем современный API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        // Fallback для http или старых браузеров
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        const successful = document.execCommand("copy");
        document.body.removeChild(textArea);
        
        if (!successful) {
          throw new Error("execCommand failed");
        }
      }
      toast.success("Скопировано", { duration: 1500 });
    } catch (err) {
      console.error("Copy failed:", err);
      toast.error("Не удалось скопировать");
    }
  };

  // Открыть сервер в браузере
  const openInBrowser = (ipAddress: string | null) => {
    if (!ipAddress) {
      toast.error("IP адрес не указан");
      return;
    }
    window.open(`http://${ipAddress}`, "_blank", "noopener,noreferrer");
  };

  const getStatusIcon = (status: ServerStatus) => {
    switch (status) {
      case "NEW": return <Clock className="w-3.5 h-3.5" />;
      case "IN_WORK": return <RefreshCw className="w-3.5 h-3.5" />;
      case "DONE": return <CheckCircle2 className="w-3.5 h-3.5" />;
      case "DEFECT": return <XCircle className="w-3.5 h-3.5" />;
      default: return <HelpCircle className="w-3.5 h-3.5" />;
    }
  };

  const getPingStatusIcon = (serverId: number) => {
    const result = pingResults[serverId];
    if (!result) return null;
    
    if (result.online) {
      return (
        <span className="flex items-center gap-1 text-xs text-green-600">
          <Wifi className="w-3.5 h-3.5" />
          {result.latency !== null && `${result.latency}ms`}
        </span>
      );
    } else {
      return (
        <span className="flex items-center gap-1 text-xs text-red-500">
          <WifiOff className="w-3.5 h-3.5" />
        </span>
      );
    }
  };

  // ============================================
  // РЕНДЕР
  // ============================================

  return (
    <div className="p-4 space-y-4">
      {/* Фильтры */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
        {/* Поиск */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Поиск по IP, hostname, серийному номеру..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Фильтр по статусу */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ServerStatus | "ALL")}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Все статусы</option>
          <option value="NEW">Новый</option>
          <option value="IN_WORK">В работе</option>
          <option value="DONE">Готово</option>
          <option value="DEFECT">Брак</option>
        </select>

        {/* Фильтр по партии */}
        <select
          value={batchFilter}
          onChange={(e) => {
            const val = e.target.value;
            setBatchFilter(val === "ALL" ? "ALL" : val === "UNASSIGNED" ? "UNASSIGNED" : Number(val));
          }}
          className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="ALL">Все партии</option>
          <option value="UNASSIGNED">Без партии</option>
          {batches.map(b => (
            <option key={b.id} value={b.id}>{b.title}</option>
          ))}
        </select>

        {/* Только активные */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={onlyActive}
            onChange={(e) => setOnlyActive(e.target.checked)}
            className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          />
          <span className="text-sm text-gray-600">Только активные</span>
        </label>

        {/* Кнопка обновления */}
        <button
          onClick={() => loadData()}
          disabled={loading}
          className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
          title="Обновить"
        >
          <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Статистика и пагинация сверху */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-500">
          Найдено: <span className="font-medium text-gray-700">{servers.length}</span> серверов
          {servers.length > 0 && (
            <span className="ml-2">
              (показаны {startIndex + 1}-{Math.min(endIndex, servers.length)})
            </span>
          )}
        </div>

        {/* Выбор размера страницы */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">На странице:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="px-2 py-1 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {PAGE_SIZE_OPTIONS.map(size => (
              <option key={size} value={size}>{size}</option>
            ))}
          </select>
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
                      checked={selectedServers.length === paginatedServers.length && paginatedServers.length > 0}
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
                {paginatedServers.map((server) => {
                  const isAssignedToMe = server.assignedToId === currentUser?.id;
                  const canWork = server.status === "IN_WORK" && isAssignedToMe;
                  const isLoading = actionLoading === server.id;
                  const isPinging = pingingServerId === server.id;

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
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => navigate(`/beryll/server/${server.id}`)}
                            className="font-mono text-sm font-medium text-indigo-600 hover:underline"
                          >
                            {server.ipAddress}
                          </button>
                          {/* Копировать IP */}
                          <button
                            onClick={() => copyToClipboard(server.ipAddress || "")}
                            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                            title="Копировать IP"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          {/* Открыть в браузере */}
                          <button
                            onClick={() => openInBrowser(server.ipAddress)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                            title="Открыть в браузере"
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </button>
                          {!server.leaseActive && (
                            <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[10px] rounded font-medium">
                              OFFLINE
                            </span>
                          )}
                          {/* Результат пинга */}
                          {getPingStatusIcon(server.id)}
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
                          {/* Пинг */}
                          <button
                            onClick={() => handlePing(server)}
                            disabled={isPinging}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Проверить доступность (ping)"
                          >
                            {isPinging ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <Wifi className="w-4 h-4" />
                            )}
                          </button>

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

                          {/* Завершить */}
                          {canWork && (
                            <button
                              onClick={() => handleStatusChange(server, "DONE")}
                              disabled={isLoading}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-50 transition-colors"
                              title="Завершить"
                            >
                              {isLoading ? (
                                <RefreshCw className="w-4 h-4 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-4 h-4" />
                              )}
                            </button>
                          )}

                          {/* Архив */}
                          {server.status === "DONE" && server.apkSerialNumber && (
                            <button
                              onClick={() => handleArchive(server)}
                              disabled={isLoading}
                              className="p-1.5 text-purple-500 hover:bg-purple-50 rounded-lg disabled:opacity-50 transition-colors"
                              title="В архив"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          )}

                          {/* Паспорт */}
                          {server.status === "DONE" && server.apkSerialNumber && (
                            <button
                              onClick={() => handleGeneratePassport(server)}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              title="Сгенерировать паспорт"
                            >
                              <FileSpreadsheet className="w-4 h-4" />
                            </button>
                          )}

                          {/* Удалить */}
                          <button
                            onClick={() => handleDelete(server)}
                            disabled={isLoading}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg disabled:opacity-50 transition-colors"
                            title="Удалить"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Пагинация снизу */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
          <div className="text-sm text-gray-500">
            Страница {currentPage} из {totalPages}
          </div>

          <div className="flex items-center gap-1">
            {/* Первая страница */}
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Первая страница"
            >
              <ChevronsLeft className="w-5 h-5" />
            </button>

            {/* Предыдущая */}
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Предыдущая"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>

            {/* Номера страниц */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${
                      currentPage === pageNum
                        ? "bg-indigo-600 text-white"
                        : "text-gray-600 hover:bg-indigo-50 hover:text-indigo-600"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Следующая */}
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Следующая"
            >
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Последняя страница */}
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Последняя страница"
            >
              <ChevronsRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

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