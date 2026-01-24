
import { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Archive,
  Search,
  Server,
  RefreshCw,
  ExternalLink,
  Download,
  Package,
  User,
  Calendar,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  Copy,
  RotateCcw,
  CheckSquare,
  Square,
  AlertTriangle,
  Clock,
  Info,
  Trash2
} from "lucide-react";
import { Context } from "src/main";
import {
  getArchivedServers,
  getBatches,
  generatePassport,
  unarchiveServer,
  deleteServer,
  BeryllServer,
  BeryllBatch,
  STATUS_LABELS,
  STATUS_COLORS,
  formatDateTime,
  formatDate
} from "src/api/beryllApi";

interface ArchiveTabProps {
  onStatsUpdate?: () => void;
}

export const ArchiveTab: React.FC<ArchiveTabProps> = observer(({ onStatsUpdate }) => {
  const navigate = useNavigate();
  const context = useContext(Context);
  const currentUser = context?.user?.user;

  const [servers, setServers] = useState<BeryllServer[]>([]);
  const [batches, setBatches] = useState<BeryllBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  
  // Фильтры
  const [search, setSearch] = useState("");
  const [batchFilter, setBatchFilter] = useState<number | "ALL">("ALL");
  
  // Пагинация
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Выбор серверов для массовых операций
  const [selectedServers, setSelectedServers] = useState<number[]>([]);
  const [showUnarchiveConfirm, setShowUnarchiveConfirm] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [archiveData, batchesData] = await Promise.all([
        getArchivedServers({
          search: search || undefined,
          batchId: batchFilter === "ALL" ? undefined : batchFilter,
          page,
          limit: 50
        }),
        getBatches({})
      ]);
      
      setServers(archiveData.servers);
      setTotal(archiveData.total);
      setTotalPages(archiveData.totalPages);
      setBatches(batchesData);
    } catch (e) {
      console.error("Ошибка загрузки архива:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, batchFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadData();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // ============================================
  // ДЕЙСТВИЯ
  // ============================================

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

  const handleUnarchive = async (server: BeryllServer) => {
    if (!confirm(`Вернуть сервер ${server.apkSerialNumber || server.ipAddress} из архива?`)) {
      return;
    }
    
    setActionLoading(server.id);
    try {
      await unarchiveServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка восстановления");
    } finally {
      setActionLoading(null);
    }
  };

  const handleBulkUnarchive = async () => {
    if (selectedServers.length === 0) return;
    
    setShowUnarchiveConfirm(false);
    const errors: string[] = [];
    
    for (const serverId of selectedServers) {
      setActionLoading(serverId);
      try {
        await unarchiveServer(serverId);
      } catch (e: any) {
        const server = servers.find(s => s.id === serverId);
        errors.push(`${server?.apkSerialNumber || serverId}: ${e.response?.data?.message || "Ошибка"}`);
      }
    }
    
    setActionLoading(null);
    setSelectedServers([]);
    await loadData();
    onStatsUpdate?.();
    
    if (errors.length > 0) {
      alert(`Ошибки при восстановлении:\n${errors.join("\n")}`);
    }
  };

  const handleDelete = async (server: BeryllServer) => {
    if (!confirm(`Удалить сервер ${server.apkSerialNumber || server.ipAddress} навсегда? Это действие нельзя отменить!`)) {
      return;
    }
    
    setActionLoading(server.id);
    try {
      await deleteServer(server.id);
      await loadData();
      onStatsUpdate?.();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка удаления");
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // ============================================
  // ВЫБОР СЕРВЕРОВ
  // ============================================

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

  // ============================================
  // РЕНДЕР
  // ============================================

  return (
    <div className="space-y-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded-lg">
            <Archive className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Архив серверов
            </h2>
            <p className="text-sm text-gray-500">
              Завершённые серверы с присвоенными серийными номерами
            </p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-sm text-gray-500">
            Всего в архиве: <span className="font-semibold text-purple-600">{total}</span>
          </div>
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className={`w-5 h-5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Фильтры */}
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        {/* Поиск */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Поиск по серийному номеру АПК, IP, hostname..."
            className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          />
        </div>

        {/* Фильтр по партии */}
        <select
          value={batchFilter}
          onChange={(e) => {
            const val = e.target.value;
            setBatchFilter(val === "ALL" ? "ALL" : parseInt(val));
            setPage(1);
          }}
          className="px-3 py-2.5 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="ALL">Все партии</option>
          {batches.map(batch => (
            <option key={batch.id} value={batch.id}>{batch.title}</option>
          ))}
        </select>
      </div>

      {/* Панель массовых действий */}
      {selectedServers.length > 0 && (
        <div className="flex items-center gap-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
          <span className="text-sm font-medium text-purple-700">
            Выбрано: {selectedServers.length}
          </span>
          <button
            onClick={() => setShowUnarchiveConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Вернуть из архива
          </button>
          <button
            onClick={() => setSelectedServers([])}
            className="text-sm text-purple-600 hover:text-purple-800"
          >
            Снять выделение
          </button>
        </div>
      )}

      {/* Таблица */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw className="w-8 h-8 animate-spin text-purple-500" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Archive className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Архив пуст</p>
            <p className="text-sm mt-1">
              Здесь будут отображаться завершённые серверы
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-purple-50 border-b border-gray-200">
                  <th className="p-3 text-left w-10">
                    <input
                      type="checkbox"
                      checked={selectedServers.length === servers.length && servers.length > 0}
                      onChange={toggleSelectAll}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-purple-600 uppercase">
                    Серийный номер АПК
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    IP / Hostname
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Партия
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Исполнитель
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Завершён
                  </th>
                  <th className="p-3 text-left text-xs font-semibold text-gray-500 uppercase">
                    Архивирован
                  </th>
                  <th className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {servers.map((server) => {
                  const isLoading = actionLoading === server.id;
                  const isSelected = selectedServers.includes(server.id);
                  
                  return (
                    <tr 
                      key={server.id} 
                      className={`hover:bg-gray-50 transition-colors ${isSelected ? "bg-purple-50/50" : ""}`}
                    >
                      {/* Чекбокс */}
                      <td className="p-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(server.id)}
                          className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                        />
                      </td>

                      {/* Серийный номер АПК */}
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-purple-700">
                            {server.apkSerialNumber || "-"}
                          </span>
                          {server.apkSerialNumber && (
                            <button
                              onClick={() => copyToClipboard(server.apkSerialNumber!)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                              title="Копировать"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        {server.serialNumber && server.serialNumber !== server.apkSerialNumber && (
                          <div className="text-xs text-gray-400 mt-0.5 font-mono">
                            SN: {server.serialNumber}
                          </div>
                        )}
                      </td>

                      {/* IP / Hostname */}
                      <td className="p-3">
                        <div className="text-sm text-gray-600 font-mono">
                          {server.ipAddress || "-"}
                        </div>
                        {server.hostname && (
                          <div className="text-xs text-gray-400 font-mono">
                            {server.hostname}
                          </div>
                        )}
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
                            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                              <User className="w-3.5 h-3.5 text-green-600" />
                            </div>
                            <span className="text-sm text-gray-700">
                              {server.assignedTo.surname} {server.assignedTo.name?.charAt(0)}.
                            </span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>

                      {/* Завершён */}
                      <td className="p-3">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          {server.completedAt ? formatDate(server.completedAt) : "-"}
                        </div>
                      </td>

                      {/* Архивирован */}
                      <td className="p-3">
                        <div className="text-sm text-gray-500">
                          {server.archivedAt ? formatDateTime(server.archivedAt) : "-"}
                        </div>
                        {server.archivedBy && (
                          <div className="text-xs text-gray-400">
                            {server.archivedBy.surname}
                          </div>
                        )}
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

                          {/* Скачать паспорт */}
                          <button
                            onClick={() => handleDownloadPassport(server)}
                            className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            title="Скачать паспорт"
                          >
                            <FileSpreadsheet className="w-4 h-4" />
                          </button>

                          {/* НОВОЕ: Вернуть из архива */}
                          <button
                            onClick={() => handleUnarchive(server)}
                            disabled={isLoading}
                            className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors disabled:opacity-50"
                            title="Вернуть из архива"
                          >
                            {isLoading ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <RotateCcw className="w-4 h-4" />
                            )}
                          </button>

                          {/* Удалить (только для админа) */}
                          {currentUser?.role === "SUPER_ADMIN" && (
                            <button
                              onClick={() => handleDelete(server)}
                              disabled={isLoading}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                              title="Удалить навсегда"
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

        {/* Пагинация */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between bg-gray-50">
            <div className="text-sm text-gray-500">
              Страница {page} из {totalPages} • Всего: {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="px-3 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 shadow-sm">
                {page}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:bg-white hover:shadow-sm rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Подсказка */}
      <div className="p-4 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl border border-purple-200">
        <div className="flex gap-3">
          <Info className="w-5 h-5 text-purple-500 shrink-0 mt-0.5" />
          <div className="text-sm text-purple-700">
            <p className="font-medium mb-2">Об архиве</p>
            <ul className="space-y-1 text-purple-600">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                В архив попадают серверы со статусом "Готово" и присвоенным серийным номером АПК
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                Архивные серверы сохраняются даже после отключения от сети (пропадания из DHCP)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                <span><strong>Новое:</strong> Серверы можно вернуть из архива кнопкой <RotateCcw className="w-3.5 h-3.5 inline" /></span>
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                Для каждого сервера можно скачать заполненный паспорт в Excel
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Модальное окно подтверждения массового восстановления */}
      {showUnarchiveConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="p-5 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RotateCcw className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    Восстановление из архива
                  </h3>
                  <p className="text-sm text-gray-500">
                    Подтвердите действие
                  </p>
                </div>
              </div>
            </div>

            <div className="p-5">
              <p className="text-gray-600 mb-4">
                Вы собираетесь вернуть из архива <strong>{selectedServers.length}</strong> {
                  selectedServers.length === 1 ? "сервер" : 
                  selectedServers.length < 5 ? "сервера" : "серверов"
                }.
              </p>
              <div className="flex items-start gap-2 p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                <AlertTriangle className="w-5 h-5 text-yellow-600 shrink-0" />
                <p className="text-sm text-yellow-700">
                  Серверы будут возвращены в статус "Готово" и появятся во вкладке "Серверы".
                </p>
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowUnarchiveConfirm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleBulkUnarchive}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Восстановить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default ArchiveTab;
