/**
 * ProductionMatrix.tsx - Улучшенная версия с расширенными фильтрами
 * 
 * Новые возможности:
 * - Периоды: неделя, месяц, год, всё время, произвольный
 * - Фильтр по конкретному сотруднику
 * - Улучшенная навигация по периодам
 */

import React, { useState, useEffect, useMemo } from "react";
import {
    Calendar, ChevronLeft, ChevronRight, Download,
    Users, FolderKanban, Settings2, TrendingUp, Award,
    RefreshCw, User, Filter, X
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

// Типы периодов
type PeriodType = 'week' | 'month' | 'year' | 'all' | 'custom';

interface PeriodOption {
    id: PeriodType;
    label: string;
    icon?: React.ReactNode;
}

const PERIOD_OPTIONS: PeriodOption[] = [
    { id: 'week', label: 'Неделя' },
    { id: 'month', label: 'Месяц' },
    { id: 'year', label: 'Год' },
    { id: 'all', label: 'Всё время' },
    { id: 'custom', label: 'Период' },
];

export const ProductionMatrix: React.FC = () => {
    // Данные
    const [matrixData, setMatrixData] = useState<MatrixResponse | null>(null);
    const [loading, setLoading] = useState(true);

    // Справочники
    const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [teams, setTeams] = useState<Array<{ id: number; title: string }>>([]);
    const [sections, setSections] = useState<Array<{ id: number; title: string }>>([]);
    const [employees, setEmployees] = useState<Array<{ id: number; name: string; surname: string }>>([]);

    // Фильтры
    const [periodType, setPeriodType] = useState<PeriodType>('week');
    const [periodOffset, setPeriodOffset] = useState(0);
    const [customDateFrom, setCustomDateFrom] = useState('');
    const [customDateTo, setCustomDateTo] = useState('');
    
    const [filterTeamId, setFilterTeamId] = useState<number | null>(null);
    const [filterSectionId, setFilterSectionId] = useState<number | null>(null);
    const [filterProjectId, setFilterProjectId] = useState<number | null>(null);
    const [filterOperationId, setFilterOperationId] = useState<number | null>(null);
    const [filterUserId, setFilterUserId] = useState<number | null>(null);

    // Вычисление дат периода
    const periodDates = useMemo(() => {
        const now = new Date();
        let from: Date;
        let to: Date;

        if (periodType === 'custom') {
            return {
                from: customDateFrom || now.toISOString().split('T')[0],
                to: customDateTo || now.toISOString().split('T')[0],
                label: customDateFrom && customDateTo 
                    ? `${formatDate(customDateFrom)} — ${formatDate(customDateTo)}`
                    : 'Выберите даты'
            };
        }

        if (periodType === 'week') {
            const dayOfWeek = now.getDay();
            from = new Date(now);
            from.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1) + (periodOffset * 7));
            to = new Date(from);
            to.setDate(from.getDate() + 6);
        } else if (periodType === 'month') {
            from = new Date(now.getFullYear(), now.getMonth() + periodOffset, 1);
            to = new Date(now.getFullYear(), now.getMonth() + periodOffset + 1, 0);
        } else if (periodType === 'year') {
            from = new Date(now.getFullYear() + periodOffset, 0, 1);
            to = new Date(now.getFullYear() + periodOffset, 11, 31);
        } else {
            // all - всё время (последние 5 лет для разумного диапазона)
            from = new Date(2020, 0, 1);
            to = new Date();
        }

        const fromStr = from.toISOString().split('T')[0];
        const toStr = to.toISOString().split('T')[0];

        let label = '';
        if (periodType === 'week') {
            label = `${formatDate(fromStr)} — ${formatDate(toStr)}`;
        } else if (periodType === 'month') {
            label = from.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' });
        } else if (periodType === 'year') {
            label = from.getFullYear().toString();
        } else {
            label = 'Всё время';
        }

        return { from: fromStr, to: toStr, label };
    }, [periodType, periodOffset, customDateFrom, customDateTo]);

    // Загрузка справочников
    useEffect(() => {
        loadDictionaries();
    }, []);

    // Загрузка матрицы при изменении фильтров
    useEffect(() => {
        if (periodType !== 'custom' || (customDateFrom && customDateTo)) {
            loadMatrix();
        }
    }, [periodDates, filterTeamId, filterSectionId, filterProjectId, filterOperationId, filterUserId]);

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
            const allEmployees: Array<{ id: number; name: string; surname: string }> = [];
            
            structure.sections?.forEach((s: any) => {
                s.teams?.forEach((t: any) => {
                    allTeams.push({ id: t.id, title: t.title });
                    t.members?.forEach((m: any) => {
                        if (!allEmployees.find(e => e.id === m.id)) {
                            allEmployees.push({ id: m.id, name: m.name, surname: m.surname });
                        }
                    });
                });
            });
            
            setTeams(allTeams);
            setEmployees(allEmployees.sort((a, b) => a.surname.localeCompare(b.surname)));
        } catch (e) {
            console.error(e);
        }
    };

    const loadMatrix = async () => {
        setLoading(true);
        try {
            const data = await fetchMatrix({
                dateFrom: periodDates.from,
                dateTo: periodDates.to,
                teamId: filterTeamId || undefined,
                sectionId: filterSectionId || undefined,
                projectId: filterProjectId || undefined,
                operationTypeId: filterOperationId || undefined,
            });
            
            // Фильтрация по сотруднику на клиенте
            if (filterUserId && data.matrix) {
                data.matrix = data.matrix.filter(u => u.userId === filterUserId);
            }
            
            setMatrixData(data);
        } catch (e: any) {
            toast.error("Ошибка загрузки данных");
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    // Навигация по периодам
    const goToPrevPeriod = () => setPeriodOffset(prev => prev - 1);
    const goToNextPeriod = () => setPeriodOffset(prev => prev + 1);
    const goToCurrentPeriod = () => setPeriodOffset(0);

    // Смена типа периода
    const handlePeriodTypeChange = (type: PeriodType) => {
        setPeriodType(type);
        setPeriodOffset(0);
        if (type !== 'custom') {
            setCustomDateFrom('');
            setCustomDateTo('');
        }
    };

    // Сброс всех фильтров
    const resetFilters = () => {
        setFilterTeamId(null);
        setFilterSectionId(null);
        setFilterProjectId(null);
        setFilterOperationId(null);
        setFilterUserId(null);
    };

    const hasActiveFilters = filterTeamId || filterSectionId || filterProjectId || filterOperationId || filterUserId;

    // Статистика
    const stats = useMemo(() => {
        if (!matrixData?.matrix) return { employees: 0, total: 0, avgPerDay: 0, leader: null };
        
        const employees = matrixData.matrix.length;
        const total = matrixData.matrix.reduce((sum, u) => sum + u.total, 0);
        const daysCount = matrixData.dates?.length || 1;
        const avgPerDay = Math.round(total / daysCount);
        const leader = matrixData.matrix[0] || null;
        
        return { employees, total, avgPerDay, leader };
    }, [matrixData]);

    // Итоги по дням
    const dayTotals = useMemo(() => {
        if (!matrixData?.matrix || !matrixData?.dates) return {};
        
        const totals: Record<string, number> = {};
        matrixData.dates.forEach(date => {
            totals[date] = matrixData.matrix.reduce((sum, u) => sum + (u.days[date] || 0), 0);
        });
        return totals;
    }, [matrixData]);

    const grandTotal = useMemo(() => {
        return Object.values(dayTotals).reduce((sum, val) => sum + val, 0);
    }, [dayTotals]);

    // Экспорт CSV
    const exportCSV = () => {
        if (!matrixData?.matrix || !matrixData?.dates) return;

        const headers = ['Сотрудник', ...matrixData.dates.map(d => formatDate(d)), 'Итого'];
        const rows = matrixData.matrix.map(u => [
            `${u.surname} ${u.name}`,
            ...matrixData.dates.map(d => u.days[d] || 0),
            u.total
        ]);
        rows.push(['ИТОГО', ...matrixData.dates.map(d => dayTotals[d] || 0), grandTotal]);

        const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
        const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `выработка_${periodDates.from}_${periodDates.to}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="space-y-4">
            {/* Панель фильтров */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                {/* Выбор типа периода */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                    <div className="flex bg-gray-100 rounded-lg p-1">
                        {PERIOD_OPTIONS.map(opt => (
                            <button
                                key={opt.id}
                                onClick={() => handlePeriodTypeChange(opt.id)}
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                    periodType === opt.id
                                        ? 'bg-white text-emerald-600 shadow-sm'
                                        : 'text-gray-600 hover:text-gray-800'
                                }`}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Навигация по периоду */}
                    {periodType !== 'all' && periodType !== 'custom' && (
                        <div className="flex items-center gap-2">
                            <button
                                onClick={goToPrevPeriod}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            
                            <button
                                onClick={goToCurrentPeriod}
                                className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg min-w-[180px]"
                            >
                                {periodDates.label}
                            </button>
                            
                            <button
                                onClick={goToNextPeriod}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                disabled={periodOffset >= 0}
                            >
                                <ChevronRight className={`w-5 h-5 ${periodOffset >= 0 ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>

                            {periodOffset !== 0 && (
                                <button
                                    onClick={goToCurrentPeriod}
                                    className="px-2 py-1 text-xs text-emerald-600 hover:bg-emerald-50 rounded"
                                >
                                    Сегодня
                                </button>
                            )}
                        </div>
                    )}

                    {/* Произвольный период */}
                    {periodType === 'custom' && (
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={customDateFrom}
                                onChange={(e) => setCustomDateFrom(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                            <span className="text-gray-400">—</span>
                            <input
                                type="date"
                                value={customDateTo}
                                onChange={(e) => setCustomDateTo(e.target.value)}
                                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
                            />
                        </div>
                    )}

                    <div className="flex-1" />

                    {/* Кнопка экспорта */}
                    <button
                        onClick={exportCSV}
                        disabled={!matrixData?.matrix?.length}
                        className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                    >
                        <Download className="w-4 h-4" />
                        CSV
                    </button>
                </div>

                {/* Фильтры */}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Фильтр по сотруднику */}
                    <select
                        value={filterUserId || ''}
                        onChange={(e) => setFilterUserId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white min-w-[180px]"
                    >
                        <option value="">Все сотрудники</option>
                        {employees.map(emp => (
                            <option key={emp.id} value={emp.id}>
                                {emp.surname} {emp.name}
                            </option>
                        ))}
                    </select>

                    {/* Участок */}
                    <select
                        value={filterSectionId || ''}
                        onChange={(e) => setFilterSectionId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">Все участки</option>
                        {sections.map(s => (
                            <option key={s.id} value={s.id}>{s.title}</option>
                        ))}
                    </select>

                    {/* Бригада */}
                    <select
                        value={filterTeamId || ''}
                        onChange={(e) => setFilterTeamId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">Все бригады</option>
                        {teams.map(t => (
                            <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                    </select>

                    {/* Проект */}
                    <select
                        value={filterProjectId || ''}
                        onChange={(e) => setFilterProjectId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">Все проекты</option>
                        {projects.map(p => (
                            <option key={p.id} value={p.id}>{p.title}</option>
                        ))}
                    </select>

                    {/* Операция */}
                    <select
                        value={filterOperationId || ''}
                        onChange={(e) => setFilterOperationId(e.target.value ? Number(e.target.value) : null)}
                        className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                    >
                        <option value="">Все операции</option>
                        {operationTypes.map(op => (
                            <option key={op.id} value={op.id}>{op.name}</option>
                        ))}
                    </select>

                    {/* Сброс фильтров */}
                    {hasActiveFilters && (
                        <button
                            onClick={resetFilters}
                            className="flex items-center gap-1 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                        >
                            <X className="w-4 h-4" />
                            Сбросить
                        </button>
                    )}
                </div>
            </div>

            {/* Статистика */}
            <div className="grid grid-cols-4 gap-4">
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Users className="w-4 h-4" />
                        Сотрудников
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{stats.employees}</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <TrendingUp className="w-4 h-4" />
                        Всего за период
                    </div>
                    <div className="text-2xl font-bold text-emerald-600">{stats.total.toLocaleString()}</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Calendar className="w-4 h-4" />
                        Среднее в день
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{stats.avgPerDay.toLocaleString()}</div>
                </div>
                
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                        <Award className="w-4 h-4" />
                        Лидер
                    </div>
                    <div className="text-lg font-bold text-amber-600 truncate">
                        {stats.leader ? `${stats.leader.surname} ${stats.leader.name[0]}.` : '—'}
                    </div>
                </div>
            </div>

            {/* Таблица */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <RefreshCw className="w-6 h-6 animate-spin text-emerald-500" />
                        <span className="ml-2 text-gray-500">Загрузка...</span>
                    </div>
                ) : !matrixData?.matrix?.length ? (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                        <Users className="w-12 h-12 mb-3 opacity-50" />
                        <p>Нет данных за выбранный период</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-gray-50 border-b border-gray-200">
                                    <th className="px-4 py-3 text-left font-semibold text-gray-600 sticky left-0 bg-gray-50 z-10">
                                        Сотрудник
                                    </th>
                                    {matrixData.dates.map(date => (
                                        <th 
                                            key={date} 
                                            className="px-3 py-3 text-center font-medium text-gray-600 min-w-[60px]"
                                        >
                                            <div className="text-xs text-gray-400">
                                                {getDayOfWeek ? getDayOfWeek(date) : ''}
                                            </div>
                                            <div>{formatDate(date)}</div>
                                        </th>
                                    ))}
                                    <th className="px-4 py-3 text-center font-semibold text-emerald-700 bg-emerald-50">
                                        Итого
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {matrixData.matrix.map((user, idx) => (
                                    <tr 
                                        key={user.userId}
                                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                            idx === 0 ? 'bg-amber-50/50' : ''
                                        }`}
                                    >
                                        <td className="px-4 py-3 font-medium text-gray-800 sticky left-0 bg-white z-10">
                                            <div className="flex items-center gap-2">
                                                {idx === 0 && <Award className="w-4 h-4 text-amber-500" />}
                                                <span>{user.surname} {user.name}</span>
                                            </div>
                                        </td>
                                        {matrixData.dates.map(date => (
                                            <td 
                                                key={date}
                                                className={`px-3 py-3 text-center ${
                                                    user.days[date] 
                                                        ? user.days[date] >= 200 
                                                            ? 'text-emerald-700 font-semibold bg-emerald-50' 
                                                            : 'text-gray-700'
                                                        : 'text-gray-300'
                                                }`}
                                            >
                                                {user.days[date] || '—'}
                                            </td>
                                        ))}
                                        <td className="px-4 py-3 text-center font-bold text-emerald-700 bg-emerald-50">
                                            {user.total}
                                        </td>
                                    </tr>
                                ))}
                                
                                {/* Итоговая строка */}
                                <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                                    <td className="px-4 py-3 text-gray-700 sticky left-0 bg-gray-100 z-10">
                                        ИТОГО
                                    </td>
                                    {matrixData.dates.map(date => (
                                        <td 
                                            key={date}
                                            className={`px-3 py-3 text-center text-gray-700 ${
                                                dayTotals[date] >= 1000 ? 'bg-amber-100' : ''
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

// Хелпер форматирования даты
function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export default ProductionMatrix;