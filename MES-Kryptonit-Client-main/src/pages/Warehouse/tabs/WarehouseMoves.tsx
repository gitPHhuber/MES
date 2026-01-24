import React, { useState } from "react";
import { Search, Loader2, AlertCircle, MapPin, ArrowRightLeft, Ruler, Trash2, ShoppingCart, Save } from "lucide-react";
import { fetchBoxById, fetchBoxByQr, moveBoxesBatch } from "src/api/warehouseApi";
import { InventoryBoxModel } from "src/types/WarehouseModels";
import { SectionModel } from "src/store/StructureStore";

interface Props { sections: SectionModel[]; }

type CartItem = {
    box: InventoryBoxModel;
    operation: string;
    toSectionId: number | null;
    statusAfter: string;
    deltaQty: number;
    goodQty: number | null;
    scrapQty: number | null;
    comment: string;
};

export const WarehouseMoves: React.FC<Props> = ({ sections }) => {
  const [scanCode, setScanCode] = useState("");
  const [loading, setLoading] = useState(false);
  
  const [currentBox, setCurrentBox] = useState<InventoryBoxModel | null>(null);
  

  const [opType, setOpType] = useState<"MOVE" | "CONSUME">("MOVE");
  const [toSectionId, setToSectionId] = useState<number | "">("");
  const [statusAfter, setStatusAfter] = useState("");
  const [consumeAmount, setConsumeAmount] = useState<number | "">("");
  const [comment, setComment] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [docNumber, setDocNumber] = useState("");

  const handleScan = async () => {
      if (!scanCode) return;
      setLoading(true);
      setCurrentBox(null);
      try {
          let res;
          if (/^\d+$/.test(scanCode)) res = await fetchBoxById(Number(scanCode));
          else res = await fetchBoxByQr(scanCode);
          
          setCurrentBox(res.box);
          
          setOpType("MOVE");
          setToSectionId(res.box.currentSectionId || "");
          setStatusAfter(res.box.status);
          setConsumeAmount("");
          setComment("");
      } catch (e) { alert("Не найдено"); } 
      finally { setLoading(false); setScanCode(""); } 
  };

  const addToCart = () => {
      if (!currentBox) return;
      
      let delta = 0;
      let op = opType;

      if (opType === "CONSUME") {
          const amount = Number(consumeAmount);
          if (!amount || amount <= 0) return alert("Введите корректное количество для списания");
          if (amount > currentBox.quantity) return alert(`Нельзя списать больше, чем есть (${currentBox.quantity})`);
          
          delta = -amount;
      }

      if (cart.some(i => i.box.id === currentBox.id)) {
          alert("Эта коробка уже в списке!");
          return;
      }

      const item: CartItem = {
          box: currentBox,
          operation: op,
          toSectionId: toSectionId ? Number(toSectionId) : null,
          statusAfter: statusAfter,
          deltaQty: delta,
          goodQty: null,
          scrapQty: null,
          comment: comment
      };

      setCart([item, ...cart]);
      setCurrentBox(null);
  };

  const commitBatch = async () => {
      if (cart.length === 0) return;
      if (!docNumber.trim()) return alert("Введите номер документа/накладной для проведения операции!");

      setLoading(true);
      try {
          await moveBoxesBatch({
              movements: cart.map(c => ({
                  boxId: c.box.id,
                  operation: c.operation,
                  toSectionId: c.toSectionId,
                  statusAfter: c.statusAfter,
                  deltaQty: c.deltaQty,
                  goodQty: c.goodQty || undefined,
                  scrapQty: c.scrapQty || undefined,
                  comment: c.comment
              })),
              documentData: {
                  createNew: true,
                  number: docNumber,
                  type: "MOVE_BATCH",
                  comment: `Пакетная операция (${cart.length} поз.)`
              }
          });
          setCart([]);
          setDocNumber("");
          alert("Операция успешно проведена! Создан документ.");
      } catch (e: any) { alert("Ошибка: " + e.message); }
      finally { setLoading(false); }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        
        {/* ЛЕВАЯ КОЛОНKA: СКАНЕР И ФОРМА (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
             {/* Сканер */}
             <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <label className="block text-sm font-bold text-gray-700 mb-2">Сканирование</label>
                <div className="flex gap-2">
                    <input 
                        value={scanCode} onChange={e => setScanCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleScan()}
                        className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 text-lg outline-none"
                        placeholder="QR или код..."
                        autoFocus
                    />
                    <button onClick={handleScan} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 transition">
                        {loading ? <Loader2 className="animate-spin"/> : <Search/>}
                    </button>
                </div>
             </div>

             {/* Форма текущей коробки */}
             {currentBox ? (
                 <div className="bg-white rounded-xl shadow-lg border border-indigo-200 overflow-hidden animate-fade-in">
                     <div className="bg-gray-900 p-4 text-white">
                         <div className="flex justify-between items-start">
                            <div>
                                <div className="text-xs text-gray-400 uppercase font-bold">Текущая коробка</div>
                                <h3 className="font-bold text-lg leading-tight mt-1">{currentBox.label}</h3>
                            </div>
                            <div className="text-right">
                                <span className="bg-gray-700 px-2 py-1 rounded text-xs font-mono">{currentBox.shortCode}</span>
                            </div>
                         </div>
                         <div className="mt-2 text-sm opacity-80 flex gap-2 items-center">
                             <AlertCircle size={14}/>
                             <span>Остаток: <b>{currentBox.quantity} {currentBox.unit}</b></span>
                         </div>
                     </div>
                     
                     <div className="p-4 space-y-4">
                         {/* Переключатель режима */}
                         <div className="flex gap-2 bg-gray-100 p-1 rounded-lg">
                             <button onClick={() => setOpType("MOVE")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${opType === 'MOVE' ? 'bg-white shadow text-indigo-600' : 'text-gray-500'}`}>Перемещение</button>
                             <button onClick={() => setOpType("CONSUME")} className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${opType === 'CONSUME' ? 'bg-white shadow text-orange-600' : 'text-gray-500'}`}>Расход / Списание</button>
                         </div>

                         {/* Поля формы */}
                         {opType === 'CONSUME' ? (
                             <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                 <label className="text-xs font-bold text-orange-800 uppercase">Сколько взять?</label>
                                 <div className="flex gap-2 mt-1">
                                    <input type="number" className="flex-1 p-2 text-xl font-bold border-orange-300 rounded outline-none" value={consumeAmount} onChange={e => setConsumeAmount(Number(e.target.value))} autoFocus />
                                    <div className="flex items-center text-orange-700 font-bold px-2">{currentBox.unit}</div>
                                 </div>
                             </div>
                         ) : (
                             <div className="grid grid-cols-2 gap-3">
                                 <div>
                                     <label className="text-[10px] uppercase font-bold text-gray-500">Куда</label>
                                     <select className="w-full p-2 border rounded text-sm bg-white outline-none" value={toSectionId} onChange={e => setToSectionId(e.target.value)}>
                                         <option value="">(Текущее)</option>
                                         {sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                     </select>
                                 </div>
                                 <div>
                                     <label className="text-[10px] uppercase font-bold text-gray-500">Статус</label>
                                     <select className="w-full p-2 border rounded text-sm bg-white outline-none" value={statusAfter} onChange={e => setStatusAfter(e.target.value)}>
                                         <option value="ON_STOCK">На складе</option>
                                         <option value="IN_WORK">В работе</option>
                                         <option value="DONE">Готово</option>
                                         <option value="SCRAP">Брак</option>
                                     </select>
                                 </div>
                             </div>
                         )}
                         
                         <input className="w-full p-2 border rounded text-sm outline-none focus:border-indigo-500" placeholder="Комментарий..." value={comment} onChange={e => setComment(e.target.value)} />
                         
                         <button onClick={addToCart} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl font-bold shadow-md flex justify-center items-center gap-2 transition">
                             <ShoppingCart size={18}/> Добавить в список
                         </button>
                     </div>
                 </div>
             ) : (
                <div className="text-center p-10 text-gray-400 bg-gray-50 rounded-xl border-2 border-dashed min-h-[300px] flex flex-col items-center justify-center">
                    <ArrowRightLeft className="mb-2 opacity-20" size={40}/>
                    <p>Отсканируйте коробку, чтобы начать операцию</p>
                </div>
             )}
        </div>

        {/* ПРАВАЯ КОЛОНКА: Корзина (7 cols) */}
        <div className="lg:col-span-7 h-[calc(100vh-140px)] flex flex-col">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 h-full flex flex-col overflow-hidden">
                <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
                    <h3 className="font-bold text-gray-700 flex items-center gap-2"><ShoppingCart size={18}/> Операции к исполнению ({cart.length})</h3>
                    {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-red-500 hover:underline">Очистить</button>}
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2 bg-gray-50/30">
                    {cart.length === 0 && <div className="text-center py-20 text-gray-300">Список пуст</div>}
                    {cart.map((item, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-lg shadow-sm hover:shadow-md transition group">
                            <div className="flex-1">
                                <div className="font-bold text-sm text-gray-800">{item.box.label} <span className="text-gray-400 font-normal text-xs">#{item.box.id}</span></div>
                                <div className="text-xs text-gray-500 flex flex-wrap gap-2 mt-1 items-center">
                                    {item.deltaQty !== 0 
                                        ? <span className="bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">РАСХОД: {Math.abs(item.deltaQty)} {item.box.unit}</span>
                                        : <span className="bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-bold">ПЕРЕМЕЩЕНИЕ</span>
                                    }
                                    {item.toSectionId && <span className="flex items-center gap-1"><MapPin size={10}/> Секция #{item.toSectionId}</span>}
                                    {item.statusAfter !== item.box.status && <span>Статус: {item.statusAfter}</span>}
                                    {item.comment && <span className="italic text-gray-400">"{item.comment}"</span>}
                                </div>
                            </div>
                            <button onClick={() => setCart(cart.filter((_, i) => i !== idx))} className="p-2 text-gray-300 hover:text-red-500 transition">
                                <Trash2 size={16}/>
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-4 border-t bg-indigo-50">
                    <label className="text-xs font-bold text-indigo-800 uppercase mb-1 block">Номер документа / Накладной</label>
                    <div className="flex gap-2">
                        <input 
                            value={docNumber} onChange={e => setDocNumber(e.target.value)}
                            className="flex-1 p-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Напр: ТН-2025-10-15"
                        />
                        <button onClick={commitBatch} disabled={loading || cart.length === 0} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold shadow transition flex items-center gap-2 disabled:opacity-50">
                            {loading ? <Loader2 className="animate-spin"/> : <Save size={18}/>} Провести
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};