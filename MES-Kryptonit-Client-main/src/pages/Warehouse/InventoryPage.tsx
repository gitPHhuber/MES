import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchBoxByQr, moveBoxesBatch, fetchBoxById } from "src/api/warehouseApi";
import { InventoryBoxModel } from "src/types/WarehouseModels";
import { Search, CheckCircle2, Save, Scale, ArrowRight, ScanLine, ArrowLeft } from "lucide-react";
import toast from 'react-hot-toast';
import { WAREHOUSE_ROUTE } from "src/utils/consts"; 

interface InventoryItem {
    box: InventoryBoxModel;
    systemQty: number;
    actualQty: number;
    delta: number;
}

export const InventoryPage: React.FC = () => {
    const navigate = useNavigate(); // <--- Хук
    const [scanCode, setScanCode] = useState("");
    const [loading, setLoading] = useState(false);
    
    const [items, setItems] = useState<InventoryItem[]>([]);
    const [scannedBox, setScannedBox] = useState<InventoryBoxModel | null>(null);
    const [actualInput, setActualInput] = useState("");

    const handleScan = async () => {
        if (!scanCode) return;
        setLoading(true);
        try {
            let res;
            if (/^\d+$/.test(scanCode)) res = await fetchBoxById(Number(scanCode));
            else res = await fetchBoxByQr(scanCode);
            
            if (items.some(i => i.box.id === res.box.id)) {
                toast.error("Эта коробка уже в списке!");
                setScanCode("");
                return;
            }
            setScannedBox(res.box);
            setActualInput(String(res.box.quantity)); 
        } catch (e) {
            toast.error("Коробка не найдена");
        } finally {
            setLoading(false);
        }
    };

    const confirmItem = () => {
        if (!scannedBox) return;
        const actual = Number(actualInput);
        if (isNaN(actual) || actual < 0) return toast.error("Неверное число");
        const delta = actual - scannedBox.quantity;
        setItems(prev => [{
            box: scannedBox,
            systemQty: scannedBox.quantity,
            actualQty: actual,
            delta
        }, ...prev]);
        setScannedBox(null);
        setScanCode("");
        setActualInput("");
        if (delta === 0) toast.success("Совпадает");
        else toast("Расхождение зафиксировано", { icon: '⚠️' });
    };

    const commitInventory = async () => {
        if (items.length === 0) return;
        const loadingToast = toast.loading("Сохранение акта...");
        try {
            await moveBoxesBatch({
                movements: items.map(item => ({
                    boxId: item.box.id,
                    operation: "INVENTORY_CHECK", 
                    deltaQty: item.delta, 
                    comment: `Инвентаризация. Было: ${item.systemQty}, Стало: ${item.actualQty}`
                })),
                documentData: {
                    createNew: true,
                    number: `INV-${Date.now()}`,
                    type: "INVENTORY_ACT",
                    comment: `Акт инвентаризации (${items.length} поз.)`
                }
            });
            toast.success("Инвентаризация завершена!", { id: loadingToast });
            setItems([]);
        } catch (e: any) {
            toast.error("Ошибка: " + e.message, { id: loadingToast });
        }
    };

    return (
        <div className="p-6 max-w-5xl mx-auto min-h-screen bg-gray-50">
            <button 
                onClick={() => navigate(WAREHOUSE_ROUTE)}
                className="mb-4 flex items-center text-gray-500 hover:text-indigo-600 transition font-medium text-sm"
            >
                <ArrowLeft size={18} className="mr-1"/> Отмена и выход
            </button>

            <h1 className="text-3xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                <Scale className="text-indigo-600"/> Инвентаризация
            </h1>

            {scannedBox && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fade-in">
                        <h3 className="text-xl font-bold text-gray-800 mb-1">{scannedBox.label}</h3>
                        <p className="text-gray-500 text-sm mb-6">ID: {scannedBox.id} • {scannedBox.shortCode}</p>
                        
                        <div className="flex items-center justify-between bg-gray-100 p-4 rounded-xl mb-6">
                            <div className="text-center">
                                <div className="text-xs text-gray-500 uppercase">По учету</div>
                                <div className="text-2xl font-bold text-gray-700">{scannedBox.quantity}</div>
                            </div>
                            <ArrowRight className="text-gray-400"/>
                            <div className="text-center w-1/2">
                                <div className="text-xs text-indigo-600 uppercase font-bold mb-1">По факту</div>
                                <input 
                                    type="number" 
                                    value={actualInput} 
                                    onChange={e => setActualInput(e.target.value)}
                                    className="w-full text-center text-3xl font-bold border-b-2 border-indigo-500 bg-transparent focus:outline-none"
                                    autoFocus
                                    onKeyDown={e => e.key === 'Enter' && confirmItem()}
                                />
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={() => setScannedBox(null)} className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300">Отмена</button>
                            <button onClick={confirmItem} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">Подтвердить</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Левая панель: Сканнер */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                        <label className="block text-sm font-bold text-gray-700 mb-2">Сканировать QR / ID</label>
                        <div className="flex gap-2">
                            <input 
                                value={scanCode} onChange={e => setScanCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleScan()}
                                className="w-full p-3 border-2 border-indigo-100 rounded-xl focus:border-indigo-500 text-lg outline-none"
                                placeholder="..."
                                autoFocus={!scannedBox}
                            />
                            <button onClick={handleScan} disabled={loading} className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700">
                                {loading ? <ScanLine className="animate-spin"/> : <Search/>}
                            </button>
                        </div>
                    </div>

                    <div className="bg-indigo-900 p-6 rounded-2xl shadow-lg text-white">
                        <div className="text-indigo-200 text-sm font-medium mb-1">Проверено позиций</div>
                        <div className="text-5xl font-black">{items.length}</div>
                    </div>
                </div>

                {/* Правая панель: Список */}
                <div className="lg:col-span-2">
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 min-h-[500px] flex flex-col">
                        <div className="p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-700">Лист инвентаризации</h3>
                            {items.length > 0 && <button onClick={commitInventory} className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-green-700 transition"><Save size={18}/> Завершить акт</button>}
                        </div>
                        
                        <div className="flex-1 overflow-y-auto p-2 space-y-2">
                            {items.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-gray-400">
                                    <Scale size={48} className="mb-2 opacity-20"/>
                                    <p>Список пуст. Сканируйте, чтобы начать.</p>
                                </div>
                            )}
                            {items.map((item, idx) => (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white border rounded-xl shadow-sm">
                                    <div>
                                        <div className="font-bold text-gray-800">{item.box.label}</div>
                                        <div className="text-xs text-gray-500">ID: {item.box.id}</div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Учет</div>
                                            <div className="font-medium">{item.systemQty}</div>
                                        </div>
                                        <ArrowRight size={14} className="text-gray-300"/>
                                        <div className="text-right">
                                            <div className="text-xs text-gray-400">Факт</div>
                                            <div className="font-bold text-lg">{item.actualQty}</div>
                                        </div>
                                        <div className={`w-20 text-center py-1 rounded-lg text-xs font-bold ${item.delta === 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {item.delta === 0 ? <CheckCircle2 className="mx-auto" size={16}/> : `${item.delta > 0 ? '+' : ''}${item.delta}`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};