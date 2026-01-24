import React, { useEffect, useMemo, useState } from "react";
import {
  fetchBoxById,
  fetchBoxByQr,
  moveBox,
  WarehouseBox,
  WarehouseMovement,
} from "src/api/warehouseApi";
import { fetchAssemblyRoutes } from "src/api/assemblyApi";
import type { AssemblyRouteModel } from "src/types/AssemblyModels";
import { fetchStructure } from "src/api/structureApi";
import type { SectionModel, TeamModel } from "src/store/StructureStore";
import {
  Box as BoxIcon,
  Search,
  Loader2,
  History,
  MapPin,
  User,
  Wrench,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  PlayCircle,
  PackageCheck
} from "lucide-react";
import toast from "react-hot-toast";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("ru-RU", {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
  });
};

export const AssemblyWorkPage: React.FC = () => {

  const [code, setCode] = useState("");
  const [scanLoading, setScanLoading] = useState(false);
  
  const [box, setBox] = useState<WarehouseBox | null>(null);
  const [movements, setMovements] = useState<WarehouseMovement[]>([]);
  const [route, setRoute] = useState<AssemblyRouteModel | null>(null);

  const [sections, setSections] = useState<SectionModel[]>([]);
  const allTeams: TeamModel[] = useMemo(
    () => sections.flatMap((s) => s.production_teams || []),
    [sections]
  );

  const [selectedStepOrder, setSelectedStepOrder] = useState<number | "">("");
  const [operation, setOperation] = useState("ASSEMBLY");
  const [toSectionId, setToSectionId] = useState<number | "">("");
  const [toTeamId, setToTeamId] = useState<number | "">("");
  const [statusAfter, setStatusAfter] = useState("IN_WORK");
  
  const [goodQty, setGoodQty] = useState<number | "">("");
  const [scrapQty, setScrapQty] = useState<number | "">("");
  const [comment, setComment] = useState("");

  const [saveLoading, setSaveLoading] = useState(false);

  useEffect(() => {
    fetchStructure().then(setSections).catch(console.error);
  }, []);

  const autoSelectNextStep = (currentBox: WarehouseBox, history: WarehouseMovement[], currentRoute: AssemblyRouteModel) => {
    if (!currentRoute.steps || currentRoute.steps.length === 0) return;

    const sortedSteps = [...currentRoute.steps].sort((a, b) => a.order - b.order);
    
    let lastCompletedOrder = 0;
    
    for (let i = 0; i < sortedSteps.length; i++) {
        const step = sortedSteps[i];
        const isDone = history.some(m => m.operation === step.operation); 
        if (isDone) lastCompletedOrder = step.order;
    }


    const nextStep = sortedSteps.find(s => s.order > lastCompletedOrder);

    if (nextStep) {
        setSelectedStepOrder(nextStep.order);
        setOperation(nextStep.operation);
        setToSectionId(nextStep.sectionId ?? "");
        setToTeamId(nextStep.teamId ?? "");
        setGoodQty(currentBox.quantity); 
        setScrapQty(0);
        setStatusAfter(nextStep.order === sortedSteps[sortedSteps.length - 1].order ? "DONE" : "IN_WORK");
    } else {
        setSelectedStepOrder("");
        setOperation("MOVE");
        setStatusAfter("ON_STOCK");
        setGoodQty(currentBox.quantity);
    }
  };

  const loadBox = async () => {
    const raw = code.trim();
    if (!raw) return toast.error("Введите номер или QR");

    setScanLoading(true);
    setBox(null); 
    setMovements([]); 
    setRoute(null);

    try {
      let data;
      if (/^\d+$/.test(raw)) {
        data = await fetchBoxById(Number(raw));
      } else {
        data = await fetchBoxByQr(raw);
      }

      setBox(data.box);
      setMovements(data.movements);

      if (data.box.projectName) {
        const routes = await fetchAssemblyRoutes({
          productName: data.box.projectName,
          isActive: true,
        });
        if (routes.length > 0) {
          setRoute(routes[0]);
          autoSelectNextStep(data.box, data.movements, routes[0]);
        } else {
            toast("Маршрут не найден, ручной режим", { icon: 'ℹ️' });
        }
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.response?.data?.message || "Коробка не найдена");
    } finally {
      setScanLoading(false);
    }
  };

  const handleStepSelect = (order: number | "") => {
    setSelectedStepOrder(order);
    if (!route || order === "") return;
    const step = route.steps?.find((s) => s.order === order);
    if (!step) return;

    setOperation(step.operation || "ASSEMBLY");
    setToSectionId(step.sectionId ?? "");
    setToTeamId(step.teamId ?? "");
  };

  const handleSaveOperation = async () => {
    if (!box) return;
    
    // Валидация
    const gQty = Number(goodQty) || 0;
    const sQty = Number(scrapQty) || 0;
    
    if (gQty + sQty > box.quantity) {
        return toast.error(`Нельзя обработать больше, чем есть (${box.quantity})`);
    }
    if (gQty + sQty === 0 && operation !== "MOVE") {
       if(!window.confirm("Количество 0. Продолжить?")) return;
    }

    setSaveLoading(true);
    try {
      await moveBox({
        boxId: box.id,
        operation,
        statusAfter: statusAfter || undefined,
        toSectionId: toSectionId === "" ? undefined : Number(toSectionId),
        toTeamId: toTeamId === "" ? undefined : Number(toTeamId),
        comment: comment.trim() || undefined,
        goodQty: gQty,
        scrapQty: sQty,
      });

      toast.success("Операция выполнена");
      loadBox(); 
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaveLoading(false);
    }
  };

  const isStepCompleted = (op: string) => {
      return movements.some(m => m.operation === op);
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      
      {/* HEADER */}
      <div className="flex items-center gap-3 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div className="p-2 bg-emerald-100 rounded-lg text-emerald-600">
            <BoxIcon size={24} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-800">Рабочее место сборки</h1>
          <p className="text-gray-500 text-sm">Сканируйте компоненты и следуйте маршруту</p>
        </div>
      </div>

      {/* SCANNER */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
              Номер коробки или QR-код
            </label>
            <div className="relative">
              <Search className="w-5 h-5 text-gray-400 absolute left-3 top-3" />
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void loadBox()}
                placeholder="Кликните сюда и сканируйте..."
                className="w-full border-2 border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition"
                autoFocus
              />
            </div>
          </div>
          <button
            onClick={loadBox}
            disabled={scanLoading || !code}
            className="w-full sm:w-auto px-6 py-3 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
          >
            {scanLoading ? <Loader2 className="animate-spin" /> : <Search size={20}/>}
            Найти
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        <div className="lg:col-span-1 space-y-6">
          <div className={`bg-white rounded-xl shadow-sm border p-5 transition-all ${box ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-200'}`}>
            <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
              <BoxIcon size={16} /> Текущая коробка
            </h2>

            {!box ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                Нет данных. Сканируйте код.
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                    <div className="text-xs text-gray-400">Название</div>
                    <div className="font-bold text-gray-800 text-lg leading-tight">{box.label}</div>
                </div>
                <div className="flex justify-between">
                    <div>
                        <div className="text-xs text-gray-400">ID / Код</div>
                        <div className="font-mono text-sm bg-gray-100 px-2 py-0.5 rounded">{box.id}</div>
                    </div>
                    <div className="text-right">
                        <div className="text-xs text-gray-400">Количество</div>
                        <div className="font-bold text-emerald-600 text-xl">{box.quantity} {box.unit}</div>
                    </div>
                </div>
                <div className="pt-3 border-t border-dashed border-gray-200 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center gap-2"><MapPin size={12}/> {box.currentSection?.title || "Без участка"} / {box.currentTeam?.title || "Без бригады"}</div>
                    <div className="flex items-center gap-2"><ArrowRight size={12}/> Статус: <span className="font-bold">{box.status}</span></div>
                    {box.projectName && <div className="mt-1 font-medium text-indigo-600">Проект: {box.projectName}</div>}
                </div>
              </div>
            )}
          </div>

          {/* ROUTE CARD */}
          {box && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                <h2 className="text-sm font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                  <Wrench size={16} /> Маршрутная карта
                </h2>
                
                {!route ? (
                    <div className="p-3 bg-yellow-50 text-yellow-700 text-sm rounded-lg flex items-start gap-2">
                        <AlertTriangle size={16} className="mt-0.5"/>
                        Маршрут не найден. Доступен ручной режим.
                    </div>
                ) : (
                    <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                        <div className="text-xs font-bold text-indigo-600 mb-2">{route.title}</div>
                        {(route.steps || []).sort((a,b)=>a.order-b.order).map((s) => {
                            const completed = isStepCompleted(s.operation);
                            const active = selectedStepOrder === s.order;
                            return (
                                <div 
                                    key={s.id}
                                    onClick={() => handleStepSelect(s.order)}
                                    className={`
                                        relative p-3 rounded-lg border text-sm cursor-pointer transition-all
                                        ${completed ? 'bg-green-50 border-green-200 text-green-800' : ''}
                                        ${active ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50' : 'hover:bg-gray-50 border-gray-200'}
                                    `}
                                >
                                    <div className="flex justify-between items-center">
                                        <span className="font-bold flex items-center gap-2">
                                            {completed ? <CheckCircle2 size={16}/> : <span className="w-4 h-4 rounded-full border-2 border-gray-300 text-[9px] flex items-center justify-center">{s.order}</span>}
                                            {s.title}
                                        </span>
                                        {active && <span className="text-[10px] bg-indigo-600 text-white px-1.5 py-0.5 rounded">Current</span>}
                                    </div>
                                    <div className="text-xs opacity-70 mt-1 pl-6">{s.operation}</div>
                                </div>
                            )
                        })}
                    </div>
                )}
              </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-6">
            
            <div className={`bg-white rounded-xl shadow-lg border p-6 transition-all ${box ? 'opacity-100 translate-y-0' : 'opacity-50 translate-y-2 pointer-events-none'}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                        <PlayCircle className="text-indigo-600"/> Выполнение операции
                    </h2>
                    {route && selectedStepOrder && (
                        <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-xs font-bold">
                            Шаг #{selectedStepOrder}
                        </span>
                    )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Тип операции</label>
                            <select 
                                value={operation} 
                                onChange={e => setOperation(e.target.value)}
                                className="w-full p-2.5 border rounded-lg bg-gray-50 font-medium"
                            >
                                <option value="ASSEMBLY">Сборка (ASSEMBLY)</option>
                                <option value="FIRMWARE">Прошивка (FIRMWARE)</option>
                                <option value="QUALITY">ОТК (QUALITY)</option>
                                <option value="PACKING">Упаковка (PACKING)</option>
                                <option value="MOVE">Перемещение (MOVE)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Новый статус</label>
                            <select 
                                value={statusAfter} 
                                onChange={e => setStatusAfter(e.target.value)}
                                className="w-full p-2.5 border rounded-lg bg-white"
                            >
                                <option value="IN_WORK">В работе</option>
                                <option value="DONE">Готово (Следующий этап)</option>
                                <option value="ON_STOCK">На склад</option>
                                <option value="SCRAP">Брак</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                             <div>
                                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Участок</label>
                                 <select value={toSectionId} onChange={e => setToSectionId(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm">
                                     <option value="">(Текущий)</option>
                                     {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                 </select>
                             </div>
                             <div>
                                 <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Бригада</label>
                                 <select value={toTeamId} onChange={e => setToTeamId(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm">
                                     <option value="">(Текущая)</option>
                                     {allTeams.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                 </select>
                             </div>
                        </div>
                    </div>

                    <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                        <div className="flex justify-between items-center">
                             <label className="text-sm font-bold text-gray-700">Результат</label>
                             <button 
                                onClick={() => { setGoodQty(box?.quantity || 0); setScrapQty(0); }}
                                className="text-xs text-blue-600 hover:underline font-medium"
                             >
                                Взять максимум ({box?.quantity || 0})
                             </button>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-emerald-600 uppercase mb-1">Годных</label>
                                <input 
                                    type="number" min={0} 
                                    value={goodQty} onChange={e => setGoodQty(Number(e.target.value))}
                                    className="w-full p-3 border-2 border-emerald-100 rounded-xl text-xl font-bold text-center focus:border-emerald-500 outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-red-600 uppercase mb-1">Брак</label>
                                <input 
                                    type="number" min={0}
                                    value={scrapQty} onChange={e => setScrapQty(Number(e.target.value))}
                                    className="w-full p-3 border-2 border-red-100 rounded-xl text-xl font-bold text-center focus:border-red-500 outline-none text-red-600"
                                />
                            </div>
                        </div>
                        
                        <input 
                            value={comment} onChange={e => setComment(e.target.value)}
                            placeholder="Комментарий (причина брака, серийник...)"
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                        />
                    </div>
                </div>

                <button 
                    onClick={handleSaveOperation}
                    disabled={saveLoading}
                    className="w-full py-4 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-xl shadow-lg transform active:scale-[0.99] transition flex justify-center items-center gap-2 text-lg"
                >
                    {saveLoading ? <Loader2 className="animate-spin"/> : <PackageCheck size={24}/>}
                    Подтвердить выполнение
                </button>
            </div>

            {/* HISTORY */}
            {movements.length > 0 && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2"><History size={18}/> История операций</h3>
                    <div className="space-y-0 relative">
                        {/* Vertical line */}
                        <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-gray-200"></div>
                        
                        {movements.map((m) => (
                            <div key={m.id} className="relative pl-8 py-3 group">
                                <div className="absolute left-[9px] top-5 w-2 h-2 rounded-full bg-gray-400 border-2 border-white ring-2 ring-gray-100 group-hover:bg-indigo-500 transition"></div>
                                <div className="flex justify-between items-start bg-gray-50 p-3 rounded-lg border border-gray-100 group-hover:border-indigo-200 transition">
                                    <div>
                                        <div className="font-bold text-gray-800 text-sm">{m.operation}</div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                                            <User size={10}/> {m.performedBy?.surname} {m.performedBy?.name}
                                        </div>
                                        {m.comment && <div className="text-xs text-gray-600 italic mt-1 bg-white px-1 rounded border inline-block">"{m.comment}"</div>}
                                    </div>
                                    <div className="text-right">
                                        <div className="text-[10px] font-mono text-gray-400">{formatDateTime(m.performedAt)}</div>
                                        <div className="mt-1">
                                            {m.goodQty ? <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded mr-1">+{m.goodQty} OK</span> : null}
                                            {m.scrapQty ? <span className="text-xs font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded">-{m.scrapQty} BAD</span> : null}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
      </div>
    </div>
  );
};