/**
 * ServerComponents.tsx
 * 
 * Компонент для отображения и выгрузки комплектующих сервера
 * 
 * Положить в: src/components/beryll/ServerComponents.tsx
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Cpu, MemoryStick, HardDrive, Network, CircuitBoard, Zap, Server,
  RefreshCw, Download, ChevronDown, ChevronUp, Copy, AlertCircle,
  CheckCircle, AlertTriangle, HelpCircle, Trash2, Settings
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import {
  checkBMC, fetchComponents, getServerComponents, deleteServerComponents
} from '../../api/beryll/componentsAPI';

import type {
  ComponentsResponse, ServerComponent, ComponentType, ComponentStatus
} from '../../types/beryll/components';

import {
  COMPONENT_TYPE_LABELS, COMPONENT_STATUS_LABELS, COMPONENT_STATUS_COLORS
} from '../../types/beryll/components';

interface Props {
  serverId: number;
  serverIp?: string;
}

// Иконки по типам
const TypeIcon: Record<ComponentType, React.FC<{ className?: string }>> = {
  CPU: Cpu,
  RAM: MemoryStick,
  SSD: HardDrive,
  HDD: HardDrive,
  NVME: HardDrive,
  NIC: Network,
  MOTHERBOARD: CircuitBoard,
  PSU: Zap,
  GPU: CircuitBoard,
  RAID: HardDrive,
  BMC: Server,
  OTHER: Settings
};

// Статус иконки
const StatusIcon: React.FC<{ status: ComponentStatus; className?: string }> = ({ status, className }) => {
  switch (status) {
    case 'OK': return <CheckCircle className={clsx("text-emerald-500", className)} />;
    case 'WARNING': return <AlertTriangle className={clsx("text-amber-500", className)} />;
    case 'CRITICAL': return <AlertCircle className={clsx("text-red-500", className)} />;
    default: return <HelpCircle className={clsx("text-slate-400", className)} />;
  }
};

export const ServerComponents: React.FC<Props> = ({ serverId, serverIp }) => {
  const [data, setData] = useState<ComponentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetching, setFetching] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bmcStatus, setBmcStatus] = useState<{ success: boolean; version?: string } | null>(null);
  
  // Раскрытые секции
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['CPU', 'RAM', 'storage']));
  // Раскрытые детали компонентов
  const [expandedDetails, setExpandedDetails] = useState<Set<number>>(new Set());

  const loadComponents = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getServerComponents(serverId);
      setData(result);
    } catch (e: any) {
      if (e.response?.status !== 404) {
        setError(e.response?.data?.message || 'Ошибка загрузки');
      }
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // Проверка BMC
  const handleCheckBMC = async () => {
    try {
      setChecking(true);
      const result = await checkBMC(serverId);
      setBmcStatus({ success: result.success, version: result.redfishVersion });
      if (result.success) {
        toast.success(`BMC доступен (Redfish ${result.redfishVersion})`);
      } else {
        toast.error(`BMC недоступен: ${result.error}`);
      }
    } catch (e: any) {
      toast.error('Ошибка проверки BMC');
      setBmcStatus({ success: false });
    } finally {
      setChecking(false);
    }
  };

  // Выгрузка комплектующих
  const handleFetch = async () => {
    try {
      setFetching(true);
      setError(null);
      const result = await fetchComponents(serverId);
      toast.success(result.message);
      await loadComponents();
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Ошибка выгрузки');
      setError(e.response?.data?.message);
    } finally {
      setFetching(false);
    }
  };

  // Удаление комплектующих
  const handleDelete = async () => {
    if (!confirm('Удалить все комплектующие? Их можно будет выгрузить заново.')) return;
    try {
      await deleteServerComponents(serverId);
      toast.success('Комплектующие удалены');
      setData(null);
    } catch (e: any) {
      toast.error('Ошибка удаления');
    }
  };

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(section)) newExpanded.delete(section);
    else newExpanded.add(section);
    setExpanded(newExpanded);
  };

  const toggleDetails = (id: number) => {
    const newExpanded = new Set(expandedDetails);
    if (newExpanded.has(id)) newExpanded.delete(id);
    else newExpanded.add(id);
    setExpandedDetails(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Скопировано');
  };

  const hasComponents = data && data.components.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Заголовок */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
            <CircuitBoard className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800">Комплектующие</h3>
            {data?.server.lastComponentsFetchAt && (
              <p className="text-xs text-slate-400">
                Обновлено: {new Date(data.server.lastComponentsFetchAt).toLocaleString()}
              </p>
            )}
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Проверка BMC */}
          <button
            onClick={handleCheckBMC}
            disabled={checking}
            className={clsx(
              "flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg transition-all",
              bmcStatus?.success 
                ? "bg-emerald-100 text-emerald-700" 
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            {checking ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Server size={14} />
            )}
            {bmcStatus?.success ? 'BMC OK' : 'Проверить BMC'}
          </button>
          
          {/* Выгрузить */}
          <button
            onClick={handleFetch}
            disabled={fetching}
            className={clsx(
              "flex items-center gap-1.5 px-4 py-1.5 text-sm font-medium rounded-lg transition-all",
              fetching 
                ? "bg-slate-200 text-slate-400 cursor-not-allowed" 
                : "bg-indigo-600 text-white hover:bg-indigo-700"
            )}
          >
            {fetching ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Download size={14} />
            )}
            {hasComponents ? 'Обновить' : 'Выгрузить с BMC'}
          </button>
          
          {/* Удалить */}
          {hasComponents && (
            <button
              onClick={handleDelete}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
              title="Удалить комплектующие"
            >
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Ошибка */}
      {error && (
        <div className="mx-5 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Загрузка */}
      {loading && (
        <div className="p-8 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
        </div>
      )}

      {/* Пустое состояние */}
      {!loading && !hasComponents && (
        <div className="p-8 text-center">
          <CircuitBoard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 mb-2">Комплектующие не загружены</p>
          <p className="text-sm text-slate-400">
            Нажмите "Выгрузить с BMC" чтобы получить информацию о железе
          </p>
        </div>
      )}

      {/* Данные */}
      {!loading && hasComponents && data && (
        <div>
          {/* Сводка - используем уже отформатированные значения с бэкенда */}
          <div className="px-5 py-4 bg-slate-50 border-b border-slate-200 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-slate-500">Процессор</p>
              <p className="font-semibold text-slate-800">
                {data.summary.cpuCores} ядер / {data.summary.cpuThreads} потоков
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Память</p>
              <p className="font-semibold text-slate-800">{data.summary.totalRAM}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Накопители</p>
              <p className="font-semibold text-slate-800">{data.summary.totalStorage}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Всего компонентов</p>
              <p className="font-semibold text-slate-800">{data.summary.totalComponents}</p>
            </div>
          </div>

          {/* Секции */}
          <div className="divide-y divide-slate-100">
            {/* CPU */}
            {data.grouped.CPU.length > 0 && (
              <ComponentSection
                title="Процессоры"
                icon={Cpu}
                components={data.grouped.CPU}
                expanded={expanded.has('CPU')}
                onToggle={() => toggleSection('CPU')}
                expandedDetails={expandedDetails}
                onToggleDetails={toggleDetails}
                onCopy={copyToClipboard}
                renderDetails={(c) => (
                  <>
                    <Detail label="Ядра" value={c.metadata?.cores?.toString()} />
                    <Detail label="Потоки" value={c.metadata?.threads?.toString()} />
                    <Detail label="Частота" value={c.speedFormatted} />
                    <Detail label="Архитектура" value={c.metadata?.architecture} />
                  </>
                )}
              />
            )}

            {/* RAM */}
            {data.grouped.RAM.length > 0 && (
              <ComponentSection
                title="Оперативная память"
                icon={MemoryStick}
                components={data.grouped.RAM}
                expanded={expanded.has('RAM')}
                onToggle={() => toggleSection('RAM')}
                expandedDetails={expandedDetails}
                onToggleDetails={toggleDetails}
                onCopy={copyToClipboard}
                renderDetails={(c) => (
                  <>
                    <Detail label="Объём" value={c.capacityFormatted} />
                    <Detail label="Тип" value={c.metadata?.memoryType} />
                    <Detail label="Частота" value={c.speed ? `${c.speed} MT/s` : undefined} />
                    <Detail label="Ранг" value={c.metadata?.rank?.toString()} />
                  </>
                )}
              />
            )}

            {/* Storage */}
            {data.grouped.storage.length > 0 && (
              <ComponentSection
                title="Накопители"
                icon={HardDrive}
                components={data.grouped.storage}
                expanded={expanded.has('storage')}
                onToggle={() => toggleSection('storage')}
                expandedDetails={expandedDetails}
                onToggleDetails={toggleDetails}
                onCopy={copyToClipboard}
                renderDetails={(c) => (
                  <>
                    <Detail label="Объём" value={c.capacityFormatted} />
                    <Detail label="Тип" value={c.metadata?.mediaType} />
                    <Detail label="Интерфейс" value={c.metadata?.interface} />
                    <Detail label="Прошивка" value={c.firmwareVersion} />
                  </>
                )}
              />
            )}

            {/* NIC */}
            {data.grouped.NIC.length > 0 && (
              <ComponentSection
                title="Сетевые адаптеры"
                icon={Network}
                components={data.grouped.NIC}
                expanded={expanded.has('NIC')}
                onToggle={() => toggleSection('NIC')}
                expandedDetails={expandedDetails}
                onToggleDetails={toggleDetails}
                onCopy={copyToClipboard}
                renderDetails={(c) => (
                  <>
                    <Detail label="MAC" value={c.metadata?.macAddress} copyable onCopy={copyToClipboard} />
                    <Detail label="Скорость" value={c.metadata?.linkSpeed} />
                  </>
                )}
              />
            )}

            {/* Other */}
            {data.grouped.other.length > 0 && (
              <ComponentSection
                title="Другое"
                icon={Settings}
                components={data.grouped.other}
                expanded={expanded.has('other')}
                onToggle={() => toggleSection('other')}
                expandedDetails={expandedDetails}
                onToggleDetails={toggleDetails}
                onCopy={copyToClipboard}
                renderDetails={(c) => (
                  <>
                    <Detail label="Прошивка" value={c.firmwareVersion} />
                  </>
                )}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Секция компонентов
interface SectionProps {
  title: string;
  icon: React.FC<{ className?: string }>;
  components: ServerComponent[];
  expanded: boolean;
  onToggle: () => void;
  expandedDetails: Set<number>;
  onToggleDetails: (id: number) => void;
  onCopy: (text: string) => void;
  renderDetails: (component: ServerComponent) => React.ReactNode;
}

const ComponentSection: React.FC<SectionProps> = ({
  title, icon: Icon, components, expanded, onToggle,
  expandedDetails, onToggleDetails, onCopy, renderDetails
}) => (
  <div>
    <button
      onClick={onToggle}
      className="w-full px-5 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <Icon className="w-5 h-5 text-slate-400" />
        <span className="font-medium text-slate-700">{title}</span>
        <span className="text-sm text-slate-400">({components.length})</span>
      </div>
      {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
    </button>
    
    {expanded && (
      <div className="px-5 pb-4 space-y-2">
        {components.map((c) => (
          <div key={c.id} className="border border-slate-200 rounded-lg overflow-hidden">
            {/* Основная строка */}
            <div
              className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50"
              onClick={() => onToggleDetails(c.id)}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <StatusIcon status={c.status} className="w-4 h-4 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="font-medium text-slate-800 truncate">
                    {c.name || `${c.manufacturer || ''} ${c.model || COMPONENT_TYPE_LABELS[c.componentType]}`}
                  </p>
                  <p className="text-xs text-slate-500 truncate">
                    {c.slot && <span className="mr-2">Слот: {c.slot}</span>}
                    {c.serialNumber && <span>S/N: {c.serialNumber}</span>}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {/* Используем capacityFormatted вместо capacity */}
                {c.capacityFormatted && c.capacityFormatted !== '0 B' && (
                  <span className="text-sm font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {c.capacityFormatted}
                  </span>
                )}
                {expandedDetails.has(c.id) ? (
                  <ChevronUp size={16} className="text-slate-400" />
                ) : (
                  <ChevronDown size={16} className="text-slate-400" />
                )}
              </div>
            </div>
            
            {/* Детали */}
            {expandedDetails.has(c.id) && (
              <div className="px-4 py-3 bg-slate-50 border-t border-slate-200">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Detail label="Производитель" value={c.manufacturer} />
                  <Detail label="Модель" value={c.model} />
                  <Detail label="S/N" value={c.serialNumber} copyable onCopy={onCopy} />
                  <Detail label="P/N" value={c.partNumber} />
                  {renderDetails(c)}
                  <Detail label="Статус" value={COMPONENT_STATUS_LABELS[c.status]} />
                  <Detail label="Health" value={c.metadata?.health} />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

// Детальная строка
interface DetailProps {
  label: string;
  value?: string;
  copyable?: boolean;
  onCopy?: (text: string) => void;
}

const Detail: React.FC<DetailProps> = ({ label, value, copyable, onCopy }) => {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <div className="flex items-center gap-1">
        <p className="text-slate-700 font-medium truncate">{value}</p>
        {copyable && onCopy && (
          <button
            onClick={(e) => { e.stopPropagation(); onCopy(value); }}
            className="p-0.5 text-slate-400 hover:text-slate-600"
          >
            <Copy size={12} />
          </button>
        )}
      </div>
    </div>
  );
};

export default ServerComponents;