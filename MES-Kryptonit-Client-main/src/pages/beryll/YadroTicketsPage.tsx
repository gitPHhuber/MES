import React, { useState, useEffect } from "react";
import { Plus, Save, Trash2, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { apiClient } from "../../api";

interface TicketRow {
  id: number | null;
  ticketNumber: string;
  serverSerial: string;
  serverId: number | null;
  componentType: string;
  serialYadro: string;
  serialManuf: string;
  sentDate: string;
  returnDate: string;
  notes: string;
  changed?: boolean;
}

const EMPTY_ROW: TicketRow = {
  id: null,
  ticketNumber: "",
  serverSerial: "",
  serverId: null,
  componentType: "",
  serialYadro: "",
  serialManuf: "",
  sentDate: "",
  returnDate: "",
  notes: "",
  changed: true
};

const COMP_TYPES = ["", "ОЗУ", "Мат. плата", "HDD", "SSD", "БП", "CPU", "Кулер", "RAID", "Сетевая", "BMC", "Другое"];

const mapTypeFromDB = (t: string | null): string => {
  if (!t) return "";
  const map: Record<string, string> = {
    RAM: "ОЗУ", MOTHERBOARD: "Мат. плата", HDD: "HDD", SSD: "SSD",
    PSU: "БП", CPU: "CPU", FAN: "Кулер", RAID: "RAID", NIC: "Сетевая", BMC: "BMC"
  };
  return map[t] || t;
};

const mapTypeToDB = (t: string): string | null => {
  const map: Record<string, string> = {
    "ОЗУ": "RAM", "Мат. плата": "MOTHERBOARD", "БП": "PSU",
    "Кулер": "FAN", "Сетевая": "NIC"
  };
  return map[t] || t || null;
};

export default function YadroTicketsPage() {
  const [rows, setRows] = useState<TicketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<number | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data } = await apiClient.get("/beryll/extended/yadro/logs", {
        params: { limit: 500 }
      });

      const loaded: TicketRow[] = (data.rows || []).map((r: any) => ({
        id: r.id,
        ticketNumber: r.ticketNumber || "",
        serverSerial: r.server?.apkSerialNumber || "",
        serverId: r.serverId || null,
        componentType: mapTypeFromDB(r.componentType),
        serialYadro: r.sentComponentSerialYadro || "",
        serialManuf: r.sentComponentSerialManuf || "",
        sentDate: r.sentAt ? r.sentAt.split("T")[0] : "",
        returnDate: r.receivedAt ? r.receivedAt.split("T")[0] : "",
        notes: r.notes || "",
        changed: false
      }));

      setRows(loaded);
    } catch (e) {
      console.error(e);
      toast.error("Ошибка загрузки");
    } finally {
      setLoading(false);
    }
  };

  const addRow = () => {
    setRows([{ ...EMPTY_ROW }, ...rows]);
  };

  const updateCell = (idx: number, field: keyof TicketRow, value: string) => {
    setRows(rows.map((r, i) =>
      i === idx ? { ...r, [field]: value, changed: true } : r
    ));
  };

  const saveRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.ticketNumber.trim()) {
      toast.error("Номер заявки обязателен");
      return;
    }

    setSaving(idx);
    try {
      if (row.id) {
        await apiClient.put(`/beryll/extended/yadro/logs/${row.id}`, {
          ticketNumber: row.ticketNumber.trim(),
          serverSerial: row.serverSerial.trim() || undefined,
          componentType: mapTypeToDB(row.componentType),
          sentComponentSerialYadro: row.serialYadro.trim() || undefined,
          sentComponentSerialManuf: row.serialManuf.trim() || undefined,
          sentAt: row.sentDate || undefined,
          receivedAt: row.returnDate || undefined,
          notes: row.notes.trim() || undefined
        });
      } else {
        await apiClient.post("/beryll/extended/yadro/logs", {
          ticketNumber: row.ticketNumber.trim(),
          serverSerial: row.serverSerial.trim() || undefined,
          componentType: mapTypeToDB(row.componentType),
          sentComponentSerialYadro: row.serialYadro.trim() || undefined,
          sentComponentSerialManuf: row.serialManuf.trim() || undefined,
          sentAt: row.sentDate || undefined,
          notes: row.notes.trim() || undefined
        });
      }
      toast.success("Сохранено");
      loadData();
    } catch (e: any) {
      toast.error(e.response?.data?.message || "Ошибка сохранения");
    } finally {
      setSaving(null);
    }
  };

  const deleteRow = async (idx: number) => {
    const row = rows[idx];
    if (!row.id) {
      setRows(rows.filter((_, i) => i !== idx));
      return;
    }
    if (!confirm(`Удалить заявку ${row.ticketNumber}?`)) return;

    try {
      await apiClient.delete(`/beryll/extended/yadro/logs/${row.id}`);
      toast.success("Удалено");
      loadData();
    } catch (e) {
      toast.error("Ошибка удаления");
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📋 Журнал заявок Ядро</h1>
        <button
          onClick={addRow}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" /> Добавить
        </button>
      </div>

      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-2 py-2 text-left font-semibold border-b w-28">№ заявки</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-28">Сервер</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-24">Компонент</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-40">S/N (Ядро)</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-40">S/N (произв.)</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-28">Отправлено</th>
              <th className="px-2 py-2 text-left font-semibold border-b w-28">Возврат</th>
              <th className="px-2 py-2 text-left font-semibold border-b">Примечания</th>
              <th className="px-2 py-2 text-center font-semibold border-b w-20"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                  Нет записей. Нажмите "Добавить" для создания.
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => (
                <tr
                  key={row.id || `new-${idx}`}
                  className={`hover:bg-blue-50 ${row.changed ? "bg-yellow-50" : ""} ${!row.id ? "bg-green-50" : ""}`}
                >
                  <td className="px-1 py-1 border-b">
                    <input
                      type="text"
                      value={row.ticketNumber}
                      onChange={(e) => updateCell(idx, "ticketNumber", e.target.value.toUpperCase())}
                      placeholder="INC553187"
                      className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="text"
                      value={row.serverSerial}
                      onChange={(e) => updateCell(idx, "serverSerial", e.target.value)}
                      placeholder="020223076B"
                      className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <select
                      value={row.componentType}
                      onChange={(e) => updateCell(idx, "componentType", e.target.value)}
                      className="w-full px-1 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    >
                      {COMP_TYPES.map(t => (
                        <option key={t} value={t}>{t || "—"}</option>
                      ))}
                    </select>
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="text"
                      value={row.serialYadro}
                      onChange={(e) => updateCell(idx, "serialYadro", e.target.value)}
                      placeholder="Y0ZJBC025024..."
                      className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="text"
                      value={row.serialManuf}
                      onChange={(e) => updateCell(idx, "serialManuf", e.target.value)}
                      placeholder="K07Z0003201..."
                      className="w-full px-2 py-1 border rounded text-xs font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="date"
                      value={row.sentDate}
                      onChange={(e) => updateCell(idx, "sentDate", e.target.value)}
                      className="w-full px-1 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="date"
                      value={row.returnDate}
                      onChange={(e) => updateCell(idx, "returnDate", e.target.value)}
                      className={`w-full px-1 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none ${
                        row.returnDate ? "bg-green-100 border-green-300" : ""
                      }`}
                    />
                  </td>

                  <td className="px-1 py-1 border-b">
                    <input
                      type="text"
                      value={row.notes}
                      onChange={(e) => updateCell(idx, "notes", e.target.value)}
                      placeholder="..."
                      className="w-full px-2 py-1 border rounded text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                    />
                  </td>

                  <td className="px-1 py-1 border-b text-center">
                    <div className="flex items-center justify-center gap-1">
                      {row.changed && (
                        <button
                          onClick={() => saveRow(idx)}
                          disabled={saving === idx}
                          className="p-1 text-green-600 hover:bg-green-100 rounded disabled:opacity-50"
                          title="Сохранить"
                        >
                          {saving === idx ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Save className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => deleteRow(idx)}
                        className="p-1 text-red-500 hover:bg-red-100 rounded"
                        title="Удалить"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-3 text-xs text-gray-500 flex gap-4">
        <span>Всего: {rows.length}</span>
        <span className="text-yellow-600">Изменено: {rows.filter(r => r.changed).length}</span>
        <span className="text-green-600">Возвращено: {rows.filter(r => r.returnDate).length}</span>
      </div>
    </div>
  );
}