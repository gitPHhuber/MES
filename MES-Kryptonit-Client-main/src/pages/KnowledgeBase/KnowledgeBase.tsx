import React, { useState } from "react";
import {
  BookOpen,
  FileText,
  Cpu,
  Package,
  Settings,
  Zap,
  Layout,
  Info,
  ChevronRight,
  Shield,
  Layers
} from "lucide-react";


import VidyBrakaFC from "assets/pdf/Vidy-Braka-FC.pdf";
import VidyBrakaESC from "assets/pdf/Vidy-Braka-ESC.pdf";
import Firmware915 from "assets/pdf/Firmware-915.pdf";


type Tab = "OVERVIEW" | "PDF_FC" | "PDF_ESC" | "PDF_915";

interface ModuleCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  tips: string[];
  color: string;
}

const ModuleCard: React.FC<ModuleCardProps> = ({ title, description, icon: Icon, tips, color }) => {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${color} text-white shadow-md`}>
        <Icon size={24} />
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-2 group-hover:text-indigo-600 transition-colors">
        {title}
      </h3>
      <p className="text-slate-500 text-sm mb-4 leading-relaxed">
        {description}
      </p>
      
      <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
        <p className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
          <Info size={12}/> Как пользоваться:
        </p>
        <ul className="space-y-1">
          {tips.map((tip, idx) => (
            <li key={idx} className="text-xs text-slate-600 flex items-start gap-2">
              <span className="mt-1 w-1 h-1 rounded-full bg-indigo-400 flex-shrink-0"/>
              {tip}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

const SystemOverview: React.FC = () => {
  return (
    <div className="animate-fade-in space-y-8 pb-10">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-3xl p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white opacity-10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2 flex items-center gap-3">
            <BookOpen className="opacity-80"/> MES Knowledge Hub
          </h1>
          <p className="text-indigo-100 max-w-2xl text-lg">
            Добро пожаловать в базу знаний «Криптонит». Здесь собрана информация о функционале системы, 
            инструкции по работе с модулями и техническая документация.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        <ModuleCard 
          title="Склад и WMS"
          description="Учет компонентов, приемка поставок, генерация QR-этикеток и управление остатками."
          icon={Package}
          color="bg-emerald-500"
          tips={[
            "Перейдите в раздел 'Склад' для приемки товара.",
            "Используйте 'Инвентаризацию' для сверки остатков.",
            "Печатайте этикетки сразу при создании партии."
          ]}
        />
        
        <ModuleCard 
          title="Сборка и Рецепты"
          description="Пошаговые инструкции для сборщиков, контроль выполнения операций и цифровые паспорта изделий."
          icon={Layers}
          color="bg-blue-500"
          tips={[
            "Технолог создает рецепты в 'Конструкторе'.",
            "Сборщик сканирует QR корпуса в 'Терминале'.",
            "Система подсказывает следующий шаг автоматически."
          ]}
        />

        <ModuleCard 
          title="Прошивка (Firmware)"
          description="Автоматизированная прошивка плат (FC, ELRS, Coral) с проверкой качества и записью логов."
          icon={Cpu}
          color="bg-orange-500"
          tips={[
            "Подключите устройство по USB.",
            "Выберите порт и нажмите 'Прошить'.",
            "Зеленая карточка означает успешную запись в БД."
          ]}
        />

        <ModuleCard 
          title="Администрирование"
          description="Управление пользователями, ролевая модель (RBAC), настройка рабочих мест и аудит."
          icon={Shield}
          color="bg-slate-700"
          tips={[
            "Настраивайте права доступа в разделе RBAC.",
            "Следите за действиями через 'Журнал Аудита'.",
            "Добавляйте новые ПК и привязывайте их к цехам."
          ]}
        />

        <ModuleCard 
          title="Задачи и Проекты"
          description="Планирование производства, постановка задач на смену и отслеживание прогресса по проектам."
          icon={Layout}
          color="bg-purple-500"
          tips={[
            "Создавайте задачи с привязкой к Проекту.",
            "Назначайте ответственных и сроки.",
            "Следите за статусом выполнения в реальном времени."
          ]}
        />

        <ModuleCard 
          title="Аналитика и Рейтинг"
          description="Дашборды эффективности, статистика брака и соревновательная таблица лидеров."
          icon={Zap}
          color="bg-yellow-500"
          tips={[
            "Следите за личным рейтингом в 'Рейтингах'.",
            "Анализируйте причины брака на графиках.",
            "Сравнивайте производительность бригад."
          ]}
        />
      </div>
    </div>
  );
};

export const KnowledgeBase: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>("OVERVIEW");

  const menuItems = [
    { id: "OVERVIEW", label: "О системе MES", icon: Layout },
    { type: "divider", label: "Инструкции (PDF)" },
    { id: "PDF_FC", label: "Виды брака FC", icon: FileText },
    { id: "PDF_ESC", label: "Виды брака ESC", icon: FileText },
    { id: "PDF_915", label: "Инструкция ELRS 915", icon: FileText },
  ];

  return (
    <div className="flex h-[calc(100vh-64px)] bg-slate-50 overflow-hidden">
      
      {/* SIDEBAR */}
      <aside className="w-72 bg-white border-r border-slate-200 flex flex-col shadow-lg z-10">
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <BookOpen className="text-indigo-600"/> База Знаний
          </h2>
          <p className="text-xs text-slate-400 mt-1">Документация и гайды</p>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {menuItems.map((item, idx) => {
            if (item.type === "divider") {
              return (
                <div key={idx} className="pt-4 pb-2 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {item.label}
                </div>
              );
            }
            
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={idx}
                onClick={() => setActiveTab(item.id as Tab)}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive 
                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? "text-indigo-600" : "text-slate-400"} />
                  {item.label}
                </div>
                {isActive && <ChevronRight size={16} className="text-indigo-400"/>}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <div className="text-xs text-slate-400 text-center">
            © 2025 NPK Kryptonit <br/> Internal Documentation
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Декоративный фон */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto h-full flex flex-col">
          
          {activeTab === "OVERVIEW" && <SystemOverview />}

          {activeTab !== "OVERVIEW" && (
            <div className="bg-white rounded-2xl shadow-lg border border-slate-200 h-full flex flex-col overflow-hidden animate-fade-in">
              <div className="bg-slate-800 text-white p-4 flex justify-between items-center shadow-md">
                <span className="font-semibold flex items-center gap-2">
                  <FileText size={18}/> 
                  {menuItems.find(i => i.id === activeTab)?.label}
                </span>
                <span className="text-xs bg-slate-700 px-2 py-1 rounded text-slate-300">PDF Viewer</span>
              </div>
              <div className="flex-1 bg-slate-100">
                {activeTab === "PDF_FC" && (
                  <iframe src={VidyBrakaFC} title="FC" className="w-full h-full border-none"/>
                )}
                {activeTab === "PDF_ESC" && (
                  <iframe src={VidyBrakaESC} title="ESC" className="w-full h-full border-none"/>
                )}
                {activeTab === "PDF_915" && (
                  <iframe src={Firmware915} title="915" className="w-full h-full border-none"/>
                )}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};