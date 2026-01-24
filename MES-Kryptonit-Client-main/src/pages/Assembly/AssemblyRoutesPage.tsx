import React, { useEffect, useMemo, useState } from "react";
import { observer } from "mobx-react-lite";
import {
  fetchAssemblyRoutes,
  createAssemblyRoute,
  updateAssemblyRoute,
  deleteAssemblyRoute,
} from "src/api/assemblyApi";
import type {
  AssemblyRouteModel,
  SaveAssemblyRouteDto,
} from "src/types/AssemblyModels";
import { fetchStructure } from "src/api/structureApi";
import type { SectionModel, TeamModel } from "src/store/StructureStore";
import {
  Network,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Settings2,
  Cpu,
  Hammer,
  Search,
  CheckCircle2,
  Package,
  ArrowRight,
  Info,
  Copy,
  BookOpen
} from "lucide-react";

const getOperationStyle = (op: string) => {
  switch (op) {
    case "ASSEMBLY":
      return { icon: <Hammer size={16} />, color: "bg-blue-100 text-blue-700 border-blue-200", label: "Сборка" };
    case "FIRMWARE":
      return { icon: <Cpu size={16} />, color: "bg-purple-100 text-purple-700 border-purple-200", label: "Прошивка" };
    case "QUALITY":
      return { icon: <CheckCircle2 size={16} />, color: "bg-green-100 text-green-700 border-green-200", label: "ОТК" };
    case "PACKING":
      return { icon: <Package size={16} />, color: "bg-orange-100 text-orange-700 border-orange-200", label: "Упаковка" };
    case "CALIBRATION":
    case "FOCUS":
      return { icon: <Settings2 size={16} />, color: "bg-indigo-100 text-indigo-700 border-indigo-200", label: "Настройка" };
    default:
      return { icon: <ArrowRight size={16} />, color: "bg-gray-100 text-gray-700 border-gray-200", label: "Действие" };
  }
};

