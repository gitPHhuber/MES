import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, TrendingUp, TrendingDown, Users, Search, Factory,
  Medal, Star, Loader2, BarChart3, Boxes, Calendar, X, Minus
} from "lucide-react";
import { fetchRankings, RankingResponse, RankingUser, RankingTeam, Period, RankingsParams, SparklinePoint } from "src/api/rankingsApi";
import { LineChart, Line, ResponsiveContainer } from "recharts";
import clsx from "clsx";
import dayjs from "dayjs";

type Tab = "users" | "teams" | "sections";

const periodLabels: Record<Period, string> = {
  day: "Сегодня",
  week: "Эта неделя",
  month: "Этот месяц",
  year: "За год",
  all: "Всё время",
  custom: "Период"
};

const mainPeriods: Period[] = ["day", "week", "month", "year", "all"];

/**
 * Компонент мини-графика (спарклайн)
 */
const Sparkline: React.FC<{ data: SparklinePoint[]; color?: string }> = ({ data, color }) => {
  if (!data || data.length < 2) {
    return <div className="w-20 h-8 flex items-center justify-center text-slate-300">—</div>;
  }

  // Определяем тренд по цвету
  const firstValue = data[0]?.value || 0;
  const lastValue = data[data.length - 1]?.value || 0;
  const isUp = lastValue >= firstValue;
  const lineColor = color || (isUp ? "#10b981" : "#ef4444");

  return (
    <div className="w-20 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data}>
          <Line 
            type="monotone" 
            dataKey="value" 
            stroke={lineColor}
            strokeWidth={1.5}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

/**
 * Компонент индикатора изменения
 */
const ChangeIndicator: React.FC<{ change: number; showPercent?: boolean }> = ({ change, showPercent }) => {
  if (change === 0) {
    return (
      <div className="flex items-center gap-1 text-slate-400">
        <Minus size={14} />
        <span className="text-sm font-medium">0</span>
      </div>
    );
  }

  const isPositive = change > 0;
  
  return (
    <div className={clsx(
      "flex items-center gap-1",
      isPositive ? "text-emerald-600" : "text-red-500"
    )}>
      {isPositive ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
      <span className="text-sm font-bold">
        {isPositive ? "+" : ""}{change}
      </span>
    </div>
  );
};

const RankingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("week");
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");
  const [appliedDateRange, setAppliedDateRange] = useState<{ start: string; end: string } | null>(null);

  const loadData = useCallback(async (params: RankingsParams) => {
    setLoading(true);
    try {
      const res = await fetchRankings(params);
      setData(res);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (period === "custom" && appliedDateRange) {
      loadData({
        period: "custom",
        startDate: appliedDateRange.start,
        endDate: appliedDateRange.end
      });
    } else if (period !== "custom") {
      loadData({ period });
    }
  }, [period, appliedDateRange, loadData]);

  const handlePeriodChange = (newPeriod: Period) => {
    if (newPeriod === "custom") {
      setShowDatePicker(true);
    } else {
      setPeriod(newPeriod);
      setShowDatePicker(false);
      setAppliedDateRange(null);
    }
  };

  const applyCustomRange = () => {
    if (customStartDate && customEndDate) {
      setAppliedDateRange({
        start: customStartDate,
        end: customEndDate
      });
      setPeriod("custom");
      setShowDatePicker(false);
    }
  };

  const resetCustomRange = () => {
    setCustomStartDate("");
    setCustomEndDate("");
    setAppliedDateRange(null);
    setShowDatePicker(false);
    setPeriod("week");
  };

  const applyPreset = (days: number) => {
    const end = dayjs().format("YYYY-MM-DD");
    const start = dayjs().subtract(days, "day").format("YYYY-MM-DD");
    setCustomStartDate(start);
    setCustomEndDate(end);
  };

  const sectionsStats = useMemo(() => {
    if (!data?.teams) return [];
    const map = new Map();
    data.teams.forEach(team => {
      const sectionName = team.section || "Без участка";
      if (!map.has(sectionName)) {
        map.set(sectionName, { 
          title: sectionName, 
          totalOutput: 0, 
          warehouseOutput: 0,
          productionOutput: 0,
          totalMembers: 0, 
          teamsCount: 0 
        });
      }
      const s = map.get(sectionName);
      s.totalOutput += team.totalOutput;
      s.warehouseOutput += team.warehouseOutput;
      s.productionOutput += team.productionOutput;
      s.totalMembers += team.membersCount;
      s.teamsCount += 1;
    });
    return Array.from(map.values()).sort((a: any, b: any) => b.totalOutput - a.totalOutput);
  }, [data]);

  const filteredUsers = data?.users.filter(u => 
    u.surname.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.teamName.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const filteredTeams = data?.teams.filter(t => 
    t.title.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  const formatDateRange = () => {
    if (appliedDateRange) {
      const start = dayjs(appliedDateRange.start).format("DD.MM.YYYY");
      const end = dayjs(appliedDateRange.end).format("DD.MM.YYYY");
      return `${start} — ${end}`;
    }
    return periodLabels[period];
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      
      {/* Хедер */}
      <div className="bg-slate-900 pt-8 pb-32 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden opacity-20 pointer-events-none">
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-indigo-500 rounded-full blur-[100px]"></div>
          <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-emerald-500 rounded-full blur-[80px]"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
            <div>
              <h1 className="text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Trophy className="text-yellow-400 fill-yellow-400" size={36}/> 
                Центр Эффективности
              </h1>
              <p className="text-slate-400 mt-2 font-medium">
                Мониторинг производственных показателей
              </p>
            </div>

            {/* Выбор периода */}
            <div className="flex flex-col items-end gap-2">
              <div className="bg-slate-800/50 backdrop-blur-md p-1.5 rounded-xl flex flex-wrap gap-1 border border-slate-700/50">
                {mainPeriods.map(p => (
                  <button
                    key={p}
                    onClick={() => handlePeriodChange(p)}
                    className={clsx(
                      "px-4 py-2 rounded-lg text-sm font-bold transition-all whitespace-nowrap",
                      period === p && !appliedDateRange
                        ? "bg-indigo-600 text-white shadow-lg" 
                        : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                    )}
                  >
                    {periodLabels[p]}
                  </button>
                ))}
                
                <button
                  onClick={() => setShowDatePicker(!showDatePicker)}
                  className={clsx(
                    "px-4 py-2 rounded-lg text-sm font-bold transition-all flex items-center gap-2",
                    appliedDateRange
                      ? "bg-indigo-600 text-white shadow-lg" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  <Calendar size={16} />
                  {appliedDateRange ? formatDateRange() : "Период"}
                </button>
              </div>

              {/* Date picker dropdown */}
              {showDatePicker && (
                <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 shadow-2xl mt-2 w-80">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-semibold">Выбрать период</span>
                    <button 
                      onClick={() => setShowDatePicker(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {[
                      { label: "7 дней", days: 7 },
                      { label: "14 дней", days: 14 },
                      { label: "30 дней", days: 30 },
                      { label: "90 дней", days: 90 },
                    ].map(preset => (
                      <button
                        key={preset.days}
                        onClick={() => applyPreset(preset.days)}
                        className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition"
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Начало</label>
                      <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        max={customEndDate || undefined}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 text-xs mb-1 block">Конец</label>
                      <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        min={customStartDate || undefined}
                        max={dayjs().format("YYYY-MM-DD")}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2 mt-4">
                    <button
                      onClick={resetCustomRange}
                      className="flex-1 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm text-slate-300 transition"
                    >
                      Сбросить
                    </button>
                    <button
                      onClick={applyCustomRange}
                      disabled={!customStartDate || !customEndDate}
                      className={clsx(
                        "flex-1 px-4 py-2 rounded-lg text-sm font-bold transition",
                        customStartDate && customEndDate
                          ? "bg-indigo-600 hover:bg-indigo-500 text-white"
                          : "bg-slate-700 text-slate-500 cursor-not-allowed"
                      )}
                    >
                      Применить
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Общая статистика */}
          {data?.totals && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <BarChart3 size={16} />
                  <span className="text-xs uppercase">Всего</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {data.totals.totalOutput.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <Boxes size={16} />
                  <span className="text-xs uppercase">Склад</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {data.totals.warehouseOutput.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-emerald-400 mb-2">
                  <Factory size={16} />
                  <span className="text-xs uppercase">Производство</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {data.totals.productionOutput.toLocaleString()}
                </div>
              </div>

              <div className="bg-slate-800/60 backdrop-blur-md rounded-2xl p-4 border border-slate-700/50">
                <div className="flex items-center gap-2 text-slate-400 mb-2">
                  <Users size={16} />
                  <span className="text-xs uppercase">Сотрудников</span>
                </div>
                <div className="text-3xl font-black text-white">
                  {data.totals.usersCount}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Основной контент */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        
        {/* Панель фильтров */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex gap-2">
            {[
              { id: "users", label: "Сотрудники", icon: Users },
              { id: "teams", label: "Бригады", icon: Medal },
              { id: "sections", label: "Участки", icon: Star }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={clsx(
                  "px-4 py-2 rounded-xl font-semibold text-sm flex items-center gap-2 transition",
                  activeTab === tab.id
                    ? "bg-indigo-100 text-indigo-700"
                    : "text-slate-500 hover:bg-slate-100"
                )}
              >
                <tab.icon size={16} />
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Поиск..."
              className="pl-10 pr-4 py-2 border border-slate-200 rounded-xl text-sm w-64 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="animate-spin text-indigo-600" size={40} />
          </div>
        ) : (
          <>
            {/* Таблица сотрудников */}
            {activeTab === "users" && (
              <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                <table className="w-full">
                  <thead className="bg-slate-50 text-xs text-slate-500 uppercase">
                    <tr>
                      <th className="px-4 py-3 text-left w-12">#</th>
                      <th className="px-4 py-3 text-left">Сотрудник</th>
                      <th className="px-4 py-3 text-left">Бригада</th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Boxes size={14} className="text-blue-500" />
                          Склад
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Factory size={14} className="text-emerald-500" />
                          Произв.
                        </div>
                      </th>
                      <th className="px-4 py-3 text-right font-bold">Итого</th>
                      <th className="px-4 py-3 text-center">Динамика</th>
                      <th className="px-4 py-3 text-right">+/−</th>
                      <th className="px-4 py-3 text-right">Эффект.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((user, idx) => (
                      <tr 
                        key={user.id} 
                        className={clsx(
                          "hover:bg-slate-50 transition cursor-pointer",
                          idx < 3 && "bg-yellow-50/30"
                        )}
                      >
                        <td className="px-4 py-4">
                          {idx < 3 ? (
                            <div className={clsx(
                              "w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm",
                              idx === 0 && "bg-yellow-400 text-yellow-900",
                              idx === 1 && "bg-slate-300 text-slate-700",
                              idx === 2 && "bg-orange-300 text-orange-900"
                            )}>
                              {user.place}
                            </div>
                          ) : (
                            <span className="text-slate-400 font-medium">{user.place}</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            {user.avatar ? (
                              <img 
                                src={`${import.meta.env.VITE_API_URL}/${user.avatar}`}
                                alt=""
                                className="w-10 h-10 rounded-full object-cover"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                                {user.surname[0]}{user.name[0]}
                              </div>
                            )}
                            <div>
                              <p className="font-semibold text-slate-800">
                                {user.surname} {user.name}
                              </p>
                              <p className="text-xs text-slate-400">{user.sectionName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-sm text-slate-600">
                          {user.teamName}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-medium text-blue-600">
                            {user.warehouseOutput > 0 ? user.warehouseOutput : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-medium text-emerald-600">
                            {user.productionOutput > 0 ? user.productionOutput : "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="text-xl font-black text-slate-800">
                            {user.output}
                          </span>
                        </td>
                        {/* Спарклайн */}
                        <td className="px-4 py-4">
                          <div className="flex justify-center">
                            <Sparkline data={user.sparkline} />
                          </div>
                        </td>
                        {/* Изменение за день */}
                        <td className="px-4 py-4 text-right">
                          <ChangeIndicator change={user.dailyChange?.change || 0} />
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className={clsx(
                            "px-2 py-0.5 rounded-full text-xs font-bold",
                            user.efficiency >= 95 && "bg-emerald-100 text-emerald-700",
                            user.efficiency >= 80 && user.efficiency < 95 && "bg-yellow-100 text-yellow-700",
                            user.efficiency < 80 && "bg-red-100 text-red-700"
                          )}>
                            {user.efficiency}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filteredUsers.length === 0 && (
                  <div className="text-center py-20 text-slate-500">
                    Нет данных за выбранный период
                  </div>
                )}
              </div>
            )}

            {/* Карточки бригад */}
            {activeTab === "teams" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredTeams.map((team, idx) => (
                  <div 
                    key={team.id}
                    className={clsx(
                      "bg-white rounded-2xl shadow-lg p-6 border-l-4 transition hover:shadow-xl",
                      idx === 0 && "border-yellow-400",
                      idx === 1 && "border-slate-400",
                      idx === 2 && "border-orange-400",
                      idx > 2 && "border-slate-200"
                    )}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-lg">{team.title}</h3>
                        <p className="text-sm text-slate-500">{team.section}</p>
                      </div>
                      <div className={clsx(
                        "w-10 h-10 rounded-xl flex items-center justify-center font-bold",
                        idx === 0 && "bg-yellow-100 text-yellow-700",
                        idx === 1 && "bg-slate-200 text-slate-700",
                        idx === 2 && "bg-orange-100 text-orange-700",
                        idx > 2 && "bg-slate-100 text-slate-500"
                      )}>
                        {idx + 1}
                      </div>
                    </div>

                    <div className="text-4xl font-black text-slate-800 mb-2">
                      {team.totalOutput.toLocaleString()}
                    </div>

                    <div className="flex gap-4 mb-4 text-sm">
                      <div className="flex items-center gap-1">
                        <Boxes size={14} className="text-blue-500" />
                        <span className="text-blue-600 font-medium">{team.warehouseOutput}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Factory size={14} className="text-emerald-500" />
                        <span className="text-emerald-600 font-medium">{team.productionOutput}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm text-slate-500">
                      <span>{team.membersCount} чел.</span>
                      <span>Эфф. {team.avgEfficiency}%</span>
                    </div>

                    <div className="mt-3 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all"
                        style={{ width: `${team.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Участки */}
            {activeTab === "sections" && (
              <div className="space-y-4">
                {sectionsStats.map((section: any, idx: number) => (
                  <div 
                    key={section.title}
                    className="bg-white rounded-2xl shadow-lg p-6 flex items-center gap-6"
                  >
                    <div className={clsx(
                      "w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-black",
                      idx === 0 && "bg-yellow-100 text-yellow-700",
                      idx === 1 && "bg-slate-200 text-slate-700",
                      idx === 2 && "bg-orange-100 text-orange-700",
                      idx > 2 && "bg-slate-100 text-slate-500"
                    )}>
                      {idx + 1}
                    </div>

                    <div className="flex-1">
                      <h3 className="font-bold text-slate-800 text-xl">{section.title}</h3>
                      <p className="text-sm text-slate-500">
                        {section.teamsCount} бригад • {section.totalMembers} человек
                      </p>
                    </div>

                    <div className="flex gap-8 items-center">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-blue-600 mb-1">
                          <Boxes size={16} />
                          <span className="text-2xl font-bold">{section.warehouseOutput.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-400">Склад</p>
                      </div>

                      <div className="text-center">
                        <div className="flex items-center gap-1 text-emerald-600 mb-1">
                          <Factory size={16} />
                          <span className="text-2xl font-bold">{section.productionOutput.toLocaleString()}</span>
                        </div>
                        <p className="text-xs text-slate-400">Производство</p>
                      </div>

                      <div className="text-center border-l border-slate-200 pl-8">
                        <div className="text-3xl font-black text-slate-800">
                          {section.totalOutput.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400">Всего</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default RankingsPage;