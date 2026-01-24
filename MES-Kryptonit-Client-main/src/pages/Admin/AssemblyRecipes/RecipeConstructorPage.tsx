import React, { useEffect, useState } from "react";
import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { createOrUpdateRecipe, fetchRecipeByProject, RecipeStep } from "src/api/assemblyRecipesApi";
import { 
    Save, Plus, Trash2, Layers, ArrowDown, 
    FileText, CheckSquare, Settings, AlertCircle 
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
                    setSteps(recipe.steps.length > 0 ? recipe.steps : [{ order: 1, title: "", quantity: 1 }]);
                    toast.success("Рецепт загружен");
                } else {
                    const proj = projects.find(p => p.id === Number(selectedProjectId));
                    setRecipeTitle(proj ? `Сборка: ${proj.title}` : "");
                    setSteps([{ order: 1, title: "", quantity: 1 }]);
                }
            } catch (e) {
                console.error(e);
            }
        };
        loadExisting();
    }, [selectedProjectId, projects]);

    const handleAddStep = () => {
        setSteps([...steps, { 
            order: steps.length + 1, 
            title: "", 
            quantity: 1, 
            description: "" 
        }]);
    };

    const handleRemoveStep = (index: number) => {
        if (steps.length === 1) return;
        const newSteps = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
        setSteps(newSteps);
    };

    const handleChangeStep = (index: number, field: keyof RecipeStep, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [field]: value };
        setSteps(newSteps);
    };

    const handleSave = async () => {
        if (!selectedProjectId) return toast.error("Выберите проект");
        if (!recipeTitle) return toast.error("Укажите название рецепта");
        if (steps.some(s => !s.title)) return toast.error("У всех шагов должно быть название");

        setLoading(true);
        try {
            await createOrUpdateRecipe(Number(selectedProjectId), recipeTitle, steps);
            toast.success("Рецепт успешно сохранен!");
        } catch (e) {
            toast.error("Ошибка сохранения");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50/50 p-8 pb-20">
            <div className="max-w-5xl mx-auto">
                
                <div className="flex items-center gap-4 mb-8">
                    <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
                        <Settings size={32} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-800">Конструктор Техкарт</h1>
                        <p className="text-gray-500 font-medium">Создание пошаговых инструкций для сборки</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 sticky top-6">
                            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                                <Layers size={18} className="text-indigo-500"/> Настройки
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Проект</label>
                                    <select 
                                        className="w-full p-3 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition"
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
                                        <Save size={18}/> {loading ? "Сохранение..." : "Сохранить рецепт"}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* RIGHT PANEL: STEPS */}
                    <div className="lg:col-span-2 space-y-4">
                        {steps.map((step, index) => (
                            <div key={index} className="group relative bg-white p-5 rounded-2xl shadow-sm border border-gray-200 hover:border-indigo-300 transition-all">
                                <div className="absolute -left-3 top-6 w-6 h-6 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xs border-2 border-white shadow-sm">
                                    {index + 1}
                                </div>

                                <div className="flex gap-4 mb-3">
                                    <div className="flex-1">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Действие / Компонент</label>
                                        <input 
                                            className="w-full p-2 border-b border-gray-200 focus:border-indigo-500 outline-none font-bold text-gray-800"
                                            placeholder="Что нужно сделать?"
                                            value={step.title}
                                            onChange={e => handleChangeStep(index, "title", e.target.value)}
                                        />
                                    </div>
                                    <div className="w-24">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase">Кол-во</label>
                                        <input 
                                            type="number" min="1"
                                            className="w-full p-2 border-b border-gray-200 focus:border-indigo-500 outline-none text-center font-mono"
                                            value={step.quantity}
                                            onChange={e => handleChangeStep(index, "quantity", Number(e.target.value))}
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase">Инструкция (Детали)</label>
                                    <textarea 
                                        className="w-full p-2 bg-gray-50 rounded-lg text-sm border-0 focus:ring-1 focus:ring-indigo-300 resize-none h-20"
                                        placeholder="Дополнительные указания для сборщика..."
                                        value={step.description}
                                        onChange={e => handleChangeStep(index, "description", e.target.value)}
                                    />
                                </div>

                                <button 
                                    onClick={() => handleRemoveStep(index)}
                                    className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18}/>
                                </button>

                                {index < steps.length - 1 && (
                                    <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 text-gray-300">
                                        <ArrowDown size={16}/>
                                    </div>
                                )}
                            </div>
                        ))}

                        <button 
                            onClick={handleAddStep}
                            className="w-full py-4 border-2 border-dashed border-gray-300 rounded-2xl text-gray-500 font-bold hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition flex justify-center items-center gap-2"
                        >
                            <Plus size={20}/> Добавить шаг
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};