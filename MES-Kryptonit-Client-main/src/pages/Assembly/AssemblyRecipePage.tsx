import React, { useEffect, useState } from "react";
import { fetchProjects } from "src/api/projectsApi";
import { $authHost } from "src/api";
import { CheckCircle2, Circle, QrCode, Play, Flag } from "lucide-react";
import { Modal } from "src/components/Modal/Modal";
import toast from "react-hot-toast";

// Типы (лучше вынести в types)
interface Step { id: number; order: number; componentName: string; quantity: number; instruction: string; }
interface Recipe { id: number; title: string; steps: Step[]; }
interface Process { id: number; completedSteps: number[]; status: string; }

export const AssemblyRecipePage: React.FC = () => {
    const [projects, setProjects] = useState<any[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    const [recipe, setRecipe] = useState<Recipe | null>(null);
    const [process, setProcess] = useState<Process | null>(null);
    
    // Модалка старта
    const [isStartModalOpen, setStartModalOpen] = useState(false);
    const [qrCode, setQrCode] = useState("");

    // Загрузка проектов
    useEffect(() => {
        fetchProjects().then(setProjects);
    }, []);

    // При выборе проекта грузим рецепт
    useEffect(() => {
        if (!selectedProjectId) return;
        $authHost.get(`api/assembly/recipe/project/${selectedProjectId}`)
            .then(res => setRecipe(res.data))
            .catch(() => {
                setRecipe(null);
                toast.error("Рецепт не найден для этого проекта");
            });
    }, [selectedProjectId]);

    // Начало сборки
    const handleStart = async () => {
        try {
            const { data } = await $authHost.post('api/assembly/recipe/start', { 
                qrCode, 
                projectId: selectedProjectId 
            });
            setProcess(data.process);
            setStartModalOpen(false);
            setQrCode("");
            toast.success("Сборка начата!");
        } catch (e: any) {
            toast.error(e.response?.data?.message || "Ошибка старта");
        }
    };

    // Клик по шагу
    const toggleStep = async (stepId: number) => {
        if (!process) return;
        try {
            const { data } = await $authHost.post('api/assembly/recipe/step', { 
                processId: process.id, 
                stepId 
            });
            setProcess(data); // Обновляем состояние (массив completedSteps)
        } catch (e) {
            console.error(e);
        }
    };

    // Финиш
    const handleFinish = async () => {
        if (!process || !recipe) return;
        
        // Проверка: все ли шаги выполнены?
        const allDone = recipe.steps.every(s => process.completedSteps.includes(s.id));
        if (!allDone) {
            if (!window.confirm("Не все шаги выполнены! Точно завершить?")) return;
        }

        try {
            await $authHost.post('api/assembly/recipe/finish', { processId: process.id });
            toast.success("Сборка изделия завершена!");
            setProcess(null); // Сброс интерфейса
        } catch (e) {
            toast.error("Ошибка завершения");
        }
    };

    // --- Рендер ---
    return (
        <div className="min-h-screen bg-gray-50 p-6 flex flex-col">
            
            {/* ШАПКА */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-bold text-gray-800">Ручная сборка</h1>
                    <select 
                        className="p-2 border rounded-lg bg-gray-50"
                        value={selectedProjectId}
                        onChange={e => setSelectedProjectId(e.target.value)}
                        disabled={!!process} // Нельзя менять проект во время сборки
                    >
                        <option value="">-- Выберите проект --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>
                </div>

                {!process && (
                    <button 
                        disabled={!recipe}
                        onClick={() => setStartModalOpen(true)}
                        className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <QrCode size={20}/> Начать сборку (Скан ID)
                    </button>
                )}
            </div>

            {/* РАБОЧАЯ ОБЛАСТЬ */}
            {recipe && process && (
                <div className="flex flex-1 gap-6 h-full">
                    
                    {/* ЛЕВАЯ КОЛОНКА (Индикатор) */}
                    <div className="w-24 bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-col items-center gap-2 overflow-y-auto">
                        <div className="text-xs font-bold text-gray-400 mb-2 uppercase">Статус</div>
                        {recipe.steps.map((step, idx) => {
                            const isDone = process.completedSteps.includes(step.id);
                            return (
                                <div 
                                    key={step.id}
                                    className={`w-12 h-12 rounded-lg flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                                        isDone 
                                        ? "bg-green-500 text-white shadow-green-200 shadow-md scale-110" 
                                        : "bg-red-100 text-red-400 border border-red-200"
                                    }`}
                                >
                                    {idx + 1}
                                </div>
                            );
                        })}
                    </div>

                    {/* ЦЕНТР (Список шагов) */}
                    <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col">
                        <h2 className="text-xl font-bold text-gray-800 mb-4 pb-4 border-b">{recipe.title}</h2>
                        
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                            {recipe.steps.map((step, idx) => {
                                const isDone = process.completedSteps.includes(step.id);
                                return (
                                    <div 
                                        key={step.id}
                                        onClick={() => toggleStep(step.id)}
                                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                                            isDone 
                                            ? "border-green-500 bg-green-50" 
                                            : "border-gray-100 hover:border-indigo-200 hover:bg-gray-50"
                                        }`}
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center font-bold text-gray-600">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <div className="font-bold text-lg text-gray-800">
                                                    {step.componentName} 
                                                    {step.quantity > 1 && <span className="text-indigo-600 ml-2">x{step.quantity}</span>}
                                                </div>
                                                {step.instruction && <div className="text-sm text-gray-500">{step.instruction}</div>}
                                            </div>
                                        </div>

                                        <button className={`p-3 rounded-full transition-all ${isDone ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                            {isDone ? <CheckCircle2 size={24}/> : <Circle size={24}/>}
                                        </button>
                                    </div>
                                );
                            })}
                        </div>

                        {/* КНОПКА ЗАВЕРШИТЬ */}
                        <div className="mt-6 pt-4 border-t flex justify-end">
                            <button 
                                onClick={handleFinish}
                                className="bg-green-600 hover:bg-green-700 text-white text-lg font-bold py-4 px-12 rounded-xl shadow-lg flex items-center gap-3 transition transform active:scale-95"
                            >
                                <Flag size={24}/> Завершить сборку
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Модалка ввода QR */}
            <Modal isOpen={isStartModalOpen} onClose={() => setStartModalOpen(false)}>
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Начало сборки изделия</h2>
                    <p className="text-gray-500 mb-4">Отсканируйте QR код корпуса или введите ID</p>
                    <input 
                        autoFocus
                        value={qrCode}
                        onChange={e => setQrCode(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleStart()}
                        placeholder="QR код..."
                        className="w-full p-4 border-2 border-indigo-200 rounded-xl text-xl mb-4 focus:border-indigo-500 outline-none"
                    />
                    <button onClick={handleStart} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold">
                        <Play className="inline mr-2"/> Поехали
                    </button>
                </div>
            </Modal>
        </div>
    );
};