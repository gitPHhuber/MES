/**
 * DefectRecordsTab.tsx
 * 
 * Вкладка "Учёт брака" для APK Beryll
 * Журнал дефектов серверов с отслеживанием ремонта
 * 
 * Положить в: src/pages/Beryll/tabs/DefectRecordsTab.tsx
 */

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, Plus, Search, Filter, FileText, Download,
  Clock, CheckCircle, XCircle, Send, RotateCcw, Repeat,
  ChevronDown, Trash2, Edit, Paperclip, Eye, Calendar
} from "lucide-react";
import toast from "react-hot-toast";
import {
  getDefectRecords, getDefectRecordById, createDefectRecord, updateDefectRecord, deleteDefectRecord,
  changeDefectRecordStatus, sendDefectToYadro, returnDefectFromYadro, resolveDefectRecord,
  markDefectAsRepeated, getDefectRecordStats, uploadDefectRecordFile, downloadDefectRecordFile,
  deleteDefectRecordFile, getRepairPartTypes, getDefectStatuses,
  BeryllDefectRecord, DefectRecordStatus, RepairPartType, DefectRecordStats
} from "../../../api/beryll/beryllExtendedApi";
import { getServers } from "../../../api/beryllApi";
import { getUsers } from "../../../api/userApi";
import { Modal } from "../../../components/Modal/Modal";
import { ConfirmModal } from "../../../components/Modal/ConfirmModal";

// Конфигурация статусов
const STATUS_CONFIG: Record<DefectRecordStatus, { label: string; color: string; bg: string; icon: React.ReactNode }> = {
  NEW: { label: "Новый", color: "text-blue-600", bg: "bg-blue-100", icon: <Clock size={14} /> },
  DIAGNOSING: { label: "Диагностика", color: "text-purple-600", bg: "bg-purple-100", icon: <Eye size={14} /> },
  WAITING_PARTS: { label: "Ожидание запчастей", color: "text-yellow-600", bg: "bg-yellow-100", icon: <Clock size={14} /> },
  REPAIRING: { label: "В ремонте", color: "text-orange-600", bg: "bg-orange-100", icon: <RotateCcw size={14} /> },
  SENT_TO_YADRO: { label: "Отправлен в Ядро", color: "text-indigo-600", bg: "bg-indigo-100", icon: <Send size={14} /> },
  RETURNED: { label: "Возвращён из Ядро", color: "text-cyan-600", bg: "bg-cyan-100", icon: <RotateCcw size={14} /> },
  RESOLVED: { label: "Решён", color: "text-green-600", bg: "bg-green-100", icon: <CheckCircle size={14} /> },
  REPEATED: { label: "Повторный брак", color: "text-red-600", bg: "bg-red-100", icon: <Repeat size={14} /> },
  CLOSED: { label: "Закрыт", color: "text-gray-600", bg: "bg-gray-100", icon: <XCircle size={14} /> }
};

// Названия типов деталей
const PART_TYPE_LABELS: Record<RepairPartType, string> = {
  RAM: "ОЗУ",
  MOTHERBOARD: "Материнская плата",
  CPU: "Процессор",
  HDD: "HDD диск",
  SSD: "SSD диск",
  PSU: "Блок питания",
  FAN: "Вентилятор",
  RAID: "RAID контроллер",
  NIC: "Сетевая карта",
  BACKPLANE: "Backplane",
  BMC: "BMC модуль",
  CABLE: "Кабель",
  OTHER: "Другое"
};

