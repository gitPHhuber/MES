/**
 * ComponentInventoryPage.tsx - Страница управления инвентарём компонентов
 */

import React, { useState, useEffect, useCallback } from "react";
import {
  Package,
  Search,
  Plus,
  Filter,
  RefreshCw,
  HardDrive,
  Cpu,
  MemoryStick,
  Server,
  Zap,
  Network,
  AlertCircle,
  ChevronRight,
  Download,
  Upload,
  Clock
} from "lucide-react";
import toast from "react-hot-toast";
import {
  inventoryApi,
  ComponentInventory,
  ComponentCatalog,
  InventoryStatus,
  ComponentCondition
} from "../../api/beryll/beryllExtendedApi";

const STATUS_COLORS: Record<InventoryStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  RESERVED: "bg-yellow-100 text-yellow-800",
  IN_USE: "bg-blue-100 text-blue-800",
  IN_REPAIR: "bg-purple-100 text-purple-800",
  DEFECTIVE: "bg-red-100 text-red-800",
  SCRAPPED: "bg-gray-100 text-gray-800",
  RETURNED: "bg-cyan-100 text-cyan-800"
};

const STATUS_LABELS: Record<InventoryStatus, string> = {
  AVAILABLE: "Доступен",
  RESERVED: "Зарезервирован",
  IN_USE: "Установлен",
  IN_REPAIR: "В ремонте",
  DEFECTIVE: "Дефектный",
  SCRAPPED: "Списан",
  RETURNED: "Возвращён"
};

const CONDITION_LABELS: Record<ComponentCondition, string> = {
  NEW: "Новый",
  REFURBISHED: "Восстановленный",
  USED: "Б/У",
  DAMAGED: "Повреждённый"
};

const TYPE_ICONS: Record<string, React.ComponentType<any>> = {
  HDD: HardDrive,
  SSD: HardDrive,
  RAM: MemoryStick,
  CPU: Cpu,
  MOTHERBOARD: Server,
  PSU: Zap,
  NIC: Network
};

