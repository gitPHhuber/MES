import React, { useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { 
    fetchAllRoles, 
    fetchAllAbilities, 
    updateRoleAbilities, 
    RoleModel, 
    AbilityModel 
} from "src/api/rbacApi";
import { fetchUsers } from "src/api/fcApi"; // Берем API для получения списка юзеров
import { userGetModel } from "src/types/UserModel";
import { 
    Shield, Save, CheckSquare, Square, 
    Loader2, Users, Key, Search, User 
} from "lucide-react";
import toast from "react-hot-toast";

export const AdminRightsPage: React.FC = observer(() => {
    // --- STATE ---
    const [viewMode, setViewMode] = useState<"USERS" | "MATRIX">("USERS");
    const [loading, setLoading] = useState(false);
    
    // Данные
    const [roles, setRoles] = useState<RoleModel[]>([]);
    const [abilities, setAbilities] = useState<AbilityModel[]>([]);
    const [users, setUsers] = useState<userGetModel[]>([]);
    
    // Для редактирования матрицы
    const [matrix, setMatrix] = useState<Record<number, Set<number>>>({});
    const [savingId, setSavingId] = useState<number | null>(null);

    // Фильтры
    const [userSearch, setUserSearch] = useState("");

    // --- ЗАГРУЗКА ДАННЫХ ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            // Грузим всё параллельно: Роли, Права и Юзеров
            const [rolesData, abilitiesData, usersData] = await Promise.all([
                fetchAllRoles(),
                fetchAllAbilities(),
                fetchUsers()
            ]);

            setRoles(rolesData);
            setAbilities(abilitiesData);
            setUsers(usersData);

            // Инициализируем матрицу (RoleID -> Set<AbilityID>)
            const initialMatrix: Record<number, Set<number>> = {};
            rolesData.forEach(role => {
                const abilityIds = new Set(role.abilities.map(a => a.id));
                initialMatrix[role.id] = abilityIds;
            });
            setMatrix(initialMatrix);

        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки данных безопасности");
        } finally {
            setLoading(false);
        }
    };

    // --- ЛОГИКА МАТРИЦЫ ---
    const togglePermission = (roleId: number, abilityId: number) => {
        const role = roles.find(r => r.id === roleId);
        if (role?.name === 'SUPER_ADMIN') {
            toast('Права Супер-Админа неизменны', { icon: '🔒' });
            return;
        }

        setMatrix(prev => {
            const roleAbilities = new Set(prev[roleId]);
            if (roleAbilities.has(abilityId)) {
                roleAbilities.delete(abilityId);
            } else {
                roleAbilities.add(abilityId);
            }
            return { ...prev, [roleId]: roleAbilities };
        });
    };

    const saveRole = async (roleId: number) => {
        setSavingId(roleId);
        try {
            const abilityIds = Array.from(matrix[roleId] || []);
            await updateRoleAbilities(roleId, abilityIds);
            toast.success("Права роли обновлены");
            // Обновляем локальный стейт ролей, чтобы список юзеров тоже обновился визуально
            const updatedRoles = roles.map(r => {
                if (r.id === roleId) {
                    // Находим объекты прав по ID
                    const newAbilities = abilities.filter(a => abilityIds.includes(a.id));
                    return { ...r, abilities: newAbilities };
                }
                return r;
            });
            setRoles(updatedRoles);
        } catch (e) {
            toast.error("Ошибка сохранения");
        } finally {
            setSavingId(null);
        }
    };

    // --- ЛОГИКА ЮЗЕРОВ ---
    // Находим права конкретного юзера через его роль
    const getUserAbilities = (userRoleName: string) => {
        if (userRoleName === 'SUPER_ADMIN') return abilities; // Все права
        const roleObj = roles.find(r => r.name === userRoleName);
        return roleObj ? roleObj.abilities : [];
    };

    const filteredUsers = users.filter(u => 
        u.login.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.surname?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role.toLowerCase().includes(userSearch.toLowerCase())
    );

    if (loading && roles.length === 0) return <div className="flex justify-center p-20"><Loader2 className="animate-spin text-indigo-600" size={32}/></div>;

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-7xl mx-auto">
                
                {/* Шапка */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-200 text-white">
                            <Shield size={32} />
                        </div>
                        <div>
                            <h1 className="text-3xl font-bold text-gray-800">Контроль доступа</h1>
                            <p className="text-gray-500 font-medium">RBAC: Роли и полномочия</p>
                        </div>
                    </div>

                    {/* Переключатель вкладок */}
                    <div className="bg-white p-1 rounded-xl shadow-sm border border-gray-200 flex">
                        <button
                            onClick={() => setViewMode("USERS")}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 ${viewMode === "USERS" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            <Users size={18} /> Пользователи
                        </button>
                        <button
                            onClick={() => setViewMode("MATRIX")}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 ${viewMode === "MATRIX" ? "bg-indigo-50 text-indigo-700 shadow-sm" : "text-gray-500 hover:bg-gray-50"}`}
                        >
                            <Key size={18} /> Матрица прав
                        </button>
                    </div>
                </div>

                {/* ======================= Вклдака: ПОЛЬЗОВАТЕЛИ ======================= */}
                {viewMode === "USERS" && (
                    <div className="space-y-4 animate-fade-in">
                        {/* Поиск */}
                        <div className="relative max-w-md">
                            <Search className="absolute left-3 top-2.5 text-gray-400 w-5 h-5"/>
                            <input 
                                value={userSearch}
                                onChange={e => setUserSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                placeholder="Поиск сотрудника..."
                            />
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 border-b border-gray-200 text-xs font-bold text-gray-500 uppercase">
                                    <tr>
                                        <th className="p-4">Сотрудник</th>
                                        <th className="p-4">Роль (Keycloak)</th>
                                        <th className="p-4">Активные права</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredUsers.map(user => {
                                        const effectiveAbilities = getUserAbilities(user.role);
                                        return (
                                            <tr key={user.id} className="hover:bg-indigo-50/30 transition">
                                                <td className="p-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 overflow-hidden border border-gray-200">
                                                            {user.img ? (
                                                                <img src={`${import.meta.env.VITE_API_URL}/${user.img}`} alt="" className="w-full h-full object-cover"/>
                                                            ) : <User size={20}/>}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-gray-800">{user.surname} {user.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{user.login}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-md text-xs font-bold border ${
                                                        user.role === 'SUPER_ADMIN' ? 'bg-red-50 text-red-700 border-red-200' :
                                                        user.role === 'PRODUCTION_CHIEF' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                        'bg-blue-50 text-blue-700 border-blue-200'
                                                    }`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1.5 max-w-xl">
                                                        {effectiveAbilities.length > 0 ? effectiveAbilities.map(ab => (
                                                            <span key={ab.id} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200" title={ab.code}>
                                                                {ab.description}
                                                            </span>
                                                        )) : (
                                                            <span className="text-gray-400 text-sm italic">Нет прав</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && <div className="p-8 text-center text-gray-400">Сотрудники не найдены</div>}
                        </div>
                    </div>
                )}

                {/* ======================= Вклдака: МАТРИЦА ======================= */}
                {viewMode === "MATRIX" && (
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-x-auto animate-fade-in">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    <th className="p-4 text-left bg-gray-50 border-b border-r min-w-[220px] sticky left-0 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                        <div className="text-xs text-gray-400 font-normal uppercase mb-1">Роль</div>
                                        <div className="font-bold text-gray-800">Название роли</div>
                                    </th>
                                    {abilities.map(ab => (
                                        <th key={ab.id} className="p-2 text-center bg-gray-50 border-b border-r min-w-[130px] align-top">
                                            <div className="text-[10px] text-gray-400 font-mono mb-1">{ab.code}</div>
                                            <div className="text-xs font-bold text-gray-700 leading-tight">{ab.description}</div>
                                        </th>
                                    ))}
                                    <th className="p-2 bg-gray-50 border-b min-w-[80px]">Сохр.</th>
                                </tr>
                            </thead>
                            <tbody>
                                {roles.map(role => {
                                    // Проверка на изменения
                                    const currentIds = matrix[role.id] || new Set();
                                    const originalIds = new Set(role.abilities.map(a => a.id));
                                    
                                    let isChanged = false;
                                    if (currentIds.size !== originalIds.size) isChanged = true;
                                    else {
                                        for (let id of currentIds) if (!originalIds.has(id)) isChanged = true;
                                    }

                                    return (
                                        <tr key={role.id} className="hover:bg-indigo-50/30 transition group">
                                            {/* Название роли */}
                                            <td className="p-4 border-r border-b bg-white sticky left-0 z-10 group-hover:bg-indigo-50/30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                                                <div className="font-bold text-gray-800 text-sm">{role.description}</div>
                                                <div className="text-xs text-indigo-500 font-mono mt-0.5">{role.name}</div>
                                            </td>

                                            {/* Чекбоксы */}
                                            {abilities.map(ab => {
                                                const isChecked = matrix[role.id]?.has(ab.id);
                                                return (
                                                    <td 
                                                        key={ab.id} 
                                                        onClick={() => togglePermission(role.id, ab.id)}
                                                        className={`p-2 border-r border-b text-center cursor-pointer transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}
                                                    >
                                                        <div className="flex justify-center">
                                                            {isChecked 
                                                                ? <CheckSquare className="text-indigo-600 fill-indigo-50" size={20} /> 
                                                                : <Square className="text-gray-300 hover:text-gray-400" size={20} />
                                                            }
                                                        </div>
                                                    </td>
                                                );
                                            })}

                                            {/* Кнопка Сохранить */}
                                            <td className="p-2 border-b text-center align-middle">
                                                {(isChanged || savingId === role.id) && (
                                                    <button 
                                                        onClick={() => saveRole(role.id)}
                                                        disabled={savingId === role.id}
                                                        className="p-2 bg-emerald-500 text-white rounded-lg shadow-md hover:bg-emerald-600 transition flex items-center justify-center mx-auto"
                                                        title="Сохранить изменения"
                                                    >
                                                        {savingId === role.id ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
});