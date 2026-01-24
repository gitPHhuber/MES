import React, { useEffect, useState } from "react";
import { fetchStockBalance } from "src/api/warehouseApi";
import { StockBalanceItem } from "src/types/WarehouseModels";
import { PieChart, Package, RefreshCw, PackageX } from "lucide-react";

export const WarehouseBalance: React.FC = () => {
    const [balance, setBalance] = useState<StockBalanceItem[]>([]);
    const [loading, setLoading] = useState(false);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchStockBalance();
            setBalance(data);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    useEffect(() => { loadData(); }, []);

    // Группировка для отображения
    const products = balance.filter(i => i.originType === "PRODUCT");
    const components = balance.filter(i => i.originType === "COMPONENT");
    const others = balance.filter(i => i.originType !== "PRODUCT" && i.originType !== "COMPONENT");

    const renderTable = (title: string, items: StockBalanceItem[], colorClass: string) => (
        <div className="mb-8 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-6 py-3 font-bold text-gray-700 bg-gray-50 border-b flex justify-between ${colorClass}`}>
                <span>{title}</span>
                <span className="text-xs bg-white px-2 py-0.5 rounded border">Позиций: {items.length}</span>
            </div>
            <table className="w-full text-left">
                <thead className="bg-gray-50/50 text-xs text-gray-500 uppercase border-b">
                    <tr>
                        <th className="px-6 py-3">Наименование</th>
                        <th className="px-6 py-3 text-right">Общий остаток</th>
                        <th className="px-6 py-3 text-right">Мест (Коробок)</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                    {items.map((item, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 transition">
                            <td className="px-6 py-3 font-medium text-gray-800">{item.label}</td>
                            <td className="px-6 py-3 text-right font-bold text-indigo-600">
                                {Number(item.totalQuantity).toLocaleString()} <span className="text-gray-400 font-normal text-xs">{item.unit}</span>
                            </td>
                            <td className="px-6 py-3 text-right text-gray-600">{item.boxCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                    <PieChart className="text-indigo-600"/> Сводные остатки склада
                </h2>
                <button onClick={loadData} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><RefreshCw size={18}/></button>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-400">Загрузка данных...</div>
            ) : (
                <>
                    {products.length > 0 && renderTable("Готовая продукция", products, "border-l-4 border-l-purple-500")}
                    {components.length > 0 && renderTable("Комплектующие и материалы", components, "border-l-4 border-l-blue-500")}
                    {others.length > 0 && renderTable("Прочее оборудование", others, "border-l-4 border-l-gray-500")}
                    
                    {balance.length === 0 && (
                        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed">
                            <PackageX size={48} className="mx-auto text-gray-300 mb-4"/>
                            <p className="text-gray-500">Склад пуст. Примите товар, чтобы увидеть остатки.</p>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};