import React, { useEffect, useState } from "react";
import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { createOrUpdateRecipe, fetchRecipeByProject, RecipeStep } from "src/api/assemblyRecipesApi";
import { 
    Save, Plus, Trash2, Layers, 
    ArrowUp, ArrowDown, CopyPlus,
    Settings, FileText
} from "lucide-react";
import toast from "react-hot-toast";

export const RecipeConstructorPage: React.FC = () => {
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [selectedProjectId, setSelectedProjectId] = useState<string>("");
    
    const [recipeTitle, setRecipeTitle] = useState("");
    const [steps, setSteps] = useState<RecipeStep[]>([
        { order: 1, title: "", quantity: 1, description: "" }
    ]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchProjects().then(setProjects);
    }, []);

    useEffect(() => {
        if (!selectedProjectId) return;
        const loadExisting = async () => {
            try {
                const recipe = await fetchRecipeByProject(Number(selectedProjectId));
                if (recipe) {
                    setRecipeTitle(recipe.title);
                    setSteps(recipe.steps.sort((a, b) => a.order - b.order));
                    toast.success("Рецепт загружен");
                } else {
                    const proj = projects.find(p => p.id === Number(selectedProjectId));
                    setRecipeTitle(proj ? `Сборка: ${proj.title}` : "");
                    setSteps([{ order: 1, title: "", quantity: 1 }]);
                }
            } catch (e) { console.error(e); }
        };
        loadExisting();
    }, [selectedProjectId, projects]);

    // === ЛОГИКА УПРАВЛЕНИЯ ШАГАМИ ===

    // 1. Добавить шаг в самый конец (стандартная кнопка)
    const handleAddStepToEnd = () => {
        setSteps([...steps, { 
            order: steps.length + 1, 
            title: "", 
            quantity: 1, 
            description: "" 
        }]);
    };

    // 2. Вставить шаг ПОСЛЕ конкретного индекса
    const handleInsertStepAfter = (index: number) => {
        const newSteps = [...steps];
        const newStep: RecipeStep = { order: 0, title: "", quantity: 1, description: "" };
        
        newSteps.splice(index + 1, 0, newStep);
        
        updateOrders(newSteps);
    };

    // 3. Удалить конкретный шаг
    const handleRemoveStep = (index: number) => {
        if (steps.length === 1) return toast.error("Должен остаться хотя бы один шаг");
        const newSteps = steps.filter((_, i) => i !== index);
        updateOrders(newSteps);
    };

    // 4. Переместить шаг (Вверх/Вниз)
    const handleMoveStep = (index: number, direction: 'up' | 'down') => {
        const newSteps = [...steps];
        
        if (direction === 'up') {
            if (index === 0) return;
            [newSteps[index], newSteps[index - 1]] = [newSteps[index - 1], newSteps[index]];
        } else {
            if (index === newSteps.length - 1) return;
            [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
        }
        
        updateOrders(newSteps);
    };

    // Служебная: Пересчет порядковых номеров (1, 2, 3...)
    const updateOrders = (newSteps: RecipeStep[]) => {
        const ordered = newSteps.map((s, i) => ({ ...s, order: i + 1 }));
        setSteps(ordered);
    };

    const handleChangeStep = (index: number, field: keyof RecipeStep, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const handleSave = async () => {
        if (!selectedProjectId) return toast.error("Выберите проект");
        if (!recipeTitle) return toast.error("Укажите название рецепта");
        if (steps.some(s => !s.title.trim())) return toast.error("Заполните названия всех шагов");

        setLoading(true);
        try {
            await createOrUpdateRecipe(Number(selectedProjectId), recipeTitle, steps);
            toast.success("Рецепт успешно сохранен!");
        } catch (e: any) {
            console.error(e);
            const errorText = e.response?.data?.message || "Ошибка сохранения";
            toast.error(errorText);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 pb-20">
            <div className="max-w-6xl mx-auto">
                
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Конструктор Техкарт</h1>
                        <p className="text-gray-500 font-medium">Создание и редактирование рецептов сборки</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    
                    {/* LEFT PANEL: SETTINGS (3 cols) */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Layers size={18} className="text-indigo-500"/> Основные настройки
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Проект</label>
                                    <select 
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition cursor-pointer"
                                        value={selectedProjectId}
                                        onChange={e => setSelectedProjectId(e.target.value)}
                                    >
                                        <option value="">-- Выберите проект --</option>
                                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Название рецепта</label>
                                    <input 
                                        className="w-full p-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Напр. Сборка корпуса v2.0"
                                        value={recipeTitle}
                                        onChange={e => setRecipeTitle(e.target.value)}
                                    />
                                </div>

                                <div className="pt-4 border-t border-gray-100">
                                    <button 
                                        onClick={handleSave}
                                        disabled={loading}
                                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg transition flex justify-center items-center gap-2 disabled:opacity-50"
                                    >
                                        <Save size={18}/> {loading ? "Сохранение..." : "Сохранить изменения"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: STEPS (9 cols) */}
                    <div className="lg:col-span-8 space-y-6">
                        {steps.map((step, index) => (
                            <div key={index} className="relative">
                                {/* Карточка шага */}
                                <div className="group bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 hover:shadow-md transition-all">
                                    
                                    {/* Шапка карточки: Номер + Кнопки управления */}
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-lg flex items-center justify-center font-bold text-sm">
                                                {index + 1}
                                            </div>
                                            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Шаг сборки</span>
                                        </div>

                                        {/* Панель управления шагом */}
                                        <div className="flex bg-gray-50 rounded-lg p-1 border border-gray-100 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => handleMoveStep(index, 'up')}
                                                disabled={index === 0}
                                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md disabled:opacity-30 transition"
                                                title="Переместить вверх"
                                            >
                                                <ArrowUp size={16}/>
                                            </button>
                                            <button 
                                                onClick={() => handleMoveStep(index, 'down')}
                                                disabled={index === steps.length - 1}
                                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-white rounded-md disabled:opacity-30 transition"
                                                title="Переместить вниз"
                                            >
                                                <ArrowDown size={16}/>
                                            </button>
                                            <div className="w-px bg-gray-300 mx-1 my-1"></div>
                                            <button 
                                                onClick={() => handleRemoveStep(index)}
                                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-white rounded-md transition"
                                                title="Удалить этот шаг"
                                            >
                                                <Trash2 size={16}/>
                                            </button>
                                        </div>
                                    </div>

                                    {/* Поля ввода */}
                                    <div className="flex gap-4 mb-3">
                                        <div className="flex-1">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Действие / Компонент</label>
                                            <input 
                                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none font-medium text-gray-800 focus:ring-2 focus:ring-indigo-100 transition"
                                                placeholder="Например: Установить плату FC"
                                                value={step.title}
                                                onChange={e => handleChangeStep(index, "title", e.target.value)}
                                            />
                                        </div>
                                        <div className="w-24">
                                            <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Кол-во</label>
                                            <input 
                                                type="number" min="1"
                                                className="w-full p-2.5 border border-gray-200 rounded-lg focus:border-indigo-500 outline-none text-center font-bold text-gray-800"
                                                value={step.quantity}
                                                onChange={e => handleChangeStep(index, "quantity", Number(e.target.value))}
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Инструкция (Детали)</label>
                                        <textarea 
                                            className="w-full p-2.5 bg-gray-50 rounded-lg text-sm border border-transparent focus:bg-white focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 outline-none resize-none h-16 transition"
                                            placeholder="Уточнения: какой стороной ставить, момент затяжки..."
                                            value={step.description}
                                            onChange={e => handleChangeStep(index, "description", e.target.value)}
                                        />
                                    </div>
                                </div>

                                {/* Кнопка "Вставить шаг сюда" (появляется при наведении между карточками) */}
                                <div className="h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group/insert">
                                    <div className="w-full h-px bg-indigo-100 group-hover/insert:bg-indigo-300 transition-colors"></div>
                                    <button 
                                        onClick={() => handleInsertStepAfter(index)}
                                        className="absolute bg-white border border-indigo-200 text-indigo-600 px-3 py-1 rounded-full text-xs font-bold shadow-sm hover:bg-indigo-50 hover:border-indigo-400 transition transform hover:scale-105 flex items-center gap-1"
                                    >
                                        <CopyPlus size={14}/> Вставить шаг сюда
                                    </button>
                                </div>
                            </div>
                        ))}

                        <button 
                            onClick={handleAddStepToEnd}
                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex justify-center items-center gap-2"
                        >
                            <Plus size={20}/> Добавить шаг в конец
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};