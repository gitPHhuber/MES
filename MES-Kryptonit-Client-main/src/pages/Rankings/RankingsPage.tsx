import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Trophy, TrendingUp, Users, Search, Factory, Package,
  Medal, Star, Award, ChevronUp, ChevronDown, Loader2,
  BarChart3, Boxes
} from "lucide-react";
import { fetchRankings, RankingResponse, RankingUser, RankingTeam } from "src/api/rankingsApi";
import clsx from "clsx";

type Period = "day" | "week" | "month";
type Tab = "users" | "teams" | "sections";

/**
 * Обновлённая страница рейтингов с интеграцией ProductionOutput
 * 
 * Показывает:
 * - Общий рейтинг (Склад + Производство)
 * - Разбивку по источникам
 * - Статистику по участкам
 */
const RankingsPage: React.FC = () => {
  const navigate = useNavigate();
  const [period, setPeriod] = useState<Period>("week");
  const [activeTab, setActiveTab] = useState<Tab>("users");
  const [data, setData] = useState<RankingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetchRankings(period);
        setData(res);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [period]);

  // Агрегация по участкам
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

  const periodLabels: Record<Period, string> = {
    day: "Сегодня",
    week: "Эта неделя",
    month: "Этот месяц"
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans text-slate-800">
      
      {/* Шапка */}
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

            {/* Переключатель периода */}
            <div className="bg-slate-800/50 backdrop-blur-md p-1.5 rounded-xl flex gap-1 border border-slate-700/50">
              {(["day", "week", "month"] as const).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    "px-5 py-2 rounded-lg text-sm font-bold transition-all",
                    period === p 
                      ? "bg-indigo-600 text-white shadow-lg" 
                      : "text-slate-400 hover:text-white hover:bg-slate-700/50"
                  )}
                >
                  {periodLabels[p]}
                </button>
              ))}
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

      {/* Контент */}
      <div className="max-w-7xl mx-auto px-6 -mt-16 relative z-20">
        
        {/* Панель управления */}
        <div className="bg-white rounded-2xl shadow-xl p-4 mb-6 flex flex-wrap items-center justify-between gap-4">
          {/* Табы */}
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

          {/* Поиск */}
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

            {/* Таблица бригад */}
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

                    {/* Прогресс-бар */}
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

            {/* Таблица участков */}
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
