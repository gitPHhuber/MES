import React, { useEffect, useState } from "react";
import { fetchAssembledHistory } from "src/api/assemblyRecipesApi";
import { fetchProjects } from "src/api/projectsApi";
import { ProductPassportModal } from "./components/ProductPassportModal";
import { Search, Database, FileText, Filter, AlertTriangle, CheckCircle2 } from "lucide-react";

export const AssembledProductsPage: React.FC = () => {
    const [history, setHistory] = useState<any[]>([]);
    const [projects, setProjects] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Filters
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [search, setSearch] = useState("");
    const [showDefectsOnly, setShowDefectsOnly] = useState(false); // Вкладка дефектов

    // Modal
    const [selectedProcessId, setSelectedProcessId] = useState<number | null>(null);

    useEffect(() => {
        fetchProjects().then(setProjects);
    }, []);

    useEffect(() => {
        loadData();
    }, [selectedProjectId]); 

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await fetchAssembledHistory({ 
                projectId: selectedProjectId ? Number(selectedProjectId) : undefined,
                search: search || undefined
            });
            setHistory(data);
        } finally {
            setLoading(false);
        }
    };

    // Фильтрация на клиенте (так как мы получаем флаг hasDefects с бэкенда)
    const filteredHistory = showDefectsOnly 
        ? history.filter(item => item.hasDefects) 
        : history;

    return (
        <div className="min-h-screen bg-gray-50/50 p-6 pb-20">
            <div className="max-w-7xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-200 text-white">
                        <Database size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">База Данных Сборки</h1>
                        <p className="text-gray-500 font-medium">Реестр готовой продукции и паспорта изделий</p>
                    </div>
                </div>

                {/* Вкладки */}
                <div className="flex gap-2 mb-4 border-b border-gray-200 pb-1">
                    <button 
                        onClick={() => setShowDefectsOnly(false)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-all relative top-[1px] flex items-center gap-2 ${!showDefectsOnly ? 'bg-white text-blue-600 border border-gray-200 border-b-white z-10' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <CheckCircle2 size={16}/> Все изделия
                    </button>
                    <button 
                        onClick={() => setShowDefectsOnly(true)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-bold transition-all relative top-[1px] flex items-center gap-2 ${showDefectsOnly ? 'bg-white text-red-600 border border-gray-200 border-b-white z-10' : 'text-gray-500 hover:text-red-500'}`}
                    >
                        <AlertTriangle size={16}/> С пропусками (Брак)
                        {history.filter(h => h.hasDefects).length > 0 && (
                            <span className="bg-red-100 text-red-600 text-xs px-1.5 rounded-full">
                                {history.filter(h => h.hasDefects).length}
                            </span>
                        )}
                    </button>
                </div>

                {/* Filters Toolbar */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Search className="text-gray-400" size={20}/>
                        <input 
                            className="w-full p-2 border-b-2 border-gray-100 focus:border-blue-500 outline-none transition text-sm"
                            placeholder="Поиск по ID / QR..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && loadData()}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Filter className="text-gray-400" size={20}/>
                        <select 
                            className="p-2 border rounded-lg bg-gray-50 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-100"
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                        >
                            <option value="">Все проекты</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                    </div>

                    <button onClick={loadData} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition text-sm">
                        Обновить
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                            <tr>
                                <th className="p-4">Статус</th>
                                <th className="p-4">ID Изделия (QR)</th>
                                <th className="p-4">Проект</th>
                                <th className="p-4">Сборщик</th>
                                <th className="p-4">Дата завершения</th>
                                <th className="p-4 text-right">Действия</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Загрузка...</td></tr>
                            ) : filteredHistory.length === 0 ? (
                                <tr><td colSpan={6} className="p-10 text-center text-gray-400">Изделия не найдены</td></tr>
                            ) : (
                                filteredHistory.map(item => (
                                    <tr key={item.id} className={`hover:bg-blue-50/30 transition ${item.hasDefects ? 'bg-red-50/30' : ''}`}>
                                        <td className="p-4">
                                            {item.hasDefects 
                                                ? <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-red-100 text-red-600 uppercase"><AlertTriangle size={12}/> Пропуски</span>
                                                : <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold bg-green-100 text-green-600 uppercase"><CheckCircle2 size={12}/> OK</span>
                                            }
                                        </td>
                                        <td className="p-4 font-mono font-bold text-indigo-600">{item.qrCode}</td>
                                        <td className="p-4 font-medium text-gray-800">{item.projectTitle}</td>
                                        <td className="p-4 text-sm text-gray-600">{item.assembler}</td>
                                        <td className="p-4 text-sm text-gray-500">
                                            {new Date(item.endTime).toLocaleString("ru-RU")}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button 
                                                onClick={() => setSelectedProcessId(item.id)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-sm font-bold text-gray-700 hover:bg-gray-50 hover:border-blue-300 hover:text-blue-600 transition shadow-sm"
                                            >
                                                <FileText size={16}/> Паспорт
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Passport Modal */}
            <ProductPassportModal 
                processId={selectedProcessId} 
                onClose={() => {
                    setSelectedProcessId(null);
                    // Можно перезагружать данные при закрытии модалки, если там что-то правили
                    if (showDefectsOnly) loadData(); 
                }} 
            />
        </div>
    );
};