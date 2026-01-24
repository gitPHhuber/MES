import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Package,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  Building2,
  Server,
  CheckCircle2,
  Clock,
  MoreVertical,
  Edit,
  Trash2,
  ExternalLink,
  XCircle
} from "lucide-react";
import {
  getBatches,
  createBatch,
  updateBatch,
  deleteBatch,
  BeryllBatch,
  BatchStatus,
  BATCH_STATUS_LABELS,
  BATCH_STATUS_COLORS,
  getStatusProgress,
  formatDate
} from "src/api/beryllApi";

export const BatchesTab: React.FC = () => {
  const navigate = useNavigate();
  
  const [batches, setBatches] = useState<BeryllBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BatchStatus | "ALL">("ALL");
  
  // Модальное окно создания/редактирования
  const [showModal, setShowModal] = useState(false);
  const [editingBatch, setEditingBatch] = useState<BeryllBatch | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    supplier: "",
    deliveryDate: "",
    expectedCount: 0,
    notes: ""
  });
  const [saving, setSaving] = useState(false);

  const loadBatches = async () => {
    setLoading(true);
    try {
      const data = await getBatches({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        search: search || undefined
      });
      setBatches(data);
    } catch (e) {
      console.error("Ошибка загрузки партий:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBatches();
  }, [statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => loadBatches(), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const openCreateModal = () => {
    setEditingBatch(null);
    setFormData({
      title: "",
      supplier: "",
      deliveryDate: new Date().toISOString().split("T")[0],
      expectedCount: 0,
      notes: ""
    });
    setShowModal(true);
  };

  const openEditModal = (batch: BeryllBatch) => {
    setEditingBatch(batch);
    setFormData({
      title: batch.title,
      supplier: batch.supplier || "",
      deliveryDate: batch.deliveryDate || "",
      expectedCount: batch.expectedCount || 0,
      notes: batch.notes || ""
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      alert("Введите название партии");
      return;
    }

    setSaving(true);
    try {
      if (editingBatch) {
        await updateBatch(editingBatch.id, formData);
      } else {
        await createBatch(formData);
      }
      setShowModal(false);
      loadBatches();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (batch: BeryllBatch) => {
    if (!confirm(`Удалить партию "${batch.title}"? Серверы будут отвязаны от партии.`)) {
      return;
    }

    try {
      await deleteBatch(batch.id);
      loadBatches();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка удаления");
    }
  };

  const handleStatusChange = async (batch: BeryllBatch, newStatus: BatchStatus) => {
    try {
      await updateBatch(batch.id, { status: newStatus });
      loadBatches();
    } catch (e: any) {
      alert(e.response?.data?.message || "Ошибка");
    }
  };

  return (
    <div className="space-y-4">
      {/* Заголовок и действия */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package className="w-5 h-5 text-gray-400" />
          <h2 className="text-lg font-semibold text-gray-800">Партии серверов</h2>
        </div>

        <div className="flex items-center gap-2">
          {/* Поиск */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск партий..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Фильтр по статусу */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as BatchStatus | "ALL")}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="ALL">Все статусы</option>
            {Object.entries(BATCH_STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          {/* Кнопка создания */}
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Создать партию
          </button>
        </div>
      </div>

      {/* Список партий */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <RefreshCw className="w-6 h-6 animate-spin text-indigo-500" />
        </div>
      ) : batches.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Партии не найдены</p>
          <button
            onClick={openCreateModal}
            className="mt-4 text-indigo-600 hover:underline"
          >
            Создать первую партию
          </button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const progress = getStatusProgress(batch.stats);
            const totalServers = batch.totalCount || 0;
            const doneServers = batch.stats?.DONE || 0;

            return (
              <div
                key={batch.id}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                {/* Шапка карточки */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-800 truncate">
                        {batch.title}
                      </h3>
                      {batch.supplier && (
                        <div className="flex items-center gap-1 mt-1 text-sm text-gray-500">
                          <Building2 className="w-3 h-3" />
                          {batch.supplier}
                        </div>
                      )}
                    </div>
                    
                    {/* Статус */}
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${BATCH_STATUS_COLORS[batch.status]}`}>
                      {BATCH_STATUS_LABELS[batch.status]}
                    </span>
                  </div>

                  {/* Дата поставки */}
                  {batch.deliveryDate && (
                    <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                      <Calendar className="w-3 h-3" />
                      {formatDate(batch.deliveryDate)}
                    </div>
                  )}
                </div>

                {/* Прогресс */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Прогресс</span>
                    <span className="text-sm font-medium text-gray-800">
                      {doneServers} / {totalServers}
                    </span>
                  </div>
                  
                  {/* Полоска прогресса */}
                  <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  {/* Статистика по статусам */}
                  {batch.stats && totalServers > 0 && (
                    <div className="flex gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1 text-gray-500">
                        <Clock className="w-3 h-3" />
                        {batch.stats.NEW || 0} новых
                      </div>
                      <div className="flex items-center gap-1 text-blue-600">
                        <RefreshCw className="w-3 h-3" />
                        {batch.stats.IN_WORK || 0} в работе
                      </div>
                      <div className="flex items-center gap-1 text-green-600">
                        <CheckCircle2 className="w-3 h-3" />
                        {batch.stats.DONE || 0} готово
                      </div>
                      {(batch.stats.DEFECT || 0) > 0 && (
                        <div className="flex items-center gap-1 text-red-600">
                          <XCircle className="w-3 h-3" />
                          {batch.stats.DEFECT} брак
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Действия */}
                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                  <button
                    onClick={() => navigate(`/beryll/batch/${batch.id}`)}
                    className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-700"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Открыть
                  </button>

                  <div className="flex items-center gap-2">
                    {batch.status === "ACTIVE" && (
                      <button
                        onClick={() => handleStatusChange(batch, "COMPLETED")}
                        className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="Завершить партию"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(batch)}
                      className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Редактировать"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(batch)}
                      className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Модальное окно создания/редактирования */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-800">
                {editingBatch ? "Редактирование партии" : "Создание партии"}
              </h3>
            </div>

            <div className="p-4 space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Название партии *
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Например: Поставка-2026-01-15"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Поставщик */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Поставщик
                </label>
                <input
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => setFormData({ ...formData, supplier: e.target.value })}
                  placeholder="ООО Вегман"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Дата поставки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Дата поставки
                </label>
                <input
                  type="date"
                  value={formData.deliveryDate}
                  onChange={(e) => setFormData({ ...formData, deliveryDate: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Ожидаемое количество */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ожидаемое кол-во серверов
                </label>
                <input
                  type="number"
                  value={formData.expectedCount}
                  onChange={(e) => setFormData({ ...formData, expectedCount: parseInt(e.target.value) || 0 })}
                  min="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>

              {/* Примечания */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечания
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                />
              </div>
            </div>

            <div className="p-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchesTab;
