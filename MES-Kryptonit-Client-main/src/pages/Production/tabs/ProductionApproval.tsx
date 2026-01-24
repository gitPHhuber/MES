/**
 * ProductionApproval.tsx - Подтверждение выработки v2
 * 
 * Групировка по дате, фильтрация по бригаде/участку
 * Отображение проекта, задачи, операции
 */

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
    CheckCircle2, XCircle, Clock, ChevronDown, ChevronRight,
    User, Calendar, Hash, Edit3, AlertTriangle, Filter,
    FolderKanban, Settings2, Users
} from "lucide-react";
import toast from "react-hot-toast";
import { Context } from "src/main";
import { observer } from "mobx-react-lite";

import {
    fetchPendingOutputs,
    approveOutputs,
    rejectOutputs,
    ProductionOutput,
    formatUserName,
    formatDate,
    formatShortDate
} from "src/api/productionApi";

import { fetchStructure } from "src/api/structureApi";

interface GroupedOutputs {
    date: string;
    outputs: ProductionOutput[];
    totalClaimed: number;
}

export const ProductionApproval: React.FC = observer(() => {
    const context = useContext(Context);
    const currentUser = context?.user?.user;

    // === DATA ===
    const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
    const [loading, setLoading] = useState(true);
    
    // === FILTERS ===
    const [teams, setTeams] = useState<Array<{ id: number; title: string }>>([]);
    const [sections, setSections] = useState<Array<{ id: number; title: string }>>([]);
    const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
    const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
    
    // === UI STATE ===
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
    const [expandedDates, setExpandedDates] = useState<Set<string>>(new Set());
    const [adjustments, setAdjustments] = useState<Record<number, number>>({});
    const [editingId, setEditingId] = useState<number | null>(null);
    const [rejectReason, setRejectReason] = useState("");
    const [showRejectModal, setShowRejectModal] = useState(false);

    // === LOAD DATA ===
    useEffect(() => {
        loadData();
        loadStructure();
    }, [filterTeamId, filterSectionId]);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchPendingOutputs({
                teamId: filterTeamId || undefined,
                sectionId: filterSectionId || undefined
            });
            setOutputs(data);
            
            // Разворачиваем все даты по умолчанию
            const dates = new Set(data.map(o => o.date));
            setExpandedDates(dates);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    const loadStructure = async () => {
        try {
            const structure = await fetchStructure();
            setSections(structure.sections || []);
            
            const allTeams: Array<{ id: number; title: string }> = [];
            structure.sections?.forEach((s: any) => {
                s.teams?.forEach((t: any) => {
                    allTeams.push({ id: t.id, title: `${t.title} (${s.title})` });
                });
            });
            setTeams(allTeams);
        } catch (e) {
            console.error(e);
        }
    };

    // === ГРУППИРОВКА ПО ДАТАМ ===
    const groupedOutputs = useMemo((): GroupedOutputs[] => {
        const map = new Map<string, ProductionOutput[]>();
        
        outputs.forEach(o => {
            const list = map.get(o.date) || [];
            list.push(o);
            map.set(o.date, list);
        });
        
        return Array.from(map.entries())
            .map(([date, list]) => ({
                date,
                outputs: list.sort((a, b) => (a.user?.surname || '').localeCompare(b.user?.surname || '')),
                totalClaimed: list.reduce((sum, o) => sum + o.claimedQty, 0)
            }))
            .sort((a, b) => b.date.localeCompare(a.date)); // Новые сверху
    }, [outputs]);

    // === SELECTION ===
    const toggleSelect = (id: number) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleSelectAll = (date: string, outputsForDate: ProductionOutput[]) => {
        const ids = outputsForDate.map(o => o.id);
        const allSelected = ids.every(id => selectedIds.has(id));
        
        const newSet = new Set(selectedIds);
        if (allSelected) {
            ids.forEach(id => newSet.delete(id));
        } else {
            ids.forEach(id => newSet.add(id));
        }
        setSelectedIds(newSet);
    };

    const toggleExpand = (date: string) => {
        const newSet = new Set(expandedDates);
        if (newSet.has(date)) {
            newSet.delete(date);
        } else {
            newSet.add(date);
        }
        setExpandedDates(newSet);
    };

    // === ACTIONS ===
    const handleApprove = async () => {
        if (selectedIds.size === 0) {
            toast.error("Выберите записи");
            return;
        }

        try {
            const result = await approveOutputs(
                Array.from(selectedIds),
                Object.keys(adjustments).length > 0 ? adjustments : undefined
            );
            
            const successCount = result.results.filter(r => !r.error).length;
            toast.success(`Подтверждено: ${successCount}`);
            
            setSelectedIds(new Set());
            setAdjustments({});
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка");
        }
    };

    const handleReject = async () => {
        if (selectedIds.size === 0) {
            toast.error("Выберите записи");
            return;
        }

        try {
            const result = await rejectOutputs(
                Array.from(selectedIds),
                rejectReason || undefined
            );
            
            const successCount = result.results.filter(r => !r.error).length;
            toast.success(`Отклонено: ${successCount}`);
            
            setSelectedIds(new Set());
            setRejectReason("");
            setShowRejectModal(false);
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка");
        }
    };

    const handleAdjustment = (id: number, value: number) => {
        setAdjustments(prev => ({
            ...prev,
            [id]: value
        }));
    };

    // === RENDER ===
    return (
        <div className="space-y-4">
            
            {/* Заголовок и фильтры */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Clock size={20} className="text-yellow-500" />
                            Ожидают подтверждения
                        </h2>
                        <p className="text-sm text-gray-500">
                            {outputs.length} записей на {groupedOutputs.length} дат
                        </p>
                    </div>
                    
                    {/* Фильтры */}
                    <div className="flex items-center gap-3">
                        <Filter size={16} className="text-gray-400" />
                        
                        <select
                            value={filterSectionId || ""}
                            onChange={(e) => {
                                setFilterSectionId(Number(e.target.value) || null);
                                setFilterTeamId(null);
                            }}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Все участки</option>
                            {sections.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filterTeamId || ""}
                            onChange={(e) => setFilterTeamId(Number(e.target.value) || null)}
                            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                        >
                            <option value="">Все бригады</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Панель действий */}
            {selectedIds.size > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                    <span className="text-emerald-800 font-medium">
                        Выбрано: {selectedIds.size}
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={handleApprove}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium flex items-center gap-2 transition"
                        >
                            <CheckCircle2 size={18} />
                            Подтвердить
                        </button>
                        <button
                            onClick={() => setShowRejectModal(true)}
                            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium flex items-center gap-2 transition"
                        >
                            <XCircle size={18} />
                            Отклонить
                        </button>
                    </div>
                </div>
            )}

            {/* Список по датам */}
            {loading ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                    <Clock size={40} className="mx-auto mb-2 animate-spin" />
                    Загрузка...
                </div>
            ) : groupedOutputs.length === 0 ? (
                <div className="bg-white rounded-xl p-8 text-center text-gray-400">
                    <CheckCircle2 size={48} className="mx-auto mb-3 text-emerald-300" />
                    <p className="text-lg font-medium">Нет записей для подтверждения</p>
                    <p className="text-sm">Все записи обработаны</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {groupedOutputs.map(group => (
                        <div key={group.date} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                            
                            {/* Заголовок группы */}
                            <div 
                                className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between cursor-pointer hover:bg-gray-100 transition"
                                onClick={() => toggleExpand(group.date)}
                            >
                                <div className="flex items-center gap-3">
                                    {expandedDates.has(group.date) 
                                        ? <ChevronDown size={20} className="text-gray-400" />
                                        : <ChevronRight size={20} className="text-gray-400" />
                                    }
                                    <Calendar size={16} className="text-gray-400" />
                                    <span className="font-bold text-gray-800">
                                        {formatDate(group.date)}
                                    </span>
                                    <span className="text-sm text-gray-500">
                                        ({group.outputs.length} записей)
                                    </span>
                                </div>
                                <div className="flex items-center gap-4">
                                    <span className="text-lg font-bold text-emerald-600">
                                        {group.totalClaimed} шт
                                    </span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleSelectAll(group.date, group.outputs);
                                        }}
                                        className="text-sm text-blue-600 hover:text-blue-800"
                                    >
                                        {group.outputs.every(o => selectedIds.has(o.id)) 
                                            ? "Снять все" 
                                            : "Выбрать все"
                                        }
                                    </button>
                                </div>
                            </div>

                            {/* Записи */}
                            {expandedDates.has(group.date) && (
                                <div className="divide-y divide-gray-50">
                                    {group.outputs.map(output => (
                                        <div 
                                            key={output.id}
                                            className={`px-4 py-3 flex items-center gap-4 hover:bg-gray-50 transition ${
                                                selectedIds.has(output.id) ? 'bg-emerald-50' : ''
                                            }`}
                                        >
                                            {/* Checkbox */}
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.has(output.id)}
                                                onChange={() => toggleSelect(output.id)}
                                                className="w-5 h-5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                                            />

                                            {/* Аватар */}
                                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                {output.user?.img ? (
                                                    <img 
                                                        src={`${import.meta.env.VITE_API_URL}/${output.user.img}`}
                                                        alt=""
                                                        className="w-full h-full object-cover"
                                                    />
                                                ) : (
                                                    <User size={20} className="text-gray-400" />
                                                )}
                                            </div>

                                            {/* Информация */}
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-gray-800">
                                                        {formatUserName(output.user)}
                                                    </span>
                                                    {output.team && (
                                                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                                                            {output.team.title}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                                                    {output.operationType && (
                                                        <span className="flex items-center gap-1">
                                                            <Settings2 size={12} />
                                                            {output.operationType.name}
                                                        </span>
                                                    )}
                                                    {output.project && (
                                                        <span className="flex items-center gap-1">
                                                            <FolderKanban size={12} />
                                                            {output.project.title}
                                                        </span>
                                                    )}
                                                </div>
                                                {output.comment && (
                                                    <p className="text-xs text-gray-400 mt-1 truncate">
                                                        {output.comment}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Количество */}
                                            <div className="text-right">
                                                {editingId === output.id ? (
                                                    <input
                                                        type="number"
                                                        value={adjustments[output.id] ?? output.claimedQty}
                                                        onChange={(e) => handleAdjustment(output.id, Number(e.target.value))}
                                                        onBlur={() => setEditingId(null)}
                                                        autoFocus
                                                        className="w-20 px-2 py-1 border border-emerald-300 rounded text-right font-bold"
                                                    />
                                                ) : (
                                                    <div 
                                                        className="flex items-center gap-2 cursor-pointer group"
                                                        onClick={() => setEditingId(output.id)}
                                                    >
                                                        <span className={`text-xl font-bold ${
                                                            adjustments[output.id] !== undefined && adjustments[output.id] !== output.claimedQty
                                                                ? 'text-blue-600'
                                                                : 'text-gray-800'
                                                        }`}>
                                                            {adjustments[output.id] ?? output.claimedQty}
                                                        </span>
                                                        <Edit3 size={14} className="text-gray-300 group-hover:text-gray-500" />
                                                    </div>
                                                )}
                                                {adjustments[output.id] !== undefined && adjustments[output.id] !== output.claimedQty && (
                                                    <p className="text-xs text-gray-400 line-through">
                                                        было: {output.claimedQty}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Модалка отклонения */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md shadow-2xl">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2 mb-4">
                            <AlertTriangle size={20} className="text-red-500" />
                            Отклонить записи
                        </h3>
                        
                        <p className="text-sm text-gray-600 mb-4">
                            Будет отклонено: {selectedIds.size} записей
                        </p>
                        
                        <textarea
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Причина отклонения (опционально)"
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg mb-4 resize-none"
                        />
                        
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setShowRejectModal(false)}
                                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                            >
                                Отмена
                            </button>
                            <button
                                onClick={handleReject}
                                className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-medium"
                            >
                                Отклонить
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
});

export default ProductionApproval;