const ComponentInventoryPage: React.FC = () => {
  const [components, setComponents] = useState<ComponentInventory[]>([]);
  const [catalog, setCatalog] = useState<ComponentCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Фильтры
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<InventoryStatus | "">("");
  const [conditionFilter, setConditionFilter] = useState<ComponentCondition | "">("");
  const [showWarrantyExpiring, setShowWarrantyExpiring] = useState(false);

  // Пагинация
  const [page, setPage] = useState(0);
  const [limit] = useState(25);

  // Модальные окна
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedComponent, setSelectedComponent] = useState<ComponentInventory | null>(null);

  // Статистика
  const [stats, setStats] = useState<any>(null);

  // Типы компонентов из справочника
  const componentTypes = [...new Set(catalog.map(c => c.type))].sort();

  // Загрузка данных
  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await inventoryApi.getAll({
        search: search || undefined,
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        condition: conditionFilter || undefined,
        warrantyExpired: showWarrantyExpiring || undefined,
        limit,
        offset: page * limit
      });

      setComponents(response.data.rows);
      setTotalCount(response.data.count);
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, statusFilter, conditionFilter, showWarrantyExpiring, page, limit]);

  const loadCatalog = async () => {
    try {
      const response = await inventoryApi.getCatalog();
      setCatalog(response.data);
    } catch (error) {
      console.error("Error loading catalog:", error);
    }
  };

  const loadStats = async () => {
    try {
      const response = await inventoryApi.getStats();
      setStats(response.data);
    } catch (error) {
      console.error("Error loading stats:", error);
    }
  };

  useEffect(() => {
    loadCatalog();
    loadStats();
  }, []);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // Сброс фильтров
  const resetFilters = () => {
    setSearch("");
    setTypeFilter("");
    setStatusFilter("");
    setConditionFilter("");
    setShowWarrantyExpiring(false);
    setPage(0);
  };

  // Форматирование
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU");
  };

  const isWarrantyExpiring = (comp: ComponentInventory): boolean => {
    if (!comp.warrantyExpires) return false;
    const expiryDate = new Date(comp.warrantyExpires);
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return expiryDate <= thirtyDaysFromNow && expiryDate > new Date();
  };

  const isWarrantyExpired = (comp: ComponentInventory): boolean => {
    if (!comp.warrantyExpires) return false;
    return new Date(comp.warrantyExpires) < new Date();
  };

  const getTypeIcon = (type: string) => {
    const Icon = TYPE_ICONS[type] || Package;
    return <Icon className="w-4 h-4" />;
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Package className="w-7 h-7 text-blue-500" />
            Инвентарь компонентов
          </h1>
          <p className="text-gray-500 mt-1">
            Управление запасными частями и компонентами серверов
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Добавить
          </button>
        </div>
      </div>

      {/* Статистика */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Всего</div>
            <div className="text-2xl font-bold text-gray-900">{stats.totals?.total || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Доступно</div>
            <div className="text-2xl font-bold text-green-600">{stats.totals?.available || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Установлено</div>
            <div className="text-2xl font-bold text-blue-600">{stats.totals?.inUse || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">В ремонте</div>
            <div className="text-2xl font-bold text-purple-600">{stats.totals?.inRepair || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500">Дефектные</div>
            <div className="text-2xl font-bold text-red-600">{stats.totals?.defective || 0}</div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="text-sm text-gray-500 flex items-center gap-1">
              <Clock className="w-4 h-4" />
              Гарантия истекает
            </div>
            <div className="text-2xl font-bold text-orange-600">{stats.warrantyExpiringSoon || 0}</div>
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
                placeholder="Поиск по серийному номеру, модели..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все типы</option>
            {componentTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as InventoryStatus | ""); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все статусы</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <select
            value={conditionFilter}
            onChange={(e) => { setConditionFilter(e.target.value as ComponentCondition | ""); setPage(0); }}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Все состояния</option>
            {Object.entries(CONDITION_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showWarrantyExpiring}
              onChange={(e) => { setShowWarrantyExpiring(e.target.checked); setPage(0); }}
              className="w-4 h-4 text-orange-600 rounded"
            />
            <span className="text-sm text-gray-700">Гарантия истекает</span>
          </label>

          <button
            onClick={resetFilters}
            className="px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Filter className="w-5 h-5" />
          </button>

          <button
            onClick={loadComponents}
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
                Тип
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                S/N (Ядро)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                S/N (Произв.)
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Модель
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Состояние
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Локация
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Гарантия
              </th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Загрузка...
                </td>
              </tr>
            ) : components.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                  Компоненты не найдены
                </td>
              </tr>
            ) : (
              components.map((comp) => (
                <tr
                  key={comp.id}
                  className={`hover:bg-gray-50 cursor-pointer ${
                    isWarrantyExpired(comp) ? "bg-red-50" :
                    isWarrantyExpiring(comp) ? "bg-orange-50" : ""
                  }`}
                  onClick={() => setSelectedComponent(comp)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {getTypeIcon(comp.type)}
                      <span className="font-medium">{comp.type}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {comp.serialNumberYadro || "—"}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">
                    {comp.serialNumber}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-sm">
                      {comp.manufacturer && <span className="text-gray-500">{comp.manufacturer} </span>}
                      {comp.model || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[comp.status]}`}>
                      {STATUS_LABELS[comp.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {CONDITION_LABELS[comp.condition]}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {comp.location || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {comp.warrantyExpires ? (
                      <div className={`flex items-center gap-1 text-sm ${
                        isWarrantyExpired(comp) ? "text-red-600" :
                        isWarrantyExpiring(comp) ? "text-orange-600" : "text-gray-500"
                      }`}>
                        {(isWarrantyExpired(comp) || isWarrantyExpiring(comp)) && (
                          <AlertCircle className="w-4 h-4" />
                        )}
                        {formatDate(comp.warrantyExpires)}
                      </div>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => { e.stopPropagation(); setSelectedComponent(comp); }}
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

      {/* Модальное окно добавления */}
      {showAddModal && (
        <AddComponentModal
          catalog={catalog}
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            loadComponents();
            loadStats();
          }}
        />
      )}

      {/* Детали компонента */}
      {selectedComponent && (
        <ComponentDetails
          component={selectedComponent}
          onClose={() => setSelectedComponent(null)}
          onUpdate={() => {
            loadComponents();
            loadStats();
          }}
        />
      )}
    </div>
  );
};

// ============================================
// Модальное окно добавления компонента
// ============================================

interface AddComponentModalProps {
  catalog: ComponentCatalog[];
  onClose: () => void;
  onSuccess: () => void;
}

const AddComponentModal: React.FC<AddComponentModalProps> = ({ catalog, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "",
    serialNumber: "",
    serialNumberYadro: "",
    manufacturer: "",
    model: "",
    condition: "NEW" as ComponentCondition,
    location: "",
    purchaseDate: "",
    warrantyExpires: "",
    notes: ""
  });

  const componentTypes = [...new Set(catalog.map(c => c.type))].sort();
  const filteredCatalog = formData.type
    ? catalog.filter(c => c.type === formData.type)
    : [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.type || !formData.serialNumber) {
      toast.error("Тип и серийный номер обязательны");
      return;
    }

    setLoading(true);
    try {
      await inventoryApi.create({
        type: formData.type,
        serialNumber: formData.serialNumber,
        serialNumberYadro: formData.serialNumberYadro || undefined,
        manufacturer: formData.manufacturer || undefined,
        model: formData.model || undefined,
        condition: formData.condition,
        location: formData.location || undefined,
        purchaseDate: formData.purchaseDate || undefined,
        warrantyExpires: formData.warrantyExpires || undefined,
        notes: formData.notes || undefined
      });

      toast.success("Компонент добавлен");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка добавления");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-semibold">Добавить компонент</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Тип <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                required
              >
                <option value="">Выберите тип</option>
                {componentTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Состояние
              </label>
              <select
                value={formData.condition}
                onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value as ComponentCondition }))}
                className="w-full px-3 py-2 border rounded-lg"
              >
                {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S/N (Производитель) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumber: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg font-mono"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S/N (Ядро)
              </label>
              <input
                type="text"
                value={formData.serialNumberYadro}
                onChange={(e) => setFormData(prev => ({ ...prev, serialNumberYadro: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Производитель
              </label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => setFormData(prev => ({ ...prev, manufacturer: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                list="manufacturers"
              />
              <datalist id="manufacturers">
                {[...new Set(filteredCatalog.map(c => c.manufacturer).filter(Boolean))].map(m => (
                  <option key={m} value={m!} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Модель
              </label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
                list="models"
              />
              <datalist id="models">
                {filteredCatalog.map(c => (
                  <option key={c.id} value={c.model} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Локация
            </label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
              className="w-full px-3 py-2 border rounded-lg"
              placeholder="Склад, стеллаж..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Дата закупки
              </label>
              <input
                type="date"
                value={formData.purchaseDate}
                onChange={(e) => setFormData(prev => ({ ...prev, purchaseDate: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Гарантия до
              </label>
              <input
                type="date"
                value={formData.warrantyExpires}
                onChange={(e) => setFormData(prev => ({ ...prev, warrantyExpires: e.target.value }))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечания
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </form>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? "Сохранение..." : "Добавить"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// Детали компонента
// ============================================

interface ComponentDetailsProps {
  component: ComponentInventory;
  onClose: () => void;
  onUpdate: () => void;
}

const ComponentDetails: React.FC<ComponentDetailsProps> = ({ component, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    loadHistory();
  }, [component.id]);

  const loadHistory = async () => {
    try {
      const response = await inventoryApi.getHistory(component.id);
      setHistory(response.data);
    } catch (error) {
      console.error("Error loading history:", error);
    }
  };

  const handleScrap = async () => {
    const reason = prompt("Укажите причину списания:");
    if (!reason) return;

    setLoading(true);
    try {
      await inventoryApi.scrap(component.id, reason);
      toast.success("Компонент списан");
      onUpdate();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLocation = async () => {
    const location = prompt("Новая локация:", component.location || "");
    if (location === null) return;

    setLoading(true);
    try {
      await inventoryApi.updateLocation(component.id, location);
      toast.success("Локация обновлена");
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">{component.type}</h2>
            <p className="text-sm text-gray-500 font-mono">{component.serialNumber}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <div className="text-sm text-gray-500">S/N (Ядро)</div>
              <div className="font-mono">{component.serialNumberYadro || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Статус</div>
              <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[component.status]}`}>
                {STATUS_LABELS[component.status]}
              </span>
            </div>
            <div>
              <div className="text-sm text-gray-500">Производитель</div>
              <div>{component.manufacturer || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Модель</div>
              <div>{component.model || "—"}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Состояние</div>
              <div>{CONDITION_LABELS[component.condition]}</div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Локация</div>
              <div>{component.location || "—"}</div>
            </div>
            {component.currentServer && (
              <div className="col-span-2">
                <div className="text-sm text-gray-500">Установлен в сервер</div>
                <div className="font-medium">{component.currentServer.apkSerialNumber} ({component.currentServer.hostname})</div>
              </div>
            )}
          </div>

          {/* История */}
          <div>
            <h3 className="font-medium mb-3">История операций</h3>
            {history.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {history.map((h, i) => (
                  <div key={i} className="p-3 bg-gray-50 rounded-lg text-sm">
                    <div className="flex justify-between">
                      <span className="font-medium">{h.action}</span>
                      <span className="text-gray-500">
                        {new Date(h.performedAt).toLocaleString("ru-RU")}
                      </span>
                    </div>
                    {h.notes && <div className="text-gray-600 mt-1">{h.notes}</div>}
                    {h.performedBy && (
                      <div className="text-gray-500 mt-1">
                        {h.performedBy.surname} {h.performedBy.name}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">История пуста</p>
            )}
          </div>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
          <div className="flex gap-2">
            {component.status === "AVAILABLE" && (
              <>
                <button
                  onClick={handleUpdateLocation}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                >
                  Изменить локацию
                </button>
                <button
                  onClick={handleScrap}
                  disabled={loading}
                  className="px-3 py-1 text-sm bg-red-100 text-red-700 rounded hover:bg-red-200"
                >
                  Списать
                </button>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg"
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComponentInventoryPage;
