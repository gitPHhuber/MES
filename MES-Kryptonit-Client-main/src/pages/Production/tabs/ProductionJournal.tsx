/**
 * ProductionJournal.tsx - Журнал выработки v2
 * 
 * Фильтры по проекту, задаче, бригаде, участку, операции
 */

import React, { useState, useEffect, useContext } from "react";
import { 
    Calendar, User, Filter, Search, Download, Trash2,
    ChevronLeft, ChevronRight, FolderKanban, ClipboardList,
    Settings2, Users, CheckCircle2, Clock, XCircle, RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";
import { Context } from "src/main";
import { observer } from "mobx-react-lite";

import {
    fetchOutputs,
    deleteOutput,
    fetchOperationTypes,
    ProductionOutput,
    OperationType,
    OUTPUT_STATUS_LABELS,
    OUTPUT_STATUS_COLORS,
    formatUserName,
    formatDate
} from "src/api/productionApi";

import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { fetchStructure } from "src/api/structureApi";

export const ProductionJournal: React.FC = observer(() => {
    const context = useContext(Context);
    const currentUser = context?.user?.user;
    const isAdmin = currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'Admin';

    // === DATA ===
    const [outputs, setOutputs] = useState<ProductionOutput[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(true);

    // === СПРАВОЧНИКИ ===
    const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [teams, setTeams] = useState<Array<{ id: number; title: string }>>([]);
    const [sections, setSections] = useState<Array<{ id: number; title: string }>>([]);
    const [users, setUsers] = useState<Array<{ id: number; name: string; surname: string }>>([]);

    // === FILTERS ===
    const [page, setPage] = useState(1);
    const [limit] = useState(30);
    const [filterUserId, setFilterUserId] = useState<number | null>(null);
    const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
    const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
    const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
    const [filterOperationId, setFilterOperationId] = useState<number | null>(null);
    const [filterStatus, setFilterStatus] = useState<string>("");
    const [filterDateFrom, setFilterDateFrom] = useState<string>("");
    const [filterDateTo, setFilterDateTo] = useState<string>("");

    const totalPages = Math.ceil(totalCount / limit);

    // === LOAD DATA ===
    useEffect(() => {
        loadDictionaries();
    }, []);

    useEffect(() => {
        loadData();
    }, [page, filterUserId, filterTeamId, filterSectionId, filterProjectId, filterOperationId, filterStatus, filterDateFrom, filterDateTo]);

    const loadDictionaries = async () => {
        try {
            const [ops, projs, structure] = await Promise.all([
                fetchOperationTypes(),
                fetchProjects(),
                fetchStructure()
            ]);
            
            setOperationTypes(ops);
            setProjects(projs);
            setSections(structure.sections || []);
            
            // Собираем бригады и пользователей
            const allTeams: Array<{ id: number; title: string }> = [];
            const allUsers: Array<{ id: number; name: string; surname: string }> = [];
            
            structure.sections?.forEach((s: any) => {
                s.teams?.forEach((t: any) => {
                    allTeams.push({ id: t.id, title: `${t.title} (${s.title})` });
                    t.members?.forEach((m: any) => {
                        if (!allUsers.find(u => u.id === m.id)) {
                            allUsers.push({ id: m.id, name: m.name, surname: m.surname });
                        }
                    });
                });
            });
            
            setTeams(allTeams);
            setUsers(allUsers.sort((a, b) => a.surname.localeCompare(b.surname)));
        } catch (e) {
            console.error(e);
        }
    };

    const loadData = async () => {
        setLoading(true);
        try {
            const result = await fetchOutputs({
                page,
                limit,
                userId: filterUserId || undefined,
                teamId: filterTeamId || undefined,
                sectionId: filterSectionId || undefined,
                projectId: filterProjectId || undefined,
                operationTypeId: filterOperationId || undefined,
                status: filterStatus || undefined,
                dateFrom: filterDateFrom || undefined,
                dateTo: filterDateTo || undefined
            });
            
            setOutputs(result.rows);
            setTotalCount(result.count);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Удалить запись?")) return;
        
        try {
            await deleteOutput(id);
            toast.success("Удалено");
            loadData();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка удаления");
        }
    };

    const handleResetFilters = () => {
        setFilterUserId(null);
        setFilterTeamId(null);
        setFilterSectionId(null);
        setFilterProjectId(null);
        setFilterOperationId(null);
        setFilterStatus("");
        setFilterDateFrom("");
        setFilterDateTo("");
        setPage(1);
    };

    const handleExportCSV = () => {
        // Формируем CSV
        const headers = ['Дата', 'Сотрудник', 'Бригада', 'Проект', 'Операция', 'Заявлено', 'Подтверждено', 'Статус', 'Комментарий'];
        const rows = outputs.map(o => [
            o.date,
            formatUserName(o.user),
            o.team?.title || '',
            o.project?.title || '',
            o.operationType?.name || '',
            o.claimedQty,
            o.approvedQty,
            OUTPUT_STATUS_LABELS[o.status] || o.status,
            o.comment || ''
        ]);
        
        const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.map(c => `"${c}"`).join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `выработка_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Экспорт завершён");
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'approved':
            case 'adjusted':
                return <CheckCircle2 size={16} className="text-green-500" />;
            case 'pending':
                return <Clock size={16} className="text-yellow-500" />;
            case 'rejected':
                return <XCircle size={16} className="text-red-500" />;
            default:
                return null;
        }
    };

    // === RENDER ===
    return (
        <div className="space-y-4">
            
            {/* Фильтры */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex items-center gap-2 mb-3">
                    <Filter size={18} className="text-gray-400" />
                    <span className="font-medium text-gray-700">Фильтры</span>
                    <button
                        onClick={handleResetFilters}
                        className="ml-auto text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                    >
                        <RefreshCw size={14} />
                        Сбросить
                    </button>
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                    {/* Даты */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Дата с</label>
                        <input
                            type="date"
                            value={filterDateFrom}
                            onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Дата по</label>
                        <input
                            type="date"
                            value={filterDateTo}
                            onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        />
                    </div>
                    
                    {/* Участок */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Участок</label>
                        <select
                            value={filterSectionId || ""}
                            onChange={(e) => { setFilterSectionId(Number(e.target.value) || null); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            {sections.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Бригада */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Бригада</label>
                        <select
                            value={filterTeamId || ""}
                            onChange={(e) => { setFilterTeamId(Number(e.target.value) || null); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Проект */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Проект</label>
                        <select
                            value={filterProjectId || ""}
                            onChange={(e) => { setFilterProjectId(Number(e.target.value) || null); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Операция */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Операция</label>
                        <select
                            value={filterOperationId || ""}
                            onChange={(e) => { setFilterOperationId(Number(e.target.value) || null); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            {operationTypes.map(op => (
                                <option key={op.id} value={op.id}>{op.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Сотрудник */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Сотрудник</label>
                        <select
                            value={filterUserId || ""}
                            onChange={(e) => { setFilterUserId(Number(e.target.value) || null); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            {users.map(u => (
                                <option key={u.id} value={u.id}>{u.surname} {u.name}</option>
                            ))}
                        </select>
                    </div>
                    
                    {/* Статус */}
                    <div>
                        <label className="text-xs text-gray-500 mb-1 block">Статус</label>
                        <select
                            value={filterStatus}
                            onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все</option>
                            <option value="pending">Ожидает</option>
                            <option value="approved">Подтверждено</option>
                            <option value="adjusted">Скорректировано</option>
                            <option value="rejected">Отклонено</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Таблица */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                
                {/* Заголовок */}
                <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <span className="font-medium text-gray-700">Найдено: {totalCount}</span>
                    </div>
                    <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1"
                    >
                        <Download size={16} />
                        Экспорт CSV
                    </button>
                </div>

                {/* Таблица */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Дата</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Сотрудник</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Бригада</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Проект</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Операция</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Заявл.</th>
                                <th className="px-4 py-3 text-right font-medium text-gray-500">Подтв.</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500">Статус</th>
                                <th className="px-4 py-3 text-left font-medium text-gray-500">Подтвердил</th>
                                <th className="px-4 py-3 text-center font-medium text-gray-500"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                                        <RefreshCw size={24} className="mx-auto mb-2 animate-spin" />
                                        Загрузка...
                                    </td>
                                </tr>
                            ) : outputs.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
                                        Нет записей
                                    </td>
                                </tr>
                            ) : (
                                outputs.map(output => (
                                    <tr key={output.id} className="hover:bg-gray-50">
                                        <td className="px-4 py-3 whitespace-nowrap">
                                            {formatDate(output.date)}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                                    {output.user?.img ? (
                                                        <img 
                                                            src={`${import.meta.env.VITE_API_URL}/${output.user.img}`}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    ) : (
                                                        <User size={14} className="text-gray-400" />
                                                    )}
                                                </div>
                                                <span>{formatUserName(output.user)}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {output.team?.title || '—'}
                                        </td>
                                        <td className="px-4 py-3">
                                            {output.project ? (
                                                <span className="flex items-center gap-1 text-blue-600">
                                                    <FolderKanban size={14} />
                                                    {output.project.title}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3">
                                            {output.operationType ? (
                                                <span className="flex items-center gap-1">
                                                    <Settings2 size={14} className="text-gray-400" />
                                                    {output.operationType.name}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">—</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium">
                                            {output.claimedQty}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-emerald-600">
                                            {output.approvedQty || '—'}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${OUTPUT_STATUS_COLORS[output.status]}`}>
                                                {getStatusIcon(output.status)}
                                                {OUTPUT_STATUS_LABELS[output.status]}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500">
                                            {formatUserName(output.approvedBy)}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(isAdmin || output.createdById === currentUser?.id || output.userId === currentUser?.id) && output.status === 'pending' && (
                                                <button
                                                    onClick={() => handleDelete(output.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Пагинация */}
                {totalPages > 1 && (
                    <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-sm text-gray-500">
                            Страница {page} из {totalPages}
                        </span>
                        <div className="flex gap-1">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronLeft size={18} />
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="p-2 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <ChevronRight size={18} />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
});

export default ProductionJournal;
