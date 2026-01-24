import React from "react";
import { 
  Activity, Users, AlertTriangle, CheckCircle, 
  TrendingUp, Clock, Calendar, BarChart3 
} from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area 
} from 'recharts';

// Моковые данные (потом реальные API запросы)
const productionData = [
  { name: 'Пн', output: 400, defects: 24 },
  { name: 'Вт', output: 300, defects: 18 },
  { name: 'Ср', output: 550, defects: 35 },
  { name: 'Чт', output: 480, defects: 20 },
  { name: 'Пт', output: 600, defects: 45 },
  { name: 'Сб', output: 350, defects: 10 },
  { name: 'Вс', output: 200, defects: 5 },
];

const defectTypes = [
  { name: 'Пайка', value: 45 },
  { name: 'Компоненты', value: 25 },
  { name: 'Прошивка', value: 15 },
  { name: 'Механика', value: 15 },
];

const COLORS = ['#6366f1', '#ec4899', '#f59e0b', '#10b981'];

export const ProductionDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 p-6 pb-20 font-sans text-gray-700">
      
      {/* Заголовок */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              <BarChart3 size={32}/>
           </div>
           <div>
              <h1 className="text-3xl font-extrabold text-slate-900">Дашборд Производства</h1>
              <p className="text-slate-500 font-medium">Оперативная сводка и метрики эффективности</p>
           </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* KPI Карточки */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-bold text-slate-400 uppercase">Выпуск сегодня</p>
                      <h3 className="text-4xl font-black text-slate-800 mt-2">1,240</h3>
                  </div>
                  <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl"><CheckCircle size={24}/></div>
              </div>
              <div className="mt-4 flex items-center text-xs font-bold text-emerald-600 bg-emerald-50 w-max px-2 py-1 rounded-lg">
                  <TrendingUp size={14} className="mr-1"/> +12% к вчерашнему
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-bold text-slate-400 uppercase">Активные линии</p>
                      <h3 className="text-4xl font-black text-slate-800 mt-2">8<span className="text-xl text-slate-300">/10</span></h3>
                  </div>
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Activity size={24}/></div>
              </div>
              <div className="mt-4 text-xs text-slate-500 font-medium">
                  Загрузка цеха: <span className="text-slate-800 font-bold">80%</span>
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-bold text-slate-400 uppercase">Брак (Смена)</p>
                      <h3 className="text-4xl font-black text-red-500 mt-2">3.2%</h3>
                  </div>
                  <div className="p-2 bg-red-50 text-red-600 rounded-xl"><AlertTriangle size={24}/></div>
              </div>
              <div className="mt-4 text-xs font-bold text-red-600 bg-red-50 w-max px-2 py-1 rounded-lg">
                  Выше нормы (2.0%)
              </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start">
                  <div>
                      <p className="text-sm font-bold text-slate-400 uppercase">Персонал</p>
                      <h3 className="text-4xl font-black text-slate-800 mt-2">42</h3>
                  </div>
                  <div className="p-2 bg-purple-50 text-purple-600 rounded-xl"><Users size={24}/></div>
              </div>
              <div className="mt-4 text-xs text-slate-500 font-medium flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  Все на рабочих местах
              </div>
          </div>
      </div>

      {/* Графики */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* График выработки */}
          <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <Calendar size={20} className="text-indigo-500"/> Динамика производства (7 дней)
              </h3>
              <div className="h-80 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={productionData}>
                          <defs>
                              <linearGradient id="colorOutput" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                              </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9"/>
                          <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}} dy={10}/>
                          <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8'}}/>
                          <Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}/>
                          <Area type="monotone" dataKey="output" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorOutput)" />
                      </AreaChart>
                  </ResponsiveContainer>
              </div>
          </div>

          {/* Причины брака */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
                  <AlertTriangle size={20} className="text-red-500"/> Структура дефектов
              </h3>
              <div className="h-64 w-full relative">
                  <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                          <Pie
                              data={defectTypes}
                              cx="50%"
                              cy="50%"
                              innerRadius={60}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                          >
                              {defectTypes.map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                          </Pie>
                          <Tooltip />
                      </PieChart>
                  </ResponsiveContainer>
                  {/* Легенда в центре */}
                  <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                      <span className="text-2xl font-bold text-slate-800">100%</span>
                  </div>
              </div>
              <div className="space-y-3 mt-4">
                  {defectTypes.map((type, idx) => (
                      <div key={idx} className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[idx % COLORS.length]}}></div>
                              <span className="text-slate-600">{type.name}</span>
                          </div>
                          <span className="font-bold text-slate-800">{type.value}%</span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Лента событий (Снизу) */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Clock size={20} className="text-blue-500"/> Последние события
              </h3>
              <div className="space-y-4">
                  {[1,2,3].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-3 hover:bg-slate-50 rounded-xl transition cursor-default">
                          <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                              JD
                          </div>
                          <div className="flex-1">
                              <p className="text-sm font-bold text-slate-800">Иванов И.И. завершил сборку партии #4021</p>
                              <p className="text-xs text-slate-500">Участок сборки • Проект "Дрон-Х"</p>
                          </div>
                          <span className="text-xs text-slate-400 font-mono">10:4{i}</span>
                      </div>
                  ))}
              </div>
          </div>

      </div>
    </div>
  );
};