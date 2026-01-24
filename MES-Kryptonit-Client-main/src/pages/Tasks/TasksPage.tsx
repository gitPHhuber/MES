import React, { useState } from "react";
import { Layout, Briefcase } from "lucide-react";
import TasksList from "./TasksList";
import ProjectsList from "./ProjectsList";

const TasksPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<"TASKS" | "PROJECTS">("TASKS");

  return (
    <div className="min-h-screen bg-gray-50/50 p-6 pb-20 font-sans text-gray-700">
      
      {/* Шапка и переключатель */}
      <div className="max-w-7xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-4">
           <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
              {activeTab === 'TASKS' ? <Layout size={28}/> : <Briefcase size={28}/>}
           </div>
           <div>
              <h1 className="text-2xl font-bold text-gray-900">Управление производством</h1>
              <p className="text-gray-500 text-sm font-medium">Планирование проектов и задач</p>
           </div>
        </div>

        <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
            <button 
                onClick={() => setActiveTab("TASKS")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'TASKS' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Задачи
            </button>
            <button 
                onClick={() => setActiveTab("PROJECTS")}
                className={`px-6 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'PROJECTS' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
            >
                Проекты
            </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto">
          {activeTab === "TASKS" && <TasksList />}
          {activeTab === "PROJECTS" && <ProjectsList />}
      </div>
    </div>
  );
};

export default TasksPage;