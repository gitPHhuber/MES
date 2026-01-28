import React, { useState, useEffect, useMemo } from "react";
import { 
  Users, AlertTriangle, CheckCircle, 
  TrendingUp, TrendingDown, Calendar, BarChart3, Loader2,
  Package, Factory, Boxes, RefreshCw, Clock, CalendarDays
} from "lucide-react";
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, BarChart, Bar
} from 'recharts';
import { $authHost } from "src/api";
import dayjs from "dayjs";
import clsx from "clsx";

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#8b5cf6', '#06b6d4'];

type Period = "day" | "week" | "month" | "year" | "all" | "custom";

interface DashboardData {
  period: string;
  startDate: string;
  endDate: string;
  daysInPeriod: number;
  periodOutput: number;
  periodDefects: number;
  defectRate: number;
  todayOutput: number;
  yesterdayOutput: number;
  activeUsers: number;
  activeUsersToday: number;
  stock: { totalItems: number; totalBoxes: number };
  productionByDay: { date: string; name: string; fullDate: string; output: number; defects: number }[];
  defectTypes: { name: string; value: number }[];
  topUsers: { id: number; name: string; output: number }[];
  teamStats: { id: number; name: string; output: number; members: number }[];
  generatedAt: string;
}

const PERIOD_LABELS: Record<Period, string> = {
  day: "Сегодня",
  week: "Неделя",
  month: "Месяц",
  year: "Год",
  all: "Всё время",
  custom: "Произвольный"
};

