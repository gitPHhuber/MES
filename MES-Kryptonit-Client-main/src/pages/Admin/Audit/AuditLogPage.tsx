import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs } from "api/auditApi";
import { Preloader } from "src/components/common/Preloader";
import { 
  History, Search, LogIn, Building2, Shield, Server, 
  AlertTriangle, Warehouse, Cpu, Factory, MoreHorizontal,
  Download, RefreshCw
} from "lucide-react";
import { AuditLogModel } from "types/AuditLogModel";
import { fetchUsers } from "src/api/fcApi";
import { userGetModel } from "src/types/UserModel";

// ===== ТИПЫ ВКЛАДОК =====
type AuditTab = 
  | "ALL" 
  | "SESSIONS" 
  | "STRUCTURE" 
  | "ACCESS" 
  | "SERVERS" 
  | "DEFECTS" 
  | "WAREHOUSE" 
  | "COMPONENTS"
  | "PRODUCTION"
  | "OTHER";

// ===== КОНФИГУРАЦИЯ ВКЛАДОК =====
const TABS: { id: AuditTab; label: string; icon: React.ElementType; description: string }[] = [
  { id: "ALL", label: "Все события", icon: History, description: "Все записи журнала" },
  { id: "SESSIONS", label: "Сессии", icon: LogIn, description: "Вход и выход пользователей" },
  { id: "SERVERS", label: "Серверы", icon: Server, description: "Beryll: серверы, партии, стойки, кластеры" },
  { id: "DEFECTS", label: "Брак", icon: AlertTriangle, description: "Дефекты серверов и плат" },
  { id: "WAREHOUSE", label: "Склад", icon: Warehouse, description: "Складские операции" },
  { id: "COMPONENTS", label: "Компоненты", icon: Cpu, description: "Компоненты серверов" },
  { id: "PRODUCTION", label: "Производство", icon: Factory, description: "Производственные операции" },
  { id: "STRUCTURE", label: "Структура", icon: Building2, description: "Участки и бригады" },
  { id: "ACCESS", label: "Права", icon: Shield, description: "Роли и разрешения" },
  { id: "OTHER", label: "Прочее", icon: MoreHorizontal, description: "Остальные события" },
];

// ===== МАППИНГ СУЩНОСТЕЙ НА ВКЛАДКИ =====
const ENTITY_TAB_MAP: Record<string, AuditTab> = {
  // Сессии
  SESSION: "SESSIONS",
  
  // Структура
  Section: "STRUCTURE",
  Team: "STRUCTURE",
  
  // Права доступа
  Role: "ACCESS",
  Ability: "ACCESS",
  RoleAbility: "ACCESS",
  
  // Серверы Beryll
  BeryllServer: "SERVERS",
  BeryllBatch: "SERVERS",
  BeryllRack: "SERVERS",
  BeryllCluster: "SERVERS",
  BeryllShipment: "SERVERS",
  Server: "SERVERS",
  Batch: "SERVERS",
  Rack: "SERVERS",
  Cluster: "SERVERS",
  
  // Дефекты
  BeryllDefectRecord: "DEFECTS",
  DefectRecord: "DEFECTS",
  BoardDefect: "DEFECTS",
  RepairAction: "DEFECTS",
  RepairHistory: "DEFECTS",
  DefectCategory: "DEFECTS",
  YadroTicketLog: "DEFECTS",
  Defect: "DEFECTS",
  
  // Склад
  WarehouseMovement: "WAREHOUSE",
  InventoryBox: "WAREHOUSE",
  Supply: "WAREHOUSE",
  WarehouseDocument: "WAREHOUSE",
  Warehouse: "WAREHOUSE",
  Box: "WAREHOUSE",
  
  // Компоненты
  ComponentInventory: "COMPONENTS",
  ComponentHistory: "COMPONENTS",
  ComponentCatalog: "COMPONENTS",
  ServerComponent: "COMPONENTS",
  Component: "COMPONENTS",
  
  // Производство
  ProductionEntry: "PRODUCTION",
  ProductionOutput: "PRODUCTION",
  AssembledProduct: "PRODUCTION",
  Recipe: "PRODUCTION",
  RecipeStep: "PRODUCTION",
  Production: "PRODUCTION",
};

