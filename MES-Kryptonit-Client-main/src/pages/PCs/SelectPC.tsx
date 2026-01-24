import { observer } from "mobx-react-lite";
import { useContext, useEffect, useMemo, useState } from "react";
import { Context } from "src/main";
import {
  fetchPC,
  fetchSession,
  fetchUsers,
  setSessionOnline,
} from "src/api/fcApi";
import { pcModelFull } from "src/types/PCModel";
import { SessionModelFull } from "src/types/SessionModel";
import { useNavigate } from "react-router-dom";
import { START_ROUTE } from "src/utils/consts";
import { userGetModel } from "src/types/UserModel";
import { Monitor, Search, MapPin, User, Lock, Wifi, Laptop } from "lucide-react";

export const SelectPC: React.FC = observer(() => {
  const context = useContext(Context);
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");

  if (!context) throw new Error("Context required");
  const { flightController, user } = context;

  useEffect(() => {
    // 🛑 БЛОКИРОВКА: Не делаем запросы, пока не подтверждена авторизация
    if (!user.isAuth) return;

    const loadData = async () => {
      // 1. Загрузка ПК и Сессий (Критично)
      try {
        const [pcs, sessions] = await Promise.all([fetchPC(), fetchSession()]);
        flightController.setPCs(pcs);
        flightController.setSessions(sessions);
      } catch (error) {
        console.error("Ошибка при загрузке списка ПК:", error);
      }

      // 2. Загрузка Пользователей (Не критично)
      // Если у пользователя нет прав (403), мы просто логируем это, но не ломаем страницу
      try {
        const users = await fetchUsers();
        flightController.setUsers(users);
      } catch (error) {
        console.warn("Не удалось загрузить список пользователей (возможно ограничены права):", error);
      }
    };

    loadData();
  }, [user.isAuth]); // Перезапустится, когда user.isAuth станет true

  // --- ЛОГИКА ЗАНЯТОСТИ ---
  const getActiveSessionInfo = (pcId: number) => {
    const session = flightController.sessions.find(
      (s: SessionModelFull) => s.online === true && s.PCId === pcId
    );
    
    if (!session) return null;

    const sessionUser = flightController.users.find(
      (u: userGetModel) => u.id === session.userId
    );

    // Если юзер не найден (нет прав на просмотр), показываем заглушку
    return sessionUser 
      ? { name: sessionUser.name, surname: sessionUser.surname } 
      : { name: "Сотрудник", surname: `ID: ${session.userId}` };
  };

  // --- ВЫБОР ПК ---
  const handleSelectPC = async (pcId: number | null) => {
    const userIdStr = localStorage.getItem("userID");
    if (!userIdStr) {
        alert("Ошибка: ID пользователя не найден. Попробуйте перезайти (F5).");
        return;
    }
    const userId = Number(userIdStr);

    try {
        await setSessionOnline(true, userId, pcId);
        navigate(START_ROUTE);
    } catch (error: any) {
        console.error("Ошибка при выборе ПК:", error);
        alert("Не удалось выбрать рабочее место.");
    }
  };

  // --- ФИЛЬТРАЦИЯ И ГРУППИРОВКА ---
  const groupedPCs = useMemo(() => {
    const filtered = flightController.PCs.filter(pc => 
        pc.pc_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        pc.ip.includes(searchTerm) ||
        pc.cabinet?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const groups: Record<string, pcModelFull[]> = {};
    
    filtered.forEach(pc => {
        const cab = pc.cabinet || "Без кабинета";
        if (!groups[cab]) groups[cab] = [];
        groups[cab].push(pc);
    });

    return groups;
  }, [flightController.PCs, searchTerm]);

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden font-sans flex flex-col">
      
      {/* Фон */}
      <div className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
          <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[500px] w-[500px] rounded-full bg-blue-400 opacity-10 blur-[120px]"></div>
      </div>

      <div className="relative z-10 container mx-auto px-4 py-8 flex flex-col h-screen">
        
        {/* --- ШАПКА --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div>
                <h1 className="text-3xl font-extrabold text-slate-800 flex items-center gap-3">
                    <Monitor className="text-indigo-600" size={32}/>
                    Рабочее место
                </h1>
                <p className="text-slate-500">Выберите компьютер для начала смены</p>
            </div>

            {/* Поиск */}
            <div className="relative w-full md:w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="text-gray-400" size={20}/>
                </div>
                <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-white placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-indigo-500 transition shadow-sm"
                    placeholder="Найти ПК по имени или IP..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
        </div>

        {/* --- КНОПКА ЛИЧНОГО НОУТБУКА --- */}
        <div className="mb-8 animate-fadeIn">
            <button
                onClick={() => handleSelectPC(null)}
                className="w-full md:w-auto flex items-center justify-center gap-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4 rounded-2xl shadow-lg hover:shadow-xl hover:scale-[1.01] transition-all group border border-purple-400"
            >
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm group-hover:bg-white/30 transition">
                    <Laptop size={32} />
                </div>
                <div className="text-left">
                    <h3 className="font-bold text-lg">Я на личном ноутбуке</h3>
                    <p className="text-purple-100 text-sm">Работать без привязки к стационарному ПК</p>
                </div>
            </button>
        </div>

        {/* --- СПИСОК ПК (СКРОЛЛ) --- */}
        <div className="flex-1 overflow-y-auto pr-2 pb-10 custom-scrollbar">
            
            {/* Предупреждение, если сессия уже есть */}
            {localStorage.getItem("pcID") && (
                 <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3 animate-fadeIn">
                     <div className="p-2 bg-yellow-100 rounded-full text-yellow-600">
                         <Lock size={20}/>
                     </div>
                     <div>
                         <h3 className="font-bold text-yellow-800">Внимание</h3>
                         <p className="text-sm text-yellow-700">
                             У вас уже выбран ПК в прошлой сессии. Чтобы сменить его, выйдите из системы и зайдите снова.
                         </p>
                     </div>
                 </div>
            )}

            {Object.keys(groupedPCs).length === 0 ? (
                <div className="text-center py-20 text-gray-400">
                    Компьютеры не найдены (или загружаются)
                </div>
            ) : (
                Object.entries(groupedPCs).map(([cabinet, pcs]) => (
                    <div key={cabinet} className="mb-8">
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <MapPin className="text-indigo-500" size={18}/>
                            <h2 className="text-lg font-bold text-gray-700 uppercase tracking-wide">
                                {cabinet}
                            </h2>
                            <span className="text-xs font-medium bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                                {pcs.length} шт.
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                            {pcs.map(pc => {
                                const activeUser = getActiveSessionInfo(pc.id);
                                const isOccupied = !!activeUser;
                                const isMyPC = localStorage.getItem("pcID") === String(pc.id);

                                return (
                                    <button
                                        key={pc.id}
                                        disabled={isOccupied}
                                        onClick={() => handleSelectPC(pc.id)}
                                        className={`relative group text-left p-4 rounded-2xl border transition-all duration-200 flex flex-col gap-3
                                            ${isOccupied 
                                                ? "bg-slate-50 border-slate-200 opacity-80 cursor-not-allowed" 
                                                : "bg-white border-slate-200 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                                            }
                                            ${isMyPC ? "ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50" : ""}
                                        `}
                                    >
                                        <div className="flex justify-between items-start">
                                            <div className={`p-2.5 rounded-xl ${isOccupied ? "bg-red-100 text-red-500" : "bg-emerald-100 text-emerald-600"}`}>
                                                <Monitor size={22} strokeWidth={2}/>
                                            </div>
                                            {isOccupied ? (
                                                <span className="px-2 py-1 bg-red-50 text-red-600 text-[10px] font-bold uppercase rounded-md border border-red-100">
                                                    Занят
                                                </span>
                                            ) : (
                                                <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-md border border-emerald-100">
                                                    Свободен
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <h3 className="font-bold text-slate-800 text-lg leading-tight truncate" title={pc.pc_name}>
                                                {pc.pc_name}
                                            </h3>
                                            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-500 font-mono">
                                                <Wifi size={12}/> {pc.ip}
                                            </div>
                                        </div>

                                        {isOccupied && (
                                            <div className="mt-auto pt-3 border-t border-slate-100 flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-xs font-bold">
                                                    <User size={12}/>
                                                </div>
                                                <div className="text-xs font-medium text-slate-600 truncate">
                                                    {activeUser.name} {activeUser.surname}
                                                </div>
                                            </div>
                                        )}

                                        {!isOccupied && (
                                            <div className="mt-auto pt-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                                 <div className="w-full py-1.5 bg-indigo-600 text-white text-xs font-bold text-center rounded-lg">
                                                     Выбрать этот ПК
                                                 </div>
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))
            )}
        </div>
      </div>
    </div>
  );
});