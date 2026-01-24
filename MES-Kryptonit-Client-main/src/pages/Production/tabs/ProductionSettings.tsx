/**
 * ProductionSettings.tsx - Справочники v2
 * 
 * Управление типами операций (OperationType)
 */

import React, { useState, useEffect, useContext } from "react";
import { 
    Plus, Edit2, Trash2, Save, X, Settings2,
    CheckCircle2, XCircle, GripVertical, Clock,
    AlertTriangle, Building2
} from "lucide-react";
import toast from "react-hot-toast";
import { Context } from "src/main";
import { observer } from "mobx-react-lite";

import {
    fetchOperationTypes,
    createOperationType,
    updateOperationType,
    deleteOperationType,
    OperationType
} from "src/api/productionApi";

import { fetchStructure } from "src/api/structureApi";

interface EditingOperation extends Partial<OperationType> {
    isNew?: boolean;
}

export const ProductionSettings: React.FC = observer(() => {
    const context = useContext(Context);
    const currentUser = context?.user?.user;
    
    // Проверка прав (recipe.manage)
    const canManage = currentUser?.role === 'SUPER_ADMIN' || 
                      currentUser?.role === 'Admin' ||
                      currentUser?.role === 'Technologist';

    // === DATA ===
    const [operations, setOperations] = useState<OperationType[]>([]);
    const [sections, setSections] = useState<Array<{ id: number; title: string }>>([]);
    const [loading, setLoading] = useState(true);
    
    // === UI STATE ===
    const [editingOp, setEditingOp] = useState<EditingOperation | null>(null);
    const [showInactive, setShowInactive] = useState(false);

    // === LOAD DATA ===
    useEffect(() => {
        loadData();
        loadSections();
    }, [showInactive]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchOperationTypes({ includeInactive: showInactive });
            setOperations(data);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    const loadSections = async () => {
        try {
            const structure = await fetchStructure();
            setSections(structure.sections || []);
        } catch (e) {
            console.error(e);
        }
    };

    // === ACTIONS ===
    const handleCreate = () => {
        setEditingOp({
            isNew: true,
            name: "",
            code: "",
            description: "",
            unit: "шт",
            normMinutes: undefined,
            sectionId: undefined,
            isActive: true,
            sortOrder: operations.length * 10
        });
    };

    const handleEdit = (op: OperationType) => {
        setEditingOp({ ...op });
    };

    const handleCancel = () => {
        setEditingOp(null);
    };

    const handleSave = async () => {
        if (!editingOp) return;
        
        if (!editingOp.name?.trim()) {
            toast.error("Укажите название операции");
            return;
        }

        try {
            if (editingOp.isNew) {
                await createOperationType({
                    name: editingOp.name,
                    code: editingOp.code || undefined,
                    description: editingOp.description || undefined,
                    unit: editingOp.unit || 'шт',
                    normMinutes: editingOp.normMinutes || undefined,
                    sectionId: editingOp.sectionId || undefined,
                    sortOrder: editingOp.sortOrder || 0
                });
                toast.success("Операция создана");
            } else {
                await updateOperationType(editingOp.id!, {
                    name: editingOp.name,
                    code: editingOp.code,
                    description: editingOp.description,
                    unit: editingOp.unit,
                    normMinutes: editingOp.normMinutes,
                    sectionId: editingOp.sectionId,
                    isActive: editingOp.isActive,
                    sortOrder: editingOp.sortOrder
                });
                toast.success("Сохранено");
            }
            
            setEditingOp(null);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка сохранения");
        }
    };

    const handleDelete = async (op: OperationType) => {
        if (!confirm(`Удалить операцию "${op.name}"?`)) return;
        
        try {
            const result = await deleteOperationType(op.id);
            
            if (result.deactivated) {
                toast.success("Операция деактивирована (есть связанные записи)");
            } else {
                toast.success("Операция удалена");
            }
            
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка удаления");
        }
    };

    const handleToggleActive = async (op: OperationType) => {
        try {
            await updateOperationType(op.id, { isActive: !op.isActive });
            toast.success(op.isActive ? "Деактивировано" : "Активировано");
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка");
        }
    };

    // === RENDER ===
    if (!canManage) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-amber-400" />
                <h3 className="text-lg font-bold text-gray-800 mb-2">Доступ ограничен</h3>
                <p className="text-gray-500">
                    Управление справочниками доступно только технологам и администраторам
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            
            {/* Заголовок */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex items-center justify-between">
                <div>
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <Settings2 size={20} className="text-indigo-500" />
                        Типы операций
                    </h2>
                    <p className="text-sm text-gray-500">
                        Справочник операций для учёта выработки
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={showInactive}
                            onChange={(e) => setShowInactive(e.target.checked)}
                            className="rounded border-gray-300"
                        />
                        Показать неактивные
                    </label>
                    
                    <button
                        onClick={handleCreate}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
                    >
                        <Plus size={18} />
                        Добавить
                    </button>
                </div>
            </div>

            {/* Форма редактирования */}
            {editingOp && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                    <h3 className="font-bold text-blue-800 mb-4">
                        {editingOp.isNew ? "Новая операция" : "Редактирование"}
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Название *</label>
                            <input
                                type="text"
                                value={editingOp.name || ""}
                                onChange={(e) => setEditingOp({ ...editingOp, name: e.target.value })}
                                placeholder="Калибровка"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Код (уникальный)</label>
                            <input
                                type="text"
                                value={editingOp.code || ""}
                                onChange={(e) => setEditingOp({ ...editingOp, code: e.target.value.toUpperCase() })}
                                placeholder="CALIB"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg font-mono"
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Единица измерения</label>
                            <select
                                value={editingOp.unit || "шт"}
                                onChange={(e) => setEditingOp({ ...editingOp, unit: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                <option value="шт">шт (штуки)</option>
                                <option value="м">м (метры)</option>
                                <option value="кг">кг (килограммы)</option>
                                <option value="л">л (литры)</option>
                                <option value="час">час (часы)</option>
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Норматив (минут на ед.)</label>
                            <input
                                type="number"
                                step="0.1"
                                value={editingOp.normMinutes || ""}
                                onChange={(e) => setEditingOp({ ...editingOp, normMinutes: Number(e.target.value) || undefined })}
                                placeholder="5.0"
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                        
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Участок (опционально)</label>
                            <select
                                value={editingOp.sectionId || ""}
                                onChange={(e) => setEditingOp({ ...editingOp, sectionId: Number(e.target.value) || undefined })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            >
                                <option value="">— Любой участок —</option>
                                {sections.map(s => (
                                    <option key={s.id} value={s.id}>{s.title}</option>
                                ))}
                            </select>
                        </div>
                        
                        <div>
                            <label className="text-sm text-gray-600 mb-1 block">Порядок сортировки</label>
                            <input
                                type="number"
                                value={editingOp.sortOrder || 0}
                                onChange={(e) => setEditingOp({ ...editingOp, sortOrder: Number(e.target.value) })}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg"
                            />
                        </div>
                        
                        <div className="md:col-span-2 lg:col-span-3">
                            <label className="text-sm text-gray-600 mb-1 block">Описание</label>
                            <textarea
                                value={editingOp.description || ""}
                                onChange={(e) => setEditingOp({ ...editingOp, description: e.target.value })}
                                placeholder="Подробное описание операции..."
                                rows={2}
                                className="w-full px-3 py-2 border border-gray-200 rounded-lg resize-none"
                            />
                        </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 mt-4">
                        <button
                            onClick={handleCancel}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg flex items-center gap-2"
                        >
                            <X size={18} />
                            Отмена
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2"
                        >
                            <Save size={18} />
                            Сохранить
                        </button>
                    </div>
                </div>
            )}

            {/* Список операций */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-500 w-10">#</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Название</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Код</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Ед. изм.</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Норматив</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-500">Участок</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500">Статус</th>
                            <th className="px-4 py-3 text-center font-medium text-gray-500 w-32">Действия</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                    <Clock size={24} className="mx-auto mb-2 animate-spin" />
                                    Загрузка...
                                </td>
                            </tr>
                        ) : operations.length === 0 ? (
                            <tr>
                                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                                    <Settings2 size={32} className="mx-auto mb-2 opacity-50" />
                                    <p>Нет операций</p>
                                    <button
                                        onClick={handleCreate}
                                        className="mt-2 text-emerald-600 hover:text-emerald-700"
                                    >
                                        Добавить первую
                                    </button>
                                </td>
                            </tr>
                        ) : (
                            operations.map((op, idx) => (
                                <tr 
                                    key={op.id}
                                    className={`hover:bg-gray-50 ${!op.isActive ? 'opacity-50' : ''}`}
                                >
                                    <td className="px-4 py-3 text-gray-400">
                                        {idx + 1}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-800">{op.name}</div>
                                        {op.description && (
                                            <div className="text-xs text-gray-500 truncate max-w-xs">
                                                {op.description}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {op.code ? (
                                            <span className="px-2 py-1 bg-gray-100 rounded font-mono text-xs">
                                                {op.code}
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {op.unit}
                                    </td>
                                    <td className="px-4 py-3 text-gray-600">
                                        {op.normMinutes ? (
                                            <span className="flex items-center gap-1">
                                                <Clock size={14} className="text-gray-400" />
                                                {op.normMinutes} мин
                                            </span>
                                        ) : (
                                            <span className="text-gray-300">—</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        {op.section ? (
                                            <span className="flex items-center gap-1 text-blue-600">
                                                <Building2 size={14} />
                                                {op.section.title}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">Любой</span>
                                        )}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleToggleActive(op)}
                                            className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                op.isActive 
                                                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                                                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                            }`}
                                        >
                                            {op.isActive ? (
                                                <>
                                                    <CheckCircle2 size={12} />
                                                    Активна
                                                </>
                                            ) : (
                                                <>
                                                    <XCircle size={12} />
                                                    Неактивна
                                                </>
                                            )}
                                        </button>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <div className="flex items-center justify-center gap-1">
                                            <button
                                                onClick={() => handleEdit(op)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition"
                                                title="Редактировать"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(op)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition"
                                                title="Удалить"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
});

export default ProductionSettings;