// ===== ЦВЕТА ДЛЯ ДЕЙСТВИЙ =====
const ACTION_COLORS: Record<string, string> = {
  CREATE: "bg-green-100 text-green-800",
  CREATED: "bg-green-100 text-green-800",
  UPDATE: "bg-blue-100 text-blue-800",
  UPDATED: "bg-blue-100 text-blue-800",
  DELETE: "bg-red-100 text-red-800",
  DELETED: "bg-red-100 text-red-800",
  SESSION_START: "bg-emerald-100 text-emerald-800",
  SESSION_END: "bg-amber-100 text-amber-800",
  SESSION_DELETE: "bg-red-100 text-red-800",
  SESSION_AUTO_OFF: "bg-gray-100 text-gray-800",
  SESSION_FORCE_OFF: "bg-orange-100 text-orange-800",
  WAREHOUSE_MOVE: "bg-purple-100 text-purple-800",
  WAREHOUSE_MOVE_BATCH: "bg-purple-100 text-purple-800",
  DEFECT_RESOLVED: "bg-green-100 text-green-800",
  DEFECT_CREATED: "bg-red-100 text-red-800",
  COMPONENT_SYNC: "bg-cyan-100 text-cyan-800",
  EXPORT: "bg-indigo-100 text-indigo-800",
};

