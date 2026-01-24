import React, { useContext, Fragment } from "react";
import Logo from "assets/images/logo.svg";
import { NavLink, useLocation } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Context } from "src/main";
import { useAuth } from "react-oidc-context";
import { Menu, Transition } from "@headlessui/react";
import { setSessionOnline } from "src/api/fcApi";
import { DateTimeDisplay } from "./DateTimeDisplay";
import clsx from "clsx";

// Иконки
import {
  Shield, KeySquare, Database, BookText, Archive,
  ClipboardList, Package, Wrench, User, LogOut,
  ChevronDown, PackageCheck, Cpu, Radio, Activity,
  BarChart3, Trophy, PieChart, MonitorPlay, FileText,
  Menu as MenuIcon, CircuitBoard, LineChart,
  // --- ДОБАВЛЕНО: Иконка Сервера ---
  Server,
  // --- ДОБАВЛЕНО: Иконка для Учёта брака ---
  AlertTriangle,
  // --- ДОБАВЛЕНО: Иконка для Производства ---
  Factory
} from "lucide-react";

// Маршруты
import {
  ADMIN_ROUTE, INPUT_DEFECT_ROUTE, ASSEMBLED_PRODUCTS_ROUTE,
  FC_ROUTE, ELRS_915_ROUTE, ELRS_2_4_ROUTE, CORAL_B_ROUTE,
  KNOWLEDGE_BASE_ROUTE, ANALYTICS_DASHBOARD_ROUTE, RANKINGS_ROUTE,
  WAREHOUSE_ROUTE, TASKS_ROUTE, RECIPE_EXECUTION_ROUTE,
  RECIPE_CONSTRUCTOR_ROUTE, ASSEMBLY_ROUTE, ADMIN_ASSEMBLY_ROUTES_ROUTE,
  FIRMWARE_OLD_ROUTE, FIRMWARE_FC_ROUTE, FIRMWARE_915_002_ROUTE,
  FIRMWARE_915_019_ROUTE, FIRMWARE_2_4_ROUTE, FIRMWARE_Coral_B_ROUTE,
  MQTT_CHECK_FC_ROUTE, MQTT_CHECK_ESC_ROUTE, PROFILE_ROUTE, RANKINGS_CHARTS_ROUTE,
  // --- ДОБАВЛЕНО ---
  BERYLL_ROUTE,
  BERYLL_MONITORING_ROUTE,
  // --- ДОБАВЛЕНО: Учёт брака ---
  DEFECTS_ROUTE,
  // --- ДОБАВЛЕНО: Производство ---
  PRODUCTION_ROUTE
} from "src/utils/consts";

type NavItem = {
  label: string;
  icon: React.ElementType;
  to?: string;
  permissions?: string[];
  children?: { label: string; to: string; icon?: React.ElementType }[];
};

