import React, { useEffect, useState } from "react";
import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { startAssemblyProcess, updateProcessStep, finishAssemblyProcess, AssemblyRecipe, AssemblyProcess } from "src/api/assemblyRecipesApi";
import { 
    QrCode, CheckCircle2, Circle, Flag, 
    Box, MonitorPlay 
} from "lucide-react";
import { Modal } from "src/components/Modal/Modal";
import toast from "react-hot-toast";

export const RecipeExecutionPage: React.FC = () => {
    // Setup
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    
    // Process
    const [recipe, setRecipe] = useState<AssemblyRecipe | null>(null);
    const [process, setProcess] = useState<AssemblyProcess | null>(null);
    const [loading, setLoading] = useState(false);

    // Modal
    const [isScanOpen, setScanOpen] = useState(false);
    const [qrCode, setQrCode] = useState("");

    useEffect(() => {
        fetchProjects().then(setProjects);
    }, []);

    // Старт сборки
    const handleStartSession = async () => {
        if (!selectedProjectId) return toast.error("Выберите проект");
        if (!qrCode.trim()) return toast.error("Сканируйте QR");

        setLoading(true);
        try {
            const res = await startAssemblyProcess(qrCode, Number(selectedProjectId));
            setRecipe(res.recipe);
            setProcess(res.process);
            setScanOpen(false);
            toast.success("Сборка начата");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка старта");
        } finally {
            setLoading(false);
        }
    };

    // Переключение шага
    const handleStepToggle = async (index: number) => {
        if (!process) return;
        
        // Логика: проверяем, выполнен ли шаг
        const isCompleted = process.completedSteps.includes(index);
        
        try {
            const updatedProcess = await updateProcessStep(process.id, index, !isCompleted); // Инвертируем состояние
            setProcess(updatedProcess);
        } catch (e) {
            toast.error("Ошибка обновления шага");
        }
    };

    // Завершение
    const handleFinish = async () => {
        if (!process || !recipe) return;
        
        const allDone = recipe.steps.length === process.completedSteps.length;
        if (!allDone) {
            if(!window.confirm("Внимание! Не все шаги отмечены как выполненные. Завершить принудительно?")) return;
        }

        try {
            await finishAssemblyProcess(process.id);
            toast.success("Изделие собрано!");
            // Reset
            setProcess(null);
            setRecipe(null);
            setQrCode("");
        } catch (e) {
            toast.error("Ошибка завершения");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100 flex flex-col">
            {/* TOP BAR */}
            <div className="bg-white shadow-sm border-b px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="bg-emerald-100 p-2 rounded-lg text-emerald-700">
                        <MonitorPlay size={24} />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold text-gray-800">Терминал Сборки</h1>
                        <p className="text-xs text-gray-500">Рабочее место оператора</p>
                    </div>
                </div>

                {!process && (
                    <div className="flex gap-3">
                        <select 
                            className="p-2.5 border rounded-xl bg-gray-50 text-sm font-medium w-64"
                            value={selectedProjectId}
                            onChange={e => setSelectedProjectId(e.target.value)}
                        >
                            <option value="">-- Выберите проект --</option>
                            {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                        </select>
                        <button 
                            onClick={() => setScanOpen(true)}
                            disabled={!selectedProjectId}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-xl font-bold shadow-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <QrCode size={18}/> Начать сборку
                        </button>
                    </div>
                )}

                {process && (
                    <button onClick={() => { if(confirm("Выйти без завершения?")) { setProcess(null); setRecipe(null); } }} className="text-red-500 text-sm font-bold hover:underline">
                        Отмена / Выход
                    </button>
                )}
            </div>

            {/* MAIN CONTENT */}
            {!process ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 p-10">
                    <Box size={64} className="mb-4 opacity-20"/>
                    <h2 className="text-xl font-semibold">Ожидание начала работы</h2>
                    <p className="text-sm">Выберите проект и отсканируйте корпус изделия</p>
                </div>
            ) : (
                <div className="flex-1 p-6 grid grid-cols-12 gap-6 h-[calc(100vh-80px)]">
                    
                    {/* LEFT: STATUS BAR */}
                    <div className="col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 p-4 flex flex-col overflow-y-auto">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Прогресс</h3>
                        <div className="space-y-3">
                            {recipe?.steps.map((step, idx) => {
                                const isDone = process.completedSteps.includes(idx);
                                return (
                                    <div key={idx} className={`flex items-center gap-3 p-3 rounded-xl transition-all ${isDone ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-transparent opacity-60'}`}>
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                                            {idx + 1}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-bold truncate ${isDone ? 'text-green-800' : 'text-gray-700'}`}>{step.title}</div>
                                        </div>
                                        {isDone && <CheckCircle2 size={16} className="text-green-500"/>}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* CENTER: INTERACTIVE STEPS */}
                    <div className="col-span-9 flex flex-col gap-4 h-full">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex justify-between items-center">
                            <div>
                                <h2 className="text-2xl font-bold text-gray-800">{recipe?.title}</h2>
                                <p className="text-indigo-600 font-mono text-sm mt-1">ID Изделия: {qrCode || "..."}</p>
                            </div>
                            <div className="text-right">
                                <div className="text-3xl font-black text-gray-900">
                                    {process.completedSteps.length} <span className="text-gray-400 text-xl font-medium">/ {recipe?.steps.length}</span>
                                </div>
                                <div className="text-xs text-gray-500 uppercase font-bold">Выполнено шагов</div>
                            </div>
                        </div>

                        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-y-auto custom-scrollbar">
                            <div className="space-y-4">
                                {recipe?.steps.map((step, idx) => {
                                    const isDone = process.completedSteps.includes(idx);
                                    return (
                                        <div 
                                            key={idx} 
                                            onClick={() => handleStepToggle(idx)}
                                            className={`
                                                relative cursor-pointer border-2 rounded-2xl p-5 transition-all duration-200 flex justify-between items-center group
                                                ${isDone ? 'border-green-500 bg-green-50/50 shadow-sm' : 'border-gray-100 hover:border-indigo-400 hover:shadow-md bg-white'}
                                            `}
                                        >
                                            <div className="flex items-start gap-5">
                                                <div className={`mt-1 w-12 h-12 rounded-2xl flex items-center justify-center text-xl font-bold transition-colors ${isDone ? 'bg-green-500 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-indigo-100 group-hover:text-indigo-600'}`}>
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <h3 className={`text-lg font-bold ${isDone ? 'text-green-800' : 'text-gray-800'}`}>
                                                        {step.title}
                                                        {step.quantity > 1 && <span className="ml-2 text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-sm">x{step.quantity}</span>}
                                                    </h3>
                                                    {step.description && <p className="text-gray-500 mt-1">{step.description}</p>}
                                                </div>
                                            </div>

                                            <div className="pr-4">
                                                {isDone 
                                                    ? <CheckCircle2 size={32} className="text-green-500 fill-green-100"/> 
                                                    : <Circle size={32} className="text-gray-300 group-hover:text-indigo-400"/>
                                                }
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>

                        {/* FOOTER ACTIONS */}
                        <div className="flex justify-end pt-2">
                            <button 
                                onClick={handleFinish}
                                className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-10 py-4 rounded-2xl font-bold text-lg shadow-lg hover:shadow-xl hover:scale-[1.01] transition flex items-center gap-3"
                            >
                                <Flag size={24}/> Завершить сборку
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCAN MODAL */}
            <Modal isOpen={isScanOpen} onClose={() => setScanOpen(false)}>
                <div className="p-8 text-center">
                    <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
                        <QrCode size={32}/>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Сканирование</h2>
                    <p className="text-gray-500 mb-6">Наведите сканер на QR код корпуса или введите ID</p>
                    
                    <input 
                        autoFocus
                        value={qrCode}
                        onChange={e => setQrCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleStartSession()}
                        className="w-full text-center text-2xl font-mono p-4 border-2 border-indigo-100 rounded-xl focus:border-indigo-600 outline-none mb-6"
                        placeholder="SCAN HERE"
                    />

                    <button 
                        onClick={handleStartSession}
                        disabled={loading}
                        className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-700 transition"
                    >
                        {loading ? "Загрузка..." : "Подтвердить"}
                    </button>
                </div>
            </Modal>
        </div>
    );
};