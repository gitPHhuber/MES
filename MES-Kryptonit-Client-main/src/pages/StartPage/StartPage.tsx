import React, { useState, useEffect, useContext } from "react";
import { Context } from "src/main";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom";
import clsx from "clsx";
import { 
  Zap, Box, Activity, ArrowRight, Clock, 
  PlayCircle, Users, BookOpen, Settings,
  Cpu, ClipboardList, BarChart3, Radio, Server,
  Monitor, Laptop, RefreshCw, AlertTriangle, CheckCircle2, Circle
} from "lucide-react";
import { 
  BETAFLIGHT_ROUTE, 
  WAREHOUSE_ROUTE, 
  KNOWLEDGE_BASE_ROUTE, 
  TASKS_ROUTE,
  RECIPE_EXECUTION_ROUTE,
  ADMIN_ROUTE,
  RANKINGS_ROUTE
} from "src/utils/consts";
import { fetchPC, fetchSession, fetchUsers } from "src/api/fcApi";

// --- ДАННЫЕ (Updates) ---
const UPDATES = [
    { ver: "2.04", date: "21.01", desc: "Виджет онлайн пользователей." },
    { ver: "2.03", date: "18.09", desc: "Добавлен PRO-режим прошивки FC." },
    { ver: "2.02", date: "05.09", desc: "Новые фильтры в таблицах." },
];

// --- КОМПОНЕНТЫ КАРТОЧЕК ---

// 1. Большая Акцентная Карточка (Hero)
const HeroCard = ({ title, sub, icon: Icon, to }: any) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(to)}
            className="group relative col-span-1 md:col-span-2 lg:col-span-2 row-span-2 cursor-pointer overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-indigo-600 to-violet-700 p-8 text-white shadow-2xl shadow-indigo-200 transition-all duration-500 hover:-translate-y-1 hover:shadow-indigo-300"
        >
            <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white opacity-10 blur-3xl transition-transform duration-700 group-hover:scale-150"></div>
            <div className="absolute bottom-0 left-0 h-40 w-full bg-gradient-to-t from-black/20 to-transparent"></div>

            <div className="relative z-10 flex h-full flex-col justify-between">
                <div className="flex items-start justify-between">
                    <div className="rounded-2xl bg-white/20 p-4 backdrop-blur-md transition-transform duration-300 group-hover:rotate-12">
                        <Icon size={32} className="text-white" />
                    </div>
                    <div className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wider backdrop-blur-md">
                        Основной процесс
                    </div>
                </div>

                <div>
                    <h2 className="text-3xl font-black leading-tight tracking-tight md:text-4xl">{title}</h2>
                    <p className="mt-2 max-w-sm text-sm font-medium text-indigo-100 opacity-90">{sub}</p>
                    <div className="mt-6 flex items-center gap-2 font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-x-2 group-hover:opacity-100">
                        Перейти к работе <ArrowRight size={18} />
                    </div>
                </div>
            </div>
        </div>
    );
};

// 2. Стандартная Карточка
const InfoTile = ({ title, sub, icon: Icon, to, colorClass, iconColor }: any) => {
    const navigate = useNavigate();
    return (
        <div 
            onClick={() => navigate(to)}
            className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl col-span-1"
        >
            <div className={clsx("absolute -right-4 -top-4 h-24 w-24 rounded-full opacity-5 transition-transform duration-500 group-hover:scale-150", colorClass)}></div>
            <div className="flex items-start justify-between">
                <div className={clsx("rounded-2xl p-3 shadow-sm transition-transform duration-300 group-hover:scale-110", colorClass)}>
                    <Icon size={24} className={iconColor} strokeWidth={2} />
                </div>
            </div>
            <div className="mt-4">
                <h3 className="text-lg font-bold text-slate-800 transition-colors group-hover:text-indigo-600">{title}</h3>
                <p className="mt-1 text-xs font-medium text-slate-400">{sub}</p>
            </div>
        </div>
    );
};

