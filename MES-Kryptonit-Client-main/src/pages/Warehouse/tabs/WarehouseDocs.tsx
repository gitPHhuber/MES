import React, { useEffect, useState } from "react";
import { 
  FileText, Calendar, Search, Plus, Filter, 
  ArrowDownToLine, Printer, User, MoreHorizontal 
} from "lucide-react";
import { createDocument, fetchDocuments } from "src/api/warehouseApi";
import { WarehouseDocument } from "src/types/WarehouseModels";
import { formatDateTime } from "../utils";

export const WarehouseDocs: React.FC = () => {
  const [docs, setDocs] = useState<WarehouseDocument[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newDoc, setNewDoc] = useState({ number: "", type: "INCOME", comment: "" });

  const loadDocuments = async () => {
      setLoading(true);
      try {
          const res = await fetchDocuments({ 
            limit: 50, 
            search: search || undefined,
            type: typeFilter || undefined,
            dateFrom: dateFrom || undefined
          });
          setDocs(res.rows);
      } catch(e) { console.error(e); }
      finally { setLoading(false); }
  };

  useEffect(() => {
      const timer = setTimeout(loadDocuments, 500);
      return () => clearTimeout(timer);
  }, [search, typeFilter, dateFrom]);

  const handleCreate = async () => {
      if(!newDoc.number) return alert("Введите номер!");
      try {
          await createDocument({ ...newDoc, boxId: null }); // boxId можно привязать позже
          setIsCreateOpen(false);
          setNewDoc({ number: "", type: "INCOME", comment: "" });
          loadDocuments();
      } catch(e) { alert("Ошибка"); }
  };

  // Хелпер для цветов типов
  const getTypeStyle = (type: string | null) => {
      const t = (type || "").toUpperCase();
      if (t.includes("INCOME") || t.includes("ПРИХОД")) return "bg-emerald-100 text-emerald-700 border-emerald-200";
      if (t.includes("OUT") || t.includes("РАСХОД") || t.includes("СПИСАНИЕ")) return "bg-orange-100 text-orange-700 border-orange-200";
      return "bg-blue-50 text-blue-700 border-blue-200";
  }

  return (
    <div className="space-y-6 animate-fade-in">
        
        {/* Панель управления */}
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                    <input 
                        value={search} onChange={e => setSearch(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent" 
                        placeholder="Поиск по номеру или комментарию..." 
                    />
                </div>
                
                <select 
                    value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                    className="p-2 border border-gray-200 rounded-lg bg-gray-50 text-sm font-medium"
                >
                    <option value="">Все типы</option>
                    <option value="INCOME">Приход (INCOME)</option>
                    <option value="OUTCOME">Расход (OUTCOME)</option>
                    <option value="MOVE">Перемещение</option>
                </select>

                <input 
                    type="date" 
                    value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                    className="p-2 border border-gray-200 rounded-lg text-sm text-gray-600"
                />
            </div>

            <button 
                onClick={() => setIsCreateOpen(!isCreateOpen)}
                className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 transition shadow-sm"
            >
                <Plus size={18} /> Новый документ
            </button>
        </div>

        {/* Форма создания (Inline) */}
        {isCreateOpen && (
            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 flex flex-col md:flex-row gap-3 items-end animate-fade-in">
                <div className="flex-1 w-full">
                    <label className="text-xs font-bold text-indigo-900 uppercase">Номер</label>
                    <input value={newDoc.number} onChange={e => setNewDoc({...newDoc, number: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="№ АКТ-001" />
                </div>
                <div className="w-full md:w-48">
                    <label className="text-xs font-bold text-indigo-900 uppercase">Тип</label>
                    <select value={newDoc.type} onChange={e => setNewDoc({...newDoc, type: e.target.value})} className="w-full p-2 border rounded-lg">
                        <option value="INCOME">Приход</option>
                        <option value="OUTCOME">Списание</option>
                        <option value="MOVE">Акт перемещения</option>
                    </select>
                </div>
                <div className="flex-[2] w-full">
                    <label className="text-xs font-bold text-indigo-900 uppercase">Комментарий</label>
                    <input value={newDoc.comment} onChange={e => setNewDoc({...newDoc, comment: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="Основание..." />
                </div>
                <button onClick={handleCreate} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700">Сохранить</button>
            </div>
        )}

        {/* Таблица (Реестр) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                        <th className="px-6 py-4">Документ</th>
                        <th className="px-6 py-4">Тип</th>
                        <th className="px-6 py-4">Дата / Автор</th>
                        <th className="px-6 py-4">Комментарий</th>
                        <th className="px-6 py-4 text-right">Действия</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {loading ? (
                         <tr><td colSpan={5} className="p-10 text-center text-gray-400">Загрузка...</td></tr>
                    ) : docs.length === 0 ? (
                         <tr><td colSpan={5} className="p-10 text-center text-gray-400">Документы не найдены</td></tr>
                    ) : (
                        docs.map(doc => (
                            <tr key={doc.id} className="hover:bg-gray-50 transition-colors group">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                                            <FileText size={20} />
                                        </div>
                                        <div>
                                            <div className="font-bold text-gray-900">{doc.number}</div>
                                            <div className="text-xs text-gray-400">ID: {doc.id}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${getTypeStyle(doc.type)}`}>
                                        {doc.type || "OTHER"}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                                            <Calendar size={14} className="text-gray-400"/> 
                                            {doc.date || formatDateTime(doc.createdAt).split(',')[0]}
                                        </span>
                                        <span className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                                            <User size={12}/> 
                                            {doc.createdBy?.name || "Система"}
                                        </span>
                                    </div>
                                </td>
                                <td className="px-6 py-4 max-w-xs">
                                    <div className="text-sm text-gray-600 truncate" title={doc.comment || ""}>
                                        {doc.comment || "—"}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition" title="Печать">
                                            <Printer size={18} />
                                        </button>
                                        <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition" title="Скачать">
                                            <ArrowDownToLine size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    </div>
  );
};