const DefectRecordsTab: React.FC = () => {
  const [records, setRecords] = useState<BeryllDefectRecord[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedRecord, setSelectedRecord] = useState<BeryllDefectRecord | null>(null);
  const [stats, setStats] = useState<DefectRecordStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showStats, setShowStats] = useState(false);
  
  // Фильтры
  const [filters, setFilters] = useState({
    search: "",
    status: "" as DefectRecordStatus | "",
    repairPartType: "" as RepairPartType | "",
    isRepeatedDefect: "" as "" | "true" | "false",
    dateFrom: "",
    dateTo: ""
  });
  const [showFilters, setShowFilters] = useState(false);
  
  // Модальные окна
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  // Справочники
  const [servers, setServers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  const LIMIT = 20;
  
  // Загрузка данных
  const loadRecords = async () => {
    try {
      setLoading(true);
      const params: any = {
        limit: LIMIT,
        offset: (page - 1) * LIMIT
      };
      
      if (filters.search) params.search = filters.search;
      if (filters.status) params.status = filters.status;
      if (filters.repairPartType) params.repairPartType = filters.repairPartType;
      if (filters.isRepeatedDefect) params.isRepeatedDefect = filters.isRepeatedDefect;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      
      const data = await getDefectRecords(params);
      setRecords(data.rows);
      setTotalCount(data.count);
    } catch (error: any) {
      toast.error("Ошибка загрузки записей");
    } finally {
      setLoading(false);
    }
  };
  
  const loadStats = async () => {
    try {
      const data = await getDefectRecordStats();
      setStats(data);
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
    }
  };
  
  const loadRecordDetails = async (id: number) => {
    try {
      const data = await getDefectRecordById(id);
      setSelectedRecord(data);
    } catch (error) {
      toast.error("Ошибка загрузки записи");
    }
  };
  
  const loadServers = async () => {
    try {
      const data = await getServers({});
      setServers(data);
    } catch (error) {
      console.error("Ошибка загрузки серверов:", error);
    }
  };
  
  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Ошибка загрузки пользователей:", error);
    }
  };
  
  useEffect(() => {
    loadRecords();
  }, [page, filters]);
  
  useEffect(() => {
    loadStats();
    loadServers();
    loadUsers();
  }, []);
  
  const totalPages = Math.ceil(totalCount / LIMIT);
  
  // Форматирование даты
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };
  
  // Компонент строки таблицы
  const RecordRow: React.FC<{ record: BeryllDefectRecord }> = ({ record }) => {
    const statusConfig = STATUS_CONFIG[record.status];
    
    return (
      <tr 
        className={`hover:bg-gray-50 cursor-pointer ${selectedRecord?.id === record.id ? "bg-blue-50" : ""}`}
        onClick={() => loadRecordDetails(record.id)}
      >
        <td className="px-4 py-3 text-sm">
          <div className="font-mono">{record.yadroTicketNumber || "—"}</div>
          <div className="text-xs text-gray-500">#{record.id}</div>
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="font-medium">{record.server?.apkSerialNumber || `#${record.serverId}`}</div>
          {record.clusterCode && (
            <div className="text-xs text-gray-500">Кластер: {record.clusterCode}</div>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="line-clamp-2">{record.problemDescription}</div>
        </td>
        <td className="px-4 py-3 text-sm">
          {record.repairPartType ? (
            <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
              {PART_TYPE_LABELS[record.repairPartType]}
            </span>
          ) : "—"}
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          {record.isRepeatedDefect && (
            <div className="text-xs text-red-500 mt-1 flex items-center gap-1">
              <Repeat size={10} />
              Повторный
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm text-gray-500">
          {formatDate(record.detectedAt)}
        </td>
        <td className="px-4 py-3 text-sm">
          {record.diagnostician ? (
            `${record.diagnostician.name || ""} ${record.diagnostician.surname || ""}`.trim() || record.diagnostician.login
          ) : "—"}
        </td>
      </tr>
    );
  };
  
  // Карточка статистики
  const StatsCard: React.FC<{ title: string; value: number | string; color?: string }> = ({ title, value, color = "text-gray-900" }) => (
    <div className="bg-white rounded-lg shadow p-4">
      <div className="text-sm text-gray-500">{title}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
  
  return (
    <div className="p-4">
      {/* Заголовок */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <AlertTriangle className="text-red-500" />
          Учёт брака
        </h2>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-3 py-2 rounded-lg border ${showStats ? "bg-blue-50 border-blue-300" : ""}`}
          >
            📊 Статистика
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${showFilters ? "bg-blue-50 border-blue-300" : ""}`}
          >
            <Filter size={18} />
            Фильтры
          </button>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Поиск..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              className="pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <Plus size={18} />
            Добавить запись
          </button>
        </div>
      </div>
      
      {/* Статистика */}
      {showStats && stats && (
        <div className="grid grid-cols-6 gap-4 mb-4">
          <StatsCard title="Всего записей" value={stats.total} />
          <StatsCard title="Новых" value={stats.byStatus.NEW || 0} color="text-blue-600" />
          <StatsCard title="В работе" value={(stats.byStatus.DIAGNOSING || 0) + (stats.byStatus.REPAIRING || 0)} color="text-orange-600" />
          <StatsCard title="Решено" value={stats.byStatus.RESOLVED || 0} color="text-green-600" />
          <StatsCard title="Повторный брак" value={`${stats.repeatedCount} (${stats.repeatedPercent}%)`} color="text-red-600" />
          <StatsCard title="В Ядро" value={stats.sentToYadroCount} color="text-indigo-600" />
        </div>
      )}
      
      {/* Фильтры */}
      {showFilters && (
        <div className="bg-gray-50 rounded-lg p-4 mb-4 grid grid-cols-6 gap-4">
          <div>
            <label className="block text-xs font-medium mb-1">Статус</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as DefectRecordStatus | "" })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Все</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>{config.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Тип детали</label>
            <select
              value={filters.repairPartType}
              onChange={(e) => setFilters({ ...filters, repairPartType: e.target.value as RepairPartType | "" })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Все</option>
              {Object.entries(PART_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Повторный брак</label>
            <select
              value={filters.isRepeatedDefect}
              onChange={(e) => setFilters({ ...filters, isRepeatedDefect: e.target.value as "" | "true" | "false" })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">Все</option>
              <option value="true">Да</option>
              <option value="false">Нет</option>
            </select>
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Дата от</label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          
          <div>
            <label className="block text-xs font-medium mb-1">Дата до</label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          
          <div className="flex items-end">
            <button
              onClick={() => setFilters({ search: "", status: "", repairPartType: "", isRepeatedDefect: "", dateFrom: "", dateTo: "" })}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Сбросить
            </button>
          </div>
        </div>
      )}
      
      <div className="flex gap-4">
        {/* Таблица */}
        <div className="flex-1 bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Заявка</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Сервер</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Проблема</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Деталь</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Статус</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Дата</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500">Диагност</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Загрузка...</td>
                  </tr>
                ) : records.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">Записи не найдены</td>
                  </tr>
                ) : (
                  records.map(record => <RecordRow key={record.id} record={record} />)
                )}
              </tbody>
            </table>
          </div>
          
          {/* Пагинация */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Показано {(page - 1) * LIMIT + 1} - {Math.min(page * LIMIT, totalCount)} из {totalCount}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  ←
                </button>
                <span className="px-3 py-1">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 border rounded disabled:opacity-50"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Детали выбранной записи */}
        {selectedRecord && (
          <div className="w-96 flex-shrink-0">
            <RecordDetails 
              record={selectedRecord} 
              users={users}
              onUpdate={() => {
                loadRecordDetails(selectedRecord.id);
                loadRecords();
              }}
              onEdit={() => setShowEditModal(true)}
              onDelete={() => setShowDeleteConfirm(true)}
              onStatusChange={() => setShowStatusModal(true)}
            />
          </div>
        )}
      </div>
      
      {/* Модальные окна */}
      <CreateRecordModal
        isOpen={showCreateModal}
        servers={servers}
        users={users}
        onClose={() => setShowCreateModal(false)}
        onSuccess={() => {
          loadRecords();
          loadStats();
          setShowCreateModal(false);
        }}
      />
      
      {selectedRecord && (
        <>
          <EditRecordModal
            isOpen={showEditModal}
            record={selectedRecord}
            servers={servers}
            users={users}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => {
              loadRecordDetails(selectedRecord.id);
              loadRecords();
              setShowEditModal(false);
            }}
          />
          
          <StatusModal
            isOpen={showStatusModal}
            record={selectedRecord}
            onClose={() => setShowStatusModal(false)}
            onSuccess={() => {
              loadRecordDetails(selectedRecord.id);
              loadRecords();
              loadStats();
              setShowStatusModal(false);
            }}
          />
          
          <ConfirmModal
            isOpen={showDeleteConfirm}
            title="Удалить запись?"
            message="Это действие необратимо"
            onConfirm={async () => {
              try {
                await deleteDefectRecord(selectedRecord.id);
                toast.success("Запись удалена");
                setSelectedRecord(null);
                loadRecords();
                loadStats();
              } catch (error: any) {
                toast.error(error.response?.data?.message || "Ошибка");
              }
              setShowDeleteConfirm(false);
            }}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        </>
      )}
    </div>
  );
};

// ============================================
// КОМПОНЕНТ ДЕТАЛЕЙ ЗАПИСИ
// ============================================

const RecordDetails: React.FC<{
  record: BeryllDefectRecord;
  users: any[];
  onUpdate: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: () => void;
}> = ({ record, users, onUpdate, onEdit, onDelete, onStatusChange }) => {
  const statusConfig = STATUS_CONFIG[record.status];
  const [uploading, setUploading] = useState(false);
  
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    try {
      setUploading(true);
      await uploadDefectRecordFile(record.id, file);
      toast.success("Файл загружен");
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка загрузки");
    } finally {
      setUploading(false);
    }
  };
  
  const handleFileDownload = async (fileId: number, fileName: string) => {
    try {
      const blob = await downloadDefectRecordFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      toast.error("Ошибка скачивания");
    }
  };
  
  const handleFileDelete = async (fileId: number) => {
    if (!confirm("Удалить файл?")) return;
    try {
      await deleteDefectRecordFile(fileId);
      toast.success("Файл удалён");
      onUpdate();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    }
  };
  
  return (
    <div className="bg-white rounded-lg shadow">
      {/* Заголовок */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded ${statusConfig.bg} ${statusConfig.color}`}>
            {statusConfig.icon}
            {statusConfig.label}
          </span>
          <div className="flex items-center gap-1">
            <button onClick={onEdit} className="p-1.5 hover:bg-gray-100 rounded" title="Редактировать">
              <Edit size={16} />
            </button>
            <button onClick={onDelete} className="p-1.5 hover:bg-red-100 text-red-500 rounded" title="Удалить">
              <Trash2 size={16} />
            </button>
          </div>
        </div>
        
        {record.yadroTicketNumber && (
          <div className="text-lg font-semibold">{record.yadroTicketNumber}</div>
        )}
        <div className="text-sm text-gray-500">
          Сервер: {record.server?.apkSerialNumber || `#${record.serverId}`}
        </div>
      </div>
      
      {/* Быстрые действия */}
      <div className="p-3 border-b bg-gray-50">
        <button
          onClick={onStatusChange}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
        >
          Изменить статус
        </button>
      </div>
      
      {/* Информация */}
      <div className="p-4 space-y-3 text-sm">
        <div>
          <div className="text-gray-500">Проблема:</div>
          <div>{record.problemDescription}</div>
        </div>
        
        {record.repairPartType && (
          <div>
            <div className="text-gray-500">Тип детали:</div>
            <div>{PART_TYPE_LABELS[record.repairPartType]}</div>
          </div>
        )}
        
        {record.defectPartSerialYadro && (
          <div>
            <div className="text-gray-500">S/N бракованной (Ядро):</div>
            <div className="font-mono">{record.defectPartSerialYadro}</div>
          </div>
        )}
        
        {record.replacementPartSerialYadro && (
          <div>
            <div className="text-gray-500">S/N замены (Ядро):</div>
            <div className="font-mono">{record.replacementPartSerialYadro}</div>
          </div>
        )}
        
        {record.repairDetails && (
          <div>
            <div className="text-gray-500">Детали ремонта:</div>
            <div>{record.repairDetails}</div>
          </div>
        )}
        
        {record.isRepeatedDefect && (
          <div className="p-2 bg-red-50 rounded border border-red-200">
            <div className="text-red-600 font-medium flex items-center gap-1">
              <Repeat size={14} />
              Повторный брак
            </div>
            {record.repeatedDefectReason && (
              <div className="text-sm mt-1">{record.repeatedDefectReason}</div>
            )}
          </div>
        )}
        
        {record.sentToYadroRepair && (
          <div className="p-2 bg-indigo-50 rounded border border-indigo-200">
            <div className="text-indigo-600 font-medium">Отправлен в Ядро</div>
            {record.sentToYadroAt && (
              <div className="text-xs">{new Date(record.sentToYadroAt).toLocaleDateString()}</div>
            )}
            {record.substituteServerSerial && (
              <div className="text-xs">Подменный: {record.substituteServerSerial}</div>
            )}
          </div>
        )}
        
        {record.resolution && (
          <div className="p-2 bg-green-50 rounded border border-green-200">
            <div className="text-green-600 font-medium">Резолюция</div>
            <div className="text-sm">{record.resolution}</div>
          </div>
        )}
        
        <div className="pt-2 border-t text-xs text-gray-500 space-y-1">
          <div>Обнаружен: {new Date(record.detectedAt).toLocaleString()}</div>
          {record.diagnostician && (
            <div>Диагност: {record.diagnostician.name} {record.diagnostician.surname}</div>
          )}
          {record.resolvedAt && (
            <div>Решён: {new Date(record.resolvedAt).toLocaleString()}</div>
          )}
        </div>
      </div>
      
      {/* Файлы */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium flex items-center gap-1">
            <Paperclip size={14} />
            Файлы ({record.files?.length || 0})
          </span>
          <label className="text-sm text-blue-600 hover:text-blue-800 cursor-pointer">
            {uploading ? "Загрузка..." : "+ Добавить"}
            <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        </div>
        
        {record.files && record.files.length > 0 && (
          <div className="space-y-1">
            {record.files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                <span className="truncate flex-1" title={file.originalName}>
                  {file.originalName}
                </span>
                <div className="flex items-center gap-1 ml-2">
                  <button
                    onClick={() => handleFileDownload(file.id, file.originalName)}
                    className="p-1 hover:bg-gray-200 rounded"
                    title="Скачать"
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => handleFileDelete(file.id)}
                    className="p-1 hover:bg-red-100 text-red-500 rounded"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО СОЗДАНИЯ
// ============================================

const CreateRecordModal: React.FC<{
  isOpen: boolean;
  servers: any[];
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, servers, users, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    serverId: 0,
    problemDescription: "",
    yadroTicketNumber: "",
    hasSPISI: false,
    clusterCode: "",
    diagnosticianId: null as number | null,
    repairPartType: "" as RepairPartType | "",
    defectPartSerialYadro: "",
    defectPartSerialManuf: "",
    notes: ""
  });
  const [saving, setSaving] = useState(false);
  const [serverSearch, setServerSearch] = useState("");
  
  const filteredServers = servers.filter(s =>
    !serverSearch ||
    s.apkSerialNumber?.toLowerCase().includes(serverSearch.toLowerCase()) ||
    s.hostname?.toLowerCase().includes(serverSearch.toLowerCase())
  );
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.serverId) {
      toast.error("Выберите сервер");
      return;
    }
    if (!form.problemDescription.trim()) {
      toast.error("Опишите проблему");
      return;
    }
    
    try {
      setSaving(true);
      await createDefectRecord({
        ...form,
        repairPartType: form.repairPartType || undefined,
        diagnosticianId: form.diagnosticianId || undefined
      });
      toast.success("Запись создана");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Добавить запись о браке">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Выбор сервера */}
        <div>
          <label className="block text-sm font-medium mb-1">Сервер *</label>
          <input
            type="text"
            placeholder="Поиск по S/N, hostname..."
            value={serverSearch}
            onChange={(e) => setServerSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-2"
          />
          <div className="max-h-32 overflow-y-auto border rounded-lg">
            {filteredServers.slice(0, 10).map(server => (
              <div
                key={server.id}
                className={`p-2 cursor-pointer hover:bg-blue-50 border-b last:border-b-0 ${form.serverId === server.id ? "bg-blue-100" : ""}`}
                onClick={() => setForm({ ...form, serverId: server.id })}
              >
                <div className="font-medium">{server.apkSerialNumber || `#${server.id}`}</div>
                <div className="text-xs text-gray-500">{server.hostname}</div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Описание проблемы *</label>
          <textarea
            value={form.problemDescription}
            onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
            rows={3}
            placeholder="ECC Error, не работает вентилятор..."
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Заявка Ядро</label>
            <input
              type="text"
              value={form.yadroTicketNumber}
              onChange={(e) => setForm({ ...form, yadroTicketNumber: e.target.value })}
              placeholder="INC553187"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Код кластера</label>
            <input
              type="text"
              value={form.clusterCode}
              onChange={(e) => setForm({ ...form, clusterCode: e.target.value })}
              placeholder="240008"
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Тип детали</label>
            <select
              value={form.repairPartType}
              onChange={(e) => setForm({ ...form, repairPartType: e.target.value as RepairPartType | "" })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">— Выберите —</option>
              {Object.entries(PART_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Диагност</label>
            <select
              value={form.diagnosticianId || ""}
              onChange={(e) => setForm({ ...form, diagnosticianId: e.target.value ? parseInt(e.target.value) : null })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">— Выберите —</option>
              {users.map(user => (
                <option key={user.id} value={user.id}>
                  {user.name} {user.surname} ({user.login})
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">S/N бракованной (Ядро)</label>
            <input
              type="text"
              value={form.defectPartSerialYadro}
              onChange={(e) => setForm({ ...form, defectPartSerialYadro: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">S/N бракованной (произв.)</label>
            <input
              type="text"
              value={form.defectPartSerialManuf}
              onChange={(e) => setForm({ ...form, defectPartSerialManuf: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasSPISI"
            checked={form.hasSPISI}
            onChange={(e) => setForm({ ...form, hasSPISI: e.target.checked })}
          />
          <label htmlFor="hasSPISI" className="text-sm">Наличие СПиСИ</label>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            {saving ? "Создание..." : "Создать"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО РЕДАКТИРОВАНИЯ
// ============================================

const EditRecordModal: React.FC<{
  isOpen: boolean;
  record: BeryllDefectRecord;
  servers: any[];
  users: any[];
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, record, servers, users, onClose, onSuccess }) => {
  const [form, setForm] = useState({ ...record });
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setForm({ ...record });
  }, [record]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setSaving(true);
      await updateDefectRecord(record.id, form);
      toast.success("Запись обновлена");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Редактировать запись">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Описание проблемы</label>
          <textarea
            value={form.problemDescription}
            onChange={(e) => setForm({ ...form, problemDescription: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Заявка Ядро</label>
            <input
              type="text"
              value={form.yadroTicketNumber || ""}
              onChange={(e) => setForm({ ...form, yadroTicketNumber: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Тип детали</label>
            <select
              value={form.repairPartType || ""}
              onChange={(e) => setForm({ ...form, repairPartType: e.target.value as RepairPartType })}
              className="w-full px-3 py-2 border rounded-lg"
            >
              <option value="">— Выберите —</option>
              {Object.entries(PART_TYPE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">S/N бракованной (Ядро)</label>
            <input
              type="text"
              value={form.defectPartSerialYadro || ""}
              onChange={(e) => setForm({ ...form, defectPartSerialYadro: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">S/N замены (Ядро)</label>
            <input
              type="text"
              value={form.replacementPartSerialYadro || ""}
              onChange={(e) => setForm({ ...form, replacementPartSerialYadro: e.target.value })}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Детали ремонта</label>
          <textarea
            value={form.repairDetails || ""}
            onChange={(e) => setForm({ ...form, repairDetails: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            type="submit"
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Сохранить"}
          </button>
        </div>
      </form>
    </Modal>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО ИЗМЕНЕНИЯ СТАТУСА
// ============================================

const StatusModal: React.FC<{
  isOpen: boolean;
  record: BeryllDefectRecord;
  onClose: () => void;
  onSuccess: () => void;
}> = ({ isOpen, record, onClose, onSuccess }) => {
  const [newStatus, setNewStatus] = useState<DefectRecordStatus>(record.status);
  const [comment, setComment] = useState("");
  const [substituteSerial, setSubstituteSerial] = useState("");
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    setNewStatus(record.status);
    setComment("");
    setSubstituteSerial("");
  }, [record]);
  
  const handleSubmit = async () => {
    try {
      setSaving(true);
      
      if (newStatus === "SENT_TO_YADRO") {
        await sendDefectToYadro(record.id, { substituteServerSerial: substituteSerial, notes: comment });
      } else if (newStatus === "RETURNED") {
        await returnDefectFromYadro(record.id, { notes: comment });
      } else if (newStatus === "RESOLVED") {
        await resolveDefectRecord(record.id, comment);
      } else if (newStatus === "REPEATED") {
        await markDefectAsRepeated(record.id, comment);
      } else {
        await changeDefectRecordStatus(record.id, newStatus, comment);
      }
      
      toast.success("Статус изменён");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setSaving(false);
    }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Изменить статус">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">Новый статус</label>
          <select
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value as DefectRecordStatus)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            {Object.entries(STATUS_CONFIG).map(([value, config]) => (
              <option key={value} value={value}>{config.label}</option>
            ))}
          </select>
        </div>
        
        {newStatus === "SENT_TO_YADRO" && (
          <div>
            <label className="block text-sm font-medium mb-1">S/N подменного сервера</label>
            <input
              type="text"
              value={substituteSerial}
              onChange={(e) => setSubstituteSerial(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg"
            />
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium mb-1">
            {newStatus === "RESOLVED" ? "Резолюция" : newStatus === "REPEATED" ? "Причина повторного брака" : "Комментарий"}
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border rounded-lg"
          />
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg hover:bg-gray-50">
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Применить"}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default DefectRecordsTab;