export const AssemblyRoutesPage: React.FC = observer(() => {
  const [routes, setRoutes] = useState<AssemblyRouteModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [showHelp, setShowHelp] = useState(false);

  const [sections, setSections] = useState<SectionModel[]>([]);
  const [structureLoading, setStructureLoading] = useState(false);


  const [title, setTitle] = useState("");
  const [productName, setProductName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);

  type StepForm = {
    id?: number;
    order: number;
    title: string;
    operation: string;
    sectionId?: number | "";
    teamId?: number | "";
    description?: string;
  };

  const [steps, setSteps] = useState<StepForm[]>([]);

  const allTeams: TeamModel[] = useMemo(
    () => sections.flatMap((s) => s.production_teams || []),
    [sections]
  );

  const loadRoutes = async () => {
    setLoading(true);
    try {
      const data = await fetchAssemblyRoutes({
        search: search.trim() || undefined,
      });
      setRoutes(data);
    } catch (e) {
      console.error("Не удалось загрузить маршруты сборки", e);
    } finally {
      setLoading(false);
    }
  };

  const loadStructure = async () => {
    setStructureLoading(true);
    try {
      const data = await fetchStructure();
      setSections(data);
    } catch (e) {
      console.error("Не удалось загрузить структуру для сборки", e);
    } finally {
      setStructureLoading(false);
    }
  };

  useEffect(() => {
    void loadRoutes();
    void loadStructure();
  }, []);

  const resetForm = () => {
    setSelectedId(null);
    setTitle("");
    setProductName("");
    setDescription("");
    setIsActive(true);
    setSteps([]);
  };

  const handleSelectRoute = (route: AssemblyRouteModel) => {
    setSelectedId(route.id);
    setTitle(route.title);
    setProductName(route.productName || "");
    setDescription(route.description || "");
    setIsActive(route.isActive);

    const sortedSteps = [...(route.steps || [])].sort(
      (a, b) => a.order - b.order
    );

    setSteps(
      sortedSteps.map((s) => ({
        id: s.id,
        order: s.order,
        title: s.title,
        operation: s.operation,
        sectionId: s.sectionId ?? "",
        teamId: s.teamId ?? "",
        description: s.description || "",
      }))
    );
  };

  const handleAddStep = () => {
    const maxOrder = steps.reduce((max, s) => Math.max(max, s.order), 0);
    setSteps((prev) => [
      ...prev,
      {
        order: maxOrder + 1,
        title: `Новый этап ${maxOrder + 1}`,
        operation: "ASSEMBLY",
        sectionId: "",
        teamId: "",
        description: "",
      },
    ]);
  };

  // === ФУНКЦИЯ ШАБЛОНА ===
  const applyTemplate = () => {
    if (steps.length > 0 && !window.confirm("Это очистит текущие шаги. Продолжить?")) return;
    
    setTitle("Стандартный маршрут: Дрон v1");
    setProductName("Drone-X-2025");
    setDescription("Типовой маршрут сборки и тестирования изделия");
    setSteps([
      { order: 1, title: "Механическая сборка рамы", operation: "ASSEMBLY", sectionId: "", teamId: "", description: "Сборка лучей, установка моторов" },
      { order: 2, title: "Монтаж электроники", operation: "ASSEMBLY", sectionId: "", teamId: "", description: "Пайка регуляторов, установка FC" },
      { order: 3, title: "Прошивка полетника", operation: "FIRMWARE", sectionId: "", teamId: "", description: "Заливка Inav/Betaflight, настройка портов" },
      { order: 4, title: "Калибровка сенсоров", operation: "CALIBRATION", sectionId: "", teamId: "", description: "Акселерометр, компас" },
      { order: 5, title: "Финальный ОТК", operation: "QUALITY", sectionId: "", teamId: "", description: "Проверка вибростендом и визуальный осмотр" },
      { order: 6, title: "Упаковка в кейс", operation: "PACKING", sectionId: "", teamId: "", description: "Комплектация ЗИП и инструкцией" },
    ]);
  };

  const handleStepChange = (
    index: number,
    field: keyof StepForm,
    value: any
  ) => {
    setSteps((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [field]: value } : s))
    );
  };

  const handleRemoveStep = (index: number) => {
    setSteps((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveRoute = async () => {
    if (!title.trim()) {
      alert("Укажи название маршрута");
      return;
    }

    const payload: SaveAssemblyRouteDto = {
      title: title.trim(),
      productName: productName.trim() || undefined,
      description: description.trim() || undefined,
      isActive,
      steps: steps
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((s, index) => ({
          id: s.id,
          order: index + 1,
          title: s.title.trim() || `Шаг ${index + 1}`,
          operation: s.operation.trim() || "MOVE",
          sectionId:
            s.sectionId === "" ? undefined : Number(s.sectionId || undefined),
          teamId: s.teamId === "" ? undefined : Number(s.teamId || undefined),
          description: s.description?.trim() || undefined,
        })),
    };

    try {
      if (selectedId) {
        await updateAssemblyRoute(selectedId, payload);
      } else {
        await createAssemblyRoute(payload);
      }
      await loadRoutes();
      resetForm();
    } catch (e) {
      console.error("Ошибка при сохранении маршрута", e);
      alert("Ошибка при сохранении маршрута");
    }
  };

  const handleDeleteRoute = async () => {
    if (!selectedId) return;
    if (!window.confirm("Точно удалить этот маршрут?")) return;

    try {
      await deleteAssemblyRoute(selectedId);
      await loadRoutes();
      resetForm();
    } catch (e) {
      console.error("Ошибка при удалении маршрута", e);
      alert("Ошибка при удалении маршрута");
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-white p-2 rounded-xl shadow-sm border border-gray-200">
             <Network className="w-8 h-8 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              Маршрутные карты
            </h1>
            <p className="text-gray-500 text-sm">
              Конструктор производственных процессов
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
           <button 
             onClick={() => setShowHelp(!showHelp)}
             className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
           >
             <BookOpen size={18} />
             {showHelp ? "Скрыть справку" : "Как это работает?"}
           </button>
           
           <button
              onClick={applyTemplate}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg hover:bg-indigo-100 transition"
            >
              <Copy size={18} />
              Пример маршрута
            </button>
        </div>
      </div>

      {/* Справка (Collapsible) */}
      {showHelp && (
        <div className="mb-6 bg-gradient-to-r from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100 shadow-sm animate-fade-in">
           <h3 className="font-semibold text-indigo-900 flex items-center gap-2 mb-2">
             <Info size={18}/> Зачем нужны маршруты?
           </h3>
           <ul className="list-disc list-inside text-sm text-indigo-800 space-y-1 ml-2">
             <li>Маршрут определяет последовательность действий над изделием (от сборки до упаковки).</li>
             <li>Когда сборщик сканирует коробку, система смотрит, какой шаг следующий, и подсказывает, что делать.</li>
             <li>Вы можете привязать каждый шаг к конкретному <strong>Участку</strong> (цеху) или <strong>Бригаде</strong>.</li>
             <li><strong>Типы операций</strong> (ASSEMBLY, FIRMWARE) важны для автоматики (например, прошивку нельзя начать, если сборка не завершена).</li>
           </ul>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* ЛЕВАЯ КОЛОНКА: СПИСОК (4 cols) */}
        <div className="xl:col-span-4 space-y-4">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 h-[calc(100vh-200px)] flex flex-col">
              <div className="flex justify-between items-center mb-4">
                 <h2 className="font-semibold text-gray-700">Все маршруты</h2>
                 <button onClick={resetForm} className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1">
                    <Plus size={16}/> Создать
                 </button>
              </div>

              <div className="relative mb-4">
                  <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Поиск..."
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
              </div>

              <div className="flex-1 overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                {loading ? (
                   <div className="text-center py-10 text-gray-400">Загрузка...</div>
                ) : routes.length === 0 ? (
                   <div className="text-center py-10 text-gray-400 text-sm">Нет созданных маршрутов</div>
                ) : (
                   routes.map((r) => (
                     <div
                       key={r.id}
                       onClick={() => handleSelectRoute(r)}
                       className={`group p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${
                         selectedId === r.id 
                           ? "bg-indigo-50 border-indigo-500 ring-1 ring-indigo-500" 
                           : "bg-white border-gray-200 hover:border-indigo-300"
                       }`}
                     >
                        <div className="flex justify-between items-start">
                           <span className="font-semibold text-gray-800 group-hover:text-indigo-700">{r.title}</span>
                           {r.isActive ? (
                              <span className="w-2 h-2 rounded-full bg-green-500 mt-2" title="Активен"></span>
                           ) : (
                              <span className="w-2 h-2 rounded-full bg-gray-300 mt-2" title="Черновик"></span>
                           )}
                        </div>
                        {r.productName && (
                          <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                             <Package size={12}/> {r.productName}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-2">
                           {r.steps?.length || 0} этапов
                        </div>
                     </div>
                   ))
                )}
              </div>
           </div>
        </div>

        {/* ПРАВАЯ КОЛОНКА: ФОРМА (8 cols) */}
        <div className="xl:col-span-8">
           <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              {/* Заголовок формы */}
              <div className="flex justify-between items-start mb-6 pb-4 border-b border-gray-100">
                 <div>
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      {selectedId ? "Редактирование маршрута" : "Создание нового маршрута"}
                    </h2>
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-semibold">
                      ID: {selectedId || "NEW"}
                    </span>
                 </div>
                 {selectedId && (
                   <button
                     onClick={handleDeleteRoute}
                     className="p-2 text-red-500 bg-red-50 hover:bg-red-100 rounded-lg transition"
                     title="Удалить маршрут"
                   >
                     <Trash2 size={20} />
                   </button>
                 )}
              </div>

              {/* Основные поля */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Название маршрута</label>
                     <input
                       value={title}
                       onChange={(e) => setTitle(e.target.value)}
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                       placeholder="Пример: Сборка FC v2 (стандарт)"
                     />
                  </div>
                  <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">Привязка к изделию</label>
                     <input
                       value={productName}
                       onChange={(e) => setProductName(e.target.value)}
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                       placeholder="Например: FC-2025-PRO"
                     />
                  </div>
                  <div className="flex items-end">
                     <label className="flex items-center gap-3 cursor-pointer p-2 border border-gray-200 rounded-lg w-full hover:bg-gray-50 transition">
                        <input
                          type="checkbox"
                          checked={isActive}
                          onChange={(e) => setIsActive(e.target.checked)}
                          className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 font-medium">Маршрут активен</span>
                     </label>
                  </div>
                  <div className="md:col-span-2">
                     <label className="block text-sm font-medium text-gray-700 mb-1">Описание</label>
                     <textarea
                       value={description}
                       onChange={(e) => setDescription(e.target.value)}
                       rows={2}
                       className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                       placeholder="Краткое описание особенностей..."
                     />
                  </div>
              </div>

              {/* Цепочка шагов */}
              <div className="mb-4 flex justify-between items-center">
                 <h3 className="text-lg font-bold text-gray-800">Этапы производства</h3>
                 <button
                    onClick={handleAddStep}
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition shadow-sm"
                 >
                    <Plus size={16}/> Добавить шаг
                 </button>
              </div>

              <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 max-h-[600px] overflow-y-auto custom-scrollbar">
                 {steps.length === 0 && (
                    <div className="text-center py-8 text-gray-400 flex flex-col items-center">
                       <Settings2 size={48} className="opacity-20 mb-2"/>
                       <p>Маршрут пуст. Добавьте шаги или используйте шаблон.</p>
                    </div>
                 )}
                 
                 {steps
                   .sort((a, b) => a.order - b.order)
                   .map((s, index) => {
                     const style = getOperationStyle(s.operation);
                     return (
                       <div key={index} className="relative pl-8">
                          {/* Линия таймлайна */}
                          {index !== steps.length - 1 && (
                             <div className="absolute left-[15px] top-8 bottom-[-16px] w-0.5 bg-gray-300"></div>
                          )}
                          
                          {/* Кружок номера */}
                          <div className="absolute left-0 top-0 w-8 h-8 rounded-full bg-white border-2 border-indigo-500 text-indigo-700 flex items-center justify-center font-bold text-sm shadow-sm z-10">
                             {index + 1}
                          </div>

                          {/* Карточка шага */}
                          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                             <div className="flex flex-wrap gap-3 mb-3">
                                {/* Тип операции (Селект с иконкой) */}
                                <div className="flex-1 min-w-[140px]">
                                   <label className="text-xs font-semibold text-gray-500 uppercase">Тип операции</label>
                                   <div className="relative mt-1">
                                      <div className={`absolute left-2 top-2.5 pointer-events-none ${style.color.split(' ')[1]}`}>
                                         {style.icon}
                                      </div>
                                      <select
                                        value={s.operation}
                                        onChange={(e) => handleStepChange(index, "operation", e.target.value)}
                                        className={`w-full pl-9 pr-2 py-2 border rounded-lg text-sm font-medium appearance-none cursor-pointer focus:ring-2 focus:ring-indigo-500 ${style.color}`}
                                      >
                                         <option value="ASSEMBLY">Сборка</option>
                                         <option value="FIRMWARE">Прошивка</option>
                                         <option value="CALIBRATION">Калибровка</option>
                                         <option value="FOCUS">Фокусировка</option>
                                         <option value="QUALITY">ОТК (Контроль)</option>
                                         <option value="PACKING">Упаковка</option>
                                         <option value="MOVE">Перемещение</option>
                                      </select>
                                   </div>
                                </div>

                                <div className="flex-[2] min-w-[200px]">
                                   <label className="text-xs font-semibold text-gray-500 uppercase">Название этапа</label>
                                   <input
                                     value={s.title}
                                     onChange={(e) => handleStepChange(index, "title", e.target.value)}
                                     className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                                     placeholder="Например: Монтаж платы"
                                   />
                                </div>

                                <div className="w-auto flex items-end">
                                   <button 
                                     onClick={() => handleRemoveStep(index)}
                                     className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                                     title="Удалить шаг"
                                   >
                                      <Trash2 size={18}/>
                                   </button>
                                </div>
                             </div>

                             <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                <div>
                                   <label className="text-xs text-gray-500">Участок</label>
                                   <select
                                     value={s.sectionId ?? ""}
                                     onChange={(e) => handleStepChange(index, "sectionId", e.target.value)}
                                     className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-gray-50"
                                   >
                                      <option value="">Любой / Не важно</option>
                                      {sections.map((sec) => (
                                         <option key={sec.id} value={sec.id}>{sec.title}</option>
                                      ))}
                                   </select>
                                </div>
                                <div>
                                   <label className="text-xs text-gray-500">Бригада</label>
                                   <select
                                     value={s.teamId ?? ""}
                                     onChange={(e) => handleStepChange(index, "teamId", e.target.value)}
                                     className="w-full mt-1 px-2 py-1.5 border border-gray-200 rounded-md text-xs bg-gray-50"
                                   >
                                      <option value="">Любая</option>
                                      {allTeams.map((t) => (
                                         <option key={t.id} value={t.id}>{t.title}</option>
                                      ))}
                                   </select>
                                </div>
                                <div className="md:col-span-2">
                                   <input
                                     value={s.description || ""}
                                     onChange={(e) => handleStepChange(index, "description", e.target.value)}
                                     placeholder="Инструкция для сотрудника (опционально)"
                                     className="w-full px-2 py-1.5 border-b border-gray-200 text-xs focus:border-indigo-500 focus:outline-none text-gray-600 placeholder-gray-400"
                                   />
                                </div>
                             </div>
                          </div>
                       </div>
                     );
                   })}
              </div>

              {/* Футер */}
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                 <button
                   onClick={handleSaveRoute}
                   className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:from-indigo-700 hover:to-blue-700 transition transform active:scale-95"
                 >
                    <Save size={20}/>
                    Сохранить маршрут
                 </button>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
});