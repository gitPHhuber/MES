import React, { useState, useMemo, useEffect } from "react";
import { 
  TrendingUp, TrendingDown, Users, Briefcase, Factory, 
  ArrowLeft, Layers, Activity, Loader2, RefreshCw,
  CalendarDays, FolderKanban
} from "lucide-react";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { RANKINGS_ROUTE } from "src/utils/consts";
import { fetchRankings, RankingResponse, RankingsParams } from "src/api/rankingsApi";
import { fetchProjects } from "src/api/projectsApi";
import dayjs from "dayjs";

const COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#06B6D4"
];

type Period = "day" | "week" | "month" | "year" | "all" | "custom";
type Tab = "users" | "teams" | "sections";

interface ProjectOption {
  id: number;
  title: string;
}

interface ChartAsset {
  id: number;
  name: string;
  fullName: string;
  current: number;
  change: string;
  history: { date: string; value: number }[];
  color: string;
}

// Метки для UI
const PERIOD_LABELS: Record<Period, string> = {
  day: "День",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
  all: "Всё",
  custom: "Период"
};

// Конвертация периода в параметры API
function getApiParams(
  period: Period, 
  projectId: string,
  customStart?: string, 
  customEnd?: string
): RankingsParams {
  const params: RankingsParams = { period };
  
  if (period === 'custom' && customStart && customEnd) {
    params.startDate = customStart;
    params.endDate = customEnd;
  }
  
  if (projectId) {
    params.projectId = projectId;
  }
  
  return params;
}

