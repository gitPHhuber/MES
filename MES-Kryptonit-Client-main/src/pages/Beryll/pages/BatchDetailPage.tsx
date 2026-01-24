import { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { observer } from "mobx-react-lite";
import {
  Package,
  ArrowLeft,
  RefreshCw,
  Calendar,
  Building2,
  Server,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  Edit,
  Save,
  X,
  Plus,
  Trash2,
  User,
  ExternalLink
} from "lucide-react";
import { Context } from "src/main";
import {
  getBatchById,
  updateBatch,
  getServers,
  assignServersToBatch,
  removeServersFromBatch,
  BeryllBatch,
  BeryllServer,
  ServerStatus,
  BatchStatus,
  STATUS_LABELS,
  STATUS_COLORS,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
  formatDate,
  formatDateTime,
  getStatusProgress
} from "src/api/beryllApi";

export const BatchDetailPage: React.FC = observer(() => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const context = useContext(Context);
  const currentUser = context?.user?.user;

  const [batch, setBatch] = useState<BeryllBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Редактирование
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    supplier: "",
    deliveryDate: "",
    expectedCount: 0,
    notes: ""
  });

  // Добавление серверов
  const [showAddModal, setShowAddModal] = useState(false);
  const [availableServers, setAvailableServers] = useState<BeryllServer[]>([]);
  const [selectedServersToAdd, setSelectedServersToAdd] = useState<number[]>([]);
  const [loadingServers, setLoadingServers] = useState(false);

  const loadBatch = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await getBatchById(parseInt(id));
      setBatch(data);
      setFormData({
        title: data.title,
        supplier: data.supplier || "",
        deliveryDate: data.deliveryDate || "",
        expectedCount: data.expectedCount || 0,
        notes: data.notes || ""
      });
    } catch (e) {
      console.error("Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableServers = async () => {
    setLoadingServers(true);
    try {
      const servers = await getServers({ batchId: "null" });
      setAvailableServers(servers);
    } catch (e) {
      console.error("Ошибка загрузки серверов:", e);
    } finally {
      setLoadingServers(false);
    }
  };

  useEffect(() => {
    loadBatch();
  }, [id]);

  const handleSave = async () => {
    if (!batch || !formData.title.trim()) {
      alert("Введите название партии");
      return;
    }

    setSaving(true);
    try {
      await updateBatch(batch.id, formData);
      setEditing(false);
      await loadBatch();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (newStatus: BatchStatus) => {
    if (!batch) return;
    
    if (newStatus === "COMPLETED" && !confirm("Завершить партию?")) return;
    if (newStatus === "CANCELLED" && !confirm("Отменить партию?")) return;

    try {
      await updateBatch(batch.id, { status: newStatus });
      await loadBatch();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  const handleAddServers = async () => {
    if (!batch || selectedServersToAdd.length === 0) return;

    try {
      await assignServersToBatch(batch.id, selectedServersToAdd);
      setShowAddModal(false);
      setSelectedServersToAdd([]);
      await loadBatch();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  const handleRemoveServer = async (serverId: number) => {
    if (!batch || !confirm("Отвязать сервер от партии?")) return;

    try {
      await removeServersFromBatch(batch.id, [serverId]);
      await loadBatch();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  const openAddModal = async () => {
    setShowAddModal(true);
    await loadAvailableServers();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <Package className="w-16 h-16 text-gray-300 mb-4" />
        <p className="text-gray-500 text-lg">Партия не найдена</p>
        <button
          onClick={() => navigate("/beryll")}
          className="mt-4 text-indigo-600 hover:underline"
        >
          Вернуться к списку
        </button>
      </div>
    );
  }

  const progress = getStatusProgress(batch.stats);
  const totalServers = batch.servers?.length || 0;
  const doneServers = batch.stats?.DONE || 0;

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
      {/* Шапка */}
      <div className="mb-6">
        <button
          onClick={() => navigate("/beryll")}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Назад к списку
        </button>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-xl">
              <Package className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                {editing ? (
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="text-2xl font-bold text-gray-800 border-b-2 border-indigo-500 focus:outline-none bg-transparent"
                  />
                ) : (
                  <h1 className="text-2xl font-bold text-gray-800">
                    {batch.title}
                  </h1>
                )}
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${BATCH_STATUS_COLORS[batch.status]}`}>
                  {BATCH_STATUS_LABELS[batch.status]}
                </span>
              </div>
              {batch.supplier && (
                <p className="text-gray-500 mt-1 flex items-center gap-1">
                  <Building2 className="w-4 h-4" />
                  {batch.supplier}
                </p>
              )}
            </div>
          </div>

          {/* Действия */}
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      title: batch.title,
                      supplier: batch.supplier || "",
                      deliveryDate: batch.deliveryDate || "",
                      expectedCount: batch.expectedCount || 0,
                      notes: batch.notes || ""
                    });
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  <Save className="w-4 h-4" />
                  Сохранить
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
                >
                  <Edit className="w-4 h-4" />
                  Редактировать
                </button>
                
                {batch.status === "ACTIVE" && (
                  <button
                    onClick={() => handleStatusChange("COMPLETED")}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Завершить
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Левая колонка - серверы */}
        <div className="lg:col-span-2 space-y-6">
          {/* Прогресс */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Прогресс</h2>
              <span className="text-2xl font-bold text-indigo-600">{progress}%</span>
            </div>

            {/* Полоска прогресса */}
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden mb-4">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>

            {/* Статистика по статусам */}
            <div className="grid grid-cols-5 gap-2">
              {Object.entries(STATUS_LABELS).map(([status, label]) => {
                const count = batch.stats?.[status as ServerStatus] || 0;
                return (
                  <div key={status} className={`p-3 rounded-lg text-center ${STATUS_COLORS[status as ServerStatus]}`}>
                    <div className="text-xl font-bold">{count}</div>
                    <div className="text-xs opacity-80">{label}</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Список серверов */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                <Server className="w-5 h-5 text-gray-400" />
                Серверы ({totalServers})
              </h2>
              
              {batch.status === "ACTIVE" && (
                <button
                  onClick={openAddModal}
                  className="flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4" />
                  Добавить
                </button>
              )}
            </div>

            {!batch.servers || batch.servers.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <Server className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Серверы не привязаны</p>
                {batch.status === "ACTIVE" && (
                  <button
                    onClick={openAddModal}
                    className="mt-4 text-indigo-600 hover:underline"
                  >
                    Добавить серверы
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {batch.servers.map((server) => (
                  <div
                    key={server.id}
                    className="p-4 hover:bg-gray-50 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <span className={`w-2 h-2 rounded-full ${
                        server.status === "DONE" ? "bg-green-500" :
                        server.status === "IN_WORK" ? "bg-blue-500" :
                        server.status === "DEFECT" ? "bg-red-500" :
                        "bg-gray-300"
                      }`} />
                      
                      <div>
                        <button
                          onClick={() => navigate(`/beryll/server/${server.id}`)}
                          className="font-mono font-medium text-indigo-600 hover:underline"
                        >
                          {server.ipAddress}
                        </button>
                        {server.hostname && (
                          <div className="text-xs text-gray-500 font-mono">
                            {server.hostname}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[server.status]}`}>
                        {STATUS_LABELS[server.status]}
                      </span>
                      
                      {server.assignedTo && (
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {server.assignedTo.surname}
                        </span>
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => navigate(`/beryll/server/${server.id}`)}
                          className="p-1 text-gray-400 hover:text-indigo-600"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                        
                        {batch.status === "ACTIVE" && (
                          <button
                            onClick={() => handleRemoveServer(server.id)}
                            className="p-1 text-gray-400 hover:text-red-600"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Правая колонка - информация */}
        <div className="space-y-6">
          {/* Информация о партии */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-4">
            <h3 className="font-semibold text-gray-800">Информация</h3>

            {/* Дата поставки */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Дата поставки</label>
              {editing ? (
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-800">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  {batch.deliveryDate ? formatDate(batch.deliveryDate) : "-"}
                </div>
              )}
            </div>

            {/* Поставщик */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Поставщик</label>
              {editing ? (
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="ООО Вегман"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <div className="flex items-center gap-2 text-gray-800">
                  <Building2 className="w-4 h-4 text-gray-400" />
                  {batch.supplier || "-"}
                </div>
              )}
            </div>

            {/* Ожидаемое количество */}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ожидаемое кол-во</label>
              {editing ? (
                <input
                  type="number"
                  value={formData.expectedCount}
                  onChange={(e) => setFormData({ ...formData, expectedCount: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              ) : (
                <div className="text-gray-800">
                  {batch.expectedCount || "-"}
                  {batch.expectedCount && totalServers > 0 && (
                    <span className="text-sm text-gray-500 ml-2">
                      (факт: {totalServers})
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Создатель */}
            {batch.createdBy && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Создал</label>
                <div className="text-gray-800">
                  {batch.createdBy.surname} {batch.createdBy.name}
                </div>
              </div>
            )}

            {/* Даты */}
            <div className="pt-4 border-t border-gray-100 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Создана</span>
                <span className="text-gray-800">{formatDateTime(batch.createdAt)}</span>
              </div>
              {batch.completedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Завершена</span>
                  <span className="text-gray-800">{formatDateTime(batch.completedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Примечания */}
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <h3 className="font-semibold text-gray-800 mb-3">Примечания</h3>
            {editing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none"
                placeholder="Добавьте примечание..."
              />
            ) : (
              <p className={`text-sm ${batch.notes ? "text-gray-600" : "text-gray-400 italic"}`}>
                {batch.notes || "Примечания отсутствуют"}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно добавления серверов */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                Добавить серверы в партию
              </h3>
              <p className="text-sm text-gray-500">
                Выберите серверы без партии
              </p>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto">
              {loadingServers ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
                </div>
              ) : availableServers.length === 0 ? (
                <p className="text-center text-gray-400 py-8">
                  Нет доступных серверов
                </p>
              ) : (
                <div className="space-y-2">
                  {availableServers.map(server => (
                    <label
                      key={server.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedServersToAdd.includes(server.id)
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedServersToAdd.includes(server.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedServersToAdd([...selectedServersToAdd, server.id]);
                          } else {
                            setSelectedServersToAdd(selectedServersToAdd.filter(id => id !== server.id));
                          }
                        }}
                        className="rounded border-gray-300"
                      />
                      <div className="flex-1">
                        <div className="font-mono font-medium text-gray-800">
                          {server.ipAddress}
                        </div>
                        {server.hostname && (
                          <div className="text-xs text-gray-500">{server.hostname}</div>
                        )}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs ${STATUS_COLORS[server.status]}`}>
                        {STATUS_LABELS[server.status]}
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-500">
                Выбрано: {selectedServersToAdd.length}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowAddModal(false);
                    setSelectedServersToAdd([]);
                  }}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Отмена
                </button>
                <button
                  onClick={handleAddServers}
                  disabled={selectedServersToAdd.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default BatchDetailPage;
