import React, { useEffect, useState } from "react";
import { fetchAssemblyPassport, updateAssemblyPassport } from "src/api/assemblyRecipesApi";
import { CheckCircle2, XCircle, User, Calendar, Box, Activity, X, MapPin, Edit, Save } from "lucide-react";
import { Modal } from "src/components/Modal/Modal";
import toast from "react-hot-toast";

interface Props {
    processId: number | null;
    onClose: () => void;
}

export const ProductPassportModal: React.FC<Props> = ({ processId, onClose }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    
    // Режим редактирования
    const [isEditing, setIsEditing] = useState(false);
    const [editedSteps, setEditedSteps] = useState<number[]>([]);

    useEffect(() => {
        if (processId) {
            setLoading(true);
            fetchAssemblyPassport(processId)
                .then(res => {
                    setData(res);
                    setEditedSteps(res.process.completedSteps || []);
                })
                .catch(console.error)
                .finally(() => setLoading(false));
        } else {
            setData(null);
            setIsEditing(false);
        }
    }, [processId]);

    const handleSave = async () => {
        if(!data) return;
        try {
            await updateAssemblyPassport(data.process.id, editedSteps);
            toast.success("Паспорт обновлен");
            setIsEditing(false);
            // Обновляем локальные данные, чтобы не перезагружать
            setData({ ...data, process: { ...data.process, completedSteps: editedSteps } });
        } catch (e) {
            toast.error("Ошибка сохранения");
        }
    };

    const toggleStep = (index: number) => {
        if (editedSteps.includes(index)) {
            setEditedSteps(editedSteps.filter(i => i !== index));
        } else {
            setEditedSteps([...editedSteps, index]);
        }
    };

    if (!processId) return null;

    return (
        <Modal isOpen={!!processId} onClose={onClose}>
            {/* Увеличили ширину до max-w-3xl и убрали лишние отступы */}
            <div className="bg-white rounded-2xl w-full max-w-3xl h-[85vh] flex flex-col overflow-hidden shadow-2xl">
                
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100 bg-gray-50 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-white rounded-lg shadow-sm text-indigo-600 border border-indigo-100">
                            <Box size={24}/>
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-800">Паспорт Изделия</h2>
                            <p className="text-xs text-gray-500 font-mono">ID: {data?.process?.box?.qrCode || "Loading..."}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {data && !isEditing && (
                            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition text-sm font-bold shadow-sm">
                                <Edit size={16}/> Редактировать
                            </button>
                        )}
                        {isEditing && (
                            <button onClick={handleSave} className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition text-sm font-bold shadow-sm">
                                <Save size={16}/> Сохранить
                            </button>
                        )}
                        <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition">
                            <X size={20}/>
                        </button>
                    </div>
                </div>

                {/* Content scrollable area */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar bg-white">
                    {loading ? (
                        <div className="flex justify-center items-center h-full text-gray-400">Загрузка данных...</div>
                    ) : data ? (
                        <>
                            {/* Основные данные */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                                <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100">
                                    <p className="text-[10px] text-indigo-400 uppercase font-bold mb-1">Проект / Рецепт</p>
                                    <div className="font-bold text-gray-800 text-sm mb-0.5">{data.process.recipe.project.title}</div>
                                    <div className="text-xs text-gray-500">{data.process.recipe.title}</div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><User size={10}/> Сборщик</p>
                                    <div className="font-bold text-gray-800 text-sm">{data.user ? `${data.user.surname} ${data.user.name}` : "Неизвестно"}</div>
                                    <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1">
                                        <MapPin size={10}/> {data.user?.structure || "—"}
                                    </div>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                    <p className="text-[10px] text-gray-400 uppercase font-bold mb-1 flex items-center gap-1"><Calendar size={10}/> Завершено</p>
                                    <div className="font-bold text-gray-800 text-sm">
                                        {new Date(data.process.endTime).toLocaleDateString()}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-0.5">
                                        {new Date(data.process.endTime).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>

                            {/* Карта сборки */}
                            <div className="mb-2 flex items-center justify-between">
                                <h3 className="text-sm font-bold text-gray-700 uppercase flex items-center gap-2">
                                    <Activity size={16} className="text-indigo-500"/> Карта сборки
                                </h3>
                                {isEditing && <span className="text-xs text-orange-600 font-bold animate-pulse">Режим редактирования</span>}
                            </div>
                            
                            <div className="space-y-3 relative pl-4 border-l-2 border-gray-100 ml-2 pb-4">
                                {data.steps.map((step: any, index: number) => {
                                    // Если редактируем, берем из стейта, иначе из props
                                    const isDone = isEditing 
                                        ? editedSteps.includes(index)
                                        : data.process.completedSteps.includes(index);
                                    
                                    return (
                                        <div key={step.id} className="relative pl-6">
                                            {/* Линия и точка */}
                                            <div 
                                                className={`absolute -left-[21px] top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-white shadow-sm z-10 
                                                ${isDone ? 'bg-green-500' : 'bg-red-500'}`}
                                            ></div>
                                            
                                            <div 
                                                onClick={() => isEditing && toggleStep(index)}
                                                className={`
                                                    flex justify-between items-center p-3 rounded-xl border transition-all
                                                    ${isEditing ? 'cursor-pointer hover:border-indigo-300 hover:shadow-md' : ''}
                                                    ${isDone ? 'bg-white border-gray-200' : 'bg-red-50 border-red-200'}
                                                `}
                                            >
                                                <div>
                                                    <div className={`text-sm font-bold ${isDone ? 'text-gray-800' : 'text-red-700'}`}>
                                                        <span className="mr-2 text-gray-400 font-mono">{index + 1}.</span>
                                                        {step.title}
                                                    </div>
                                                    {step.description && <div className="text-xs text-gray-500 mt-0.5 ml-5">{step.description}</div>}
                                                </div>
                                                
                                                <div>
                                                    {isDone 
                                                        ? <div className="flex items-center gap-2 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded"><CheckCircle2 size={16}/> OK</div>
                                                        : <div className="flex items-center gap-2 text-red-600 text-xs font-bold bg-white px-2 py-1 rounded border border-red-100"><XCircle size={16}/> MISS</div>
                                                    }
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="p-10 text-center text-red-400">Ошибка загрузки паспорта</div>
                    )}
                </div>
            </div>
        </Modal>
    );
};