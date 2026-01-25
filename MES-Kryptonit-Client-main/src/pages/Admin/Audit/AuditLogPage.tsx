import { useEffect, useMemo, useState } from "react";
import { fetchAuditLogs } from "api/auditApi";
import { Preloader } from "src/components/common/Preloader";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { History, Search } from "lucide-react";
import { AuditLogModel } from "types/AuditLogModel";
import { fetchUsers } from "src/api/fcApi";
import { userGetModel } from "src/types/UserModel";

type AuditTab = "ALL" | "SESSIONS" | "STRUCTURE" | "ACCESS" | "OTHER";

const TABS: { id: AuditTab; label: string }[] = [
  { id: "ALL", label: "Все события" },
  { id: "SESSIONS", label: "Вход / выход" },
  { id: "STRUCTURE", label: "Структура" },
  { id: "ACCESS", label: "Роли и права" },
  { id: "OTHER", label: "Прочее" },
];

export const AuditLogPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogModel[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(50);
  const [totalCount, setTotalCount] = useState(0);

  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [actionFilter, setActionFilter] = useState<string>("");

  const [searchText, setSearchText] = useState<string>("");
  const [activeTab, setActiveTab] = useState<AuditTab>("ALL");

  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [users, setUsers] = useState<userGetModel[]>([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requestId, setRequestId] = useState<string | null>(null);

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

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      setRequestId(null);
      try {
        const userIdParam =
          selectedUserId && selectedUserId !== "ALL"
            ? Number(selectedUserId)
            : undefined;

        const { count, rows } = await fetchAuditLogs({
          page,
          limit,
          action: actionFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
          userId: userIdParam,
        });

        setLogs(rows);
        setTotalCount(count);
      } catch (e: any) {
        console.error(e);
        setError(e.userMessage ?? e?.response?.data?.message ?? "Ошибка загрузки журнала");
        setRequestId(e.requestId ?? null);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [page, limit, actionFilter, dateFrom, dateTo, selectedUserId]);

  const actions = useMemo(() => {
    const set = new Set<string>();
    logs.forEach((log) => {
      if (log.action) set.add(log.action);
    });
    return Array.from(set).sort();
  }, [logs]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / limit)),
    [totalCount, limit]
  );

  const filteredLogs = useMemo(() => {
    const query = searchText.toLowerCase();
    let data = logs;

    if (activeTab === "SESSIONS") {
      data = data.filter((log) => log.entity === "SESSION");
    } else if (activeTab === "STRUCTURE") {
      data = data.filter(
        (log) => log.entity === "Section" || log.entity === "Team"
      );
    } else if (activeTab === "ACCESS") {
      data = data.filter(
        (log) =>
          log.entity === "Role" ||
          log.entity === "Ability" ||
          log.entity === "RoleAbility"
      );
    } else if (activeTab === "OTHER") {
      data = data.filter(
        (log) =>
          log.entity !== "SESSION" &&
          log.entity !== "Section" &&
          log.entity !== "Team" &&
          log.entity !== "Role" &&
          log.entity !== "Ability" &&
          log.entity !== "RoleAbility"
      );
    }

    if (!query) {
      return data;
    }

    return data.filter((log) => {
      const description = (log.description || "").toLowerCase();
      const action = (log.action || "").toLowerCase();
      const user = `${log.User?.name || ""} ${log.User?.surname || ""} ${
        log.User?.login || ""
      }`
        .trim()
        .toLowerCase();

      return (
        description.includes(query) ||
        action.includes(query) ||
        user.includes(query)
      );
    });
  }, [logs, searchText, activeTab]);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-2">
        <History className="w-6 h-6 text-blue-600" />
        <h1 className="text-2xl font-semibold text-gray-800">
          Журнал действий
        </h1>
      </div>
      <p className="text-sm text-gray-500 mb-4">Аудит изменений в системе</p>

      {/* Вкладки */}
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={[
              "px-3 py-1 rounded-full text-xs font-semibold border transition-colors",
              activeTab === tab.id
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Фильтры */}
      <div className="grid grid-cols-1 md:grid-cols-5 lg:grid-cols-6 gap-4 mb-4">
        {/* Дата с */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Дата с
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Дата по */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Дата по
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm"
          />
        </div>

        {/* Действие */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Действие
          </label>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="">Все</option>
            {actions.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        {/* Пользователь */}
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold text-gray-600">
            Пользователь
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => {
              setSelectedUserId(e.target.value);
              setPage(1);
            }}
            className="border rounded px-2 py-1 text-sm bg-white"
          >
            <option value="">Все</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name} {u.surname} ({u.login})
              </option>
            ))}
          </select>
        </div>

        {/* Поиск по описанию/пользователю */}
        <div className="flex flex-col gap-1 md:col-span-2 lg:col-span-2">
          <label className="text-xs font-semibold text-gray-600">
            Поиск по описанию...
          </label>
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-2 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value);
                setPage(1);
              }}
              className="border rounded pl-8 pr-2 py-1 text-sm w-full"
              placeholder="Действие, пользователь или текст..."
            />
          </div>
        </div>
      </div>

      {/* Состояния */}
      {loading && (
        <div className="flex justify-center py-8">
          <Preloader />
        </div>
      )}

      {error && !loading && (
        <div className="mb-4 p-3 rounded bg-red-50 text-sm text-red-700 border border-red-100">
          Не удалось загрузить журнал.
          <br />
          <span className="font-mono text-xs">{error}</span>
          <RequestIdNotice requestId={requestId} />
        </div>
      )}

      {/* Таблица */}
      {!loading && (
        <div className="bg-white rounded-lg shadow">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Время
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Кто
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Действие
                  </th>
                  <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">
                    Описание
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 && (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-6 text-center text-sm text-gray-400"
                    >
                      Нет записей по выбранным фильтрам
                    </td>
                  </tr>
                )}

                {filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className="border-b last:border-b-0 hover:bg-gray-50"
                  >
                    <td className="px-4 py-2 text-sm text-gray-700">
                      {new Date(log.createdAt).toLocaleString("ru-RU", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </td>

                    <td className="px-4 py-2 text-sm text-gray-700">
                      {log.User
                        ? `${log.User.name} ${log.User.surname} (${log.User.login})`
                        : "Система"}
                    </td>

                    <td className="px-4 py-2 text-sm text-gray-700">
                      {log.action}
                    </td>

                    <td className="px-4 py-2 text-sm text-gray-600">
                      {log.description || (
                        <span className="text-gray-400 italic">—</span>
                      )}

                      {/* ПК для событий сессий */}
                      {log.entity === "SESSION" && log.metadata?.pcName && (
                        <div className="text-xs text-gray-400 mt-1">
                          ПК: {log.metadata.pcName}
                          {log.metadata.pcIp ? ` (${log.metadata.pcIp})` : ""}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Пагинация */}
          <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
            <div className="text-xs text-gray-500">
              Всего записей: {totalCount}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
              >
                Назад
              </button>
              <span className="text-xs text-gray-600">
                Стр. {page} из {totalPages}
              </span>
              <button
                className="px-2 py-1 text-xs border rounded disabled:opacity-50"
                onClick={() =>
                  setPage((p) => (p < totalPages ? p + 1 : p))
                }
                disabled={page >= totalPages}
              >
                Вперёд
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