export const ProductionDashboard: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Период
  const [period, setPeriod] = useState<Period>("week");
  const [customStart, setCustomStart] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'));
  const [customEnd, setCustomEnd] = useState(dayjs().format('YYYY-MM-DD'));
  const [showCustomPicker, setShowCustomPicker] = useState(false);

  // Загрузка данных
  const loadDashboard = async (selectedPeriod: Period = period) => {
    setLoading(true);
    setError(null);
    
    try {
      let url = `api/warehouse/analytics/dashboard?period=${selectedPeriod}`;
      
      if (selectedPeriod === 'custom') {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      
      console.log("[Dashboard] Загрузка:", url);
      const response = await $authHost.get(url);
      console.log("[Dashboard] Данные:", response.data);
      setData(response.data);
    } catch (e: any) {
      console.error("[Dashboard] Ошибка:", e);
      setError(e.response?.data?.message || "Ошибка загрузки данных");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard(period);
  }, [period]);

  // Смена периода
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
    loadDashboard('custom');
  };

  // Расчёт изменения к вчера
  const outputChange = useMemo(() => {
    if (!data) return { value: 0, isPositive: true };
    const change = data.todayOutput - data.yesterdayOutput;
    const percent = data.yesterdayOutput > 0 
      ? Math.round((change / data.yesterdayOutput) * 100)
      : (data.todayOutput > 0 ? 100 : 0);
    return { value: percent, isPositive: percent >= 0 };
  }, [data]);

  // Норма брака (2%)
  const DEFECT_NORM = 2.0;
  const isDefectOverNorm = (data?.defectRate || 0) > DEFECT_NORM;

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="animate-spin text-indigo-600 mx-auto mb-4" size={48} />
          <p className="text-slate-500 font-medium">Загрузка данных...</p>
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
          <p className="text-red-600 font-medium mb-4">{error}</p>
          <button
            onClick={() => loadDashboard()}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-20 font-sans text-gray-700">
      
      {/* Заголовок */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              <BarChart3 size={32}/>
            </div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Дашборд Производства</h1>
              <p className="text-slate-500 font-medium">Оперативная сводка и метрики эффективности</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {data?.generatedAt && (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Clock size={16} />
                {dayjs(data.generatedAt).format("HH:mm:ss")}
              </div>
            )}
            <button
              onClick={() => loadDashboard()}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
              Обновить
            </button>
          </div>
        </div>
      </div>

      {/* Селектор периода */}
      <div className="max-w-7xl mx-auto mb-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays size={20} className="text-indigo-500" />
              <span className="font-medium text-slate-700">Период:</span>
              
              <div className="flex bg-slate-100 p-1 rounded-xl">
                {(["day", "week", "month", "year", "all", "custom"] as Period[]).map(p => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    disabled={loading}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-medium transition",
                      period === p
                        ? "bg-indigo-600 text-white shadow-md"
                        : "text-slate-600 hover:bg-slate-200",
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
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={customStart}
                  onChange={e => setCustomStart(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <span className="text-slate-400">—</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={e => setCustomEnd(e.target.value)}
                  className="px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
                <button
                  onClick={applyCustomPeriod}
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
                >
                  Применить
                </button>
              </div>
            )}

            {/* Инфо о периоде */}
            {data && (
              <div className="text-sm text-slate-500">
                {dayjs(data.startDate).format("DD.MM.YYYY")} — {dayjs(data.endDate).format("DD.MM.YYYY")}
                <span className="text-slate-400 ml-2">({data.daysInPeriod} дн.)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Карточки KPI */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        
        {/* Выпуск за период */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">Выпуск ({PERIOD_LABELS[period]})</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">
                {data?.periodOutput.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle size={24}/>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-medium">
            Среднее в день: <span className="text-slate-800 font-bold">
              {data ? Math.round(data.periodOutput / data.daysInPeriod).toLocaleString() : 0}
            </span>
          </div>
        </div>

        {/* Сегодня vs Вчера */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">Сегодня</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">
                {data?.todayOutput.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Boxes size={24}/>
            </div>
          </div>
          <div className={`mt-4 flex items-center text-xs font-bold w-max px-2 py-1 rounded-lg ${
            outputChange.isPositive 
              ? "text-emerald-600 bg-emerald-50" 
              : "text-red-600 bg-red-50"
          }`}>
            {outputChange.isPositive ? <TrendingUp size={14} className="mr-1"/> : <TrendingDown size={14} className="mr-1"/>}
            {outputChange.isPositive ? "+" : ""}{outputChange.value}% к вчера ({data?.yesterdayOutput || 0})
          </div>
        </div>

        {/* Брак */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">Брак ({PERIOD_LABELS[period]})</p>
              <h3 className={`text-4xl font-black mt-2 ${
                isDefectOverNorm ? "text-red-500" : "text-emerald-500"
              }`}>
                {data?.defectRate || 0}%
              </h3>
            </div>
            <div className={`p-2 rounded-xl ${
              isDefectOverNorm ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              <AlertTriangle size={24}/>
            </div>
          </div>
          <div className={`mt-4 text-xs font-bold w-max px-2 py-1 rounded-lg ${
            isDefectOverNorm ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"
          }`}>
            {data?.periodDefects || 0} шт. {isDefectOverNorm ? `(выше ${DEFECT_NORM}%)` : "— в норме"}
          </div>
        </div>

        {/* Персонал */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">Персонал</p>
              <h3 className="text-4xl font-black text-slate-800 mt-2">
                {data?.activeUsersToday || 0}
                <span className="text-xl text-slate-300">/{data?.activeUsers || 0}</span>
              </h3>
            </div>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Users size={24}/>
            </div>
          </div>
          <div className="mt-4 text-xs text-slate-500 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            Сегодня / за период
          </div>
        </div>
      </div>

      {/* Графики - первый ряд */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* График динамики */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Calendar size={20} className="text-indigo-500"/> Динамика производства
          </h3>
          <div className="h-80 w-full">
            {data?.productionByDay && data.productionByDay.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.productionByDay}>
                  <defs>
                    <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                  <XAxis 
                    dataKey={data.productionByDay.length > 14 ? "fullDate" : "name"} 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 11}} 
                    dy={10}
                    interval={data.productionByDay.length > 14 ? Math.floor(data.productionByDay.length / 7) : 0}
                  />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}}/>
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [value.toLocaleString(), 'Выработка']}
                    labelFormatter={(label) => `Дата: ${label}`}
                  />
                  <Area type="monotone" dataKey="output" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOutput)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Нет данных за период
              </div>
            )}
          </div>
        </div>

        {/* Структура дефектов */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-500"/> Структура дефектов
          </h3>
          <div className="h-64 w-full relative">
            {data?.defectTypes && data.defectTypes.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.defectTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {data.defectTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <span className="text-2xl font-bold text-slate-800">
                    {data.periodDefects}
                  </span>
                  <p className="text-xs text-slate-400">дефектов</p>
                </div>
              </>
            ) : (
              <div className="h-full flex items-center justify-center text-emerald-500">
                <CheckCircle size={48} className="mr-2" />
                <span>Нет дефектов</span>
              </div>
            )}
          </div>
          {data?.defectTypes && data.defectTypes.length > 0 && (
            <div className="space-y-2 mt-4">
              {data.defectTypes.map((type, idx) => (
                <div key={idx} className="flex justify-between items-center text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                    <span className="text-slate-600">{type.name}</span>
                  </div>
                  <span className="font-bold text-slate-800">{type.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Графики - второй ряд */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Топ сотрудников */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Users size={20} className="text-purple-500"/> Топ-5 сотрудников
          </h3>
          <div className="h-64">
            {data?.topUsers && data.topUsers.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.topUsers} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9"/>
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}}/>
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#64748b', fontSize: 12}} 
                    width={100}
                  />
                  <Tooltip 
                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                    formatter={(value: number) => [value.toLocaleString(), 'Выработка']}
                  />
                  <Bar dataKey="output" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-slate-400">
                Нет данных
              </div>
            )}
          </div>
        </div>

        {/* Бригады */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            <Factory size={20} className="text-emerald-500"/> Показатели бригад
          </h3>
          <div className="space-y-4">
            {data?.teamStats && data.teamStats.length > 0 ? (
              data.teamStats.map((team, idx) => {
                const maxOutput = Math.max(...data.teamStats.map(t => t.output));
                const percent = maxOutput > 0 ? (team.output / maxOutput) * 100 : 0;
                
                return (
                  <div key={team.id || idx}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium text-slate-700">{team.name}</span>
                      <span className="text-sm font-bold text-slate-800">{team.output.toLocaleString()}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <div className="text-xs text-slate-400 mt-1">{team.members} сотрудников</div>
                  </div>
                );
              })
            ) : (
              <div className="h-40 flex items-center justify-center text-slate-400">
                Нет данных по бригадам
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Дополнительные метрики */}
      <div className="max-w-7xl mx-auto mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* На складе */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">На складе (общее)</p>
              <h3 className="text-3xl font-black text-slate-800 mt-2">
                {data?.stock.totalItems.toLocaleString() || 0}
              </h3>
            </div>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Package size={24}/>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            {data?.stock.totalBoxes || 0} коробок
          </div>
        </div>

        {/* Всего дефектов за период */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase">Дефектов ({PERIOD_LABELS[period]})</p>
              <h3 className={`text-3xl font-black mt-2 ${
                (data?.periodDefects || 0) > 0 ? "text-red-500" : "text-emerald-500"
              }`}>
                {data?.periodDefects.toLocaleString() || 0}
              </h3>
            </div>
            <div className={`p-2 rounded-xl ${
              (data?.periodDefects || 0) > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              <AlertTriangle size={24}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};