export const RankingsChartsPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [viewMode, setViewMode] = useState<"individual" | "comparison">("individual");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<RankingResponse | null>(null);

  // Проекты
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");

  // Период
  const [period, setPeriod] = useState<Period>("all");
  const [customStart, setCustomStart] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM-DD'));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Загрузка проектов
  useEffect(() => {
    fetchProjects()
      .then(setProjects)
      .catch(e => console.error("Ошибка загрузки проектов:", e));
  }, []);

  // Загрузка данных
  const loadData = async () => {
    setLoading(true);
    
    const params = getApiParams(period, selectedProjectId, customStart, customEnd);
    console.log("[Analytics] Загрузка данных:", params);
    
    try {
      const res = await fetchRankings(params);
      console.log("[Analytics] Получено:", res.users?.length, "пользователей");
      setData(res);
      setSelectedId(null);
    } catch (e) {
      console.error("[Analytics] Ошибка загрузки:", e);
    } finally {
      setLoading(false);
    }
  };

  // Загрузка при изменении периода или проекта
  useEffect(() => {
    loadData();
  }, [period, selectedProjectId]);

  // Обработчик смены периода
  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === 'custom') {
      setShowCustomPicker(true);
    } else {
      setShowCustomPicker(false);
    }
    setPeriod(newPeriod);
  };

  // Применить кастомный период
  const applyCustomPeriod = () => {
    loadData();
  };

  // Преобразование данных пользователей для графиков
  const usersAssets: ChartAsset[] = useMemo(() => {
    if (!data?.users?.length) return [];
    
    return data.users.slice(0, 10).map((user, idx) => {
      const history = user.sparkline?.length > 0 
        ? user.sparkline.map(p => ({ 
            date: dayjs(p.date).format('DD.MM'), 
            value: p.value 
          }))
        : [{ date: 'Итого', value: user.output }];
      
      const values = history.map(h => h.value);
      const startVal = values.length > 1 ? values.slice(0, Math.floor(values.length/2)).reduce((a,b) => a+b, 0) / Math.floor(values.length/2) : 0;
      const endVal = values.length > 1 ? values.slice(Math.floor(values.length/2)).reduce((a,b) => a+b, 0) / (values.length - Math.floor(values.length/2)) : values[0] || 0;
      const change = startVal > 0 ? ((endVal - startVal) / startVal * 100) : 0;

      return {
        id: user.id,
        name: (user.surname || '').substring(0, 3).toUpperCase(),
        fullName: (user.surname || '') + " " + (user.name || ''),
        current: user.output,
        change: change.toFixed(1),
        history,
        color: COLORS[idx % COLORS.length]
      };
    });
  }, [data]);

  // Преобразование данных бригад
  const teamsAssets: ChartAsset[] = useMemo(() => {
    if (!data?.teams?.length) return [];
    
    return data.teams.slice(0, 10).map((team, idx) => {
      const history = team.sparkline?.length > 0 
        ? team.sparkline.map(p => ({ 
            date: dayjs(p.date).format('DD.MM'), 
            value: p.value 
          }))
        : [{ date: 'Итого', value: team.totalOutput }];

      return {
        id: team.id,
        name: (team.title || '').substring(0, 4).toUpperCase(),
        fullName: team.title || `Бригада ${team.id}`,
        current: team.totalOutput,
        change: "0",
        history,
        color: COLORS[idx % COLORS.length]
      };
    });
  }, [data]);

  // Данные участков
  const sectionsAssets: ChartAsset[] = useMemo(() => {
    if (!data?.sections?.length) return [];
    
    return data.sections.slice(0, 10).map((section, idx) => {
      const history = section.sparkline?.length > 0 
        ? section.sparkline.map(p => ({ 
            date: dayjs(p.date).format('DD.MM'), 
            value: p.value 
          }))
        : [{ date: 'Итого', value: section.totalOutput }];

      return {
        id: section.id,
        name: (section.title || '').substring(0, 4).toUpperCase(),
        fullName: section.title || `Участок ${section.id}`,
        current: section.totalOutput,
        change: "0",
        history,
        color: COLORS[idx % COLORS.length]
      };
    });
  }, [data]);

  // Выбор данных по активной вкладке
  const assets = activeTab === "users" ? usersAssets : activeTab === "teams" ? teamsAssets : sectionsAssets;
  
  // Выбранный элемент
  const selectedAsset = selectedId !== null 
    ? assets.find(a => a.id === selectedId) || assets[0] 
    : assets[0];
  
  const isPositive = selectedAsset ? Number(selectedAsset.change) >= 0 : true;
  const chartColor = isPositive ? "#10B981" : "#EF4444";

  // Данные для режима сравнения
  const comparisonData = useMemo(() => {
    if (!assets.length || !assets[0]?.history?.length) return [];
    
    const maxLen = Math.max(...assets.map(a => a.history?.length || 0));
    if (maxLen === 0) return [];

    return Array.from({ length: maxLen }, (_, i) => {
      const point: Record<string, any> = { name: assets[0]?.history[i]?.date || "#" + (i + 1) };
      assets.forEach(asset => {
        point[asset.id] = asset.history[i]?.value || 0;
      });
      return point;
    });
  }, [assets]);

  // Кастомный тултип для сравнения
  const CustomComparisonTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    
    const sortedPayload = [...payload].sort((a, b) => b.value - a.value);
    
    return (
      <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl">
        <p className="text-slate-400 text-xs font-bold mb-2 uppercase tracking-wider">{label}</p>
        <div className="space-y-1">
          {sortedPayload.map((entry: any) => (
            <div key={entry.name} className="flex items-center justify-between gap-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-slate-200 font-medium">{entry.name}</span>
              </div>
              <span className="font-mono font-bold text-white">{entry.value?.toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // При смене таба сбрасываем выбор
  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setSelectedId(null);
  };

  // Название проекта
  const selectedProjectName = useMemo(() => {
    if (!selectedProjectId) return "Все проекты";
    const project = projects.find(p => p.id === Number(selectedProjectId));
    return project?.title || "Проект";
  }, [selectedProjectId, projects]);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans flex flex-col">
      
      {/* Header */}
      <header className="border-b border-slate-800 bg-[#0B0E14] px-6 py-4 shrink-0 z-20">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => navigate(RANKINGS_ROUTE)}
              className="p-2 hover:bg-slate-800 rounded-lg text-slate-400 transition"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-white flex items-center gap-2 tracking-tight">
                <Activity className="text-indigo-500" />
                Аналитика производительности
              </h1>
              <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">
                {loading 
                  ? 'Загрузка...' 
                  : `${selectedProjectId ? (data as any)?.projectName || selectedProjectName : "Все проекты"} | ${data?.users?.length || 0} сотрудников`
                }
              </p>
            </div>
          </div>

          {/* Табы */}
          <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
            <button 
              onClick={() => handleTabChange("users")} 
              className={clsx(
                "px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", 
                activeTab === 'users' 
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Users size={14}/> Сотрудники
              {data?.users?.length ? <span className="ml-1 text-xs opacity-70">({data.users.length})</span> : null}
            </button>
            <button 
              onClick={() => handleTabChange("teams")} 
              className={clsx(
                "px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", 
                activeTab === 'teams' 
                  ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Briefcase size={14}/> Бригады
              {data?.teams?.length ? <span className="ml-1 text-xs opacity-70">({data.teams.length})</span> : null}
            </button>
            <button 
              onClick={() => handleTabChange("sections")} 
              className={clsx(
                "px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", 
                activeTab === 'sections' 
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" 
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800"
              )}
            >
              <Factory size={14}/> Участки
              {data?.sections?.length ? <span className="ml-1 text-xs opacity-70">({data.sections.length})</span> : null}
            </button>
          </div>

          {/* Режим отображения + Обновить */}
          <div className="flex items-center gap-3">
            <button
              onClick={loadData}
              disabled={loading}
              className={clsx(
                "p-2 rounded-lg transition",
                loading 
                  ? "text-slate-600 cursor-not-allowed" 
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              )}
              title="Обновить данные"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
            </button>
            
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              <button 
                onClick={() => setViewMode("individual")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition",
                  viewMode === 'individual' 
                    ? "bg-slate-700 text-white" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                Детально
              </button>
              <button 
                onClick={() => setViewMode("comparison")}
                className={clsx(
                  "px-3 py-1.5 rounded-md text-xs font-bold transition",
                  viewMode === 'comparison' 
                    ? "bg-slate-700 text-white" 
                    : "text-slate-500 hover:text-slate-300"
                )}
              >
                Сравнение
              </button>
            </div>
          </div>
        </div>

        {/* Фильтры: Проект + Период */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Селектор проекта */}
          <div className="flex items-center gap-2">
            <FolderKanban size={16} className="text-emerald-500" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              disabled={loading}
              className="px-3 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-sm font-medium text-white focus:ring-2 focus:ring-emerald-500 min-w-[180px]"
            >
              <option value="">Все проекты</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
          </div>

          {/* Селектор периода */}
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-indigo-400" />
            <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
              {(["day", "week", "month", "year", "all", "custom"] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => handlePeriodChange(p)}
                  disabled={loading}
                  className={clsx(
                    "px-3 py-1 rounded-md text-xs font-bold transition",
                    period === p
                      ? "bg-indigo-600 text-white"
                      : "text-slate-400 hover:text-white hover:bg-slate-700",
                    loading && "opacity-50 cursor-not-allowed"
                  )}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>
          </div>

          {/* Кастомный диапазон */}
          {showCustomPicker && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customStart}
                onChange={e => setCustomStart(e.target.value)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <span className="text-slate-500">—</span>
              <input
                type="date"
                value={customEnd}
                onChange={e => setCustomEnd(e.target.value)}
                className="px-2 py-1 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white"
              />
              <button
                onClick={applyCustomPeriod}
                disabled={loading}
                className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50"
              >
                OK
              </button>
            </div>
          )}

          {/* Инфо о периоде */}
          {data && (
            <div className="text-xs text-slate-500 ml-auto">
              {dayjs(data.startDate).format("DD.MM.YYYY")} — {dayjs(data.endDate).format("DD.MM.YYYY")}
            </div>
          )}
        </div>
      </header>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Sidebar - список */}
        {viewMode === 'individual' && (
          <aside className="w-72 border-r border-slate-800 bg-[#080A0F] overflow-y-auto">
            {loading ? (
              <div className="flex justify-center items-center h-40">
                <Loader2 className="animate-spin text-indigo-500" size={24} />
              </div>
            ) : assets.length === 0 ? (
              <div className="flex justify-center items-center h-40 text-slate-500 text-sm">
                Нет данных за период
              </div>
            ) : (
              assets.map((item, idx) => {
                const isUp = Number(item.change) >= 0;
                const isSelected = item.id === (selectedAsset?.id ?? 0);
                
                return (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={clsx(
                      "px-4 py-3 border-b border-slate-800/50 cursor-pointer transition-all",
                      isSelected 
                        ? "bg-slate-800/80 border-l-2 border-l-indigo-500" 
                        : "hover:bg-slate-800/30"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                          style={{ backgroundColor: item.color }}
                        >
                          {idx + 1}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-200 truncate max-w-[120px]">
                            {item.fullName}
                          </p>
                          <p className="text-xs text-slate-500 font-mono">{item.name}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-white font-mono">
                          {item.current.toLocaleString()}
                        </p>
                        <div className={clsx(
                          "text-xs font-bold flex items-center justify-end gap-0.5",
                          isUp ? "text-emerald-500" : "text-red-500"
                        )}>
                          {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                          {item.change}%
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </aside>
        )}

        {/* Chart area */}
        <main className="flex-1 flex flex-col bg-[#0B0E14] relative">
          
          {/* Chart header */}
          <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0B0E14]">
            {viewMode === 'individual' && selectedAsset ? (
              <div className="flex items-center gap-4">
                <div 
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg"
                  style={{ backgroundColor: selectedAsset.color }}
                >
                  {selectedAsset.name[0]}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">{selectedAsset.fullName}</h2>
                  <span className="text-xs text-slate-500 font-mono tracking-wider">
                    ID: {selectedAsset.id} | {selectedAsset.history.length} точек данных
                  </span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-4">
                <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                  <Layers size={24}/>
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white leading-tight">Сводный анализ</h2>
                  <span className="text-xs text-slate-500 font-mono tracking-wider">
                    Сравнение {assets.length} объектов
                  </span>
                </div>
              </div>
            )}

            <div className="text-right">
              {viewMode === 'individual' && selectedAsset ? (
                <>
                  <div className={clsx(
                    "text-3xl font-black font-mono tracking-tight", 
                    isPositive ? "text-emerald-400" : "text-red-400"
                  )}>
                    {selectedAsset.current.toLocaleString()}
                  </div>
                  <div className={clsx(
                    "text-xs font-bold uppercase tracking-wider", 
                    isPositive ? "text-emerald-600" : "text-red-600"
                  )}>
                    Выработка за {PERIOD_LABELS[period]}
                  </div>
                </>
              ) : (
                <div className="flex -space-x-2">
                  {assets.slice(0, 5).map(a => (
                    <div 
                      key={a.id} 
                      className="w-8 h-8 rounded-full border-2 border-slate-900 flex items-center justify-center text-xs font-bold text-white" 
                      style={{ backgroundColor: a.color }}
                    >
                      {a.name[0]}
                    </div>
                  ))}
                  {assets.length > 5 && (
                    <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">
                      +{assets.length - 5}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chart */}
          <div className="flex-1 p-6 relative">
            {loading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="animate-spin text-indigo-500" size={48} />
              </div>
            ) : assets.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500">
                Нет данных за выбранный период
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                {viewMode === 'individual' && selectedAsset ? (
                  <AreaChart data={selectedAsset.history}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                        <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="date" 
                      stroke="#475569" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={['auto', 'auto']} 
                      dx={-10} 
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#0f172a', 
                        borderColor: '#334155', 
                        color: '#f8fafc', 
                        borderRadius: '12px', 
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' 
                      }}
                      itemStyle={{ color: chartColor, fontWeight: 'bold' }}
                      cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
                      formatter={(value: number) => [value.toLocaleString(), 'Выработка']}
                    />
                    <ReferenceLine y={selectedAsset.current} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                    <Area 
                      type="monotone" 
                      dataKey="value" 
                      stroke={chartColor} 
                      strokeWidth={3} 
                      fillOpacity={1} 
                      fill="url(#colorValue)" 
                      animationDuration={1000}
                    />
                  </AreaChart>
                ) : (
                  <LineChart data={comparisonData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis 
                      dataKey="name" 
                      stroke="#475569" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      dy={10} 
                    />
                    <YAxis 
                      stroke="#475569" 
                      tick={{ fontSize: 12, fill: '#64748b' }} 
                      axisLine={false} 
                      tickLine={false} 
                      domain={['auto', 'auto']} 
                      dx={-10} 
                    />
                    <Tooltip 
                      content={<CustomComparisonTooltip />} 
                      cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} 
                    />
                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                    {assets.map((asset) => (
                      <Line 
                        key={asset.id}
                        type="monotone" 
                        dataKey={asset.id} 
                        name={asset.fullName}
                        stroke={asset.color} 
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 6, strokeWidth: 0, fill: '#fff' }}
                        animationDuration={1500}
                      />
                    ))}
                  </LineChart>
                )}
              </ResponsiveContainer>
            )}
          </div>

          {/* Stats footer */}
          {data && !loading && (
            <div className="h-14 border-t border-slate-800 bg-[#080A0F] flex items-center justify-center gap-8 px-6">
              <div className="text-center">
                <div className="text-lg font-bold text-white">{data.totals?.totalOutput?.toLocaleString() || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase">Всего выработка</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{data.users?.length || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase">Сотрудников</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{data.teams?.length || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase">Бригад</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-white">{data.sections?.length || 0}</div>
                <div className="text-[10px] text-slate-500 uppercase">Участков</div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};