
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  ChevronRight,
  Search,
  Cpu,
  HardDrive,
  MemoryStick,
  Fan,
  CircuitBoard,
  Server,
  Zap,
  Package,
  Settings,
  X,
  Save,
  Loader2,
  Eye,
  EyeOff,
  Info,
  ListFilter
} from "lucide-react";
import { BERYLL_ROUTE } from "src/utils/consts";

// ============================================================
// Типы
// ============================================================

interface ComponentCatalog {
  id: number;
  type: string;
  manufacturer: string | null;
  model: string;
  revision: string | null;
  partNumber: string | null;
  specifications: Record<string, any> | null;
  serialNumberPattern: string | null;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

type ComponentType =
  | "CPU" | "RAM" | "HDD" | "SSD" | "NVME" | "NIC"
  | "MOTHERBOARD" | "PSU" | "GPU" | "RAID" | "BMC"
  | "FAN" | "CHASSIS" | "BACKPLANE" | "CABLE" | "OTHER";

// ============================================================
// Константы
// ============================================================

const COMPONENT_TYPE_LABELS: Record<string, string> = {
  MOTHERBOARD: "Материнская плата",
  CPU: "Процессор",
  RAM: "Планки памяти",
  HDD: "HDD диски",
  SSD: "SSD диски",
  NVME: "NVMe накопители",
  NIC: "Сетевая карта",
  PSU: "Блок питания",
  GPU: "Видеокарта",
  RAID: "RAID-контроллер",
  BMC: "BMC",
  FAN: "Кулеры",
  BACKPLANE: "Backplane",
  CHASSIS: "Корпус",
  CABLE: "Кабели",
  OTHER: "Прочее"
};

const COMPONENT_TYPE_ICONS: Record<string, React.ReactNode> = {
  MOTHERBOARD: <CircuitBoard size={18} />,
  CPU: <Cpu size={18} />,
  RAM: <MemoryStick size={18} />,
  HDD: <HardDrive size={18} />,
  SSD: <HardDrive size={18} />,
  NVME: <HardDrive size={18} />,
  NIC: <Settings size={18} />,
  PSU: <Zap size={18} />,
  GPU: <Cpu size={18} />,
  RAID: <Server size={18} />,
  BMC: <CircuitBoard size={18} />,
  FAN: <Fan size={18} />,
  BACKPLANE: <Package size={18} />,
  CHASSIS: <Server size={18} />,
  CABLE: <Package size={18} />,
  OTHER: <Package size={18} />
};

const COMPONENT_TYPE_COLORS: Record<string, string> = {
  MOTHERBOARD: "bg-emerald-50 text-emerald-700 border-emerald-200",
  CPU: "bg-blue-50 text-blue-700 border-blue-200",
  RAM: "bg-violet-50 text-violet-700 border-violet-200",
  HDD: "bg-amber-50 text-amber-700 border-amber-200",
  SSD: "bg-orange-50 text-orange-700 border-orange-200",
  NVME: "bg-red-50 text-red-700 border-red-200",
  NIC: "bg-cyan-50 text-cyan-700 border-cyan-200",
  PSU: "bg-yellow-50 text-yellow-700 border-yellow-200",
  GPU: "bg-pink-50 text-pink-700 border-pink-200",
  RAID: "bg-indigo-50 text-indigo-700 border-indigo-200",
  BMC: "bg-teal-50 text-teal-700 border-teal-200",
  FAN: "bg-sky-50 text-sky-700 border-sky-200",
  BACKPLANE: "bg-lime-50 text-lime-700 border-lime-200",
  CHASSIS: "bg-stone-50 text-stone-700 border-stone-200",
  CABLE: "bg-gray-50 text-gray-700 border-gray-200",
  OTHER: "bg-slate-50 text-slate-700 border-slate-200"
};

// Порядок отображения типов (по приоритету VegmanS220v8)
const TYPE_ORDER: string[] = [
  "MOTHERBOARD", "CPU", "RAM", "SSD", "HDD", "NVME",
  "NIC", "RAID", "BMC", "PSU", "FAN", "BACKPLANE",
  "GPU", "CHASSIS", "CABLE", "OTHER"
];

const ALL_TYPES: ComponentType[] = [
  "CPU", "RAM", "HDD", "SSD", "NVME", "NIC",
  "MOTHERBOARD", "PSU", "GPU", "RAID", "BMC",
  "FAN", "CHASSIS", "BACKPLANE", "CABLE", "OTHER"
];

// ============================================================
// API — каталог комплектующих
// Роуты из beryllRouter.js → /api/beryll/catalog
// ============================================================

import { $authHost } from "src/api/index";

const catalogApi = {
  // GET /api/beryll/catalog
  getAll: async (): Promise<ComponentCatalog[]> => {
    const { data } = await $authHost.get("api/beryll/catalog");
    return data;
  },

  // POST /api/beryll/catalog
  create: async (entry: Partial<ComponentCatalog>): Promise<{ catalog: ComponentCatalog; created: boolean }> => {
    const { data } = await $authHost.post("api/beryll/catalog", entry);
    return data;
  },

  // PUT /api/beryll/catalog/:id
  update: async (id: number, entry: Partial<ComponentCatalog>): Promise<ComponentCatalog> => {
    const { data } = await $authHost.put(`api/beryll/catalog/${id}`, entry);
    return data;
  },

  // DELETE /api/beryll/catalog/:id (CatalogExtendedController)
  delete: async (id: number): Promise<void> => {
    await $authHost.delete(`api/beryll/catalog/${id}`);
  }
};

// ============================================================
// Компонент: Модальное окно
// ============================================================

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, maxWidth = "max-w-lg" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className={`relative bg-white rounded-2xl shadow-2xl w-full ${maxWidth} max-h-[90vh] overflow-hidden`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-indigo-50 to-purple-50">
          <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/60 transition text-gray-500 hover:text-gray-700"
          >
            <X size={18} />
          </button>
        </div>
        {/* Content */}
        <div className="overflow-y-auto max-h-[calc(90vh-70px)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Компонент: Форма добавления/редактирования
// ============================================================

interface CatalogFormData {
  type: string;
  manufacturer: string;
  model: string;
  revision: string;
  partNumber: string;
  notes: string;
  specifications: string; // JSON строка
}

const emptyCatalogForm: CatalogFormData = {
  type: "",
  manufacturer: "",
  model: "",
  revision: "",
  partNumber: "",
  notes: "",
  specifications: "{}"
};

interface CatalogFormProps {
  initialData?: CatalogFormData;
  presetType?: string;
  onSubmit: (data: CatalogFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  loading: boolean;
}

const CatalogForm: React.FC<CatalogFormProps> = ({
  initialData,
  presetType,
  onSubmit,
  onCancel,
  submitLabel,
  loading
}) => {
  const [form, setForm] = useState<CatalogFormData>(
    initialData || { ...emptyCatalogForm, type: presetType || "" }
  );
  const [showSpecs, setShowSpecs] = useState(false);

  const handleChange = (field: keyof CatalogFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.type) {
      toast.error("Выберите тип комплектующего");
      return;
    }
    if (!form.model) {
      toast.error("Укажите модель");
      return;
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      {/* Тип */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">
          Тип комплектующего <span className="text-red-500">*</span>
        </label>
        <select
          value={form.type}
          onChange={(e) => handleChange("type", e.target.value)}
          disabled={!!presetType}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">— Выберите тип —</option>
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {COMPONENT_TYPE_LABELS[t] || t}
            </option>
          ))}
        </select>
      </div>

      {/* Производитель + Модель */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Производитель</label>
          <input
            type="text"
            value={form.manufacturer}
            onChange={(e) => handleChange("manufacturer", e.target.value)}
            placeholder="Samsung, Intel, Yadro..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Модель <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => handleChange("model", e.target.value)}
            placeholder="Модель / артикул"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
        </div>
      </div>

      {/* Ревизия + Part Number */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Ревизия</label>
          <input
            type="text"
            value={form.revision}
            onChange={(e) => handleChange("revision", e.target.value)}
            placeholder="Rev.20, 2245, 1E1-..."
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Part Number</label>
          <input
            type="text"
            value={form.partNumber}
            onChange={(e) => handleChange("partNumber", e.target.value)}
            placeholder="Артикул производителя"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition"
          />
        </div>
      </div>

      {/* Заметки */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">Заметки</label>
        <textarea
          value={form.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          placeholder="Дополнительная информация..."
          rows={2}
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition resize-none"
        />
      </div>

      {/* Спецификации (скрываемый блок) */}
      <div>
        <button
          type="button"
          onClick={() => setShowSpecs(!showSpecs)}
          className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-indigo-600 transition"
        >
          {showSpecs ? <EyeOff size={14} /> : <Eye size={14} />}
          {showSpecs ? "Скрыть спецификации" : "Показать спецификации (JSON)"}
        </button>
        {showSpecs && (
          <textarea
            value={form.specifications}
            onChange={(e) => handleChange("specifications", e.target.value)}
            rows={4}
            className="w-full mt-2 px-3 py-2.5 border border-gray-200 rounded-xl text-xs font-mono focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 transition resize-none bg-gray-50"
          />
        )}
      </div>

      {/* Кнопки */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
        >
          Отмена
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-md hover:shadow-lg transition disabled:opacity-50"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {submitLabel}
        </button>
      </div>
    </form>
  );
};

// ============================================================
// Компонент: Карточка ревизии
// ============================================================

interface RevisionCardProps {
  entry: ComponentCatalog;
  onEdit: (entry: ComponentCatalog) => void;
  onDelete: (entry: ComponentCatalog) => void;
}

const RevisionCard: React.FC<RevisionCardProps> = ({ entry, onEdit, onDelete }) => {
  const specs = entry.specifications || {};
  const specKeys = Object.keys(specs).filter(
    (k) => !["serverModel", "variants"].includes(k)
  );

  return (
    <div className="group relative bg-white border border-gray-100 rounded-xl p-4 hover:border-indigo-200 hover:shadow-sm transition-all duration-200">
      {/* Основная инфо */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm text-gray-800 truncate">
              {entry.manufacturer ? `${entry.manufacturer} ` : ""}
              {entry.model}
            </span>
            {entry.revision && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">
                rev. {entry.revision}
              </span>
            )}
          </div>

          {/* Part Number */}
          {entry.partNumber && (
            <div className="mt-1 text-xs text-gray-400">
              P/N: {entry.partNumber}
            </div>
          )}

          {/* Спецификации */}
          {specKeys.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {specKeys.slice(0, 4).map((key) => (
                <span
                  key={key}
                  className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-gray-50 text-gray-600 border border-gray-100"
                >
                  {key}: {String(specs[key])}
                </span>
              ))}
              {specKeys.length > 4 && (
                <span className="text-xs text-gray-400">+{specKeys.length - 4}</span>
              )}
            </div>
          )}

          {/* Заметки */}
          {entry.notes && (
            <div className="mt-1.5 text-xs text-gray-400 truncate" title={entry.notes}>
              {entry.notes}
            </div>
          )}
        </div>

        {/* Кнопки */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(entry)}
            className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition"
            title="Редактировать"
          >
            <Pencil size={14} />
          </button>
          <button
            onClick={() => onDelete(entry)}
            className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition"
            title="Деактивировать"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Компонент: Секция типа комплектующего
// ============================================================

interface TypeSectionProps {
  type: string;
  entries: ComponentCatalog[];
  isExpanded: boolean;
  onToggle: () => void;
  onAddRevision: (type: string) => void;
  onEdit: (entry: ComponentCatalog) => void;
  onDelete: (entry: ComponentCatalog) => void;
}

const TypeSection: React.FC<TypeSectionProps> = ({
  type,
  entries,
  isExpanded,
  onToggle,
  onAddRevision,
  onEdit,
  onDelete
}) => {
  const label = COMPONENT_TYPE_LABELS[type] || type;
  const icon = COMPONENT_TYPE_ICONS[type] || <Package size={18} />;
  const colorClass = COMPONENT_TYPE_COLORS[type] || COMPONENT_TYPE_COLORS.OTHER;

  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm hover:shadow-md transition-shadow duration-200">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className={`flex items-center justify-center w-9 h-9 rounded-xl border ${colorClass}`}>
            {icon}
          </div>
          <div className="text-left">
            <div className="font-semibold text-gray-800">{label}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              {entries.length} {entries.length === 1 ? "ревизия" : entries.length < 5 ? "ревизии" : "ревизий"}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Быстрые бейджи ревизий */}
          <div className="hidden sm:flex items-center gap-1 mr-2">
            {entries.slice(0, 5).map((e) => (
              <span
                key={e.id}
                className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-gray-100 text-gray-500 max-w-[80px] truncate"
                title={`${e.manufacturer || ""} ${e.model} ${e.revision ? `(${e.revision})` : ""}`}
              >
                {e.revision || e.model.slice(0, 12)}
              </span>
            ))}
            {entries.length > 5 && (
              <span className="text-[10px] text-gray-400">+{entries.length - 5}</span>
            )}
          </div>
          {isExpanded ? (
            <ChevronDown size={18} className="text-gray-400" />
          ) : (
            <ChevronRight size={18} className="text-gray-400" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="border-t border-gray-100 px-5 pb-4 pt-3">
          {/* Кнопка добавления */}
          <div className="mb-3">
            <button
              onClick={() => onAddRevision(type)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition"
            >
              <Plus size={14} />
              Добавить ревизию
            </button>
          </div>

          {/* Список ревизий */}
          <div className="grid gap-2">
            {entries.map((entry) => (
              <RevisionCard
                key={entry.id}
                entry={entry}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>

          {entries.length === 0 && (
            <div className="text-center py-6 text-sm text-gray-400">
              Нет записей. Добавьте первую ревизию.
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================================
// Главная страница
// ============================================================

const ComponentRevisionsPage: React.FC = () => {
  const navigate = useNavigate();

  // Данные
  const [catalog, setCatalog] = useState<ComponentCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // UI состояние
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("");

  // Модальные окна
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ComponentCatalog | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<ComponentCatalog | null>(null);
  const [presetType, setPresetType] = useState<string>("");

  // ============================================================
  // Загрузка данных
  // ============================================================

  const loadCatalog = useCallback(async () => {
    try {
      setLoading(true);
      const data = await catalogApi.getAll();
      setCatalog(data.filter((d) => d.isActive));
    } catch (error: any) {
      toast.error("Ошибка загрузки каталога");
      console.error("loadCatalog error:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCatalog();
  }, [loadCatalog]);

  // ============================================================
  // Группировка и фильтрация
  // ============================================================

  const grouped = useMemo(() => {
    let filtered = catalog;

    // Поиск
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (c) =>
          (c.manufacturer || "").toLowerCase().includes(q) ||
          c.model.toLowerCase().includes(q) ||
          (c.revision || "").toLowerCase().includes(q) ||
          (c.partNumber || "").toLowerCase().includes(q) ||
          (c.notes || "").toLowerCase().includes(q)
      );
    }

    // Фильтр по типу
    if (filterType) {
      filtered = filtered.filter((c) => c.type === filterType);
    }

    // Группируем
    const map = new Map<string, ComponentCatalog[]>();
    for (const entry of filtered) {
      const list = map.get(entry.type) || [];
      list.push(entry);
      map.set(entry.type, list);
    }

    // Сортируем по TYPE_ORDER
    const result: Array<{ type: string; entries: ComponentCatalog[] }> = [];
    for (const type of TYPE_ORDER) {
      const entries = map.get(type);
      if (entries && entries.length > 0) {
        result.push({ type, entries });
      }
    }
    // Добавляем типы, которых нет в TYPE_ORDER
    for (const [type, entries] of map) {
      if (!TYPE_ORDER.includes(type)) {
        result.push({ type, entries });
      }
    }

    return result;
  }, [catalog, searchQuery, filterType]);

  // Уникальные типы для фильтра
  const availableTypes = useMemo(() => {
    return [...new Set(catalog.map((c) => c.type))].sort();
  }, [catalog]);

  // ============================================================
  // Обработчики
  // ============================================================

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  const expandAll = () => {
    setExpandedTypes(new Set(grouped.map((g) => g.type)));
  };

  const collapseAll = () => {
    setExpandedTypes(new Set());
  };

  // Добавление
  const handleAddRevision = (type: string) => {
    setPresetType(type);
    setShowCreateModal(true);
  };

  const handleCreate = async (formData: CatalogFormData) => {
    setSaving(true);
    try {
      let specs = {};
      try {
        specs = JSON.parse(formData.specifications || "{}");
      } catch {
        // invalid JSON — игнорируем
      }

      const { created } = await catalogApi.create({
        type: formData.type as ComponentType,
        manufacturer: formData.manufacturer || null,
        model: formData.model,
        revision: formData.revision || null,
        partNumber: formData.partNumber || null,
        notes: formData.notes || null,
        specifications: specs
      });

      if (created) {
        toast.success("Ревизия добавлена");
      } else {
        toast.success("Запись уже существует, обновлена");
      }

      setShowCreateModal(false);
      setPresetType("");
      await loadCatalog();

      // Раскрываем секцию нового типа
      setExpandedTypes((prev) => new Set([...prev, formData.type]));
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка создания");
    } finally {
      setSaving(false);
    }
  };

  // Редактирование
  const handleEdit = (entry: ComponentCatalog) => {
    setEditingEntry(entry);
    setShowEditModal(true);
  };

  const handleUpdate = async (formData: CatalogFormData) => {
    if (!editingEntry) return;
    setSaving(true);
    try {
      let specs = {};
      try {
        specs = JSON.parse(formData.specifications || "{}");
      } catch {
        // invalid JSON
      }

      await catalogApi.update(editingEntry.id, {
        type: formData.type as ComponentType,
        manufacturer: formData.manufacturer || null,
        model: formData.model,
        revision: formData.revision || null,
        partNumber: formData.partNumber || null,
        notes: formData.notes || null,
        specifications: specs
      });

      toast.success("Запись обновлена");
      setShowEditModal(false);
      setEditingEntry(null);
      await loadCatalog();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка обновления");
    } finally {
      setSaving(false);
    }
  };

  // Удаление (деактивация)
  const handleDeleteClick = (entry: ComponentCatalog) => {
    setDeletingEntry(entry);
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingEntry) return;
    setSaving(true);
    try {
      await catalogApi.delete(deletingEntry.id);
      toast.success("Запись деактивирована");
      setShowDeleteConfirm(false);
      setDeletingEntry(null);
      await loadCatalog();
    } catch (error: any) {
      // Если DELETE эндпоинт ещё не добавлен, делаем через update isActive: false
      try {
        await catalogApi.update(deletingEntry.id, { isActive: false } as any);
        toast.success("Запись деактивирована");
        setShowDeleteConfirm(false);
        setDeletingEntry(null);
        await loadCatalog();
      } catch (err2: any) {
        toast.error(err2.response?.data?.message || "Ошибка удаления");
      }
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // Рендер
  // ============================================================

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-indigo-50/30">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(BERYLL_ROUTE)}
                className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
              >
                <ArrowLeft size={20} />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gray-900">
                  Ревизии комплектующих
                </h1>
                <p className="text-xs text-gray-400">
                  VegmanS220v8 — справочник моделей и ревизий
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setPresetType("");
                setShowCreateModal(true);
              }}
              className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 rounded-xl shadow-md hover:shadow-lg transition"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">Новое комплектующее</span>
            </button>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          {/* Поиск */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по модели, производителю, ревизии..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition bg-white"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Фильтр по типу */}
          <div className="relative">
            <ListFilter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="pl-9 pr-8 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 transition bg-white appearance-none"
            >
              <option value="">Все типы</option>
              {availableTypes.map((t) => (
                <option key={t} value={t}>
                  {COMPONENT_TYPE_LABELS[t] || t}
                </option>
              ))}
            </select>
          </div>

          {/* Свернуть/Развернуть */}
          <div className="flex gap-1">
            <button
              onClick={expandAll}
              className="px-3 py-2.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-xl transition"
              title="Развернуть всё"
            >
              Развернуть
            </button>
            <button
              onClick={collapseAll}
              className="px-3 py-2.5 text-xs text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 border border-gray-200 rounded-xl transition"
              title="Свернуть всё"
            >
              Свернуть
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="mt-3 flex items-center gap-4 text-xs text-gray-400">
          <span>
            Всего: <strong className="text-gray-600">{catalog.length}</strong> записей
          </span>
          <span>
            Типов: <strong className="text-gray-600">{availableTypes.length}</strong>
          </span>
          {searchQuery && (
            <span>
              Найдено: <strong className="text-indigo-600">
                {grouped.reduce((sum, g) => sum + g.entries.length, 0)}
              </strong>
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-12">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-indigo-400" />
            <span className="ml-3 text-gray-500">Загрузка каталога...</span>
          </div>
        ) : grouped.length === 0 ? (
          <div className="text-center py-20">
            <Package size={48} className="mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-600">
              {searchQuery || filterType
                ? "Ничего не найдено"
                : "Каталог пуст"
              }
            </h3>
            <p className="mt-1 text-sm text-gray-400">
              {searchQuery || filterType
                ? "Попробуйте изменить параметры поиска"
                : "Добавьте первое комплектующее"
              }
            </p>
            {!searchQuery && !filterType && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition"
              >
                <Plus size={16} />
                Добавить комплектующее
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {grouped.map(({ type, entries }) => (
              <TypeSection
                key={type}
                type={type}
                entries={entries}
                isExpanded={expandedTypes.has(type)}
                onToggle={() => toggleType(type)}
                onAddRevision={handleAddRevision}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
              />
            ))}
          </div>
        )}
      </div>

      {/* ============================================================ */}
      {/* Модальные окна */}
      {/* ============================================================ */}

      {/* Создание */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setPresetType("");
        }}
        title={presetType
          ? `Добавить ревизию — ${COMPONENT_TYPE_LABELS[presetType] || presetType}`
          : "Новое комплектующее"
        }
      >
        <CatalogForm
          presetType={presetType || undefined}
          onSubmit={handleCreate}
          onCancel={() => {
            setShowCreateModal(false);
            setPresetType("");
          }}
          submitLabel="Добавить"
          loading={saving}
        />
      </Modal>

      {/* Редактирование */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setEditingEntry(null);
        }}
        title="Редактирование"
      >
        {editingEntry && (
          <CatalogForm
            initialData={{
              type: editingEntry.type,
              manufacturer: editingEntry.manufacturer || "",
              model: editingEntry.model,
              revision: editingEntry.revision || "",
              partNumber: editingEntry.partNumber || "",
              notes: editingEntry.notes || "",
              specifications: JSON.stringify(editingEntry.specifications || {}, null, 2)
            }}
            onSubmit={handleUpdate}
            onCancel={() => {
              setShowEditModal(false);
              setEditingEntry(null);
            }}
            submitLabel="Сохранить"
            loading={saving}
          />
        )}
      </Modal>

      {/* Подтверждение удаления */}
      <Modal
        isOpen={showDeleteConfirm}
        onClose={() => {
          setShowDeleteConfirm(false);
          setDeletingEntry(null);
        }}
        title="Деактивировать запись?"
        maxWidth="max-w-sm"
      >
        <div className="p-6">
          {deletingEntry && (
            <>
              <div className="flex items-start gap-3 mb-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="text-sm text-gray-700">
                    Вы уверены, что хотите деактивировать запись?
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-900">
                    {deletingEntry.manufacturer ? `${deletingEntry.manufacturer} ` : ""}
                    {deletingEntry.model}
                    {deletingEntry.revision ? ` (rev. ${deletingEntry.revision})` : ""}
                  </p>
                  <p className="mt-1 text-xs text-gray-400">
                    Запись станет неактивной и не будет отображаться при добавлении комплектующих на сервер.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDeletingEntry(null);
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-xl transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-xl shadow transition disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                  Деактивировать
                </button>
              </div>
            </>
          )}
        </div>
      </Modal>

      {/* Подсказка */}
      <div className="fixed bottom-4 right-4 z-20">
        <div className="group relative">
          <button className="w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-indigo-500 hover:border-indigo-200 transition">
            <Info size={18} />
          </button>
          <div className="invisible group-hover:visible opacity-0 group-hover:opacity-100 absolute bottom-12 right-0 w-72 bg-white rounded-xl shadow-xl border border-gray-100 p-4 text-xs text-gray-500 transition-all duration-200">
            <p className="font-semibold text-gray-700 mb-1">Справочник ревизий</p>
            <p>Здесь управляются модели и ревизии комплектующих, которые доступны при добавлении компонентов на сервер.</p>
            <p className="mt-2">Данные из этого каталога используются в формах добавления комплектующих (модальное окно «Добавить комплектующее» на странице сервера).</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComponentRevisionsPage;