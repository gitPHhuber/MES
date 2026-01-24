import React, { useState, useMemo } from "react";
import { 
  TrendingUp, TrendingDown, Users, Briefcase, Factory, 
  ArrowLeft, Calendar, Maximize2, Layers, Activity
} from "lucide-react";
import { 
  AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, 
  ResponsiveContainer, ReferenceLine, Legend 
} from 'recharts';
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { RANKINGS_ROUTE } from "src/utils/consts";

const generateHistory = (days = 30, volatilityFactor = 1) => {
    let current = 50 + Math.random() * 50;
    return Array.from({ length: days }, (_, i) => {
        const change = (Math.random() - 0.45) * 10 * volatilityFactor;
        current = Math.max(10, current + change);
        return {
            date: `Day ${i + 1}`,
            value: Math.floor(current),
        };
    });
};

const COLORS = [
  "#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", 
  "#EC4899", "#6366F1", "#14B8A6", "#F97316", "#06B6D4"
];

const createAssets = (count: number, type: string) => Array.from({ length: count }, (_, i) => {
    const history = generateHistory(14, type === 'Users' ? 2 : 1);
    const current = history[history.length - 1].value;
    const start = history[0].value;
    const change = ((current - start) / start) * 100;

    return {
        id: i,
        name: `${type === 'Users' ? 'Op' : type === 'Teams' ? 'Tm' : 'Sec'}-${101 + i}`,
        fullName: `${type === 'Users' ? 'Сотрудник' : type === 'Teams' ? 'Бригада' : 'Участок'} ${i + 1}`,
        current: current,
        change: change.toFixed(2),
        history: history,
        color: COLORS[i % COLORS.length]
    };
}).sort((a, b) => b.current - a.current);

const MOCK_DATA = {
    users: createAssets(10, 'Users'),
    teams: createAssets(5, 'Teams'),
    sections: createAssets(3, 'Sections')
};

