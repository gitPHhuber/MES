import React, { useEffect, useState } from "react";
import { Plus, Trash2, FolderOpen, Box } from "lucide-react";
import { fetchProjects, createProject, deleteProject, ProjectModel } from "src/api/projectsApi";
import { Modal } from "src/components/Modal/Modal";

const ProjectsList: React.FC = () => {
    const [projects, setProjects] = useState<ProjectModel[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [form, setForm] = useState({ title: "", description: "" });

    const load = async () => {
        const data = await fetchProjects();
        setProjects(data);
    };

    useEffect(() => { load(); }, []);

    const handleCreate = async () => {
        if(!form.title) return alert("Введите название");
        await createProject(form.title, form.description);
        setIsModalOpen(false);
        setForm({ title: "", description: "" });
        load();
    };

    const handleDelete = async (id: number) => {
        if(window.confirm("Удалить проект?")) {
            await deleteProject(id);
            load();
        }
    };

    return (
        <div className="animate-fade-in">
            <div className="flex justify-end mb-4">
                <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-xl font-bold hover:bg-black transition">
                    <Plus size={18}/> Новый проект
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map(p => (
                    <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 hover:shadow-md transition relative group">
                        <div className="flex justify-between items-start mb-2">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <FolderOpen size={24}/>
                            </div>
                            <button onClick={() => handleDelete(p.id)} className="text-gray-300 hover:text-red-500 transition opacity-0 group-hover:opacity-100">
                                <Trash2 size={18}/>
                            </button>
                        </div>
                        <h3 className="text-lg font-bold text-gray-800 mb-1">{p.title}</h3>
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2 h-10">{p.description || "Нет описания"}</p>
                        
                        <div className="flex justify-between items-center text-xs text-gray-400 border-t pt-3">
                            <span>Создал: {p.author?.surname || "Admin"}</span>
                            <span>{new Date(p.createdAt).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)}>
                <div className="p-4">
                    <h2 className="text-xl font-bold mb-4">Создать проект</h2>
                    <input className="w-full p-3 border rounded-xl mb-3" placeholder="Название (напр. Дрон-разведчик)" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                    <textarea className="w-full p-3 border rounded-xl mb-3" placeholder="Что входит в проект..." rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                    <button onClick={handleCreate} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl">Создать</button>
                </div>
            </Modal>
        </div>
    );
};

export default ProjectsList;