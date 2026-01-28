/**
 * ================================================================================
 * PassportsExportModal.tsx
 * ================================================================================
 * 
 * Модальное окно для экспорта и объединения паспортов серверов
 * 
 * Функционал:
 * - Выбор фильтров (партия, статус, даты)
 * - Предпросмотр данных с индикатором полноты
 * - Статистика по компонентам
 * - Экспорт в Excel
 * 
 * ================================================================================
 */

import React, { useState, useEffect, useCallback } from "react";
import { Dialog, Transition, Listbox } from "@headlessui/react";
import { 
  Download, 
  FileSpreadsheet, 
  X, 
  ChevronDown, 
  Check,
  Loader2,
  AlertTriangle,
  HardDrive,
  MemoryStick,
  Cpu,
  Zap,
  Server,
  Network,
  Calendar,
  Search,
  Filter,
  Eye,
  BarChart3,
  CheckCircle,
  XCircle,
  Package,
  RefreshCw
} from "lucide-react";
import clsx from "clsx";
import { toast } from "react-hot-toast";
import passportsExportApi, {
  ExportOptions,
  ExportStats,
  ServerPreview,
  PreviewResponse,
  StatsResponse
} from "../../api/passportsExportApi";

// ============================================================================
// Типы
// ============================================================================

interface Props {
  isOpen: boolean;
  onClose: () => void;
  batches: Array<{ id: number; name: string }>;
  initialBatchId?: number | null;
  selectedServerIds?: number[];
}

interface FilterState {
  batchId: number | string | null;
  status: string;
  dateFrom: string;
  dateTo: string;
  search: string;
  includeArchived: boolean;
}

// ============================================================================
// Константы
// ============================================================================

const SERVER_STATUSES = [
  { value: "", label: "Все статусы" },
  { value: "NEW", label: "Новый" },
  { value: "IN_PROGRESS", label: "В работе" },
  { value: "TESTING", label: "Тестирование" },
  { value: "READY", label: "Готов" },
  { value: "SHIPPED", label: "Отгружен" },
  { value: "RETURNED", label: "Возврат" }
];

const COMPONENT_ICONS: Record<string, React.FC<{ className?: string; size?: number }>> = {
  HDD: HardDrive,
  SSD: HardDrive,
  NVME: HardDrive,
  RAM: MemoryStick,
  CPU: Cpu,
  PSU: Zap,
  MOTHERBOARD: Server,
  NIC: Network,
  BMC: Server,
  RAID: HardDrive
};

// ============================================================================
// Компонент
// ============================================================================

