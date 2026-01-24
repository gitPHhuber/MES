import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { fetchDashboardStats } from "src/api/warehouseApi";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, Package, AlertTriangle, Activity, ArrowLeft } from "lucide-react";
import { WAREHOUSE_ROUTE } from "src/utils/consts"; 

export const AnalyticsPage: React.FC = () => {
    const navigate = useNavigate(); 
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDashboardStats().then(res => {
            setData(res);
            setLoading(false);
        });
    }, []);

    if (loading) return <div className="p-10 text-center text-gray-500">Загрузка аналитики...</div>;

    const totalItems = data?.stock?.totalItems || 0;
    const totalBoxes = data?.stock?.totalBoxes || 0;
    const scrapOp = data?.today?.find((x: any) => x.operation === 'QUALITY' || x.operation === 'SCRAP');
    const scrapToday = scrapOp ? Number(scrapOp.sumScrap) : 0;
    const chartData = data?.chart?.map((item: any) => ({
        name: new Date(item.date).toLocaleDateString('ru-RU', {weekday: 'short'}),
        count: Number(item.count)
    })) || [];

    return (
        <div className="p-6 max-w-7xl mx-auto animate-fade-in bg-gray-50 min-h-screen">
            <button 
                onClick={() => navigate(WAREHOUSE_ROUTE)}
                className="mb-4 flex items-center text-gray-500 hover:text-indigo-600 transition font-medium text-sm"
            >
                <ArrowLeft size={18} className="mr-1"/> Вернуться на склад
            </button>

            <h1 className="text-3xl font-bold text-gray-800 mb-8">Аналитическая панель</h1>

            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                {/* Карточка 1 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Всего на складе</p>
                            <h3 className="text-3xl font-bold text-indigo-600 mt-2">{Number(totalItems).toLocaleString()}</h3>
                            <p className="text-xs text-gray-400 mt-1">единиц хранения</p>
                        </div>
                        <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600"><Package /></div>
                    </div>
                </div>
                {/* Карточка 2 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Мест хранения</p>
                            <h3 className="text-3xl font-bold text-gray-800 mt-2">{totalBoxes}</h3>
                            <p className="text-xs text-gray-400 mt-1">активных коробок</p>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-xl text-gray-600"><Activity /></div>
                    </div>
                </div>
                {/* Карточка 3 */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-gray-500 text-sm font-medium">Брак за сегодня</p>
                            <h3 className="text-3xl font-bold text-red-600 mt-2">{scrapToday}</h3>
                            <p className="text-xs text-gray-400 mt-1">выявлено на ОТК</p>
                        </div>
                        <div className="p-3 bg-red-50 rounded-xl text-red-600"><AlertTriangle /></div>
                    </div>
                </div>
                {/* Карточка 4 */}
                <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-2xl shadow-lg text-white">
                    <p className="text-indigo-100 text-sm font-medium">Эффективность</p>
                    <h3 className="text-3xl font-bold mt-2">98.5%</h3>
                    <div className="flex items-center gap-1 text-xs text-indigo-200 mt-1">
                        <TrendingUp size={14}/> <span>Стабильный рост</span>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-700 mb-6">Динамика операций (7 дней)</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                            <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                            <Tooltip cursor={{fill: '#f9fafb'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
};