export const Header: React.FC = observer(() => {
  const auth = useAuth();
  const context = useContext(Context);
  const location = useLocation();

  if (!context) throw new Error("Context required");
  const { user } = context;

  // --- ЛОГИКА ВЫХОДА ---
  const logOut = async () => {
    try {
      const userId = Number(localStorage.getItem("userID"));
      const pcId = localStorage.getItem("pcID");
      const pcIdNum = pcId === "PERSONAL" ? null : Number(pcId);
      if (userId) await setSessionOnline(false, userId, pcIdNum);
    } catch (error) { console.error(error); }

    user.resetUser();
    localStorage.clear();
    sessionStorage.clear();
    await auth.signoutRedirect({ post_logout_redirect_uri: window.location.origin });
  };

  // --- КОНФИГУРАЦИЯ МЕНЮ ---
  const navigation: NavItem[] = [
    // 1. Операционная деятельность
    {
      label: "Задачи",
      icon: ClipboardList,
      to: TASKS_ROUTE,
    },
    {
      label: "Склад",
      icon: Archive,
      to: WAREHOUSE_ROUTE,
      permissions: ["warehouse.view"]
    },
    {
      label: "Сборка",
      icon: Package,
      permissions: ["assembly.execute", "recipe.manage"],
      children: [
        { label: "Терминал Сборки", to: RECIPE_EXECUTION_ROUTE, icon: MonitorPlay },
        { label: "Конструктор ТК", to: RECIPE_CONSTRUCTOR_ROUTE, icon: FileText },
        { label: "Рабочее место (Legacy)", to: ASSEMBLY_ROUTE, icon: Wrench },
        { label: "Маршруты (Legacy)", to: ADMIN_ASSEMBLY_ROUTES_ROUTE, icon: Wrench },
      ]
    },

    // --- ДОБАВЛЕНО: Производство (Учёт выработки) ---
    {
      label: "Производство",
      icon: Factory,
      to: PRODUCTION_ROUTE,
    },

    // --- ОБНОВЛЕНО: АПК Берилл с подменю ---
    {
      label: "АПК Берилл",
      icon: Server,
      permissions: ["beryll.view"],
      children: [
        { label: "Серверы", to: BERYLL_ROUTE, icon: Server },
        { label: "Мониторинг", to: BERYLL_MONITORING_ROUTE, icon: Activity },
      ]
    },

    // --- ДОБАВЛЕНО: Учёт брака (Дефекты) ---
    {
      label: "Учёт брака",
      icon: AlertTriangle,
      to: DEFECTS_ROUTE,
      permissions: ["defect.manage", "defect.view"]
    },
    
    // 2. Инженерный блок
    {
      label: "Инженерия",
      icon: CircuitBoard, 
      permissions: ["firmware.flash", "devices.view", "defect.manage"],
      children: [
        // Прошивки
        { label: "Прошивка FC", to: FIRMWARE_FC_ROUTE, icon: Cpu },
        { label: "Прошивка ELRS", to: FIRMWARE_915_019_ROUTE, icon: Radio },
        { label: "Прошивка Coral", to: FIRMWARE_Coral_B_ROUTE, icon: Activity },
        // Стенды
        { label: "Тест FC (Стенд)", to: MQTT_CHECK_FC_ROUTE, icon: Activity },
        { label: "Тест ESC (Стенд)", to: MQTT_CHECK_ESC_ROUTE, icon: Activity }, 
        // Базы данных
        { label: "БД: Изделия", to: ASSEMBLED_PRODUCTS_ROUTE, icon: PackageCheck },
        { label: "БД: Компоненты", to: FC_ROUTE, icon: Database },
        // Брак
        { label: "Ввод брака", to: INPUT_DEFECT_ROUTE, icon: KeySquare },
      ]
    },

    // 3. Управление
    {
      label: "Аналитика",
      icon: PieChart,
      permissions: ["analytics.view"],
      children: [
        { label: "Дашборды", to: ANALYTICS_DASHBOARD_ROUTE, icon: BarChart3 },
        { label: "Графики динамики", to: RANKINGS_CHARTS_ROUTE, icon: LineChart },
        { label: "Рейтинг (KPI)", to: RANKINGS_ROUTE, icon: Trophy },
      ]
    },
    
    // 4. Админка
    {
      label: "Админ",
      icon: Shield,
      to: ADMIN_ROUTE,
      permissions: ["admin.access"]
    },
  ];

  // Фильтр прав
  const visibleNav = navigation.filter(item => {
      if (!item.permissions) return true;
      return item.permissions.some(p => user.can(p));
  });

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-sm border-b border-gray-200 h-14 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-4 h-full flex justify-between items-center">
        
        {/* ЛЕВАЯ ЧАСТЬ: Лого */}
        <div className="flex items-center gap-6 min-w-max">
          <NavLink to="/" className="flex items-center gap-2 group">
            <img src={Logo} alt="Logo" className="h-7 w-auto group-hover:opacity-80 transition-opacity" />
            <span className="text-lg font-bold text-slate-800 tracking-tight leading-none">
              MES <span className="text-emerald-600">Kryptonit</span>
            </span>
          </NavLink>
          {/* Вертикальный разделитель */}
          <div className="h-6 w-px bg-gray-200 hidden lg:block"></div>
        </div>

        {/* ЦЕНТР: Навигация (Компактная) */}
        {auth.isAuthenticated && (
          <nav className="hidden lg:flex items-center gap-1">
            {visibleNav.map((item, idx) => (
              <Fragment key={idx}>
                {item.children ? (
                  <Menu as="div" className="relative">
                    <Menu.Button className={({ open }) => clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all outline-none",
                        open ? "bg-slate-100 text-slate-900" : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}>
                      <item.icon size={16} />
                      <span>{item.label}</span>
                      <ChevronDown size={12} className="opacity-50" />
                    </Menu.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-[cubic-bezier(0.16,1,0.3,1)] duration-200"
                      enterFrom="transform opacity-0 scale-95 -translate-y-2"
                      enterTo="transform opacity-100 scale-100 translate-y-0"
                      leave="transition ease-in duration-150"
                      leaveFrom="transform opacity-100 scale-100 translate-y-0"
                      leaveTo="transform opacity-0 scale-95 -translate-y-2"
                    >
                      <Menu.Items className="absolute left-0 mt-2 w-56 origin-top-left divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="p-1">
                          {item.children.map((sub, sIdx) => (
                            <Menu.Item key={sIdx}>
                              {({ active }) => (
                                <NavLink
                                  to={sub.to}
                                  className={clsx(
                                    "flex w-full items-center gap-2 rounded-md px-2 py-2 text-sm",
                                    active ? "bg-slate-100 text-indigo-700 font-medium" : "text-slate-700 hover:bg-slate-50"
                                  )}
                                >
                                  {sub.icon && <sub.icon size={14} className={active ? "text-indigo-600" : "text-slate-400"} />}
                                  {sub.label}
                                </NavLink>
                              )}
                            </Menu.Item>
                          ))}
                        </div>
                      </Menu.Items>
                    </Transition>
                  </Menu>
                ) : (
                  <NavLink
                    to={item.to!}
                    className={({ isActive }) => clsx(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all",
                        isActive 
                          ? "bg-slate-100 text-indigo-700 font-bold" 
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <item.icon size={16} />
                    <span>{item.label}</span>
                  </NavLink>
                )}
              </Fragment>
            ))}
          </nav>
        )}

        {/* ПРАВАЯ ЧАСТЬ: Инфо и Профиль */}
        <div className="flex items-center gap-4 min-w-max">
          {/* Справка - иконкой */}
          <NavLink to={KNOWLEDGE_BASE_ROUTE} title="База знаний" className="p-2 text-slate-400 hover:text-indigo-600 transition">
             <BookText size={20}/>
          </NavLink>

          <div className="hidden xl:block text-right">
             <DateTimeDisplay /> 
          </div>

          {auth.isAuthenticated ? (
            <Menu as="div" className="relative ml-2">
                <Menu.Button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-full hover:bg-slate-100 transition border border-transparent hover:border-slate-200 group outline-none">
                    <div className="flex flex-col items-end leading-none mr-1">
                        <span className="text-xs font-bold text-slate-700">{user.user?.surname} {user.user?.name?.[0]}.</span>
                        <span className="text-[10px] text-slate-400">{user.user?.role}</span>
                    </div>
                    <div className="h-8 w-8 rounded-full bg-slate-200 overflow-hidden ring-2 ring-white shadow-sm">
                         {user.user?.img 
                            ? <img src={`${import.meta.env.VITE_API_URL}/${user.user.img}`} alt="" className="h-full w-full object-cover"/>
                            : <div className="h-full w-full flex items-center justify-center text-slate-500 font-bold text-xs">{user.user?.name?.[0]}</div>
                         }
                    </div>
                </Menu.Button>
                
                <Transition
                    as={Fragment}
                    enter="transition ease-[cubic-bezier(0.16,1,0.3,1)] duration-200"
                    enterFrom="transform opacity-0 scale-95 -translate-y-2"
                    enterTo="transform opacity-100 scale-100 translate-y-0"
                    leave="transition ease-in duration-150"
                    leaveFrom="transform opacity-100 scale-100 translate-y-0"
                    leaveTo="transform opacity-0 scale-95 -translate-y-2"
                >
                    <Menu.Items className="absolute right-0 mt-2 w-48 origin-top-right divide-y divide-gray-100 rounded-lg bg-white shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-50">
                        <div className="p-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <NavLink to={PROFILE_ROUTE} className={clsx("flex w-full items-center rounded-md px-2 py-2 text-sm", active ? "bg-slate-100 text-indigo-700" : "text-slate-700 hover:bg-slate-50")}>
                                        <User className="mr-2 h-4 w-4" /> Профиль
                                    </NavLink>
                                )}
                            </Menu.Item>
                        </div>
                        <div className="p-1">
                            <Menu.Item>
                                {({ active }) => (
                                    <button onClick={logOut} className={clsx("flex w-full items-center rounded-md px-2 py-2 text-sm", active ? "bg-red-50 text-red-700" : "text-gray-700 hover:bg-slate-50")}>
                                        <LogOut className="mr-2 h-4 w-4" /> Выйти
                                    </button>
                                )}
                            </Menu.Item>
                        </div>
                    </Menu.Items>
                </Transition>
            </Menu>
          ) : (
            <button onClick={() => auth.signinRedirect()} className="bg-emerald-600 text-white text-xs font-bold py-2 px-4 rounded-lg hover:bg-emerald-700 transition">
              Войти
            </button>
          )}
        </div>
      </div>
    </div>
  );
});
