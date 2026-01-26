import React, { useEffect, useState, useMemo } from "react";
import { observer } from "mobx-react-lite";
import { 
    fetchAllRoles, 
    fetchAllAbilities, 
    updateRoleAbilities, 
    RoleModel, 
    AbilityModel 
} from "src/api/rbacApi";
import { fetchUsers } from "src/api/fcApi";
import { userGetModel } from "src/types/UserModel";
import { 
    Shield, Save, CheckSquare, Square, 
    Loader2, Users, Key, Search, User,
    ChevronDown, ChevronRight, Filter, X,
    CheckCircle2, AlertCircle
} from "lucide-react";
import toast from "react-hot-toast";

// ==================== ТИПЫ ====================
interface AbilityGroup {
    prefix: string;
    label: string;
    abilities: AbilityModel[];
    isExpanded: boolean;
}

// Маппинг префиксов на человекочитаемые названия
const GROUP_LABELS: Record<string, string> = {
    warehouse: "Склад",
    recipe: "Техкарты",
    rbac: "Права доступа",
    roles: "Роли",
    users: "Пользователи",
    assembly: "Сборка",
    firmware: "Прошивка",
    devices: "Устройства",
    analytics: "Аналитика",
    beryll: "АПК Берилл",
    defect: "Дефекты/Брак",
    admin: "Администрирование",
    production: "Производство",
    tasks: "Задачи",
    mit: "Ручной ввод",
};