// 3. Виджет Статуса + Апдейты
const SystemWidget = () => (
    <div className="col-span-1 md:col-span-1 lg:row-span-2 flex flex-col gap-4">
        <div className="flex-1 rounded-[2rem] border border-slate-100 bg-white p-6 shadow-sm relative overflow-hidden">
             <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                    <Activity size={18} className="text-emerald-500"/> Статус
                </h3>
                <span className="flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-2.5 w-2.5 animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500"></span>
                </span>
             </div>
             <div className="space-y-4">
                 <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                     <div className="flex items-center gap-3">
                         <div className="rounded-lg bg-white p-1.5 shadow-sm"><Server size={14} className="text-slate-500"/></div>
                         <div className="text-xs font-bold text-slate-600">Core API</div>
                     </div>
                     <span className="text-[10px] font-bold text-emerald-600">ONLINE</span>
                 </div>
                 <div className="flex items-center justify-between rounded-xl bg-slate-50 p-3">
                     <div className="flex items-center gap-3">
                         <div className="rounded-lg bg-white p-1.5 shadow-sm"><Radio size={14} className="text-slate-500"/></div>
                         <div className="text-xs font-bold text-slate-600">MQTT</div>
                     </div>
                     <span className="text-[10px] font-bold text-emerald-600">ACTIVE</span>
                 </div>
             </div>
        </div>

        <div className="flex-1 rounded-[2rem] border border-slate-100 bg-slate-900 p-6 text-slate-300 shadow-lg relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
            <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
                <Zap size={16} className="text-yellow-400 fill-yellow-400"/> Updates
            </h3>
            <div className="space-y-3">
                {UPDATES.map((u, i) => (
                    <div key={i} className="flex items-start gap-3 text-xs">
                        <span className="font-mono text-indigo-400 min-w-[32px]">{u.ver}</span>
                        <p className="leading-snug opacity-80">{u.desc}</p>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

// 4. НОВЫЙ: Виджет онлайн пользователей (встроенный в bento)
interface OnlineUser {
  id: number;
  name: string;
  surname: string;
  role: string;
  pcName: string | null;
  isPersonalLaptop: boolean;
}

const OnlineUsersWidget = () => {
    const context = useContext(Context);
    const { flightController } = context || {};

    const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

    const loadOnlineUsers = async () => {
        try {
            setLoading(true);
            const [sessions, users, pcs] = await Promise.all([
                fetchSession(),
                fetchUsers(),
                fetchPC().catch(() => [])
            ]);

            const activeSessions = sessions.filter((s: any) => s.online === true);

            const online: OnlineUser[] = activeSessions.map((session: any) => {
                const user = users.find((u: any) => u.id === session.userId);
                const pc = pcs.find((p: any) => p.id === session.PCId);
                return {
                    id: user?.id || 0,
                    name: user?.name || "Неизвестный",
                    surname: user?.surname || "",
                    role: user?.role || "USER",
                    pcName: pc?.pc_name || null,
                    isPersonalLaptop: session.PCId === null
                };
            });

            const uniqueOnline = online.filter((user, index, self) => 
                index === self.findIndex(u => u.id === user.id)
            );

            setOnlineUsers(uniqueOnline);
            setLastUpdate(new Date());
        } catch (e) {
            console.error("Ошибка загрузки онлайн пользователей:", e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadOnlineUsers();
        const interval = setInterval(loadOnlineUsers, 30000);
        return () => clearInterval(interval);
    }, []);

    const getRoleLabel = (role: string) => {
        const roles: Record<string, string> = {
            SUPER_ADMIN: "Админ", ADMIN: "Админ", PRODUCTION_CHIEF: "Нач. пр.",
            WAREHOUSE_MASTER: "Склад", TECHNOLOGIST: "Техн.", ASSEMBLER: "Сборщик",
            REPAIR: "Ремонт", OTK: "ОТК", USER: "User"
        };
        return roles[role] || role;
    };

    const canReboot = onlineUsers.length === 0;

    return (
        <div className="col-span-1 md:col-span-2 row-span-2 rounded-[2rem] border border-slate-100 bg-white shadow-sm overflow-hidden flex flex-col">
            {/* Заголовок */}
            <div className="p-5 border-b border-slate-100 flex-shrink-0">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={clsx(
                            "p-2.5 rounded-xl",
                            onlineUsers.length > 0 ? "bg-emerald-100" : "bg-slate-100"
                        )}>
                            <Users size={20} className={onlineUsers.length > 0 ? "text-emerald-600" : "text-slate-500"} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800">Сейчас в системе</h3>
                            <p className="text-xs text-slate-400">
                                Обн: {lastUpdate.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className={clsx(
                            "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold",
                            canReboot 
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                        )}>
                            {canReboot ? (
                                <><CheckCircle2 size={12} /> OK</>
                            ) : (
                                <><AlertTriangle size={12} /> {onlineUsers.length}</>
                            )}
                        </div>
                        <button
                            onClick={loadOnlineUsers}
                            disabled={loading}
                            className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
                        >
                            <RefreshCw size={14} className={clsx("text-slate-500", loading && "animate-spin")} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Контент */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading && onlineUsers.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <RefreshCw size={20} className="text-slate-300 animate-spin" />
                    </div>
                ) : onlineUsers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-14 h-14 mb-3 rounded-full bg-slate-100 flex items-center justify-center">
                            <Users size={24} className="text-slate-400" />
                        </div>
                        <p className="font-medium text-slate-600 text-sm">Никого нет</p>
                        <p className="text-xs text-slate-400 mt-1">Можно ребутать сервер</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {onlineUsers.map((user) => (
                            <div
                                key={user.id}
                                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
                            >
                                <div className="flex items-center gap-2.5">
                                    <div className="relative">
                                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold">
                                            {user.name[0]}{user.surname?.[0] || ""}
                                        </div>
                                        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full"></span>
                                    </div>
                                    <div>
                                        <div className="font-semibold text-slate-800 text-sm leading-tight">
                                            {user.name} {user.surname?.[0] ? user.surname[0] + "." : ""}
                                        </div>
                                        <span className="text-[10px] font-medium text-slate-400">
                                            {getRoleLabel(user.role)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                    {user.isPersonalLaptop ? (
                                        <Laptop size={12} />
                                    ) : (
                                        <Monitor size={12} />
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Футер */}
            {onlineUsers.length > 0 && (
                <div className="px-5 py-2.5 bg-slate-50 border-t border-slate-100 flex-shrink-0">
                    <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-500">
                            Онлайн: <span className="font-bold text-emerald-600">{onlineUsers.length}</span>
                        </span>
                        <div className="flex items-center gap-1 text-slate-400">
                            <Circle size={6} className="fill-emerald-500 text-emerald-500" />
                            <span>Live</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};


// --- ОСНОВНАЯ СТРАНИЦА ---
export const StartPage: React.FC = observer(() => {
    const { user } = useContext(Context)!;
    const [greeting, setGreeting] = useState("");
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            setCurrentTime(now);
            const hour = now.getHours();
            if (hour < 12) setGreeting("Доброе утро");
            else if (hour < 18) setGreeting("Добрый день");
            else setGreeting("Добрый вечер");
        };
        updateTime();
        const t = setInterval(updateTime, 1000);
        return () => clearInterval(t);
    }, []);

    const today = currentTime.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
    const isAdmin = user.can('admin.access') || user.can('users.manage');

    return (
        <div className="min-h-screen bg-[#F6F8FA] p-6 lg:p-10 font-sans text-slate-800 pb-20">
            <div className="max-w-[1400px] mx-auto animate-fade-in-up">
                
                {/* HEADER */}
                <div className="mb-10 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                            <Clock size={14} className="text-indigo-500"/>
                            {today}
                        </div>
                        <h1 className="text-4xl font-black tracking-tight text-slate-900 md:text-5xl">
                            {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">{user.user?.name || "Коллега"}</span>.
                        </h1>
                        <p className="mt-2 text-lg font-medium text-slate-500">
                            Добро пожаловать в единое рабочее пространство.
                        </p>
                    </div>
                    
                    <div className="hidden md:block">
                        <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-3 shadow-sm border border-slate-100">
                            <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                                {user.user?.name?.[0] || "U"}
                            </div>
                            <div>
                                <div className="text-xs font-bold uppercase text-slate-400">Ваша роль</div>
                                <div className="font-bold text-indigo-600">{user.user?.role || "Сотрудник"}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* BENTO GRID */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4 auto-rows-auto">
                    
                    {/* СБОРКА */}
                    <HeroCard 
                        title="Терминал Сборки" 
                        sub="Интерактивные инструкции и контроль этапов производства"
                        icon={PlayCircle}
                        to={RECIPE_EXECUTION_ROUTE}
                    />

                    {/* БЫСТРЫЕ ДЕЙСТВИЯ */}
                    <InfoTile title="Задачи" sub="Мой план на смену" icon={ClipboardList} to={TASKS_ROUTE} colorClass="bg-blue-500" iconColor="text-blue-600" />
                    <InfoTile title="Склад" sub="Остатки и движение" icon={Box} to={WAREHOUSE_ROUTE} colorClass="bg-emerald-500" iconColor="text-emerald-600" />
                    <InfoTile title="Прошивка FC" sub="Утилиты Betaflight" icon={Cpu} to={BETAFLIGHT_ROUTE} colorClass="bg-orange-500" iconColor="text-orange-600" />
                    <InfoTile title="Аналитика" sub="Рейтинги и отчеты" icon={BarChart3} to={RANKINGS_ROUTE} colorClass="bg-purple-500" iconColor="text-purple-600" />

                    {/* СТАТУС СИСТЕМЫ */}
                    <SystemWidget />
                    
                    {/* ДОПОЛНИТЕЛЬНО */}
                    <InfoTile title="База Знаний" sub="Регламенты и PDF" icon={BookOpen} to={KNOWLEDGE_BASE_ROUTE} colorClass="bg-sky-500" iconColor="text-sky-600" />

                    {isAdmin && (
                        <InfoTile title="Админка" sub="Настройки системы" icon={Settings} to={ADMIN_ROUTE} colorClass="bg-slate-800" iconColor="text-slate-700" />
                    )}

                    {/* ОНЛАЙН ПОЛЬЗОВАТЕЛИ - виджет встроен в grid для админов */}
                    {isAdmin && <OnlineUsersWidget />}

                </div>
            </div>
        </div>
    );
});