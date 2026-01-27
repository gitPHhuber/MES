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
  
  // ============================================
  // НОВОЕ: Сохраняем начальный путь при монтировании
  // Это путь из URL при загрузке страницы (до любых редиректов)
  // ============================================
  const initialPathRef = useRef<string | null>(null);
  
  useEffect(() => {
    // Сохраняем начальный путь только один раз при первом рендере
    if (initialPathRef.current === null) {
      const currentPath = window.location.pathname + window.location.search;
      // Не сохраняем если это корень или есть OIDC параметры
      const hasOidcParams = window.location.search.includes('code=') || 
                            window.location.search.includes('state=');
      if (currentPath !== "/" && !hasOidcParams) {
        initialPathRef.current = currentPath;
      }
    }
  }, []);

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
            
            // Восстанавливаем путь (только один раз)
            if (!hasRestoredPath.current) {
              hasRestoredPath.current = true;
              
              // ============================================
              // ИСПРАВЛЕННАЯ ЛОГИКА ВОССТАНОВЛЕНИЯ ПУТИ:
              // 1. Приоритет: начальный путь из URL (при F5)
              // 2. Затем: сохранённый путь из sessionStorage (после OIDC редиректа)
              // 3. Иначе: текущий location.pathname
              // ============================================
              
              const savedPath = getSavedPath();
              const targetPath = initialPathRef.current || savedPath;
              
              // Очищаем сохранённый путь после использования
              if (savedPath) {
                clearSavedPath();
              }
              
              // Определяем нужно ли делать навигацию
              const currentPath = location.pathname;
              
              if (targetPath && targetPath !== "/" && targetPath !== currentPath) {
                // Есть целевой путь, отличный от текущего - переходим туда
                console.log(`[App] Восстанавливаем путь: ${targetPath}`);
                navigate(targetPath, { replace: true });
              } else if (!pcId && currentPath !== SELECT_PC_ROUTE && currentPath === "/") {
                // Нет ПК, на корне - редирект на выбор ПК
                // НО: если мы уже на другой странице (не корень) - НЕ редиректим!
                console.log(`[App] Нет pcID, редирект на выбор ПК`);
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
      initialPathRef.current = null; // Сброс начального пути
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

           <h1 className="text-3xl font-bold text-slate-800 mb-2 tracking-tight">MES Kryptonit</h1>
           <p className="text-slate-500 mb-8 text-center text-sm">Система управления производством</p>
           
           <button
             onClick={() => auth.signinRedirect()}
             className="w-full flex items-center justify-center gap-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-0.5 group"
           >
             <ShieldCheck className="w-5 h-5 group-hover:animate-bounce" />
             <span>Войти через Keycloak</span>
           </button>

           <div className="mt-8 flex items-center gap-2 text-xs text-slate-400">
              <Lock size={12} />
              <span>Защищено SSO аутентификацией</span>
           </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-6 text-center text-xs text-slate-400">
          <p>© 2024 MES Kryptonit • Версия 2.1</p>
        </div>
      </div>
    );
  }

  // --- MAIN APP ---
  return (
    <div
      style={{ backgroundImage: `url(${background})` }}
      className="bg-cover bg-no-repeat bg-center min-h-screen flex flex-col"
    >
      <Toaster 
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e293b',
            color: '#fff',
            borderRadius: '12px',
          },
        }}
      />
      <Header />
      <main className="flex-1 overflow-auto pb-4 pt-14">
        <AppRouter />
      </main>
    </div>
  );
});

export default App;