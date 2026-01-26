import React, { useEffect, useState } from "react";
import { 
  Settings, 
  Plus, 
  Edit2, 
  Trash2, 
  X,
  Check,
  AlertTriangle,
  RefreshCw
} from "lucide-react";
import {
  fetchDefectCategories,
  createDefectCategory,
  updateDefectCategory,
  deleteDefectCategory
} from "src/api/defectApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import {
  DefectCategory,
  BoardType,
  BOARD_TYPE_SHORT,
  SEVERITY_LABELS,
  SEVERITY_COLORS
} from "src/types/DefectTypes";

const ALL_BOARD_TYPES: BoardType[] = ["FC", "ELRS_915", "ELRS_2_4", "CORAL_B", "SMARAGD"];

export const AdminDefectCategoriesPage: React.FC = () => {
  const [categories, setCategories] = useState<DefectCategory[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Фильтр
  const [filterType, setFilterType] = useState<BoardType | "">("");
  const [showInactive, setShowInactive] = useState(false);
  
  // Модалка
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DefectCategory | null>(null);
  
  // Форма
  const [formCode, setFormCode] = useState("");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formSeverity, setFormSeverity] = useState<"CRITICAL" | "MAJOR" | "MINOR">("MAJOR");
  const [formTypes, setFormTypes] = useState<BoardType[]>([]);
  const [formActive, setFormActive] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  // Загрузка
  const loadCategories = async () => {
    setLoading(true);
    try {
      const data = await fetchDefectCategories(undefined, !showInactive);
      setCategories(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [showInactive]);

  // Фильтрация
  const filteredCategories = filterType
    ? categories.filter(c => c.applicableTypes?.includes(filterType))
    : categories;

  // Открыть модалку создания
  const openCreate = () => {
    setEditingCategory(null);
    setFormCode("");
    setFormTitle("");
    setFormDescription("");
    setFormSeverity("MAJOR");
    setFormTypes([]);
    setFormActive(true);
    setError("");
    setRequestId(null);
    setShowModal(true);
  };

  // Открыть модалку редактирования
  const openEdit = (category: DefectCategory) => {
    setEditingCategory(category);
    setFormCode(category.code);
    setFormTitle(category.title);
    setFormDescription(category.description || "");
    setFormSeverity(category.severity);
    setFormTypes(category.applicableTypes || []);
    setFormActive(category.isActive);
    setError("");
    setRequestId(null);
    setShowModal(true);
  };

  // Сохранение
  const handleSave = async () => {
    if (!formCode.trim()) {
      setError("Введите код");
      return;
    }
    if (!formTitle.trim()) {
      setError("Введите название");
      return;
    }
    if (formTypes.length === 0) {
      setError("Выберите хотя бы один тип продукции");
      return;
    }
    
    setSaving(true);
    setError("");
    setRequestId(null);
    
    try {
      if (editingCategory) {
        await updateDefectCategory(editingCategory.id, {
          code: formCode.trim().toUpperCase(),
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          severity: formSeverity,
          applicableTypes: formTypes,
          isActive: formActive
        });
      } else {
        await createDefectCategory({
          code: formCode.trim().toUpperCase(),
          title: formTitle.trim(),
          description: formDescription.trim() || undefined,
          severity: formSeverity,
          applicableTypes: formTypes
        });
      }
      
      setShowModal(false);
      loadCategories();
    } catch (e: any) {
      setError(
        e.userMessage ?? e.response?.data?.message ?? "Ошибка при сохранении"
      );
      setRequestId(e.requestId ?? null);
    } finally {
      setSaving(false);
    }
  };

  // Удаление
  const handleDelete = async (id: number) => {
    if (!confirm("Удалить категорию? Если есть связанные дефекты — будет деактивирована.")) {
      return;
    }
    
    try {
      await deleteDefectCategory(id);
      loadCategories();
    } catch (e) {
      console.error(e);
    }
  };

  // Переключение типа в форме
  const toggleFormType = (type: BoardType) => {
    if (formTypes.includes(type)) {
      setFormTypes(formTypes.filter(t => t !== type));
    } else {
      setFormTypes([...formTypes, type]);
    }
  };

  // Выбрать все типы
  const selectAllTypes = () => {
    setFormTypes([...ALL_BOARD_TYPES]);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-purple-500 rounded-2xl shadow-lg shadow-purple-200 text-white">
              <Settings size={32} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-800">Категории дефектов</h1>
              <p className="text-gray-500 font-medium">Управление справочником категорий</p>
            </div>
          </div>
          
          <button
            onClick={openCreate}
            className="flex items-center gap-2 px-5 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-semibold shadow-lg shadow-purple-200 transition-all"
          >
            <Plus size={20} />
            Добавить категорию
          </button>
        </div>

        {/* Фильтры */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-4">
          <span className="text-sm text-gray-500 font-medium">Фильтры:</span>
          
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value as BoardType | "")}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
          >
            <option value="">Все типы</option>
            {ALL_BOARD_TYPES.map(type => (
              <option key={type} value={type}>{BOARD_TYPE_SHORT[type]}</option>
            ))}
          </select>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-purple-500"
            />
            <span className="text-sm text-gray-600">Показать неактивные</span>
          </label>
          
          <div className="flex-1"></div>
          
          <button
            onClick={loadCategories}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
          </button>
        </div>

        {/* Таблица */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Код</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Название</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Критичность</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Применимо к</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Статус</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase">Действия</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredCategories.map(category => (
                <tr 
                  key={category.id}
                  className={`hover:bg-gray-50 ${!category.isActive ? "opacity-50" : ""}`}
                >
                  <td className="px-4 py-3 font-mono text-sm text-gray-600">
                    {category.code}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{category.title}</div>
                    {category.description && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">
                        {category.description}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${SEVERITY_COLORS[category.severity]}`}>
                      {SEVERITY_LABELS[category.severity]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {category.applicableTypes?.map(type => (
                        <span 
                          key={type}
                          className="px-2 py-0.5 bg-gray-100 rounded text-xs"
                        >
                          {BOARD_TYPE_SHORT[type as BoardType]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {category.isActive ? (
                      <span className="flex items-center gap-1 text-green-600 text-sm">
                        <Check size={14} /> Активна
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-gray-400 text-sm">
                        <X size={14} /> Неактивна
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => openEdit(category)}
                      className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg mr-1"
                      title="Редактировать"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      title="Удалить"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">
                    <AlertTriangle className="mx-auto mb-2 text-gray-300" size={32} />
                    <p>Категории не найдены</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Модалка создания/редактирования */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            {/* Header */}
            <div className="bg-purple-500 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-lg font-bold">
                {editingCategory ? "Редактирование категории" : "Новая категория"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-white/20 rounded-lg transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Код *
                  </label>
                  <input
                    type="text"
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="SOLDER_DEFECT"
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl font-mono uppercase"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Критичность *
                  </label>
                  <select
                    value={formSeverity}
                    onChange={e => setFormSeverity(e.target.value as any)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                  >
                    <option value="CRITICAL">Критический</option>
                    <option value="MAJOR">Серьёзный</option>
                    <option value="MINOR">Незначительный</option>
                  </select>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Название *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  placeholder="Дефект пайки"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl"
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание
                </label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={2}
                  placeholder="Подробное описание..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl resize-none"
                />
              </div>

              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Применимо к *
                  </label>
                  <button
                    onClick={selectAllTypes}
                    className="text-xs text-purple-500 hover:text-purple-600"
                  >
                    Выбрать все
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {ALL_BOARD_TYPES.map(type => (
                    <button
                      key={type}
                      onClick={() => toggleFormType(type)}
                      className={`px-3 py-2 border-2 rounded-lg text-sm font-medium transition-all ${
                        formTypes.includes(type)
                          ? "border-purple-500 bg-purple-50 text-purple-700"
                          : "border-gray-200 text-gray-600 hover:border-gray-300"
                      }`}
                    >
                      {BOARD_TYPE_SHORT[type]}
                    </button>
                  ))}
                </div>
              </div>

              {editingCategory && (
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formActive}
                      onChange={e => setFormActive(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 text-purple-500"
                    />
                    <span className="text-sm text-gray-700">Категория активна</span>
                  </label>
                </div>
              )}

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                  <RequestIdNotice requestId={requestId} />
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Отмена
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white rounded-xl font-semibold"
                >
                  {saving ? "Сохранение..." : "Сохранить"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
