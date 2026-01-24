import React, { useEffect, useState } from "react";
import {
  ProductionTask,
  TaskDetailResponse,
  fetchTasks,
  fetchTaskById,
  createTask,
  updateTaskStatus,
  updateTask,
  deleteTask,
} from "src/api/tasksApi";
import { fetchProjects, ProjectModel } from "src/api/projectsApi";
import { fetchUsers } from "src/api/fcApi";
import { fetchStructure } from "src/api/structureApi";
import { userGetModel } from "src/types/UserModel";
import { SectionModel } from "src/store/StructureStore";
import { 
  Plus, Calendar, Target, Loader2, MapPin, Box, 
  CheckCircle2, AlertCircle, Clock, Flag, User, Trash2, Building2, 
  Edit3, Save, X, Briefcase
} from "lucide-react";
import { Modal } from "src/components/Modal/Modal";

interface TaskStats { total: number; done: number; inWork: number; onStock: number; }
interface ExtendedTask extends ProductionTask { stats?: TaskStats; }

const TasksList: React.FC = () => {
  const [tasks, setTasks] = useState<ExtendedTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskDetailResponse | null>(null);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});

  const [users, setUsers] = useState<userGetModel[]>([]);
  const [sections, setSections] = useState<SectionModel[]>([]);
  const [projects, setProjects] = useState<ProjectModel[]>([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [createForm, setCreateForm] = useState<any>({ priority: "1", targetQty: "" });

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchTasks({ page: 1, limit: 100 });
      setTasks(res.rows as unknown as ExtendedTask[]);
    } catch (e) { console.error(e); } 
    finally { setLoading(false); }
  };

  useEffect(() => { 
      loadData(); 
      fetchUsers().then(setUsers);
      fetchStructure().then(setSections);
      fetchProjects().then(setProjects);
  }, []);

  const handleSelectTask = async (id: number) => {
    setIsEditing(false);
    try {
      const res = await fetchTaskById(id);
      setSelectedTask(res);
    } catch (e) { alert("Ошибка загрузки деталей"); }
  };

  const startEditing = () => {
      if(!selectedTask) return;
      setEditForm({
          priority: selectedTask.task.priority,
          dueDate: selectedTask.task.dueDate,
          responsibleId: selectedTask.task.responsibleId,
          sectionId: selectedTask.task.sectionId,
          projectId: selectedTask.task.projectId,
          status: selectedTask.task.status
      });
      setIsEditing(true);
  };

  const saveChanges = async () => {
      if(!selectedTask) return;
      try {
          await updateTask(selectedTask.task.id, editForm);
          setIsEditing(false);
          handleSelectTask(selectedTask.task.id);
          loadData(); 
      } catch (e) { alert("Ошибка сохранения"); }
  };

  
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
        
        {/* СПИСОК ЗАДАЧ */}
        <div className="lg:col-span-7 space-y-4">
            <button onClick={() => setIsModalOpen(true)} className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-bold hover:border-indigo-500 hover:text-indigo-600 transition flex justify-center items-center gap-2">
                <Plus size={20}/> Добавить задачу
            </button>

            {loading && <Loader2 className="animate-spin mx-auto"/>}
            
            {tasks.map(task => {
                const stats = task.stats || { done: 0, inWork: 0, onStock: 0, total: 0 };
                const pDone = Math.min(100, Math.round((stats.done / task.targetQty) * 100));
                
                const projName = projects.find(p => p.id === task.projectId)?.title;

                return (
                    <div 
                        key={task.id} 
                        onClick={() => handleSelectTask(task.id)}
                        className={`bg-white p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg relative overflow-hidden ${selectedTask?.task.id === task.id ? 'border-indigo-500 ring-2 ring-indigo-100' : 'border-gray-200'}`}
                    >
                        {/* Хедер карточки */}
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex flex-col">
                                <h3 className="font-bold text-lg text-gray-800">{task.title}</h3>
                                {projName && <span className="text-xs text-indigo-600 font-bold flex items-center gap-1"><Briefcase size={10}/> {projName}</span>}
                            </div>
                            <div className="text-right">
                                <div className="text-2xl font-black text-gray-900">{stats.total} <span className="text-sm text-gray-400">/ {task.targetQty}</span></div>
                            </div>
                        </div>
                        {/* Прогресс бар (упрощенно) */}
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                            <div style={{width: `${pDone}%`}} className="bg-emerald-500 h-full"></div>
                        </div>
                    </div>
                )
            })}
        </div>

        {/* ДЕТАЛИЗАЦИЯ И РЕДАКТИРОВАНИЕ */}
        <div className="lg:col-span-5">
           {selectedTask ? (
             <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 sticky top-6">
                
                {/* Заголовок и кнопки управления */}
                <div className="flex justify-between items-start mb-4 border-b pb-4">
                    <h2 className="text-xl font-bold text-gray-800 w-3/4">{selectedTask.task.title}</h2>
                    <div className="flex gap-2">
                        {isEditing ? (
                            <>
                                <button onClick={saveChanges} className="p-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200"><Save size={18}/></button>
                                <button onClick={() => setIsEditing(false)} className="p-2 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200"><X size={18}/></button>
                            </>
                        ) : (
                            <button onClick={startEditing} className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-100"><Edit3 size={18}/></button>
                        )}
                    </div>
                </div>

                {/* ФОРМА РЕДАКТИРОВАНИЯ ИЛИ ПРОСМОТР */}
                <div className="space-y-4 mb-6">
                    {/* Статус */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Статус</span>
                        {isEditing ? (
                            <select 
                                value={editForm.status}
                                onChange={e => setEditForm({...editForm, status: e.target.value})}
                                className="border rounded p-1 text-sm font-bold"
                            >
                                <option value="NEW">НОВАЯ</option>
                                <option value="IN_PROGRESS">В РАБОТЕ</option>
                                <option value="DONE">ГОТОВО</option>
                            </select>
                        ) : (
                            <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold">{selectedTask.task.status}</span>
                        )}
                    </div>

                    {/* Проект */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Проект</span>
                        {isEditing ? (
                            <select 
                                value={editForm.projectId || ""}
                                onChange={e => setEditForm({...editForm, projectId: e.target.value || null})}
                                className="border rounded p-1 text-sm w-48"
                            >
                                <option value="">Без проекта</option>
                                {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                            </select>
                        ) : (
                            <span className="text-sm font-medium text-indigo-600">
                                {projects.find(p => p.id === selectedTask.task.projectId)?.title || "—"}
                            </span>
                        )}
                    </div>

                    {/* Приоритет */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Приоритет</span>
                        {isEditing ? (
                            <select 
                                value={editForm.priority || 1}
                                onChange={e => setEditForm({...editForm, priority: e.target.value})}
                                className="border rounded p-1 text-sm"
                            >
                                <option value="1">Низкий</option>
                                <option value="2">Средний</option>
                                <option value="3">Высокий</option>
                            </select>
                        ) : (
                            <span className="text-sm">{selectedTask.task.priority === 3 ? "🔥 Высокий" : "Обычный"}</span>
                        )}
                    </div>

                    {/* Ответственный */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Ответственный</span>
                        {isEditing ? (
                            <select 
                                value={editForm.responsibleId || ""}
                                onChange={e => setEditForm({...editForm, responsibleId: e.target.value || null})}
                                className="border rounded p-1 text-sm w-48"
                            >
                                <option value="">-- Не назначен --</option>
                                {users.map(u => <option key={u.id} value={u.id}>{u.surname} {u.name}</option>)}
                            </select>
                        ) : (
                            <span className="text-sm">{selectedTask.task.responsible ? `${selectedTask.task.responsible.surname} ${selectedTask.task.responsible.name}` : "Не назначен"}</span>
                        )}
                    </div>

                    {/* Срок */}
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-500 font-bold uppercase">Срок сдачи</span>
                        {isEditing ? (
                            <input type="date" value={editForm.dueDate || ""} onChange={e => setEditForm({...editForm, dueDate: e.target.value})} className="border rounded p-1 text-sm"/>
                        ) : (
                            <span className="text-sm">{selectedTask.task.dueDate || "—"}</span>
                        )}
                    </div>
                </div>

                {/* БЛОК ЛОКАЛИЗАЦИИ */}
                <h3 className="font-bold text-gray-700 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide border-t pt-4">
                   <MapPin size={16} className="text-indigo-500"/> Локализация изделий
                </h3>
                <div className="space-y-2">
                   {selectedTask.breakdown.map((item, idx) => (
                     <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                        <span>{item.sectionTitle || "Склад"}</span>
                        <span className="font-bold">{item.qty} шт</span>
                     </div>
                   ))}
                </div>

             </div>
           ) : (
             <div className="h-[400px] flex items-center justify-center text-gray-400 bg-white rounded-2xl border-2 border-dashed">
                <p>Выберите задачу</p>
             </div>
           )}
        </div>

        {/* МОДАЛКА СОЗДАНИЯ */}
        <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
            <div className="p-4">
                <h2 className="text-xl font-bold mb-4">Создать задачу</h2>
                <div className="space-y-4">
                    <input className="w-full p-2 border rounded" placeholder="Название" value={createCreateFormTitle(createForm)} onChange={e => setCreateForm({...createForm, title: e.target.value})} />
                    
                    {/* Выбор проекта при создании */}
                    <select className="w-full p-2 border rounded" value={createForm.projectId || ""} onChange={e => setCreateForm({...createForm, projectId: e.target.value})}>
                        <option value="">-- Без проекта --</option>
                        {projects.map(p => <option key={p.id} value={p.id}>{p.title}</option>)}
                    </select>

                    <div className="grid grid-cols-2 gap-2">
                        <select className="w-full p-2 border rounded" value={createForm.originType || "PRODUCT"} onChange={e => setCreateForm({...createForm, originType: e.target.value})}>
                            <option value="PRODUCT">Изделие</option>
                            <option value="COMPONENT">Комплектующее</option>
                        </select>
                        <input type="number" className="w-full p-2 border rounded" placeholder="ID Объекта" value={createForm.originId || ""} onChange={e => setCreateForm({...createForm, originId: e.target.value})} />
                    </div>

                    <input type="number" className="w-full p-2 border rounded font-bold" placeholder="Цель (шт)" value={createForm.targetQty} onChange={e => setCreateForm({...createForm, targetQty: e.target.value})} />
                    
                    <button onClick={async () => {
                        await createTask({...createForm, targetQty: Number(createForm.targetQty), originId: Number(createForm.originId), projectId: createForm.projectId ? Number(createForm.projectId) : undefined});
                        setIsModalOpen(false);
                        loadData();
                    }} className="w-full py-3 bg-blue-600 text-white font-bold rounded">Создать</button>
                </div>
            </div>
        </Modal>
    </div>
  );
  
  function createCreateFormTitle(form: any) { return form.title || ""; }
};

export default TasksList;