export const PassportsExportModal: React.FC<Props> = ({
  isOpen,
  onClose,
  batches,
  initialBatchId = null,
  selectedServerIds = []
}) => {
  // Состояние фильтров
  const [filters, setFilters] = useState<FilterState>({
    batchId: initialBatchId,
    status: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    includeArchived: false
  });
  
  // Состояние данных
  const [stats, setStats] = useState<ExportStats | null>(null);
  const [preview, setPreview] = useState<ServerPreview[]>([]);
  const [totalServers, setTotalServers] = useState(0);
  
  // Состояние загрузки
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [exporting, setExporting] = useState(false);
  
  // Активная вкладка
  const [activeTab, setActiveTab] = useState<"preview" | "stats">("preview");

  // ============================================================================
  // Загрузка данных
  // ============================================================================

  const loadStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const response = await passportsExportApi.getExportStats(filters);
      setStats(response.stats);
    } catch (error) {
      console.error("Ошибка загрузки статистики:", error);
      toast.error("Не удалось загрузить статистику");
    } finally {
      setLoadingStats(false);
    }
  }, [filters]);

  const loadPreview = useCallback(async () => {
    setLoadingPreview(true);
    try {
      const response = await passportsExportApi.getExportPreview(filters, 20);
      setPreview(response.preview);
      setTotalServers(response.total);
    } catch (error) {
      console.error("Ошибка загрузки предпросмотра:", error);
      toast.error("Не удалось загрузить предпросмотр");
    } finally {
      setLoadingPreview(false);
    }
  }, [filters]);

  // Загрузка при изменении фильтров
  useEffect(() => {
    if (isOpen) {
      loadPreview();
      loadStats();
    }
  }, [isOpen, filters, loadPreview, loadStats]);

  // ============================================================================
  // Экспорт
  // ============================================================================

  const handleExport = async () => {
    setExporting(true);
    try {
      await passportsExportApi.exportAndDownload(filters, {
        batchId: filters.batchId,
        status: filters.status || undefined
      });
      toast.success("Экспорт успешно выполнен!");
      onClose();
    } catch (error) {
      console.error("Ошибка экспорта:", error);
      toast.error("Не удалось выполнить экспорт");
    } finally {
      setExporting(false);
    }
  };

  const handleExportSelected = async () => {
    if (selectedServerIds.length === 0) {
      toast.error("Не выбраны серверы для экспорта");
      return;
    }
    
    setExporting(true);
    try {
      await passportsExportApi.exportSelectedAndDownload(selectedServerIds);
      toast.success(`Экспортировано ${selectedServerIds.length} серверов`);
      onClose();
    } catch (error) {
      console.error("Ошибка экспорта:", error);
      toast.error("Не удалось выполнить экспорт");
    } finally {
      setExporting(false);
    }
  };

  // ============================================================================
  // Обновление фильтров
  // ============================================================================

  const updateFilter = <K extends keyof FilterState>(
    key: K,
    value: FilterState[K]
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const resetFilters = () => {
    setFilters({
      batchId: null,
      status: "",
      dateFrom: "",
      dateTo: "",
      search: "",
      includeArchived: false
    });
  };

  // ============================================================================
  // Рендер
  // ============================================================================

  const batchOptions = [
    { id: null, name: "Все партии" },
    { id: "null", name: "Без партии" },
    ...batches
  ];

  const selectedBatch = batchOptions.find(b => b.id === filters.batchId) || batchOptions[0];
  const selectedStatus = SERVER_STATUSES.find(s => s.value === filters.status) || SERVER_STATUSES[0];

  return (
    <Transition appear show={isOpen} as={React.Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={React.Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={React.Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-5xl transform rounded-2xl bg-white shadow-2xl transition-all">
                {/* Заголовок */}
                <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
                      <FileSpreadsheet size={20} />
                    </div>
                    <div>
                      <Dialog.Title className="text-lg font-semibold text-slate-900">
                        Экспорт паспортов серверов
                      </Dialog.Title>
                      <p className="text-sm text-slate-500">
                        Объединение данных в таблицу "Состав серверов"
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={onClose}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Фильтры */}
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Filter size={16} className="text-slate-500" />
                    <span className="text-sm font-medium text-slate-700">Фильтры</span>
                    <button
                      onClick={resetFilters}
                      className="ml-auto flex items-center gap-1 text-xs text-slate-500 hover:text-slate-700"
                    >
                      <RefreshCw size={12} />
                      Сбросить
                    </button>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {/* Партия */}
                    <Listbox 
                      value={filters.batchId} 
                      onChange={(v) => updateFilter("batchId", v)}
                    >
                      <div className="relative">
                        <Listbox.Label className="block text-xs font-medium text-slate-600 mb-1">
                          Партия
                        </Listbox.Label>
                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          <span className="block truncate">{selectedBatch.name}</span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown size={16} className="text-slate-400" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={React.Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm">
                            {batchOptions.map((batch) => (
                              <Listbox.Option
                                key={String(batch.id)}
                                value={batch.id}
                                className={({ active }) =>
                                  clsx(
                                    "relative cursor-pointer select-none py-2 pl-10 pr-4",
                                    active ? "bg-emerald-50 text-emerald-900" : "text-slate-900"
                                  )
                                }
                              >
                                {({ selected }) => (
                                  <>
                                    <span className={clsx("block truncate", selected && "font-medium")}>
                                      {batch.name}
                                    </span>
                                    {selected && (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                                        <Check size={16} />
                                      </span>
                                    )}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>

                    {/* Статус */}
                    <Listbox 
                      value={filters.status} 
                      onChange={(v) => updateFilter("status", v)}
                    >
                      <div className="relative">
                        <Listbox.Label className="block text-xs font-medium text-slate-600 mb-1">
                          Статус
                        </Listbox.Label>
                        <Listbox.Button className="relative w-full cursor-pointer rounded-lg bg-white py-2 pl-3 pr-10 text-left border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500">
                          <span className="block truncate">{selectedStatus.label}</span>
                          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
                            <ChevronDown size={16} className="text-slate-400" />
                          </span>
                        </Listbox.Button>
                        <Transition
                          as={React.Fragment}
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100"
                          leaveTo="opacity-0"
                        >
                          <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-lg bg-white py-1 shadow-lg ring-1 ring-black/5 focus:outline-none text-sm">
                            {SERVER_STATUSES.map((status) => (
                              <Listbox.Option
                                key={status.value}
                                value={status.value}
                                className={({ active }) =>
                                  clsx(
                                    "relative cursor-pointer select-none py-2 pl-10 pr-4",
                                    active ? "bg-emerald-50 text-emerald-900" : "text-slate-900"
                                  )
                                }
                              >
                                {({ selected }) => (
                                  <>
                                    <span className={clsx("block truncate", selected && "font-medium")}>
                                      {status.label}
                                    </span>
                                    {selected && (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-emerald-600">
                                        <Check size={16} />
                                      </span>
                                    )}
                                  </>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    </Listbox>

                    {/* Дата от */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Дата от
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={filters.dateFrom}
                          onChange={(e) => updateFilter("dateFrom", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    {/* Дата до */}
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Дата до
                      </label>
                      <div className="relative">
                        <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="date"
                          value={filters.dateTo}
                          onChange={(e) => updateFilter("dateTo", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Поиск и чекбокс */}
                  <div className="mt-3 flex items-center gap-4">
                    <div className="flex-1 relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Поиск по серийному номеру..."
                        value={filters.search}
                        onChange={(e) => updateFilter("search", e.target.value)}
                        className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={filters.includeArchived}
                        onChange={(e) => updateFilter("includeArchived", e.target.checked)}
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                      />
                      <span className="text-sm text-slate-600">Включая архивные</span>
                    </label>
                  </div>
                </div>

                {/* Вкладки */}
                <div className="flex border-b border-slate-200">
                  <button
                    onClick={() => setActiveTab("preview")}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "preview"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <Eye size={16} />
                    Предпросмотр
                    {totalServers > 0 && (
                      <span className="ml-1 rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                        {totalServers}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("stats")}
                    className={clsx(
                      "flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors",
                      activeTab === "stats"
                        ? "border-emerald-500 text-emerald-600"
                        : "border-transparent text-slate-500 hover:text-slate-700"
                    )}
                  >
                    <BarChart3 size={16} />
                    Статистика
                  </button>
                </div>

                {/* Контент */}
                <div className="max-h-96 overflow-y-auto p-6">
                  {activeTab === "preview" ? (
                    <PreviewTab 
                      preview={preview} 
                      loading={loadingPreview}
                      total={totalServers}
                    />
                  ) : (
                    <StatsTab 
                      stats={stats} 
                      loading={loadingStats} 
                    />
                  )}
                </div>

                {/* Футер с кнопками */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4">
                  <div className="text-sm text-slate-500">
                    {totalServers > 0 ? (
                      <>
                        Найдено <span className="font-medium text-slate-700">{totalServers}</span> серверов
                        {stats && (
                          <>, <span className="font-medium text-slate-700">{stats.totalComponents}</span> компонентов</>
                        )}
                      </>
                    ) : (
                      "Нет данных для экспорта"
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <button
                      onClick={onClose}
                      className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Отмена
                    </button>
                    
                    {selectedServerIds.length > 0 && (
                      <button
                        onClick={handleExportSelected}
                        disabled={exporting}
                        className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                      >
                        {exporting ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Download size={16} />
                        )}
                        Экспорт выбранных ({selectedServerIds.length})
                      </button>
                    )}
                    
                    <button
                      onClick={handleExport}
                      disabled={exporting || totalServers === 0}
                      className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                    >
                      {exporting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <FileSpreadsheet size={16} />
                      )}
                      Экспорт в Excel
                    </button>
                  </div>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

// ============================================================================
// Вкладка предпросмотра
// ============================================================================

const PreviewTab: React.FC<{
  preview: ServerPreview[];
  loading: boolean;
  total: number;
}> = ({ preview, loading, total }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className="ml-2 text-slate-500">Загрузка...</span>
      </div>
    );
  }

  if (preview.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <Package size={48} className="text-slate-300 mb-3" />
        <p>Нет данных для отображения</p>
        <p className="text-sm">Измените параметры фильтрации</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {preview.length < total && (
        <p className="text-xs text-slate-500 mb-3">
          Показаны первые {preview.length} из {total} серверов
        </p>
      )}
      
      {preview.map((server) => (
        <div
          key={server.id}
          className="flex items-center gap-4 rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-300"
        >
          {/* Серийный номер */}
          <div className="min-w-40">
            <p className="font-mono font-medium text-slate-900">{server.apkSerialNumber}</p>
            <p className="text-xs text-slate-500">
              {server.batchName || "Без партии"}
            </p>
          </div>

          {/* Статус */}
          <div className="min-w-24">
            <span className={clsx(
              "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
              server.status === "READY" && "bg-green-100 text-green-700",
              server.status === "IN_PROGRESS" && "bg-blue-100 text-blue-700",
              server.status === "NEW" && "bg-slate-100 text-slate-700",
              server.status === "TESTING" && "bg-amber-100 text-amber-700",
              server.status === "SHIPPED" && "bg-purple-100 text-purple-700"
            )}>
              {server.status}
            </span>
          </div>

          {/* Компоненты */}
          <div className="flex-1 flex items-center gap-3">
            <ComponentBadge 
              icon={HardDrive} 
              label="HDD" 
              count={server.componentsSummary.hdd} 
              expected={12} 
            />
            <ComponentBadge 
              icon={HardDrive} 
              label="SSD" 
              count={server.componentsSummary.ssd} 
              expected={4} 
            />
            <ComponentBadge 
              icon={MemoryStick} 
              label="RAM" 
              count={server.componentsSummary.ram} 
              expected={12} 
            />
            <ComponentBadge 
              icon={Zap} 
              label="PSU" 
              count={server.componentsSummary.psu} 
              expected={2} 
            />
          </div>

          {/* Полнота */}
          <div className="min-w-20 text-right">
            <div className={clsx(
              "text-lg font-semibold",
              server.completeness >= 90 && "text-green-600",
              server.completeness >= 50 && server.completeness < 90 && "text-amber-600",
              server.completeness < 50 && "text-red-600"
            )}>
              {server.completeness}%
            </div>
            <p className="text-xs text-slate-500">полнота</p>
          </div>
        </div>
      ))}
    </div>
  );
};

// ============================================================================
// Бейдж компонента
// ============================================================================

const ComponentBadge: React.FC<{
  icon: React.FC<{ className?: string; size?: number }>;
  label: string;
  count: number;
  expected: number;
}> = ({ icon: Icon, label, count, expected }) => {
  const isComplete = count >= expected;
  
  return (
    <div className={clsx(
      "flex items-center gap-1.5 rounded-full px-2 py-1 text-xs",
      isComplete ? "bg-green-50 text-green-700" : "bg-amber-50 text-amber-700"
    )}>
      <Icon size={12} />
      <span>{label}</span>
      <span className="font-medium">{count}/{expected}</span>
      {isComplete ? (
        <CheckCircle size={12} className="text-green-500" />
      ) : (
        <AlertTriangle size={12} className="text-amber-500" />
      )}
    </div>
  );
};

// ============================================================================
// Вкладка статистики
// ============================================================================

const StatsTab: React.FC<{
  stats: ExportStats | null;
  loading: boolean;
}> = ({ stats, loading }) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 size={24} className="animate-spin text-emerald-500" />
        <span className="ml-2 text-slate-500">Загрузка статистики...</span>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-slate-500">
        <BarChart3 size={48} className="text-slate-300 mb-3" />
        <p>Нет данных статистики</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Общая статистика */}
      <div className="grid grid-cols-3 gap-4">
        <StatCard 
          label="Всего серверов" 
          value={stats.totalServers} 
          icon={Server}
          color="emerald" 
        />
        <StatCard 
          label="Всего компонентов" 
          value={stats.totalComponents} 
          icon={Package}
          color="blue" 
        />
        <StatCard 
          label="С неполной комплектацией" 
          value={stats.missingComponents.length} 
          icon={AlertTriangle}
          color={stats.missingComponents.length > 0 ? "amber" : "green"} 
        />
      </div>

      {/* По типам компонентов */}
      <div>
        <h4 className="text-sm font-medium text-slate-700 mb-3">По типам компонентов</h4>
        <div className="grid grid-cols-4 gap-2">
          {Object.entries(stats.byComponentType).map(([type, count]) => {
            const Icon = COMPONENT_ICONS[type] || Server;
            return (
              <div 
                key={type}
                className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2"
              >
                <Icon size={16} className="text-slate-500" />
                <span className="text-sm text-slate-600">{type}</span>
                <span className="ml-auto font-semibold text-slate-900">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* По партиям */}
      {Object.keys(stats.byBatch).length > 1 && (
        <div>
          <h4 className="text-sm font-medium text-slate-700 mb-3">По партиям</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.byBatch).map(([batch, count]) => (
              <span 
                key={batch}
                className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-sm text-blue-700"
              >
                {batch}: <span className="ml-1 font-semibold">{count}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Серверы с неполной комплектацией */}
      {stats.missingComponents.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-amber-700 mb-3 flex items-center gap-2">
            <AlertTriangle size={16} />
            Серверы с неполной комплектацией ({stats.missingComponents.length})
          </h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {stats.missingComponents.slice(0, 10).map((item) => (
              <div 
                key={item.serverId}
                className="flex items-center gap-3 rounded-lg bg-amber-50 px-3 py-2 text-sm"
              >
                <span className="font-mono font-medium text-amber-900">
                  {item.apkSerialNumber}
                </span>
                <span className="text-amber-700">
                  Отсутствуют: {item.missing.join(", ")}
                </span>
              </div>
            ))}
            {stats.missingComponents.length > 10 && (
              <p className="text-xs text-slate-500">
                ...и ещё {stats.missingComponents.length - 10}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================================
// Карточка статистики
// ============================================================================

const StatCard: React.FC<{
  label: string;
  value: number;
  icon: React.FC<{ className?: string; size?: number }>;
  color: "emerald" | "blue" | "amber" | "green";
}> = ({ label, value, icon: Icon, color }) => {
  const colorClasses = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    green: "bg-green-50 text-green-600"
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <div className={clsx("rounded-lg p-2", colorClasses[color])}>
          <Icon size={20} />
        </div>
        <div>
          <p className="text-2xl font-bold text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
};

export default PassportsExportModal;
