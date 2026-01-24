import React, { useEffect, useState } from "react";
import { fetchStockBalance } from "src/api/warehouseApi";
import { StockBalanceItem } from "src/types/WarehouseModels";
import { Loader2 } from "lucide-react";

export const ProjectDashboard: React.FC = () => {
    const [topItems, setTopItems] = useState<StockBalanceItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Загружаем реальные остатки
        fetchStockBalance()
            .then(data => {
                // Сортируем по убыванию количества и берем топ-3
                const sorted = data.sort((a, b) => Number(b.totalQuantity) - Number(a.totalQuantity)).slice(0, 3);
                setTopItems(sorted);
            })
            .catch(console.error)
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <div className="flex items-center text-sm text-gray-400"><Loader2 className="animate-spin mr-2 h-4 w-4"/> Загрузка склада...</div>;

    if (topItems.length === 0) return <div className="text-sm text-gray-400">Склад пуст</div>;

    return (
        <div className="flex gap-4 overflow-x-auto pb-2 w-full md:w-auto">
            {topItems.map((item, idx) => (
                <div key={idx} className="bg-white border border-gray-200 p-3 rounded-xl shadow-sm flex flex-col gap-1 min-w-[200px]">
                    <div className="flex justify-between items-start">
                        <div className="font-bold text-gray-700 text-sm truncate w-32" title={item.label}>
                            {item.label}
                        </div>
                        <div className="text-[10px] font-bold bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded">
                            TOP {idx + 1}
                        </div>
                    </div>
                    
                    {/* Имитация прогресс-бара для красоты (относительно самого большого) */}
                    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden mt-1">
                        <div 
                            className="bg-emerald-500 h-full rounded-full" 
                            style={{ width: idx === 0 ? '100%' : `${(Number(item.totalQuantity) / Number(topItems[0].totalQuantity)) * 100}%` }}
                        ></div>
                    </div>

                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>В наличии:</span>
                        <span className="font-bold text-gray-900">{Number(item.totalQuantity).toLocaleString()} {item.unit}</span>
                    </div>
                </div>
            ))}
        </div>
    );
};