export const RankingsChartsPage: React.FC = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<"users" | "teams" | "sections">("users");
    const [viewMode, setViewMode] = useState<"individual" | "comparison">("individual");
    const [selectedId, setSelectedId] = useState<number>(0);
    const [timeRange, setTimeRange] = useState<"1W" | "1M" | "3M">("1W");

    const assets = MOCK_DATA[activeTab];
    
    const selectedAsset = assets.find(a => a.id === selectedId) || assets[0];
    const isPositive = Number(selectedAsset.change) >= 0;
    const chartColor = isPositive ? "#10B981" : "#EF4444";

    const comparisonData = useMemo(() => {
        if (assets.length === 0) return [];
        const timelineLength = assets[0].history.length;
        
        return Array.from({ length: timelineLength }, (_, i) => {
            const point: any = { name: assets[0].history[i].date };
            assets.forEach(asset => {
                point[asset.id] = asset.history[i].value;
            });
            return point;
        });
    }, [assets]);

    const CustomComparisonTooltip = ({ active, payload, label }: any) => {
        if (active && payload && payload.length) {
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
                                <span className="font-mono font-bold text-white">{entry.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }
        return null;
    };

    return (
        <div className="min-h-screen bg-[#0B0E14] text-slate-200 font-sans flex flex-col">
            
            <header className="h-16 border-b border-slate-800 bg-[#0B0E14] flex items-center justify-between px-6 shrink-0 z-20">
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
                            Market Analytics
                        </h1>
                        <p className="text-[10px] text-slate-500 font-mono uppercase tracking-widest">Prod. Volatility Index</p>
                    </div>
                </div>

                <div className="flex bg-slate-900 border border-slate-800 p-1 rounded-lg">
                    <button onClick={() => {setActiveTab("users"); setSelectedId(0)}} className={clsx("px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", activeTab === 'users' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800")}>
                        <Users size={14}/> Оперативники
                    </button>
                    <button onClick={() => {setActiveTab("teams"); setSelectedId(0)}} className={clsx("px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", activeTab === 'teams' ? "bg-purple-600 text-white shadow-lg shadow-purple-900/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800")}>
                        <Briefcase size={14}/> Бригады
                    </button>
                    <button onClick={() => {setActiveTab("sections"); setSelectedId(0)}} className={clsx("px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2", activeTab === 'sections' ? "bg-emerald-600 text-white shadow-lg shadow-emerald-900/50" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800")}>
                        <Factory size={14}/> Участки
                    </button>
                </div>

                <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button 
                        onClick={() => setViewMode("individual")}
                        className={clsx("p-2 rounded transition", viewMode === 'individual' ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white")}
                        title="Индивидуальный обзор"
                    >
                        <Maximize2 size={18}/>
                    </button>
                    <button 
                        onClick={() => setViewMode("comparison")}
                        className={clsx("p-2 rounded transition", viewMode === 'comparison' ? "bg-slate-600 text-white" : "text-slate-400 hover:text-white")}
                        title="Сравнение (Наложение)"
                    >
                        <Layers size={18}/>
                    </button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                
                {viewMode === 'individual' && (
                    <aside className="w-80 border-r border-slate-800 bg-[#0F1218] overflow-y-auto custom-scrollbar flex flex-col animate-fade-in-left">
                        {assets.map((item) => {
                            const isUp = Number(item.change) >= 0;
                            return (
                                <div 
                                    key={item.id}
                                    onClick={() => setSelectedId(item.id)}
                                    className={clsx(
                                        "p-4 border-b border-slate-800/50 cursor-pointer transition-all hover:bg-slate-800/50 flex justify-between items-center group",
                                        selectedId === item.id ? "bg-slate-800/80 border-l-4 border-l-indigo-500" : "border-l-4 border-l-transparent"
                                    )}
                                >
                                    <div>
                                        <div className="font-bold text-sm text-white flex items-center gap-2">
                                            {item.name}
                                            {selectedId === item.id && <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"/>}
                                        </div>
                                        <div className="text-xs text-slate-500 mt-0.5 group-hover:text-slate-300 transition-colors">{item.fullName}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-mono text-sm text-white font-bold">{item.current}</div>
                                        <div className={clsx("text-xs font-bold flex items-center justify-end gap-1 mt-0.5", isUp ? "text-emerald-500" : "text-red-500")}>
                                            {isUp ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                                            {item.change}%
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </aside>
                )}

                <main className="flex-1 flex flex-col bg-[#0B0E14] relative">
                    
                    <div className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#0B0E14]">
                        {viewMode === 'individual' ? (
                            <div className="flex items-center gap-4 animate-fade-in">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/20">
                                    {selectedAsset.name[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">{selectedAsset.fullName}</h2>
                                    <span className="text-xs text-slate-500 font-mono tracking-wider">TICKER: {selectedAsset.name}</span>
                                </div>
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 animate-fade-in">
                                <div className="p-2 bg-slate-800 rounded-lg text-indigo-400">
                                    <Layers size={24}/>
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-white leading-tight">Сводный анализ</h2>
                                    <span className="text-xs text-slate-500 font-mono tracking-wider">Сравнение {assets.length} объектов</span>
                                </div>
                            </div>
                        )}

                        <div className="text-right">
                            {viewMode === 'individual' ? (
                                <>
                                    <div className={clsx("text-3xl font-black font-mono tracking-tight", isPositive ? "text-emerald-400" : "text-red-400")}>
                                        {selectedAsset.current}
                                    </div>
                                    <div className={clsx("text-xs font-bold uppercase tracking-wider", isPositive ? "text-emerald-600" : "text-red-600")}>
                                        Текущий показатель
                                    </div>
                                </>
                            ) : (
                                <div className="flex -space-x-2">
                                    {assets.slice(0,5).map(a => (
                                        <div key={a.id} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-700 flex items-center justify-center text-xs font-bold text-white" style={{backgroundColor: a.color}}>
                                            {a.name[0]}
                                        </div>
                                    ))}
                                    {assets.length > 5 && <div className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-400">+{assets.length-5}</div>}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 p-6 relative">
                        <ResponsiveContainer width="100%" height="100%">
                            {viewMode === 'individual' ? (
                                <AreaChart data={selectedAsset.history}>
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3}/>
                                            <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                    <XAxis dataKey="date" stroke="#475569" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="#475569" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} domain={['auto', 'auto']} dx={-10} />
                                    <Tooltip 
                                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#f8fafc', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)' }}
                                        itemStyle={{ color: chartColor, fontWeight: 'bold' }}
                                        cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }}
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
                                    <XAxis dataKey="name" stroke="#475569" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} dy={10} />
                                    <YAxis stroke="#475569" tick={{fontSize: 12, fill: '#64748b'}} axisLine={false} tickLine={false} domain={['auto', 'auto']} dx={-10} />
                                    
                                    <Tooltip content={<CustomComparisonTooltip />} cursor={{ stroke: '#fff', strokeWidth: 1, strokeDasharray: '4 4' }} />
                                    
                                    <Legend wrapperStyle={{paddingTop: '20px'}} />

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
                    </div>

                    <div className="h-14 border-t border-slate-800 bg-[#0B0E14] flex items-center justify-center gap-2">
                        {['1W', '1M', '3M', 'YTD', 'ALL'].map(t => (
                            <button 
                                key={t}
                                className={clsx(
                                    "px-4 py-1.5 rounded-full text-xs font-bold transition uppercase tracking-wider",
                                    (timeRange === t) 
                                    ? "text-white bg-slate-700" 
                                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                                )}
                                onClick={() => setTimeRange(t as any)}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                </main>
            </div>
        </div>
    );
};