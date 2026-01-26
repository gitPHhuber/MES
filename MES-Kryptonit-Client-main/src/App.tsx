import "./App.css";
import { Header } from "components/Header/Header";
import background from "assets/images/backGroundTest1.svg";
import { AppRouter } from "components/AppRouter";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState, useRef } from "react";
import { Context, getSavedPath, clearSavedPath } from "./main";
import { Preloader } from "./components/common/Preloader";
import { useAuth } from "react-oidc-context";
import { useNavigate, useLocation } from "react-router-dom";
import { SELECT_PC_ROUTE } from "./utils/consts";
import { check } from "./api/userApi";
import { ShieldCheck, Lock, Unlock, Cpu, Activity, X, Sparkles } from "lucide-react"; 
import { Toaster } from 'react-hot-toast'; 

const App = observer(() => {
  const auth = useAuth();
  const context = useContext(Context);
  const navigate = useNavigate();
  const location = useLocation();
  
  const [isUserLoading, setIsUserLoading] = useState(auth.isAuthenticated);
  
  const [showNotification, setShowNotification] = useState(false);
  const [notificationStep, setNotificationStep] = useState(1); 

  // Флаг для предотвращения повторной навигации при восстановлении пути
  const hasRestoredPath = useRef(false);

  if (!context) throw new Error("Context required");
  const { user } = context;

  // Анимация уведомлений
  useEffect(() => {
    const timer1 = setTimeout(() => {
        setNotificationStep(1);
        setShowNotification(true);
    }, 1000);

    const timer2 = setTimeout(() => {
        setShowNotification(false);
    }, 5000);

    const timer3 = setTimeout(() => {
        setNotificationStep(2);
        setShowNotification(true);
    }, 5500);

    return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
        clearTimeout(timer3);
    };
  }, []);

  // ============================================
  // ГЛАВНЫЙ ЭФФЕКТ: Аутентификация + восстановление пути
  // ============================================
  useEffect(() => {
    if (auth.isAuthenticated && auth.user) {
      localStorage.setItem('token', auth.user.access_token);
      setIsUserLoading(true);

      check()
        .then((userData) => {
            user.setUser(userData);
            user.setIsAuth(true);
            
            // Проверяем, выбран ли ПК
            const pcId = localStorage.getItem('pcID');
            
            // Восстанавливаем сохранённый путь (только один раз)
            if (!hasRestoredPath.current) {
              hasRestoredPath.current = true;
              
              // Получаем сохранённый путь из sessionStorage
              const savedPath = getSavedPath();
              
              if (savedPath && savedPath !== "/" && savedPath !== location.pathname) {
                // Есть сохранённый путь - переходим туда
                clearSavedPath();
                navigate(savedPath, { replace: true });
              } else if (!pcId && location.pathname !== SELECT_PC_ROUTE) {
                // Нет ПК и не на странице выбора ПК - редирект на выбор ПК
                navigate(SELECT_PC_ROUTE, { replace: true });
              }
              // Иначе остаёмся на текущей странице
            }
        })
        .catch((err) => {
            console.error("❌ Failed to fetch user profile:", err);
        })
        .finally(() => setIsUserLoading(false));

    } else if (!auth.isLoading && !auth.isAuthenticated) {
      user.resetUser();
      localStorage.removeItem('token');
      localStorage.removeItem('userID');
      setIsUserLoading(false);
      hasRestoredPath.current = false; // Сброс флага при выходе
    }
  }, [auth.isAuthenticated, auth.user, user, navigate, location.pathname]);

  // Прелоадер во время загрузки
  if (auth.isLoading || isUserLoading) {
    return <Preloader />;
  }

  // --- LOGIN SCREEN ---
  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden font-sans">
        
        {/* Background */}
        <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px]"></div>
            <div className="absolute left-0 right-0 top-0 -z-10 m-auto h-[310px] w-[310px] rounded-full bg-blue-400 opacity-20 blur-[100px]"></div>
            <div className="absolute right-0 bottom-0 -z-10 h-[310px] w-[310px] rounded-full bg-emerald-400 opacity-20 blur-[100px]"></div>
        </div>

        {/* --- NOTIFICATION BLOCK --- */}
        <div 
            className={`absolute top-8 right-8 z-50 transition-all duration-700 transform ${showNotification ? 'translate-x-0 opacity-100' : 'translate-x-20 opacity-0'}`}
        >
            <div className="bg-white/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-white/60 max-w-xs relative group cursor-default hover:scale-105 transition-transform duration-300">
                <button 
                    onClick={() => setShowNotification(false)}
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600 transition"
                >
                    <X size={14} />
                </button>

                <div className="flex gap-3">
                    {/* Иконка меняется в зависимости от шага */}
                    <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl shadow-md transition-colors duration-500 ${notificationStep === 1 ? 'bg-gradient-to-br from-yellow-400 to-orange-500' : 'bg-gradient-to-br from-blue-500 to-indigo-600'}`}>
                        {notificationStep === 1 ? '😇' : '👋'}
                    </div>
                    
                    <div>
                        {/* СООБЩЕНИЕ 1: Эмоциональное */}
                        {notificationStep === 1 && (
                            <div className="animate-fadeIn">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-slate-800">Мы стали лучше!</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    С версией <span className="font-bold text-orange-600">2.0</span> работать стало еще удобнее и приятнее.
                                </p>
                            </div>
                        )}

                        {/* СООБЩЕНИЕ 2: Техническое */}
                        {notificationStep === 2 && (
                            <div className="animate-fadeIn">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-sm text-slate-800">Обновление MES</span>
                                    <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-full">v2.1</span>
                                </div>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    <span className="font-semibold text-indigo-600">Система обновлена!</span> 😊 <br/>
                                    Включен контроль доступа (RBAC).
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Login Card */}
        <div className="relative z-10 bg-white/80 backdrop-blur-xl p-8 md:p-12 rounded-3xl shadow-2xl border border-white/50 max-w-md w-full mx-4 flex flex-col items-center transition-all duration-500 hover:shadow-blue-200/50">
           
           <div className="relative w-20 h-20 bg-gradient-to-br from-blue-600 to-emerald-500 rounded-2xl flex items-center justify-center shadow-lg mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300 group">
              <Cpu className="text-white w-10 h-10 group-hover:animate-pulse" strokeWidth={1.5} />
              <div className="absolute inset-0 bg-white opacity-20 rounded-2xl animate-ping"></div>
           </div>

           <div className="flex items-start gap-2 mb-2">
               <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">
                 MES <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-emerald-600">Kryptonit</span>
               </h1>
               <span className="px-2 py-0.5 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-[10px] font-bold shadow-md transform -translate-y-1 rotate-6 border border-white/30">
                   v2.1
               </span>
           </div>
           
           <p className="text-slate-500 text-center mb-8 text-sm font-medium leading-relaxed">
             Единая экосистема управления производством
           </p>

           <button 
              onClick={() => auth.signinRedirect()}
              className="group relative w-full flex items-center justify-center gap-3 bg-slate-900 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-blue-500/30 transition-all duration-300 transform hover:-translate-y-1 active:translate-y-0 overflow-hidden"
           >
              <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transform -skew-x-12 group-hover:animate-[shimmer_1.5s_infinite]"></div>
              
              <div className="bg-white/10 p-1.5 rounded-lg flex items-center justify-center">
                 <Lock className="w-5 h-5 group-hover:hidden transition-all duration-200" />
                 <Unlock className="w-5 h-5 hidden group-hover:block transition-all duration-200 animate-in fade-in zoom-in-75" />
              </div>
              
              <span className="text-md">Войти через единую точку входа</span>
           </button>

           <div className="mt-8 w-full border-t border-slate-100 pt-6">
              <div className="flex justify-between items-center text-xs text-slate-400 font-medium">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    <span>Защищенное соединение</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                    <span>Система в сети</span>
                  </div>
              </div>
           </div>
        </div>

        <div className="absolute bottom-6 text-slate-400 text-xs font-medium text-center w-full opacity-50">
          © 2018-{new Date().getFullYear()} НПК Криптонит. Только для внутреннего пользования.
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
      
      <Header />
      <main
        className="flex-grow mt-16"
        style={{
          backgroundImage: `url(${background})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <AppRouter />
      </main>
    </div>
  );
});

export default App;