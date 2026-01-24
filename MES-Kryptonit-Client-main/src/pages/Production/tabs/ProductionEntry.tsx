/**
 * ProductionEntry.tsx - Ввод выработки v2
 * 
 * С выбором проекта, задачи, операции и сотрудника
 */

import React, { useState, useEffect, useContext, useMemo } from "react";
import { 
    Calendar, User, Hash, MessageSquare, Save, 
    Plus, RotateCcw, CheckCircle2, Clock, FolderKanban,
    ClipboardList, Settings2, Users
} from "lucide-react";
import toast from "react-hot-toast";
import { Context } from "src/main";
import { observer } from "mobx-react-lite";

import { 
    createOutput, 
    fetchOperationTypes, 
    fetchMyTeamMembers,
    fetchOutputs,
    OperationType, 
    TeamMember,
    ProductionOutput,
    OUTPUT_STATUS_LABELS,
    OUTPUT_STATUS_COLORS,
    formatUserName,
    formatDate
} from "src/api/productionApi";

import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { fetchTasks, ProductionTask } from "src/api/tasksApi";

export const ProductionEntry: React.FC = observer(() => {
    const context = useContext(Context);
    const currentUser = context?.user?.user;

    // === СПРАВОЧНИКИ ===
    const [operationTypes, setOperationTypes] = useState<OperationType[]>([]);
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [tasks, setTasks] = useState<ProductionTask[]>([]);
    
    // === ФОРМА ===
    const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [selectedProjectId, setSelectedProjectId] = useState<number | null>(null);
    const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
    const [selectedOperationId, setSelectedOperationId] = useState<number | null>(null);
    const [quantity, setQuantity] = useState<number>(0);
    const [comment, setComment] = useState("");
    
    // === UI STATE ===
    const [loading, setLoading] = useState(false);
    const [todayOutputs, setTodayOutputs] = useState<ProductionOutput[]>([]);

    // === ЗАГРУЗКА ДАННЫХ ===
    useEffect(() => {
        loadInitialData();
    }, []);

    useEffect(() => {
        if (currentUser?.id) {
            setSelectedUserId(currentUser.id);
        }
    }, [currentUser]);

    useEffect(() => {
        // При смене проекта — загружаем задачи
        if (selectedProjectId) {
            loadTasks(selectedProjectId);
        } else {
            setTasks([]);
            setSelectedTaskId(null);
        }
    }, [selectedProjectId]);

    useEffect(() => {
        // Загружаем записи за сегодня
        loadTodayOutputs();
    }, [date, selectedUserId]);

    const loadInitialData = async () => {
        try {
            const [ops, members, projs] = await Promise.all([
                fetchOperationTypes(),
                fetchMyTeamMembers(),
                fetchProjects()
            ]);
            setOperationTypes(ops);
            setTeamMembers(members);
            setProjects(projs);
        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки данных");
        }
    };

    const loadTasks = async (projectId: number) => {
        try {
            const result = await fetchTasks({ 
                status: 'active',
                limit: 100 
            });
            // Фильтруем по проекту на клиенте (или добавить фильтр на сервере)
            const filtered = result.rows.filter(t => t.projectId === projectId);
            setTasks(filtered);
        } catch (e) {
            console.error(e);
        }
    };

    const loadTodayOutputs = async () => {
        if (!selectedUserId) return;
        
        try {
            const result = await fetchOutputs({
                userId: selectedUserId,
                dateFrom: date,
                dateTo: date,
                limit: 50
            });
            setTodayOutputs(result.rows);
        } catch (e) {
            console.error(e);
        }
    };

    // === СТАТИСТИКА ЗА СЕГОДНЯ ===
    const todayStats = useMemo(() => {
        const pending = todayOutputs
            .filter(o => o.status === 'pending')
            .reduce((sum, o) => sum + o.claimedQty, 0);
        
        const approved = todayOutputs
            .filter(o => o.status === 'approved' || o.status === 'adjusted')
            .reduce((sum, o) => sum + o.approvedQty, 0);
        
        const total = todayOutputs.reduce((sum, o) => sum + o.claimedQty, 0);
        
        return { pending, approved, total, count: todayOutputs.length };
    }, [todayOutputs]);

    // === ОБРАБОТЧИКИ ===
    const handleQuickAdd = (val: number) => {
        setQuantity(prev => prev + val);
    };

    const handleReset = () => {
        setQuantity(0);
        setComment("");
    };

    const handleSubmit = async () => {
        if (!selectedUserId) {
            toast.error("Выберите сотрудника");
            return;
        }
        if (quantity <= 0) {
            toast.error("Укажите количество");
            return;
        }

        setLoading(true);
        try {
            await createOutput({
                date,
                userId: selectedUserId,
                projectId: selectedProjectId,
                taskId: selectedTaskId,
                operationTypeId: selectedOperationId,
                claimedQty: quantity,
                comment: comment || undefined
            });
            
            toast.success(`Записано: ${quantity} шт`);
            setQuantity(0);
            setComment("");
            loadTodayOutputs();
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка сохранения");
        } finally {
            setLoading(false);
        }
    };

    // === РЕНДЕР ===
    const selectedUser = teamMembers.find(u => u.id === selectedUserId);
    const isForSelf = selectedUserId === currentUser?.id;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* === ФОРМА ВВОДА === */}
            <div className="lg:col-span-2 space-y-4">
                
                {/* Заголовок */}
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-6 py-4 rounded-xl shadow-lg">
                    <h2 className="text-xl font-bold flex items-center gap-2">
                        <Plus size={24} />
                        Внести выработку
                    </h2>
                    <p className="text-emerald-100 text-sm mt-1">
                        Укажите проект, операцию и количество
                    </p>
                </div>

                {/* Поля формы */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-5">
                    
                    {/* Дата */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Calendar size={16} className="text-gray-400" />
                            Дата
                        </label>
                        <input
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                        />
                    </div>

                    {/* Сотрудник */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <User size={16} className="text-gray-400" />
                            Сотрудник
                        </label>
                        <select
                            value={selectedUserId || ""}
                            onChange={(e) => setSelectedUserId(Number(e.target.value) || null)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white"
                        >
                            <option value="">— Выберите сотрудника —</option>
                            {teamMembers.map(u => (
                                <option key={u.id} value={u.id}>
                                    {u.id === currentUser?.id ? "За себя" : `${u.surname} ${u.name}`}
                                    {u.team ? ` (${u.team.title})` : ""}
                                </option>
                            ))}
                        </select>
                        {!isForSelf && selectedUser && (
                            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                <Users size={12} />
                                Вы вносите за: {selectedUser.surname} {selectedUser.name}
                            </p>
                        )}
                    </div>

                    {/* Проект */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <FolderKanban size={16} className="text-gray-400" />
                            Проект
                            <span className="text-gray-400 font-normal">(опционально)</span>
                        </label>
                        <select
                            value={selectedProjectId || ""}
                            onChange={(e) => setSelectedProjectId(Number(e.target.value) || null)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white"
                        >
                            <option value="">— Без проекта —</option>
                            {projects.map(p => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                            ))}
                        </select>
                    </div>

                    {/* Задача (если выбран проект) */}
                    {selectedProjectId && tasks.length > 0 && (
                        <div>
                            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                                <ClipboardList size={16} className="text-gray-400" />
                                Задача
                                <span className="text-gray-400 font-normal">(опционально)</span>
                            </label>
                            <select
                                value={selectedTaskId || ""}
                                onChange={(e) => setSelectedTaskId(Number(e.target.value) || null)}
                                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white"
                            >
                                <option value="">— Без задачи —</option>
                                {tasks.map(t => (
                                    <option key={t.id} value={t.id}>
                                        {t.title} ({t.targetQty} {t.unit})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Тип операции */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Settings2 size={16} className="text-gray-400" />
                            Тип операции
                        </label>
                        <select
                            value={selectedOperationId || ""}
                            onChange={(e) => setSelectedOperationId(Number(e.target.value) || null)}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition bg-white"
                        >
                            <option value="">— Без типа —</option>
                            {operationTypes.map(op => (
                                <option key={op.id} value={op.id}>
                                    {op.name} {op.code ? `(${op.code})` : ""} — {op.unit}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Количество */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <Hash size={16} className="text-gray-400" />
                            Количество
                        </label>
                        <input
                            type="number"
                            min="0"
                            value={quantity || ""}
                            onChange={(e) => setQuantity(Number(e.target.value) || 0)}
                            placeholder="Введите количество"
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition text-lg font-semibold"
                        />
                        
                        {/* Быстрые кнопки */}
                        <div className="flex gap-2 mt-3">
                            {[10, 20, 50, 100, 200].map(val => (
                                <button
                                    key={val}
                                    onClick={() => handleQuickAdd(val)}
                                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition"
                                >
                                    +{val}
                                </button>
                            ))}
                            <button
                                onClick={handleReset}
                                className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition"
                            >
                                Сброс
                            </button>
                        </div>
                    </div>

                    {/* Комментарий */}
                    <div>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
                            <MessageSquare size={16} className="text-gray-400" />
                            Комментарий
                            <span className="text-gray-400 font-normal">(опционально)</span>
                        </label>
                        <textarea
                            value={comment}
                            onChange={(e) => setComment(e.target.value)}
                            placeholder="Дополнительная информация..."
                            rows={2}
                            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition resize-none"
                        />
                    </div>

                    {/* Кнопка сохранения */}
                    <button
                        onClick={handleSubmit}
                        disabled={loading || quantity <= 0}
                        className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-xl font-bold text-lg flex items-center justify-center gap-2 transition shadow-lg disabled:shadow-none"
                    >
                        <Save size={20} />
                        {loading ? "Сохранение..." : "Сохранить"}
                    </button>
                </div>
            </div>

            {/* === ПРАВАЯ КОЛОНКА: СТАТИСТИКА === */}
            <div className="space-y-4">
                
                {/* Итого за день */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 mb-4">
                        Итого за {formatDate(date)}
                    </h3>
                    
                    <div className="space-y-3">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="flex items-center gap-2 text-yellow-600">
                                <Clock size={16} />
                                Ожидает
                            </span>
                            <span className="font-bold text-lg">{todayStats.pending}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                            <span className="flex items-center gap-2 text-green-600">
                                <CheckCircle2 size={16} />
                                Подтверждено
                            </span>
                            <span className="font-bold text-lg text-green-600">{todayStats.approved}</span>
                        </div>
                        
                        <div className="flex justify-between items-center py-2">
                            <span className="text-gray-600 font-medium">Всего</span>
                            <span className="font-bold text-xl">{todayStats.total}</span>
                        </div>
                    </div>
                </div>

                {/* Мои записи за сегодня */}
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
                    <h3 className="font-bold text-gray-800 mb-4">Мои записи</h3>
                    
                    {todayOutputs.length === 0 ? (
                        <div className="text-center py-8 text-gray-400">
                            <Clock size={32} className="mx-auto mb-2 opacity-50" />
                            <p>Нет записей за этот день</p>
                        </div>
                    ) : (
                        <div className="space-y-2 max-h-80 overflow-y-auto">
                            {todayOutputs.map(output => (
                                <div 
                                    key={output.id}
                                    className="p-3 bg-gray-50 rounded-lg border border-gray-100"
                                >
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-medium text-sm">
                                                {output.operationType?.name || "Без типа"}
                                            </p>
                                            {output.project && (
                                                <p className="text-xs text-gray-500">
                                                    {output.project.title}
                                                </p>
                                            )}
                                        </div>
                                        <div className="text-right">
                                            <p className="font-bold">{output.claimedQty}</p>
                                            <span className={`text-xs px-2 py-0.5 rounded-full ${OUTPUT_STATUS_COLORS[output.status]}`}>
                                                {OUTPUT_STATUS_LABELS[output.status]}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
});

export default ProductionEntry;
