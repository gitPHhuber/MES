import React, { useContext, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { Context } from "src/main";
import {
  Network,
  Users,
  Plus,
  ChevronRight,
  ChevronDown,
  Crown,
  UserCheck,
  UserPlus,
  Trash2,
  Layers,
  UserX,
  ArrowRight
} from "lucide-react";
import {
  fetchStructure,
  createSection,
  createTeam,
  assignSectionManager,
  assignTeamLead,
  addUserToTeam,
  removeUserFromTeam,
  fetchUnassignedUsers, // Убедитесь, что эта функция добавлена в api/structureApi.ts
} from "src/api/structureApi";
import { fetchUsers } from "src/api/fcApi";
import { Modal } from "src/components/Modal/Modal";
import { userGetModel } from "src/types/UserModel";
import toast from "react-hot-toast"; // Для уведомлений

type Tab = "HIERARCHY" | "UNASSIGNED";

export const StructurePage: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { structureStore } = context;

  // --- State: Вкладки и данные ---
  const [activeTab, setActiveTab] = useState<Tab>("HIERARCHY");
  const [expandedSections, setExpandedSections] = useState<number[]>([]);
  const [allUsers, setAllUsers] = useState<userGetModel[]>([]);
  const [unassignedUsers, setUnassignedUsers] = useState<userGetModel[]>([]);

  // --- State: Модальные окна и формы создания ---
  const [modalType, setModalType] = useState<"CREATE_SECTION" | "CREATE_TEAM" | "SELECT_USER" | null>(null);
  const [targetId, setTargetId] = useState<number | null>(null);
  const [actionType, setActionType] = useState<"MANAGER" | "LEAD" | "MEMBER" | null>(null);
  const [inputTitle, setInputTitle] = useState("");
  const [userSearch, setUserSearch] = useState("");

  // --- State: Быстрое назначение (для вкладки Нераспределенные) ---
  const [assigningUserId, setAssigningUserId] = useState<number | null>(null);
  const [selectedSectionId, setSelectedSectionId] = useState<number | "">("");
  const [selectedTeamId, setSelectedTeamId] = useState<number | "">("");

  const loadData = async () => {
    try {
      const structData = await fetchStructure();
      structureStore.setSections(structData);
      
      const usersData = await fetchUsers();
      setAllUsers(usersData);

      // Загрузка "потеряшек"
      try {
        const unassigned = await fetchUnassignedUsers();
        setUnassignedUsers(unassigned);
      } catch (e) {
        console.warn("API для нераспределенных еще не готово или вернуло ошибку");
      }
    } catch (e) {
      toast.error("Ошибка загрузки данных");
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  // --- Handlers: Создание и Назначение (Иерархия) ---

  const handleCreateSection = async () => {
    if (!inputTitle.trim()) return;
    await createSection(inputTitle.trim());
    setInputTitle("");
    closeModal();
    await loadData();
    toast.success("Участок создан");
  };

  const handleCreateTeam = async () => {
    if (!targetId || !inputTitle.trim()) return;
    await createTeam(inputTitle.trim(), targetId);
    setInputTitle("");
    closeModal();
    await loadData();
    if (!expandedSections.includes(targetId)) {
      setExpandedSections((prev) => [...prev, targetId]);
    }
    toast.success("Бригада создана");
  };

  const handleUserSelect = async (userId: number) => {
    if (!targetId || !actionType) return;

    try {
      if (actionType === "MANAGER") {
        await assignSectionManager(targetId, userId);
      } else if (actionType === "LEAD") {
        await assignTeamLead(targetId, userId);
      } else if (actionType === "MEMBER") {
        await addUserToTeam(targetId, userId);
      }
      toast.success("Успешно назначено");
    } catch (e) {
      toast.error("Ошибка назначения");
    }

    closeModal();
    await loadData();
  };

  const handleRemoveMember = async (userId: number) => {
    if(!window.confirm("Убрать сотрудника из бригады?")) return;
    try {
      await removeUserFromTeam(userId);
      await loadData();
      toast.success("Сотрудник откреплен");
    } catch (e) {
      toast.error("Ошибка удаления");
    }
  };

  // --- Handlers: Быстрое назначение (Нераспределенные) ---

  const handleQuickAssign = async () => {
    if (!assigningUserId || !selectedTeamId) return;
    try {
        await addUserToTeam(Number(selectedTeamId), assigningUserId);
        toast.success("Сотрудник распределен!");
        
        // Сброс формы
        setAssigningUserId(null);
        setSelectedSectionId("");
        setSelectedTeamId("");
        
        await loadData();
    } catch (e) {
        toast.error("Ошибка привязки");
    }
  };

  // --- Helpers ---

  const openUserSelect = (id: number, type: "MANAGER" | "LEAD" | "MEMBER") => {
    setTargetId(id);
    setActionType(type);
    setUserSearch("");
    setModalType("SELECT_USER");
  };

  const openCreateTeam = (sectionId: number) => {
    setTargetId(sectionId);
    setInputTitle("");
    setModalType("CREATE_TEAM");
  };

  const closeModal = () => {
    setModalType(null);
    setTargetId(null);
    setActionType(null);
  };

  const toggleSection = (id: number) => {
    setExpandedSections((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const filteredUsers = allUsers.filter((user) => {
    const query = userSearch.trim().toLowerCase();
    if (!query) return true;
    return `${user.name} ${user.surname} ${user.login}`.toLowerCase().includes(query);
  });

  // Получение списка бригад для выбранного участка (в табе нераспределенных)
  const availableTeamsForQuickAssign = structureStore.sections
      .find(s => s.id === Number(selectedSectionId))?.production_teams || [];

  return (
    <div className="min-h-screen bg-gray-50 p-8 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* --- ЗАГОЛОВОК И ВКЛАДКИ --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <Network className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-800">Структура предприятия</h1>
              <p className="text-sm text-gray-500">Управление иерархией и персоналом</p>
            </div>
          </div>

          <div className="bg-white p-1 rounded-xl border border-gray-200 shadow-sm flex gap-1">
              <button 
                onClick={() => setActiveTab("HIERARCHY")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'HIERARCHY' ? 'bg-indigo-50 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Layers size={16}/> Иерархия
              </button>
              <button 
                onClick={() => setActiveTab("UNASSIGNED")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition ${activeTab === 'UNASSIGNED' ? 'bg-orange-50 text-orange-600' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <UserX size={16}/> Нераспределенные
                  {unassignedUsers.length > 0 && (
                    <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full ml-1">
                        {unassignedUsers.length}
                    </span>
                  )}
              </button>
          </div>
        </div>

        {/* ================================================================================== */}
        {/* Вклдака 1: ИЕРАРХИЯ */}
        {/* ================================================================================== */}
        {activeTab === "HIERARCHY" && (
            <div className="space-y-6 animate-fade-in">
                <div className="flex justify-end">
                    <button
                        type="button"
                        onClick={() => { setInputTitle(""); setModalType("CREATE_SECTION"); }}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700 transition"
                    >
                        <Plus size={18} /> Добавить участок
                    </button>
                </div>

                {structureStore.sections.map((section) => (
                    <div key={section.id} className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                        {/* Шапка участка */}
                        <div className="p-5 bg-gray-50 flex items-center justify-between gap-4 border-b border-gray-200 group">
                            <div className="flex items-center gap-4 cursor-pointer flex-1" onClick={() => toggleSection(section.id)}>
                                <button className="text-gray-400 hover:text-blue-600 transition">
                                    {expandedSections.includes(section.id) ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                                </button>
                                <div>
                                    <h2 className="font-semibold text-lg text-gray-800 flex items-center gap-2">{section.title}</h2>
                                    <div className="text-sm text-gray-500 flex items-center gap-2 mt-1">
                                        <Crown size={14} className="text-yellow-600" /> Начальник:
                                        {section.manager ? (
                                            <span 
                                                className="font-bold text-gray-700 underline decoration-dotted cursor-pointer hover:text-blue-600"
                                                onClick={(e) => { e.stopPropagation(); openUserSelect(section.id, "MANAGER"); }}
                                            >
                                                {section.manager.name} {section.manager.surname}
                                            </span>
                                        ) : (
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); openUserSelect(section.id, "MANAGER"); }}
                                                className="text-red-500 text-xs font-bold border border-red-200 bg-red-50 px-2 py-0.5 rounded hover:bg-red-100"
                                            >
                                                + НАЗНАЧИТЬ
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2 items-center">
                                <span className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded-full border border-blue-100">Бригад: {section.production_teams?.length || 0}</span>
                                <button onClick={() => openCreateTeam(section.id)} className="p-2 text-gray-500 hover:text-blue-600 bg-white rounded-lg border hover:border-blue-300 transition flex items-center gap-2 text-sm font-medium">
                                    <Plus size={16} /> Бригада
                                </button>
                            </div>
                        </div>

                        {/* Список бригад */}
                        {expandedSections.includes(section.id) && (
                            <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-4 bg-white">
                                {section.production_teams?.length > 0 ? (
                                    section.production_teams.map((team) => (
                                        <div key={team.id} className="border rounded-xl p-4 bg-gray-50/60 hover:bg-gray-50 transition shadow-sm">
                                            <div className="flex justify-between items-start mb-3 pb-2 border-b border-dashed border-gray-300">
                                                <div>
                                                    <h3 className="font-bold text-lg text-gray-700 flex items-center gap-2">
                                                        <Users size={18} className="text-blue-500" /> {team.title}
                                                    </h3>
                                                    <div className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                                                        <UserCheck size={12} /> Старший:
                                                        {team.teamLead ? (
                                                            <button onClick={() => openUserSelect(team.id, "LEAD")} className="font-medium text-gray-800 cursor-pointer hover:text-blue-600 border-b border-dotted border-gray-400 ml-1">
                                                                {team.teamLead.name} {team.teamLead.surname}
                                                            </button>
                                                        ) : (
                                                            <button onClick={() => openUserSelect(team.id, "LEAD")} className="text-blue-600 font-bold hover:underline ml-1">Назначить</button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-2 min-h-[50px]">
                                                {team.users?.map((member) => (
                                                    <div key={member.id} className="flex items-center justify-between text-sm text-gray-600 bg-white border border-gray-200 p-2 rounded-lg shadow-sm">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">{member.name[0]}</div>
                                                            <span>{member.name} {member.surname}</span>
                                                        </div>
                                                        <button onClick={() => handleRemoveMember(member.id)} className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-red-50 transition" title="Убрать из бригады">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <button onClick={() => openUserSelect(team.id, "MEMBER")} className="w-full py-2 text-xs font-bold text-blue-500 border border-dashed border-blue-300 rounded-lg hover:bg-blue-50 transition flex items-center justify-center gap-1">
                                                    <UserPlus size={14} /> Добавить сотрудника
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="col-span-full text-center py-8 text-gray-400 border-2 border-dashed rounded-xl">В этом участке пока нет бригад. Создайте первую!</div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        )}

        {/* ================================================================================== */}
        {/* Вклдака 2: НЕРАСПРЕДЕЛЕННЫЕ (НОВАЯ) */}
        {/* ================================================================================== */}
        {activeTab === "UNASSIGNED" && (
            <div className="animate-fade-in bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 bg-orange-50/30">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <UserX className="text-orange-500"/> Сотрудники без бригады
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">
                        Список пользователей, которые не привязаны ни к одной структурной единице.
                        Вы можете назначить их прямо здесь.
                    </p>
                </div>
                
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unassignedUsers.length === 0 && (
                        <div className="col-span-full text-center py-20">
                            <div className="inline-flex p-4 bg-green-50 rounded-full mb-3"><UserCheck size={32} className="text-green-500"/></div>
                            <h3 className="text-lg font-bold text-gray-700">Все распределены!</h3>
                            <p className="text-gray-400">Нет сотрудников без привязки к бригаде.</p>
                        </div>
                    )}
                    
                    {unassignedUsers.map(user => (
                        <div key={user.id} className={`p-4 border rounded-xl transition-all ${assigningUserId === user.id ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-100 shadow-md' : 'bg-white border-gray-200 shadow-sm hover:shadow-md'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 font-bold overflow-hidden border border-gray-300">
                                        {user.img ? <img src={`${import.meta.env.VITE_API_URL}/${user.img}`} className="w-full h-full object-cover"/> : user.name[0]}
                                    </div>
                                    <div>
                                        <div className="font-bold text-gray-800">{user.name} {user.surname}</div>
                                        <div className="text-xs text-gray-500">{user.login} • {user.role}</div>
                                    </div>
                                </div>
                                
                                {assigningUserId !== user.id && (
                                    <button 
                                        onClick={() => { setAssigningUserId(user.id); setSelectedSectionId(""); setSelectedTeamId(""); }}
                                        className="px-3 py-1.5 bg-white border border-gray-300 text-gray-600 text-xs font-bold rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition"
                                    >
                                        Назначить
                                    </button>
                                )}
                            </div>

                            {/* Форма назначения (раскрывается при клике) */}
                            {assigningUserId === user.id && (
                                <div className="pt-3 border-t border-indigo-200 flex flex-col gap-2 animate-fade-in">
                                    <div className="space-y-2">
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Участок</label>
                                            <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                                                value={selectedSectionId}
                                                onChange={e => { setSelectedSectionId(Number(e.target.value)); setSelectedTeamId(""); }}
                                            >
                                                <option value="">Выберите...</option>
                                                {structureStore.sections.map(s => <option key={s.id} value={s.id}>{s.title}</option>)}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Бригада</label>
                                            <select 
                                                className="w-full p-2 border rounded-lg text-sm bg-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-gray-100 disabled:text-gray-400"
                                                value={selectedTeamId}
                                                onChange={e => setSelectedTeamId(Number(e.target.value))}
                                                disabled={!selectedSectionId}
                                            >
                                                <option value="">Выберите...</option>
                                                {availableTeamsForQuickAssign.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-end gap-2 mt-2">
                                        <button onClick={() => setAssigningUserId(null)} className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded font-medium">Отмена</button>
                                        <button 
                                            onClick={handleQuickAssign}
                                            disabled={!selectedTeamId}
                                            className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-1 shadow-sm transition"
                                        >
                                            Сохранить <ArrowRight size={12}/>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* --- Модальные окна (для вкладки Иерархия) --- */}
        <Modal isOpen={modalType === "CREATE_SECTION"} onClose={closeModal}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-3">Новый участок</h2>
            <input
              className="w-full border rounded px-3 py-2 mb-3 text-sm"
              placeholder="Название участка"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50">Отмена</button>
              <button onClick={handleCreateSection} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300" disabled={!inputTitle.trim()}>Создать</button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={modalType === "CREATE_TEAM"} onClose={closeModal}>
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-3">Новая бригада</h2>
            <input
              className="w-full border rounded px-3 py-2 mb-3 text-sm"
              placeholder="Название бригады"
              value={inputTitle}
              onChange={(e) => setInputTitle(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={closeModal} className="px-3 py-1.5 text-sm rounded border border-gray-300 bg-white hover:bg-gray-50">Отмена</button>
              <button onClick={handleCreateTeam} className="px-3 py-1.5 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300" disabled={!inputTitle.trim()}>Создать</button>
            </div>
          </div>
        </Modal>

        <Modal isOpen={modalType === "SELECT_USER"} onClose={closeModal}>
          <div className="p-4 h-[500px] flex flex-col">
            <h2 className="text-lg font-semibold mb-3">
              {actionType === "MANAGER" && "Выберите начальника участка"}
              {actionType === "LEAD" && "Выберите старшего бригады"}
              {actionType === "MEMBER" && "Добавить сотрудника в бригаду"}
            </h2>
            <input className="w-full p-2 border rounded mb-2 text-sm" placeholder="Поиск по имени или логину" value={userSearch} onChange={(e) => setUserSearch(e.target.value)} />
            <div className="overflow-y-auto flex-1 space-y-2 pr-1 custom-scrollbar">
              {filteredUsers.map((user) => (
                <button key={user.id} type="button" onClick={() => handleUserSelect(user.id)} className="w-full flex flex-col items-start px-3 py-2 border border-gray-200 rounded-lg bg-white hover:bg-blue-50 hover:border-blue-300 text-left transition">
                  <span className="font-medium text-gray-700">{user.name} {user.surname}</span>
                  <span className="text-xs text-gray-400">{user.login}</span>
                </button>
              ))}
            </div>
          </div>
        </Modal>

      </div>
    </div>
  );
});