// ==================== КОМПОНЕНТ ====================
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
    const [originalMatrix, setOriginalMatrix] = useState<Record<number, Set<number>>>({});
    const [savingId, setSavingId] = useState<number | null>(null);
    const [savingAll, setSavingAll] = useState(false);

    // Фильтры
    const [userSearch, setUserSearch] = useState("");
    const [abilitySearch, setAbilitySearch] = useState("");
    
    // Группировка
    const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
    const [compactMode, setCompactMode] = useState(false);

    // --- ЗАГРУЗКА ДАННЫХ ---
    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [rolesData, abilitiesData, usersData] = await Promise.all([
                fetchAllRoles(),
                fetchAllAbilities(),
                fetchUsers()
            ]);

            setRoles(rolesData);
            setAbilities(abilitiesData);
            setUsers(usersData);

            // Инициализируем матрицу
            const initialMatrix: Record<number, Set<number>> = {};
            rolesData.forEach(role => {
                const abilityIds = new Set(role.abilities.map(a => a.id));
                initialMatrix[role.id] = abilityIds;
            });
            setMatrix(initialMatrix);
            setOriginalMatrix(JSON.parse(JSON.stringify(
                Object.fromEntries(
                    Object.entries(initialMatrix).map(([k, v]) => [k, Array.from(v)])
                )
            )));

            // Раскрываем все группы по умолчанию
            const prefixes = new Set(abilitiesData.map(a => a.code.split('.')[0]));
            setExpandedGroups(prefixes);

        } catch (e) {
            console.error(e);
            toast.error("Ошибка загрузки данных безопасности");
        } finally {
            setLoading(false);
        }
    };

    // --- ГРУППИРОВКА ПРАВ ---
    const groupedAbilities = useMemo(() => {
        const groups: Record<string, AbilityModel[]> = {};
        
        abilities.forEach(ability => {
            const prefix = ability.code.split('.')[0];
            if (!groups[prefix]) groups[prefix] = [];
            groups[prefix].push(ability);
        });

        // Фильтрация по поиску
        const filtered: AbilityGroup[] = Object.entries(groups)
            .map(([prefix, abs]) => ({
                prefix,
                label: GROUP_LABELS[prefix] || prefix,
                abilities: abs.filter(a => 
                    !abilitySearch || 
                    a.code.toLowerCase().includes(abilitySearch.toLowerCase()) ||
                    a.description.toLowerCase().includes(abilitySearch.toLowerCase())
                ),
                isExpanded: expandedGroups.has(prefix)
            }))
            .filter(g => g.abilities.length > 0)
            .sort((a, b) => a.label.localeCompare(b.label));

        return filtered;
    }, [abilities, abilitySearch, expandedGroups]);

    // Плоский список отфильтрованных abilities для рендера
    const visibleAbilities = useMemo(() => {
        const result: { ability: AbilityModel; groupPrefix: string; isFirstInGroup: boolean; groupLabel: string; groupSize: number }[] = [];
        
        groupedAbilities.forEach(group => {
            if (group.isExpanded) {
                group.abilities.forEach((ability, idx) => {
                    result.push({
                        ability,
                        groupPrefix: group.prefix,
                        isFirstInGroup: idx === 0,
                        groupLabel: group.label,
                        groupSize: group.abilities.length
                    });
                });
            }
        });
        
        return result;
    }, [groupedAbilities]);

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

    // Переключить всю группу для роли
    const toggleGroupForRole = (roleId: number, groupPrefix: string) => {
        const role = roles.find(r => r.id === roleId);
        if (role?.name === 'SUPER_ADMIN') {
            toast('Права Супер-Админа неизменны', { icon: '🔒' });
            return;
        }

        const groupAbilities = abilities.filter(a => a.code.startsWith(groupPrefix + '.'));
        const groupIds = groupAbilities.map(a => a.id);
        
        setMatrix(prev => {
            const roleAbilities = new Set(prev[roleId]);
            const allChecked = groupIds.every(id => roleAbilities.has(id));
            
            if (allChecked) {
                // Снять все
                groupIds.forEach(id => roleAbilities.delete(id));
            } else {
                // Выбрать все
                groupIds.forEach(id => roleAbilities.add(id));
            }
            return { ...prev, [roleId]: roleAbilities };
        });
    };

    // Проверка изменений для роли
    const hasChanges = (roleId: number): boolean => {
        const current = matrix[roleId] || new Set();
        const original = new Set(originalMatrix[roleId] || []);
        
        if (current.size !== original.size) return true;
        for (const id of current) {
            if (!original.has(id)) return true;
        }
        return false;
    };

    // Общее количество изменённых ролей
    const changedRolesCount = useMemo(() => {
        return roles.filter(r => hasChanges(r.id)).length;
    }, [roles, matrix, originalMatrix]);

    // --- СОХРАНЕНИЕ ---
    const saveRole = async (roleId: number) => {
        setSavingId(roleId);
        try {
            const abilityIds = Array.from(matrix[roleId] || []);
            await updateRoleAbilities(roleId, abilityIds);
            toast.success("Права роли обновлены");
            
            // Обновляем original
            setOriginalMatrix(prev => ({
                ...prev,
                [roleId]: abilityIds
            }));

            // Обновляем локальный стейт ролей
            const updatedRoles = roles.map(r => {
                if (r.id === roleId) {
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

    const saveAllChanges = async () => {
        const changedRoles = roles.filter(r => hasChanges(r.id));
        if (changedRoles.length === 0) return;

        setSavingAll(true);
        let successCount = 0;
        let errorCount = 0;

        for (const role of changedRoles) {
            try {
                const abilityIds = Array.from(matrix[role.id] || []);
                await updateRoleAbilities(role.id, abilityIds);
                
                setOriginalMatrix(prev => ({
                    ...prev,
                    [role.id]: abilityIds
                }));
                successCount++;
            } catch (e) {
                errorCount++;
            }
        }

        setSavingAll(false);
        
        if (errorCount === 0) {
            toast.success(`Сохранено ${successCount} ролей`);
        } else {
            toast.error(`Ошибки: ${errorCount} из ${changedRoles.length}`);
        }

        // Перезагружаем данные
        loadData();
    };

    // --- ЛОГИКА ЮЗЕРОВ ---
    const getUserAbilities = (userRoleName: string) => {
        if (userRoleName === 'SUPER_ADMIN') return abilities;
        const roleObj = roles.find(r => r.name === userRoleName);
        return roleObj ? roleObj.abilities : [];
    };

    const filteredUsers = users.filter(u => 
        u.login.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.name?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.surname?.toLowerCase().includes(userSearch.toLowerCase()) ||
        u.role.toLowerCase().includes(userSearch.toLowerCase())
    );

    // --- TOGGLE GROUP ---
    const toggleGroup = (prefix: string) => {
        setExpandedGroups(prev => {
            const next = new Set(prev);
            if (next.has(prefix)) {
                next.delete(prefix);
            } else {
                next.add(prefix);
            }
            return next;
        });
    };

    const expandAllGroups = () => {
        const allPrefixes = new Set(abilities.map(a => a.code.split('.')[0]));
        setExpandedGroups(allPrefixes);
    };

    const collapseAllGroups = () => {
        setExpandedGroups(new Set());
    };

    // --- RENDER ---
    if (loading && roles.length === 0) {
        return (
            <div className="flex justify-center p-20">
                <Loader2 className="animate-spin text-indigo-600" size={32}/>
            </div>
        );
    }

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="max-w-full mx-auto">
                
                {/* Шапка */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
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
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                                viewMode === "USERS" 
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                                    : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <Users size={18} /> Пользователи
                        </button>
                        <button
                            onClick={() => setViewMode("MATRIX")}
                            className={`px-6 py-2 rounded-lg font-bold transition flex items-center gap-2 ${
                                viewMode === "MATRIX" 
                                    ? "bg-indigo-50 text-indigo-700 shadow-sm" 
                                    : "text-gray-500 hover:bg-gray-50"
                            }`}
                        >
                            <Key size={18} /> Матрица прав
                        </button>
                    </div>
                </div>

                {/* ======================= Вкладка: ПОЛЬЗОВАТЕЛИ ======================= */}
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
                                                                <img src={user.img} alt="" className="w-full h-full object-cover"/>
                                                            ) : (
                                                                <User size={20}/>
                                                            )}
                                                        </div>
                                                        <div>
                                                            <div className="font-semibold text-gray-800">
                                                                {user.surname} {user.name}
                                                            </div>
                                                            <div className="text-xs text-gray-400">{user.login}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-xs font-bold">
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex flex-wrap gap-1 max-w-xl">
                                                        {effectiveAbilities.length > 0 ? effectiveAbilities.map(ab => (
                                                            <span 
                                                                key={ab.id} 
                                                                className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px] border border-gray-200" 
                                                                title={ab.code}
                                                            >
                                                                {ab.description}
                                                            </span>
                                                        )) : (
                                                            <span className="text-gray-400 text-sm italic">Нет прав</span>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="p-8 text-center text-gray-400">Сотрудники не найдены</div>
                            )}
                        </div>
                    </div>
                )}

                {/* ======================= Вкладка: МАТРИЦА ======================= */}
                {viewMode === "MATRIX" && (
                    <div className="space-y-4 animate-fade-in">
                        
                        {/* Панель управления */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
                            <div className="flex flex-wrap items-center gap-4">
                                {/* Поиск по правам */}
                                <div className="relative flex-1 min-w-[200px] max-w-md">
                                    <Search className="absolute left-3 top-2.5 text-gray-400 w-4 h-4"/>
                                    <input 
                                        value={abilitySearch}
                                        onChange={e => setAbilitySearch(e.target.value)}
                                        className="w-full pl-9 pr-8 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="Поиск права..."
                                    />
                                    {abilitySearch && (
                                        <button 
                                            onClick={() => setAbilitySearch("")}
                                            className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-600"
                                        >
                                            <X size={16}/>
                                        </button>
                                    )}
                                </div>

                                {/* Управление группами */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={expandAllGroups}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Развернуть всё
                                    </button>
                                    <button
                                        onClick={collapseAllGroups}
                                        className="px-3 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition"
                                    >
                                        Свернуть всё
                                    </button>
                                </div>

                                {/* Компактный режим */}
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input 
                                        type="checkbox"
                                        checked={compactMode}
                                        onChange={e => setCompactMode(e.target.checked)}
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-sm text-gray-600">Компактный режим</span>
                                </label>

                                {/* Статистика */}
                                <div className="ml-auto flex items-center gap-4 text-sm text-gray-500">
                                    <span>{roles.length} ролей</span>
                                    <span>{abilities.length} прав</span>
                                    <span>{groupedAbilities.length} групп</span>
                                </div>
                            </div>
                        </div>

                        {/* Таблица матрицы */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full border-collapse">
                                    <thead>
                                        <tr>
                                            {/* Sticky колонка: Роли */}
                                            <th className={`
                                                ${compactMode ? 'p-2 min-w-[160px]' : 'p-4 min-w-[220px]'}
                                                text-left bg-gray-50 border-b border-r 
                                                sticky left-0 z-20 
                                                shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                            `}>
                                                <div className="text-xs text-gray-400 font-normal uppercase mb-1">Роль</div>
                                                <div className="font-bold text-gray-800">Название роли</div>
                                            </th>
                                            
                                            {/* Заголовки групп */}
                                            {groupedAbilities.map(group => (
                                                <th 
                                                    key={group.prefix}
                                                    colSpan={group.isExpanded ? group.abilities.length : 1}
                                                    className={`
                                                        ${compactMode ? 'p-1' : 'p-2'}
                                                        text-center bg-gray-100 border-b border-r
                                                        ${!group.isExpanded ? 'cursor-pointer hover:bg-gray-200' : ''}
                                                    `}
                                                    onClick={() => !group.isExpanded && toggleGroup(group.prefix)}
                                                >
                                                    <div className="flex items-center justify-center gap-1">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); toggleGroup(group.prefix); }}
                                                            className="p-1 hover:bg-gray-200 rounded transition"
                                                        >
                                                            {group.isExpanded 
                                                                ? <ChevronDown size={14} className="text-gray-500"/>
                                                                : <ChevronRight size={14} className="text-gray-500"/>
                                                            }
                                                        </button>
                                                        <span className="font-bold text-gray-700 text-xs uppercase">
                                                            {group.label}
                                                        </span>
                                                        <span className="text-[10px] text-gray-400 ml-1">
                                                            ({group.abilities.length})
                                                        </span>
                                                    </div>
                                                </th>
                                            ))}

                                            {/* Sticky колонка: Действия */}
                                            <th className={`
                                                ${compactMode ? 'p-2 min-w-[70px]' : 'p-4 min-w-[100px]'}
                                                bg-gray-50 border-b 
                                                sticky right-0 z-20
                                                shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                            `}>
                                                <div className="text-xs text-gray-500 font-bold">Сохр.</div>
                                            </th>
                                        </tr>
                                        
                                        {/* Подзаголовки для развёрнутых групп */}
                                        <tr>
                                            <th className={`
                                                ${compactMode ? 'p-1' : 'p-2'}
                                                bg-gray-50 border-b border-r 
                                                sticky left-0 z-20
                                                shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                            `}></th>
                                            
                                            {groupedAbilities.map(group => (
                                                group.isExpanded ? (
                                                    group.abilities.map(ab => (
                                                        <th 
                                                            key={ab.id}
                                                            className={`
                                                                ${compactMode ? 'p-1 min-w-[80px]' : 'p-2 min-w-[110px]'}
                                                                text-center bg-gray-50 border-b border-r align-top
                                                            `}
                                                        >
                                                            <div className={`
                                                                ${compactMode ? 'text-[8px]' : 'text-[10px]'}
                                                                text-gray-400 font-mono mb-0.5 truncate
                                                            `} title={ab.code}>
                                                                .{ab.code.split('.')[1]}
                                                            </div>
                                                            <div className={`
                                                                ${compactMode ? 'text-[9px]' : 'text-xs'}
                                                                font-semibold text-gray-600 leading-tight
                                                            `} title={ab.description}>
                                                                {compactMode 
                                                                    ? ab.description.slice(0, 12) + (ab.description.length > 12 ? '…' : '')
                                                                    : ab.description
                                                                }
                                                            </div>
                                                        </th>
                                                    ))
                                                ) : (
                                                    <th key={group.prefix + '-collapsed'} className="p-1 bg-gray-50 border-b border-r">
                                                        <div className="text-[10px] text-gray-400 italic">свёрнуто</div>
                                                    </th>
                                                )
                                            ))}
                                            
                                            <th className={`
                                                ${compactMode ? 'p-1' : 'p-2'}
                                                bg-gray-50 border-b 
                                                sticky right-0 z-20
                                                shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                            `}></th>
                                        </tr>
                                    </thead>
                                    
                                    <tbody>
                                        {roles.map(role => {
                                            const isChanged = hasChanges(role.id);
                                            const isSuperAdmin = role.name === 'SUPER_ADMIN';
                                            
                                            return (
                                                <tr 
                                                    key={role.id} 
                                                    className={`
                                                        hover:bg-indigo-50/30 transition group
                                                        ${isChanged ? 'bg-amber-50/50' : ''}
                                                    `}
                                                >
                                                    {/* Sticky: Название роли */}
                                                    <td className={`
                                                        ${compactMode ? 'p-2' : 'p-4'}
                                                        border-r border-b bg-white 
                                                        sticky left-0 z-10 
                                                        group-hover:bg-indigo-50/30 
                                                        ${isChanged ? 'bg-amber-50/50 group-hover:bg-amber-100/50' : ''}
                                                        shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                                    `}>
                                                        <div className={`font-bold text-gray-800 ${compactMode ? 'text-xs' : 'text-sm'}`}>
                                                            {role.description}
                                                        </div>
                                                        <div className={`text-indigo-500 font-mono mt-0.5 ${compactMode ? 'text-[10px]' : 'text-xs'}`}>
                                                            {role.name}
                                                        </div>
                                                        {isChanged && (
                                                            <div className="flex items-center gap-1 mt-1 text-amber-600">
                                                                <AlertCircle size={12}/>
                                                                <span className="text-[10px]">Изменено</span>
                                                            </div>
                                                        )}
                                                    </td>

                                                    {/* Чекбоксы по группам */}
                                                    {groupedAbilities.map(group => (
                                                        group.isExpanded ? (
                                                            group.abilities.map(ab => {
                                                                const isChecked = isSuperAdmin || matrix[role.id]?.has(ab.id);
                                                                return (
                                                                    <td 
                                                                        key={ab.id} 
                                                                        onClick={() => togglePermission(role.id, ab.id)}
                                                                        className={`
                                                                            ${compactMode ? 'p-1' : 'p-2'}
                                                                            border-r border-b text-center 
                                                                            ${isSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}
                                                                            transition-colors
                                                                            ${isChecked ? 'bg-indigo-50/50' : ''}
                                                                            ${!isSuperAdmin && 'hover:bg-indigo-100/50'}
                                                                        `}
                                                                    >
                                                                        <div className="flex justify-center">
                                                                            {isChecked 
                                                                                ? <CheckSquare size={compactMode ? 16 : 20} className="text-indigo-600"/>
                                                                                : <Square size={compactMode ? 16 : 20} className="text-gray-300"/>
                                                                            }
                                                                        </div>
                                                                    </td>
                                                                );
                                                            })
                                                        ) : (
                                                            // Свёрнутая группа - показываем summary
                                                            <td 
                                                                key={group.prefix + '-collapsed'}
                                                                onClick={() => !isSuperAdmin && toggleGroupForRole(role.id, group.prefix)}
                                                                className={`
                                                                    ${compactMode ? 'p-1' : 'p-2'}
                                                                    border-r border-b text-center 
                                                                    ${isSuperAdmin ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:bg-indigo-100/50'}
                                                                    transition-colors
                                                                `}
                                                                title="Клик для переключения всей группы"
                                                            >
                                                                {(() => {
                                                                    const groupAbilities = abilities.filter(a => a.code.startsWith(group.prefix + '.'));
                                                                    const checkedCount = isSuperAdmin 
                                                                        ? groupAbilities.length 
                                                                        : groupAbilities.filter(a => matrix[role.id]?.has(a.id)).length;
                                                                    const total = groupAbilities.length;
                                                                    
                                                                    return (
                                                                        <div className={`
                                                                            font-mono font-bold
                                                                            ${checkedCount === total ? 'text-green-600' : 
                                                                              checkedCount === 0 ? 'text-gray-400' : 'text-amber-600'}
                                                                            ${compactMode ? 'text-xs' : 'text-sm'}
                                                                        `}>
                                                                            {checkedCount}/{total}
                                                                        </div>
                                                                    );
                                                                })()}
                                                            </td>
                                                        )
                                                    ))}

                                                    {/* Sticky: Кнопка сохранения */}
                                                    <td className={`
                                                        ${compactMode ? 'p-1' : 'p-2'}
                                                        border-b bg-white 
                                                        sticky right-0 z-10
                                                        group-hover:bg-indigo-50/30
                                                        ${isChanged ? 'bg-amber-50/50 group-hover:bg-amber-100/50' : ''}
                                                        shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]
                                                    `}>
                                                        <button
                                                            onClick={() => saveRole(role.id)}
                                                            disabled={!isChanged || savingId === role.id || isSuperAdmin}
                                                            className={`
                                                                p-2 rounded-lg transition-all flex items-center justify-center
                                                                ${isChanged && !isSuperAdmin
                                                                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-md'
                                                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                                }
                                                            `}
                                                            title={isSuperAdmin ? 'Права Супер-Админа неизменны' : isChanged ? 'Сохранить изменения' : 'Нет изменений'}
                                                        >
                                                            {savingId === role.id 
                                                                ? <Loader2 size={16} className="animate-spin"/>
                                                                : <Save size={16}/>
                                                            }
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Легенда */}
                        <div className="flex flex-wrap items-center gap-6 text-xs text-gray-500 px-2">
                            <div className="flex items-center gap-2">
                                <CheckSquare size={16} className="text-indigo-600"/>
                                <span>Право включено</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <Square size={16} className="text-gray-300"/>
                                <span>Право выключено</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-4 h-4 bg-amber-100 rounded"/>
                                <span>Есть несохранённые изменения</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-green-600 font-bold">3/3</span>
                                <span>Все права группы (в свёрнутом виде)</span>
                            </div>
                        </div>
                    </div>
                )}

                {/* ==================== FLOATING SAVE BUTTON ==================== */}
                {viewMode === "MATRIX" && changedRolesCount > 0 && (
                    <div className="fixed bottom-6 right-6 z-50 animate-bounce-in">
                        <button
                            onClick={saveAllChanges}
                            disabled={savingAll}
                            className="
                                flex items-center gap-3 px-6 py-4 
                                bg-gradient-to-r from-indigo-600 to-purple-600 
                                text-white font-bold rounded-2xl 
                                shadow-2xl shadow-indigo-500/40
                                hover:from-indigo-700 hover:to-purple-700
                                transition-all transform hover:scale-105
                                disabled:opacity-70 disabled:cursor-not-allowed
                            "
                        >
                            {savingAll ? (
                                <>
                                    <Loader2 size={24} className="animate-spin"/>
                                    <span>Сохранение...</span>
                                </>
                            ) : (
                                <>
                                    <Save size={24}/>
                                    <span>Сохранить всё</span>
                                    <span className="
                                        ml-2 px-2 py-1 
                                        bg-white/20 rounded-full 
                                        text-sm font-mono
                                    ">
                                        {changedRolesCount}
                                    </span>
                                </>
                            )}
                        </button>
                    </div>
                )}
            </div>

            {/* Стили для анимаций */}
            <style>{`
                @keyframes fade-in {
                    from { opacity: 0; transform: translateY(10px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                @keyframes bounce-in {
                    0% { opacity: 0; transform: scale(0.8) translateY(20px); }
                    50% { transform: scale(1.05) translateY(-5px); }
                    100% { opacity: 1; transform: scale(1) translateY(0); }
                }
                .animate-fade-in {
                    animation: fade-in 0.3s ease-out;
                }
                .animate-bounce-in {
                    animation: bounce-in 0.4s ease-out;
                }
            `}</style>
        </div>
    );
});

export default AdminRightsPage;