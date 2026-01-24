/**
 * ProductionMatrix.tsx - Матрица выработки v2
 * 
 * Excel-like grid: сотрудники × даты
 * Фильтры по проекту, бригаде, операции
 */

import React, { useState, useEffect, useMemo } from "react";
import { 
    Calendar, ChevronLeft, ChevronRight, Download, Filter,
    Users, FolderKanban, Settings2, TrendingUp, Award,
    RefreshCw
} from "lucide-react";
import toast from "react-hot-toast";

import {
    fetchMatrix,
    fetchOperationTypes,
    MatrixResponse,
    MatrixUser,
    OperationType,
    formatShortDate,
    getDayOfWeek
} from "src/api/productionApi";

import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { fetchStructure } from "src/api/structureApi";

export const ProductionMatrix: React.FC = () => {
    // === DATA ===
    const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // === СПРАВОЧНИКИ ===
    const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [teams, setTeams] = useState<Array<{ id: number; title: string }>>([]);
    const [sections, setSections] = useState<Array<{ id: number; title: string }>>([]);

    // === FILTERS ===
    const [weekOffset, setWeekOffset] = useState(0); // 0 = текущая неделя, -1 = прошлая и т.д.
    const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
    const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
    const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
    const [filterOperationId, setFilterOperationId] = useState<number | null>(null);

    // Вычисляем даты недели
    const weekDates = useMemo(() => {
        const now = new Date();
        const dayOfWeek = now.getDay();
        const monday = new Date(now);
        monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (weekOffset * 7));
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        
        return {
            from: monday.toISOString().split('T')[0],
            to: sunday.toISOString().split('T')[0]
        };
    }, [weekOffset]);

    // === LOAD DATA ===
    useEffect(() => {
        loadDictionaries();
    }, []);

    useEffect(() => {
        loadMatrix();
    }, [weekDates, filterTeamId, filterSectionId, filterProjectId, filterOperationId]);

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
            
            const allTeams: Array<{ id: number; title: string }> = [];
            structure.sections?.forEach((s: any) => {
                s.teams?.forEach((t: any) => {
                    allTeams.push({ id: t.id, title: `${t.title}` });
                });
            });
            setTeams(allTeams);
        } catch (e) {
            console.error(e);
        }
    };

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const data = await fetchMatrix({
                dateFrom: weekDates.from,
                dateTo: weekDates.to,
                teamId: filterTeamId || undefined,
                sectionId: filterSectionId || undefined,
                projectId: filterProjectId || undefined,
                operationTypeId: filterOperationId || undefined
            });
            setMatrixData(data);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки");
        } finally {
            setLoading(false);
        }
    };

    // === CALCULATIONS ===
    const dayTotals = useMemo(() => {
        if (!matrixData) return {};
        
        const totals: Record<string, number> = {};
        matrixData.dates.forEach(date => {
            totals[date] = matrixData.matrix.reduce((sum, user) => sum + (user.days[date] || 0), 0);
        });
        return totals;
    }, [matrixData]);

    const grandTotal = useMemo(() => {
        if (!matrixData) return 0;
        return matrixData.matrix.reduce((sum, user) => sum + user.total, 0);
    }, [matrixData]);

    // === EXPORT ===
    const handleExportCSV = () => {
        if (!matrixData) return;
        
        const headers = ['Сотрудник', ...matrixData.dates.map(d => formatShortDate(d)), 'Итого'];
        const rows = matrixData.matrix.map(user => [
            `${user.surname} ${user.name}`,
            ...matrixData.dates.map(d => user.days[d] || 0),
            user.total
        ]);
        
        // Итоги
        rows.push([
            'ИТОГО',
            ...matrixData.dates.map(d => dayTotals[d] || 0),
            grandTotal
        ]);
        
        const csvContent = '\uFEFF' + [headers, ...rows].map(r => r.join(';')).join('\n');
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `матрица_${weekDates.from}_${weekDates.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Экспорт завершён");
    };

    // === RENDER ===
    const isWeekend = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.getDay() === 0 || d.getDay() === 6;
    };

    return (
        <div className="space-y-4">
            
            {/* Навигация по неделям и фильтры */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    
                    {/* Навигация по неделям */}
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setWeekOffset(w => w - 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Предыдущая неделя"
                        >
                            <ChevronLeft size={20} />
                        </button>
                        
                        <div className="text-center min-w-[200px]">
                            <div className="font-bold text-gray-800">
                                {formatShortDate(weekDates.from)} — {formatShortDate(weekDates.to)}
                            </div>
                            <div className="text-xs text-gray-500">
                                {weekOffset === 0 ? 'Текущая неделя' : 
                                 weekOffset === -1 ? 'Прошлая неделя' :
                                 `${Math.abs(weekOffset)} нед. ${weekOffset < 0 ? 'назад' : 'вперёд'}`}
                            </div>
                        </div>
                        
                        <button
                            onClick={() => setWeekOffset(w => w + 1)}
                            className="p-2 hover:bg-gray-100 rounded-lg transition"
                            title="Следующая неделя"
                        >
                            <ChevronRight size={20} />
                        </button>
                        
                        {weekOffset !== 0 && (
                            <button
                                onClick={() => setWeekOffset(0)}
                                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg"
                            >
                                Сегодня
                            </button>
                        )}
                    </div>

                    {/* Фильтры */}
                    <div className="flex items-center gap-2 flex-wrap">
                        <Filter size={16} className="text-gray-400" />
                        
                        <select
                            value={filterSectionId || ""}
                            onChange={(e) => setFilterSectionId(Number(e.target.value) || null)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все участки</option>
                            {sections.map(s => (
                                <option key={s.id} value={s.id}>{s.title}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filterTeamId || ""}
                            onChange={(e) => setFilterTeamId(Number(e.target.value) || null)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все бригады</option>
                            {teams.map(t => (
                                <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filterProjectId || ""}
                            onChange={(e) => setFilterProjectId(Number(e.target.value) || null)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все проекты</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                        
                        <select
                            value={filterOperationId || ""}
                            onChange={(e) => setFilterOperationId(Number(e.target.value) || null)}
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                        >
                            <option value="">Все операции</option>
                            {operationTypes.map(op => (
                                <option key={op.id} value={op.id}>{op.name}</option>
                            ))}
                        </select>
                        
                        <button
                            onClick={handleExportCSV}
                            className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1"
                        >
                            <Download size={16} />
                            CSV
                        </button>
                    </div>
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Users size={16} />
                        Сотрудников
                    </div>
                    <div className="text-2xl font-bold text-gray-800">
                        {matrixData?.matrix.length || 0}
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <TrendingUp size={16} />
                        Всего за неделю
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">
                        {grandTotal.toLocaleString()}
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Calendar size={16} />
                        Среднее в день
                    </div>
                    <div className="text-2xl font-bold text-blue-600">
                        {matrixData?.dates.length ? Math.round(grandTotal / matrixData.dates.length) : 0}
                    </div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Award size={16} />
                        Лидер
                    </div>
                    <div className="text-lg font-bold text-amber-600 truncate">
                        {matrixData?.matrix[0] 
                            ? `${matrixData.matrix[0].surname} ${matrixData.matrix[0].name?.[0]}.`
                            : '—'
                        }
                    </div>
                </div>
            </div>

            {/* Матрица */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="p-8 text-center text-gray-400">
                        <RefreshCw size={32} className="mx-auto mb-2 animate-spin" />
                        Загрузка...
                    </div>
                ) : !matrixData || matrixData.matrix.length === 0 ? (
                    <div className="p-8 text-center text-gray-400">
                        <Users size={48} className="mx-auto mb-3 opacity-50" />
                        <p>Нет данных за выбранный период</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50">
                                    <th className="px-4 py-3 text-left font-medium text-gray-700 sticky left-0 bg-gray-50 z-10 min-w-[180px]">
                                        Сотрудник
                                    </th>
                                    {matrixData.dates.map(date => (
                                        <th 
                                            key={date}
                                            className={`px-3 py-3 text-center font-medium min-w-[70px] ${
                                                isWeekend(date) ? 'bg-amber-50 text-amber-700' : 'text-gray-700'
                                            }`}
                                        >
                                            <div className="text-xs uppercase">{getDayOfWeek(date)}</div>
                                            <div>{formatShortDate(date)}</div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center font-bold text-gray-800 bg-emerald-50 min-w-[80px]">
                                        Итого
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.matrix.map((user, idx) => (
                                    <tr 
                                        key={user.userId}
                                        className={`border-t border-gray-50 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                                    >
                                        <td className="px-4 py-2 sticky left-0 bg-inherit z-10">
                                            <div className="flex items-center gap-2">
                                                <span className="text-gray-400 text-xs w-5">{idx + 1}</span>
                                                <span className="font-medium text-gray-800">
                                                    {user.surname} {user.name}
                                                </span>
                                            </div>
                                        </td>
                                        {matrixData.dates.map(date => {
                                            const val = user.days[date] || 0;
                                            return (
                                                <td 
                                                    key={date}
                                                    className={`px-3 py-2 text-center ${
                                                        isWeekend(date) ? 'bg-amber-50/50' : ''
                                                    }`}
                                                >
                                                    {val > 0 ? (
                                                        <span className={`font-medium ${
                                                            val >= 100 ? 'text-emerald-600' :
                                                            val >= 50 ? 'text-blue-600' :
                                                            'text-gray-700'
                                                        }`}>
                                                            {val}
                                                        </span>
                                                    ) : (
                                                        <span className="text-gray-300">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                        <td className="px-4 py-2 text-center font-bold text-emerald-600 bg-emerald-50">
                                            {user.total}
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Итоги по дням */}
                                <tr className="border-t-2 border-gray-200 bg-gray-100 font-bold">
                                    <td className="px-4 py-3 sticky left-0 bg-gray-100 z-10 text-gray-700">
                                        ИТОГО
                                    </td>
                                    {matrixData.dates.map(date => (
                                        <td 
                                            key={date}
                                            className={`px-3 py-3 text-center text-gray-800 ${
                                                isWeekend(date) ? 'bg-amber-100' : ''
                                            }`}
                                        >
                                            {dayTotals[date] || 0}
                                        </td>
                                    ))}
                                    <td className="px-4 py-3 text-center text-lg text-emerald-700 bg-emerald-100">
                                        {grandTotal}
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionMatrix;
