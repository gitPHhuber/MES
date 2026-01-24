import React, { useEffect, useMemo, useState } from "react";
import QRCode from "react-qr-code";
import {
  ClipboardList, AlertCircle, Printer, Copy, Layers, FileSpreadsheet
} from "lucide-react";
import { createBoxesBatch, downloadBoxesExcel, printBoxesPdf } from "src/api/warehouseApi";
import { InventoryBoxModel } from "src/types/WarehouseModels";
import { SectionModel } from "src/store/StructureStore";
import { productModel } from "src/types/ProductModel";
import { componentModel } from "src/types/ComponentModel";
import { LabelPreview } from "../components/LabelPreview";

interface Props {
  sections: SectionModel[];
  productsList: productModel[];
  componentsList: componentModel[];
}

export const WarehouseIntake: React.FC<Props> = ({ sections, productsList, componentsList }) => {
  // --- STATE ---
  const [intakeMode, setIntakeMode] = useState<"PRODUCT" | "COMPONENT" | "OTHER">("PRODUCT");
  const [selectedSkuId, setSelectedSkuId] = useState<number | "">("");
  const [label, setLabel] = useState("");
  const [projectName, setProjectName] = useState("");
  const [batchName, setBatchName] = useState("");
  
  // Калькулятор
  const [measureType, setMeasureType] = useState<"PCS" | "METERS">("PCS");
  const [unit, setUnit] = useState("шт");
  const [shipmentTotal, setShipmentTotal] = useState<number | "">(""); 
  const [capacityPerUnit, setCapacityPerUnit] = useState<number>(1); 
  
  const batchCalc = useMemo(() => {
      const total = Number(shipmentTotal) || 0;
      const capacity = Number(capacityPerUnit) || 1;
      if (total === 0) return { fullUnits: 0, remainder: 0, totalUnits: 0 };
      const fullUnits = Math.floor(total / capacity);
      const remainder = total % capacity;
      const totalUnits = fullUnits + (remainder > 0 ? 1 : 0);
      return { fullUnits, remainder, totalUnits };
  }, [shipmentTotal, capacityPerUnit]);

  const [intakeStatus, setIntakeStatus] = useState("ON_STOCK");
  const [intakeSectionId, setIntakeSectionId] = useState<number | "">("");
  const [intakeNotes, setIntakeNotes] = useState("");
  const [createdBoxes, setCreatedBoxes] = useState<InventoryBoxModel[]>([]);
  const [intakeLoading, setIntakeLoading] = useState(false);
  const [intakeError, setIntakeError] = useState<string | null>(null);

  // Авто-выбор единицы
  useEffect(() => {
    setUnit(measureType === "PCS" ? "шт" : "м");
  }, [measureType]);

  // Авто-заполнение названия
  useEffect(() => {
      if (intakeMode === "PRODUCT" && selectedSkuId) {
          const p = productsList.find(x => x.id === Number(selectedSkuId));
          if(p) setLabel(p.title);
      } else if (intakeMode === "COMPONENT" && selectedSkuId) {
          const c = componentsList.find(x => x.id === Number(selectedSkuId));
          if(c) setLabel(c.title);
      }
  }, [intakeMode, selectedSkuId]);

  // Шаблоны
  const applyTemplate = (type: "THERMAL" | "CABLE" | "SUB") => {
      if (type === "THERMAL") {
        setLabel("Тепловизор ТП-200 (Комплект)");
        setProjectName("Project-40k");
        setBatchName("Партия 2");
        setMeasureType("PCS");
        setShipmentTotal(4000);
        setCapacityPerUnit(200);
        setIntakeNotes("Пришла часть. Сборку выполняем сами.");
      } else if (type === "CABLE") {
        setLabel("Кабель Коаксиальный RG-6");
        setProjectName("Общий запас");
        setBatchName("Поставка Дек-24");
        setMeasureType("METERS");
        setShipmentTotal(5000); 
        setCapacityPerUnit(1000);
        setIntakeNotes("Кабель для нарезки");
      } else if (type === "SUB") {
        setLabel("Полётный контроллер v3 (Субподряд)");
        setProjectName("Дроны FPV");
        setBatchName("От ООО 'Техно'");
        setMeasureType("PCS");
        setShipmentTotal(10000);
        setCapacityPerUnit(500);
        setIntakeNotes("Пришли готовые, сразу на прошивку!");
        setIntakeStatus("IN_WORK"); 
      }
  };

  const handleCreateBatch = async () => {
    if (!label.trim()) return alert("Введите название!");
    if (batchCalc.totalUnits > 1000) return alert("Слишком много этикеток (>1000).");

    setIntakeLoading(true);
    setIntakeError(null);
    try {
      let autoNote = intakeNotes;
      if (batchCalc.remainder > 0) {
         autoNote += ` | ВНИМАНИЕ: Остаточное место: ${batchCalc.remainder} ${unit}`;
      }

      const res = await createBoxesBatch({
        label, projectName, batchName, 
        originType: intakeMode, 
        originId: selectedSkuId ? Number(selectedSkuId) : null,
        quantity: batchCalc.totalUnits, 
        itemsPerBox: capacityPerUnit,
        unit,
        status: intakeStatus, 
        currentSectionId: intakeSectionId ? Number(intakeSectionId) : null,
        notes: autoNote
      });
      
      setCreatedBoxes(res.boxes);
      setShipmentTotal(""); 
    } catch (e: any) { 
        setIntakeError(e.message || "Ошибка создания");
    } 
    finally { setIntakeLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fade-in">
        
        <div className="xl:col-span-8 space-y-6">
            {/* Шаблоны */}
            <div className="flex gap-2 overflow-x-auto pb-2">
                <button onClick={() => applyTemplate("THERMAL")} className="whitespace-nowrap px-4 py-2 bg-white border rounded text-xs font-bold text-gray-600 hover:bg-blue-50 transition flex gap-2"><Copy size={14}/> Пример: Тепловизоры</button>
                <button onClick={() => applyTemplate("SUB")} className="whitespace-nowrap px-4 py-2 bg-white border rounded text-xs font-bold text-gray-600 hover:bg-purple-50 transition flex gap-2"><Copy size={14}/> Пример: Субподряд</button>
                <button onClick={() => applyTemplate("CABLE")} className="whitespace-nowrap px-4 py-2 bg-white border rounded text-xs font-bold text-gray-600 hover:bg-orange-50 transition flex gap-2"><Copy size={14}/> Пример: Кабель</button>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <ClipboardList className="text-indigo-600"/> Новая поставка
                </h2>

                {/* Выбор типа */}
                <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">Что принимаем?</label>
                    <div className="flex gap-2">
                        {(['PRODUCT', 'COMPONENT', 'OTHER'] as const).map(m => (
                            <button 
                                key={m}
                                onClick={() => { setIntakeMode(m); setSelectedSkuId(""); setLabel(""); }}
                                className={`flex-1 py-2 rounded-lg border text-sm font-bold transition ${intakeMode === m ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-gray-50 text-gray-600'}`}
                            >
                                {m === 'PRODUCT' ? 'Изделие' : m === 'COMPONENT' ? 'Комплектующее' : 'Прочее'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Выбор SKU */}
                {(intakeMode === 'PRODUCT' || intakeMode === 'COMPONENT') && (
                    <div className="mb-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Выберите из справочника</label>
                        <select 
                            className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-emerald-500"
                            value={selectedSkuId} onChange={e => setSelectedSkuId(e.target.value)}
                        >
                            <option value="">-- Не выбрано --</option>
                            {intakeMode === 'PRODUCT' 
                                ? productsList.map(p => <option key={p.id} value={p.id}>{p.title}</option>)
                                : componentsList.map(c => <option key={c.id} value={c.id}>{c.title} ({c.article})</option>)
                            }
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                     <div className="md:col-span-2">
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Название</label>
                         <input value={label} onChange={e => setLabel(e.target.value)} className="w-full p-3 border rounded-xl" placeholder="Например: Контроллер FC v2.4"/>
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Партия</label>
                         <input value={batchName} onChange={e => setBatchName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="№ партии" />
                     </div>
                     <div>
                         <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Проект</label>
                         <input value={projectName} onChange={e => setProjectName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="Опционально" />
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Куда (Участок)</label>
                         <select value={intakeSectionId} onChange={e => setIntakeSectionId(Number(e.target.value))} className="w-full p-2 border rounded-lg text-sm bg-gray-50">
                            <option value="">-- Склад Приёмки --</option>
                            {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                         </select>
                     </div>
                     <div>
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Статус</label>
                         <select value={intakeStatus} onChange={e => setIntakeStatus(e.target.value)} className="w-full p-2 border rounded-lg text-sm">
                             <option value="ON_STOCK">На складе (Обычный)</option>
                             <option value="IN_WORK">Сразу в работу</option>
                         </select>
                     </div>
                     <div className="md:col-span-2">
                         <label className="block text-xs font-medium text-gray-500 mb-1 uppercase">Примечание</label>
                         <input value={intakeNotes} onChange={e => setIntakeNotes(e.target.value)} className="w-full p-2 border rounded-lg text-sm" placeholder="..." />
                     </div>
                </div>

                {/* Калькулятор */}
                <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-6">
                    <div className="flex justify-between mb-2">
                        <h4 className="text-sm font-bold text-indigo-900 flex items-center gap-2"><Layers size={14}/> Расчет мест</h4>
                        <div className="flex text-[10px] font-bold bg-white rounded border overflow-hidden">
                            <button onClick={() => setMeasureType("PCS")} className={`px-2 py-1 ${measureType === 'PCS' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>ШТ</button>
                            <button onClick={() => setMeasureType("METERS")} className={`px-2 py-1 ${measureType === 'METERS' ? 'bg-indigo-100 text-indigo-700' : 'text-gray-500'}`}>МЕТРЫ</button>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 mb-2">
                         <div>
                             <label className="text-xs text-gray-600">Всего пришло ({unit})</label>
                             <input type="number" min={1} value={shipmentTotal} onChange={e => setShipmentTotal(Number(e.target.value))} className="w-full p-2 border rounded-lg font-bold" placeholder="0"/>
                         </div>
                         <div>
                             <label className="text-xs text-gray-600">В одной таре ({unit})</label>
                             <input type="number" min={1} value={capacityPerUnit} onChange={e => setCapacityPerUnit(Number(e.target.value))} className="w-full p-2 border rounded-lg" placeholder="1"/>
                         </div>
                    </div>
                    
                    <div className="text-sm text-indigo-800 font-medium flex justify-between items-center pt-2 border-t border-indigo-200">
                        <span>Будет создано этикеток:</span>
                        <span className="text-xl font-black">{batchCalc.totalUnits}</span>
                    </div>
                    {batchCalc.remainder > 0 && (
                        <div className="mt-2 text-xs text-orange-600 font-bold flex items-center gap-1">
                            <AlertCircle size={12}/> {batchCalc.fullUnits} полных + 1 с остатком ({batchCalc.remainder} {unit})
                        </div>
                    )}
                </div>

                {intakeError && <div className="text-sm text-red-600 mb-4 p-3 bg-red-50 rounded-lg">{intakeError}</div>}

                <div className="flex justify-end">
                     <button 
                        onClick={handleCreateBatch} disabled={intakeLoading || !label}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg transition flex items-center gap-2"
                     >
                        {intakeLoading ? "..." : <Printer size={20}/>} Создать партию
                     </button>
                </div>
            </div>

            {/* Результат */}
            <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-700">Результат ({createdBoxes.length})</h3>
                    <div className="flex gap-2">
                        {/* Кнопка PDF */}
                        {createdBoxes.length > 0 && (
                            <button 
                                onClick={() => printBoxesPdf(createdBoxes.map(b => b.id))}
                                className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 px-3 py-2 rounded-lg hover:bg-indigo-700 transition shadow-md"
                            >
                                <Printer size={18}/> PDF
                            </button>
                        )}
                        {/* Кнопка Excel */}
                        {createdBoxes.length > 0 && (
                            <button 
                                onClick={() => downloadBoxesExcel(createdBoxes.map(b => b.id))}
                                className="flex items-center gap-2 text-sm font-bold text-green-700 bg-green-100 px-3 py-2 rounded-lg hover:bg-green-200 transition"
                            >
                                <FileSpreadsheet size={18}/> Excel
                            </button>
                        )}
                    </div>
                </div>

                {createdBoxes.length === 0 && <div className="text-center py-10 bg-white rounded-2xl border-2 border-dashed border-gray-200 text-gray-400">Здесь появятся этикетки</div>}
                
                <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto pr-2">
                    {createdBoxes.map(box => (
                        <div key={box.id} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col items-center text-center relative group hover:border-indigo-300 transition">
                            <div className="absolute top-2 left-2 text-[10px] font-mono bg-gray-100 px-1.5 rounded text-gray-500 font-bold">{box.shortCode}</div>
                            <div className="mb-2 bg-white p-1"><QRCode value={box.qrCode} size={80} /></div>
                            <div className="text-xs font-bold text-gray-900 w-full truncate">{box.label}</div>
                            <div className="text-[10px] text-gray-500 mt-1">ID: {box.id}</div>
                            <div className="mt-2 bg-gray-900 text-white text-xs font-bold px-2 py-0.5 rounded">{box.quantity} {box.unit}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>

        <div className="xl:col-span-4">
            <div className="sticky top-6 flex justify-center">
                <LabelPreview label={label || "Название"} project={projectName} batch={batchName} id="###" qrValue={`BOX-FULL`} qty={capacityPerUnit} unit={unit} />
            </div>
        </div>
    </div>
  );
};