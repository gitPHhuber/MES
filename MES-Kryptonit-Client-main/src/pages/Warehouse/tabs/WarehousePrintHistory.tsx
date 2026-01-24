import React, { useEffect, useState } from "react";
import { fetchPrintHistory } from "src/api/warehouseApi";
import { 
    Search, Calendar, Printer, User, History, 
    ArrowRight, Tv, Tag, Info, FileText 
} from "lucide-react";
import { formatDateTime } from "../utils";
import { Modal } from "src/components/Modal/Modal";
import clsx from "clsx";

export const WarehousePrintHistory: React.FC = () => {
    const [data, setData] = useState<any[]>([]);
    const [totalCount, setTotalCount] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Фильтры
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [template, setTemplate] = useState("");
    const [dateFrom, setDateFrom] = useState("");
    
    // Модалка деталей
    const [selectedItem, setSelectedItem] = useState<any | null>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const res = await fetchPrintHistory({ 
                page, 
                limit: 20, 
                search, 
                template,
                dateFrom
            });
            setData(res.rows);
            setTotalCount(res.count);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timer = setTimeout(loadData, 500);
        return () => clearTimeout(timer);
    }, [page, search, template, dateFrom]);

    // Хелпер для иконки шаблона
    const getTemplateIcon = (type: string) => {
        if (type === "VIDEO_KIT") return <Tv size={16} className="text-indigo-600"/>;
        return <Tag size={16} className="text-gray-600"/>;
    };

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Тулбар */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
                <div className="flex items-center gap-3 text-gray-700 font-bold text-lg">
                    <History className="text-indigo-600" /> История печати
                </div>

                <div className="flex flex-wrap gap-3 flex-1 justify-end">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4" />
                        <input 
                            value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                            placeholder="Название, ID или Код..."
                        />
                    </div>
                    
                    <select 
                        value={template} onChange={e => setTemplate(e.target.value)}
                        className="p-2 border rounded-lg text-sm bg-gray-50 font-medium"
                    >
                        <option value="">Все шаблоны</option>
                        <option value="VIDEO_KIT">Видеокомплект</option>
                        <option value="SIMPLE">Универсальная</option>
                    </select>

                    <input 
                        type="date" 
                        value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                        className="p-2 border rounded-lg text-sm text-gray-600"
                    />
                </div>
            </div>

            {/* Таблица */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                        <tr>
                            <th className="px-6 py-4">Дата / Время</th>
                            <th className="px-6 py-4">Сотрудник</th>
                            <th className="px-6 py-4">Шаблон</th>
                            <th className="px-6 py-4">Наименование</th>
                            <th className="px-6 py-4">Диапазон (ID)</th>
                            <th className="px-6 py-4 text-center">Тираж</th>
                            <th className="px-6 py-4 text-right">Инфо</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {loading ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">Загрузка...</td></tr>
                        ) : data.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-400">История пуста</td></tr>
                        ) : (
                            data.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 transition group">
                                    <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                                        {formatDateTime(item.createdAt)}
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                                                {item.createdBy?.name?.[0] || <User size={12}/>}
                                            </div>
                                            <span className="font-medium text-gray-800">
                                                {item.createdBy ? `${item.createdBy.surname} ${item.createdBy.name}` : "Система"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            {getTemplateIcon(item.template)}
                                            <span className={clsx("text-xs font-bold px-2 py-0.5 rounded", item.template === "VIDEO_KIT" ? "bg-indigo-50 text-indigo-700" : "bg-gray-100 text-gray-700")}>
                                                {item.template === "VIDEO_KIT" ? "Видео" : "Простая"}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 font-bold text-gray-800 max-w-xs truncate" title={item.labelName}>
                                        {item.labelName}
                                    </td>
                                    <td className="px-6 py-4 font-mono text-xs text-gray-600">
                                        {item.quantity > 1 ? (
                                            <div className="flex items-center gap-1">
                                                {item.startCode} <ArrowRight size={10} className="text-gray-400"/> {item.endCode}
                                            </div>
                                        ) : (
                                            item.startCode
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-lg">{item.quantity}</span>
                                        <span className="text-xs text-gray-400 ml-1">шт</span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button 
                                            onClick={() => setSelectedItem(item)}
                                            className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                        >
                                            <Info size={18}/>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
                
                {/* Пагинация */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-between items-center text-xs text-gray-500">
                    <span>Всего записей: {totalCount}</span>
                    <div className="flex gap-2">
                        <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50">Назад</button>
                        <span className="py-1 px-2">Стр. {page}</span>
                        <button disabled={data.length < 20} onClick={() => setPage(p => p + 1)} className="px-3 py-1 bg-white border rounded hover:bg-gray-100 disabled:opacity-50">Вперед</button>
                    </div>
                </div>
            </div>

            {/* Модалка деталей */}
            <Modal isOpen={!!selectedItem} onClose={() => setSelectedItem(null)}>
                {selectedItem && (
                    <div className="p-6 max-w-lg w-full">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="p-3 bg-indigo-50 rounded-full text-indigo-600">
                                <Printer size={24}/>
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-gray-800">Детали печати</h3>
                                <p className="text-xs text-gray-500">ID операции: {selectedItem.id}</p>
                            </div>
                        </div>

                        <div className="space-y-4 bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Наименование:</span>
                                <span className="font-bold">{selectedItem.labelName}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Дата печати:</span>
                                <span>{formatDateTime(selectedItem.createdAt)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Тираж:</span>
                                <span className="font-bold">{selectedItem.quantity} шт.</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Размер бумаги:</span>
                                <span>{selectedItem.params?.widthMm} x {selectedItem.params?.heightMm} мм</span>
                            </div>
                            
                            {selectedItem.params?.contract && (
                                <div className="border-t border-gray-200 pt-2 mt-2">
                                    <span className="text-gray-500 block mb-1">Договор:</span>
                                    <p className="bg-white p-2 rounded border border-gray-200 text-xs text-gray-700 italic">
                                        {selectedItem.params.contract}
                                    </p>
                                </div>
                            )}
                            
                            {/* Технические данные */}
                            <div className="border-t border-gray-200 pt-2 mt-2">
                                <span className="text-gray-500 block mb-1 flex items-center gap-1"><FileText size={12}/> Сырые данные (JSON):</span>
                                <pre className="bg-slate-800 text-green-400 p-2 rounded text-[10px] overflow-auto max-h-32">
                                    {JSON.stringify(selectedItem.params, null, 2)}
                                </pre>
                            </div>
                        </div>

                        <button 
                            onClick={() => setSelectedItem(null)} 
                            className="w-full mt-6 py-3 bg-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-300 transition"
                        >
                            Закрыть
                        </button>
                    </div>
                )}
            </Modal>
        </div>
    );
};