// ===== КОМПОНЕНТ СТРАНИЦЫ =====
export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogModel[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");
  const [entityFilter, setEntityFilter] = useState<string>("");

  const [searchText, setSearchText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AuditTab>("ALL");

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<userGetModel[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Загрузка пользователей
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await fetchUsers();
        setUsers(data);
      } catch (e) {
        console.error("Не удалось загрузить пользователей для фильтра журнала", e);
      }
    };
    loadUsers();
  }, []);

  // Загрузка логов
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const userIdParam =
          selectedUserId && selectedUserId !== "ALL"
            ? Number(selectedUserId)
            : undefined;

        const { count, rows } = await fetchAuditLogs({
          page,
          limit,
          action: actionFilter || undefined,
          entity: entityFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          userId: userIdParam,
        });

        setLogs(rows);
        setTotalCount(count);
      } catch (e: any) {
        console.error(e);
        setError(e?.response?.data?.message || "Ошибка загрузки журнала");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, limit, actionFilter, entityFilter, dateFrom, dateTo, selectedUserId]);

  // Уникальные действия из текущих логов
  const actions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Уникальные сущности
  const entities = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.entity) set.add(log.entity);
    });
    return Array.from(set).sort();
  }, [logs]);

  // Пагинация
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / limit)),
    [totalCount, limit]
  );

  // Определяем вкладку для записи
  const getLogTab = (log: AuditLogModel): AuditTab => {
    if (log.entity && ENTITY_TAB_MAP[log.entity]) {
      return ENTITY_TAB_MAP[log.entity];
    }
    // Проверяем по action
    if (log.action?.startsWith("SESSION_")) return "SESSIONS";
    if (log.action?.startsWith("WAREHOUSE_")) return "WAREHOUSE";
    if (log.action?.startsWith("DEFECT_")) return "DEFECTS";
    if (log.action?.startsWith("COMPONENT_")) return "COMPONENTS";
    if (log.action?.startsWith("SERVER_") || log.action?.startsWith("BERYLL_")) return "SERVERS";
    if (log.action?.startsWith("PRODUCTION_")) return "PRODUCTION";
    return "OTHER";
  };

  // Фильтрация логов по вкладке и поиску
  const filteredLogs = useMemo(() => {
    const query = searchText.toLowerCase();
    let data = logs;

    // Фильтрация по вкладке
    if (activeTab !== "ALL") {
      data = data.filter((log) => getLogTab(log) === activeTab);
    }

    // Поиск
    if (query) {
      data = data.filter((log) => {
        const description = (log.description || "").toLowerCase();
        const action = (log.action || "").toLowerCase();
        const entity = (log.entity || "").toLowerCase();
        const user = `${log.User?.name || ""} ${log.User?.surname || ""} ${log.User?.login || ""}`
          .trim()
          .toLowerCase();

        return (
          description.includes(query) ||
          action.includes(query) ||
          entity.includes(query) ||
          user.includes(query)
        );
      });
    }

    return data;
  }, [logs, searchText, activeTab]);

  // Статистика по вкладкам
  const tabStats = useMemo(() => {
    const stats: Record<AuditTab, number> = {
      ALL: logs.length,
      SESSIONS: 0,
      STRUCTURE: 0,
      ACCESS: 0,
      SERVERS: 0,
      DEFECTS: 0,
      WAREHOUSE: 0,
      COMPONENTS: 0,
      PRODUCTION: 0,
      OTHER: 0,
    };

    logs.forEach((log) => {
      const tab = getLogTab(log);
      stats[tab]++;
    });

    return stats;
  }, [logs]);

  // Цвет бейджа действия
  const getActionBadgeClass = (action: string): string => {
    if (ACTION_COLORS[action]) return ACTION_COLORS[action];
    if (action.includes("CREATE") || action.includes("ADD")) return ACTION_COLORS.CREATE;
    if (action.includes("UPDATE") || action.includes("EDIT")) return ACTION_COLORS.UPDATE;
    if (action.includes("DELETE") || action.includes("REMOVE")) return ACTION_COLORS.DELETE;
    return "bg-gray-100 text-gray-700";
  };

  // Экспорт в CSV
  const handleExport = () => {
    const headers = ["Время", "Пользователь", "Действие", "Сущность", "Описание"];
    const rows = filteredLogs.map((log) => [
      new Date(log.createdAt).toLocaleString("ru-RU"),
      log.User ? `${log.User.name} ${log.User.surname}` : "Система",
      log.action || "",
      log.entity || "",
      log.description || "",
    ]);

    const csv = [headers, ...rows]
      .map((row) => row.map((cell) => `"${cell}"`).join(","))
      .join("\n");

    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="px-4 py-6 max-w-[1800px] mx-auto">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
            <History className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Журнал действий</h1>
            <p className="text-sm text-gray-500">Аудит изменений в системе MES Kryptonit</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.location.reload()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Экспорт
          </button>
        </div>
      </div>

      {/* Вкладки */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const count = tabStats[tab.id];
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setPage(1);
              }}
              title={tab.description}
              className={[
                "flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all",
                isActive
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50 hover:border-gray-300",
              ].join(" ")}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {count > 0 && (
                <span
                  className={[
                    "px-1.5 py-0.5 rounded-full text-xs",
                    isActive ? "bg-blue-500 text-white" : "bg-gray-100 text-gray-600",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Фильтры */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
          {/* Поиск */}
          <div className="lg:col-span-2">
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Поиск</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Поиск по описанию, действию, пользователю..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Дата с */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Дата с</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Дата по */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Дата по</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Пользователь */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Пользователь</label>
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.surname}
                </option>
              ))}
            </select>
          </div>

          {/* Действие */}
          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Действие</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Все</option>
              {actions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Прелоадер */}
      {loading && <Preloader />}

      {/* Ошибка */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          <strong>Ошибка:</strong> {error}
        </div>
      )}

      {/* Таблица */}
      {!loading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-40">
                    Время
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-48">
                    Пользователь
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-40">
                    Действие
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase w-36">
                    Сущность
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Описание
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-12 text-center text-gray-400">
                      <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p>Нет записей по выбранным фильтрам</p>
                    </td>
                  </tr>
                )}

                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-b-0 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                      {new Date(log.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>

                    <td className="px-4 py-3 text-sm">
                      {log.User ? (
                        <div>
                          <div className="font-medium text-gray-800">
                            {log.User.name} {log.User.surname}
                          </div>
                          <div className="text-xs text-gray-400">{log.User.login}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Система</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span
                        className={`inline-block px-2 py-1 rounded text-xs font-medium ${getActionBadgeClass(
                          log.action || ""
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.entity && (
                        <span className="inline-block px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {log.entity}
                          {log.entityId && <span className="text-gray-400 ml-1">#{log.entityId}</span>}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-sm text-gray-600">
                      {log.description || <span className="text-gray-300 italic">—</span>}

                      {/* Дополнительная информация из metadata */}
                      {log.metadata && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {log.metadata.pcName && (
                            <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded">
                              ПК: {log.metadata.pcName}
                            </span>
                          )}
                          {log.metadata.ip && (
                            <span className="text-xs bg-gray-50 text-gray-500 px-1.5 py-0.5 rounded">
                              IP: {log.metadata.ip}
                            </span>
                          )}
                          {log.metadata.serverSerial && (
                            <span className="text-xs bg-purple-50 text-purple-600 px-1.5 py-0.5 rounded">
                              S/N: {log.metadata.serverSerial}
                            </span>
                          )}
                          {log.metadata.count !== undefined && (
                            <span className="text-xs bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded">
                              Кол-во: {log.metadata.count}
                            </span>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <div className="text-sm text-gray-500">
                Показано {filteredLogs.length} из {totalCount} записей
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Назад
                </button>
                <span className="text-sm text-gray-600">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border border-gray-200 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                >
                  Вперёд
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AuditLogPage;