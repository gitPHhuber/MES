/**
 * ServerComponentsManager.tsx
 * 
 * Расширенный компонент для управления комплектующими сервера:
 * - Просмотр комплектующих с двумя серийными номерами (Yadro и производителя)
 * - Добавление новых комплектующих
 * - Замена комплектующих
 * - Сканирование/ввод серийного номера Yadro
 * - Редактирование серийных номеров
 * - Синхронизация с BMC с выбором режима (compare/force/merge)
 * 
 * Положить в: src/components/beryll/ServerComponentsManager.tsx
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Cpu, MemoryStick, HardDrive, Network, CircuitBoard, Zap, Server,
  RefreshCw, Download, ChevronDown, ChevronUp, Copy, AlertCircle,
  CheckCircle, AlertTriangle, HelpCircle, Trash2, Settings, Plus,
  Edit2, X, Save, ScanLine, ArrowRightLeft, Search, Package, GitMerge
} from 'lucide-react';
import clsx from 'clsx';
import toast from 'react-hot-toast';

import { $authHost } from '../../api/index';

// ============================================
// API ФУНКЦИИ
// ============================================

const BASE_URL = "/api/beryll";

async function checkBMC(serverId: number) {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/bmc/check`);
  return data;
}

// Обновленная функция с поддержкой режимов синхронизации
async function fetchComponentsFromBMC(
  serverId: number,
  mode: 'compare' | 'force' | 'merge' = 'compare',
  preserveManual: boolean = true
) {
  const { data } = await $authHost.post(
    `${BASE_URL}/servers/${serverId}/components/fetch`,
    { mode, preserveManual }
  );
  return data;
}

async function getServerComponents(serverId: number) {
  const { data } = await $authHost.get(`${BASE_URL}/servers/${serverId}/components`);
  return data;
}

async function addServerComponent(serverId: number, componentData: any) {
  const { data } = await $authHost.post(`${BASE_URL}/servers/${serverId}/components`, componentData);
  return data;
}

async function updateServerComponent(componentId: number, updates: any) {
  const { data } = await $authHost.put(`${BASE_URL}/components/${componentId}`, updates);
  return data;
}

async function updateComponentSerials(componentId: number, serials: { serialNumber?: string; serialNumberYadro?: string }) {
  const { data } = await $authHost.patch(`${BASE_URL}/components/${componentId}/serials`, serials);
  return data;
}

async function replaceServerComponent(componentId: number, replacementData: any) {
  const { data } = await $authHost.post(`${BASE_URL}/components/${componentId}/replace`, replacementData);
  return data;
}

async function deleteComponent(componentId: number, reason?: string) {
  const { data } = await $authHost.delete(`${BASE_URL}/components/${componentId}`, { data: { reason } });
  return data;
}

// ============================================
// ТИПЫ И КОНСТАНТЫ
// ============================================

type ComponentType = 'CPU' | 'RAM' | 'HDD' | 'SSD' | 'NVME' | 'NIC' | 'MOTHERBOARD' | 'PSU' | 'GPU' | 'RAID' | 'BMC' | 'OTHER';
type ComponentStatus = 'OK' | 'WARNING' | 'CRITICAL' | 'UNKNOWN' | 'REPLACED';

interface ServerComponent {
  id: number;
  serverId: number;
  componentType: ComponentType;
  name: string;
  manufacturer?: string;
  model?: string;
  serialNumber?: string;
  serialNumberYadro?: string;
  partNumber?: string;
  slot?: string;
  capacity?: number;
  speed?: string;
  status: ComponentStatus;
  healthPercent?: number;
  firmwareVersion?: string;
  metadata?: any;
}

interface ComponentsResponse {
  server: any;
  summary: {
    totalRAMBytes: number;
    totalStorageBytes: number;
    totalRAM: string;
    totalStorage: string;
    cpuCores: number;
    cpuThreads: number;
    totalComponents: number;
  };
  grouped: any;
  components: ServerComponent[];
}

// Тип для результата сравнения с BMC
interface BMCComparisonResult {
  success: boolean;
  mode: 'compare';
  hasDiscrepancies: boolean;
  summary: {
    total: { inDb: number; inBmc: number };
    matched: number;
    missingInBmc: number;
    newInBmc: number;
    mismatches: number;
  };
  details: {
    matched: any[];
    missingInBmc: any[];
    newInBmc: any[];
    mismatches: any[];
  };
  message?: string;
}

interface Props {
  serverId: number;
  serverIp?: string;
  apkSerialNumber?: string;
  readOnly?: boolean;
}

const COMPONENT_TYPES: { value: ComponentType; label: string }[] = [
  { value: 'CPU', label: 'Процессор' },
  { value: 'RAM', label: 'Оперативная память' },
  { value: 'HDD', label: 'Жёсткий диск' },
  { value: 'SSD', label: 'Твердотельный накопитель' },
  { value: 'NVME', label: 'NVMe накопитель' },
  { value: 'NIC', label: 'Сетевая карта' },
  { value: 'MOTHERBOARD', label: 'Материнская плата' },
  { value: 'PSU', label: 'Блок питания' },
  { value: 'GPU', label: 'Видеокарта' },
  { value: 'RAID', label: 'RAID-контроллер' },
  { value: 'BMC', label: 'BMC' },
  { value: 'OTHER', label: 'Прочее' }
];

const COMPONENT_STATUS_LABELS: Record<ComponentStatus, string> = {
  OK: 'Исправен',
  WARNING: 'Предупреждение',
  CRITICAL: 'Критическое',
  UNKNOWN: 'Неизвестно',
  REPLACED: 'Заменён'
};

const COMPONENT_STATUS_COLORS: Record<ComponentStatus, string> = {
  OK: 'bg-emerald-100 text-emerald-700 border-emerald-300',
  WARNING: 'bg-amber-100 text-amber-700 border-amber-300',
  CRITICAL: 'bg-red-100 text-red-700 border-red-300',
  UNKNOWN: 'bg-slate-100 text-slate-500 border-slate-300',
  REPLACED: 'bg-violet-100 text-violet-700 border-violet-300'
};

// Иконки по типам
const TypeIcon: Record<ComponentType, React.FC<{ className?: string; size?: number }>> = {
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
    case 'OK': return <CheckCircle className={clsx('text-emerald-500', className)} size={18} />;
    case 'WARNING': return <AlertTriangle className={clsx('text-amber-500', className)} size={18} />;
    case 'CRITICAL': return <AlertCircle className={clsx('text-red-500', className)} size={18} />;
    case 'REPLACED': return <ArrowRightLeft className={clsx('text-violet-500', className)} size={18} />;
    default: return <HelpCircle className={clsx('text-slate-400', className)} size={18} />;
  }
};

// Утилита форматирования байт
function formatBytes(bytes: number | string | null | undefined): string {
  if (!bytes) return '—';
  const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
  if (isNaN(b) || b === 0) return '—';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(b) / Math.log(1024));
  return `${(b / Math.pow(1024, i)).toFixed(i > 2 ? 1 : 0)} ${units[i]}`;
}

// Placeholder-ы для разных типов комплектующих
const TYPE_PLACEHOLDERS: Record<ComponentType, {
  manufacturer: string;
  model: string;
  name: string;
  slot: string;
  capacity: string;
  speed: string;
}> = {
  CPU: {
    manufacturer: 'Intel, AMD',
    model: 'Xeon Gold 6348',
    name: 'Intel Xeon Gold 6348 2.6GHz',
    slot: 'CPU_1, CPU_2',
    capacity: 'Ядра: 28',
    speed: '2.6 GHz'
  },
  RAM: {
    manufacturer: 'Samsung, Micron, SK Hynix',
    model: 'M393A8G40BB4-CWE',
    name: 'Samsung 64GB DDR4',
    slot: 'DIMM_A1, DIMM_B1',
    capacity: '64',
    speed: '3200 MT/s'
  },
  SSD: {
    manufacturer: 'Samsung, Intel, Micron',
    model: 'MZQL21T9HCJR',
    name: 'Samsung PM9A3 1.92TB',
    slot: 'SSD_1, SSD_2',
    capacity: '1920',
    speed: '6800 MB/s'
  },
  HDD: {
    manufacturer: 'Seagate, WD, Toshiba',
    model: 'ST18000NM000J',
    name: 'Seagate Exos X18 18TB',
    slot: 'HDD_1, HDD_2',
    capacity: '18000',
    speed: '7200 RPM'
  },
  NVME: {
    manufacturer: 'Samsung, Intel, Micron',
    model: 'MZQL21T9HCJR',
    name: 'Samsung PM9A3 NVMe 1.92TB',
    slot: 'NVME_1, M.2_1',
    capacity: '1920',
    speed: '6800 MB/s'
  },
  NIC: {
    manufacturer: 'Intel, Mellanox, Broadcom',
    model: 'E810-XXVDA2',
    name: 'Intel E810 25GbE',
    slot: 'PCI_1, OCP_1',
    capacity: '',
    speed: '25 Gbps'
  },
  MOTHERBOARD: {
    manufacturer: 'Supermicro, ASUS, Dell',
    model: 'X12SPL-F',
    name: 'Supermicro X12SPL-F',
    slot: '',
    capacity: '',
    speed: ''
  },
  PSU: {
    manufacturer: 'Delta, Lite-On, FSP',
    model: 'DPS-1200FB',
    name: 'Delta 1200W Platinum',
    slot: 'PSU_1, PSU_2',
    capacity: '1200',
    speed: ''
  },
  GPU: {
    manufacturer: 'NVIDIA, AMD',
    model: 'A100-SXM4-80GB',
    name: 'NVIDIA A100 80GB',
    slot: 'GPU_1, PCI_1',
    capacity: '80',
    speed: ''
  },
  RAID: {
    manufacturer: 'Broadcom, LSI, Dell',
    model: '9460-16i',
    name: 'Broadcom MegaRAID 9460-16i',
    slot: 'PCI_1, RAID_1',
    capacity: '',
    speed: '12 Gbps'
  },
  BMC: {
    manufacturer: 'ASPEED, Nuvoton',
    model: 'AST2600',
    name: 'ASPEED AST2600 BMC',
    slot: '',
    capacity: '',
    speed: ''
  },
  OTHER: {
    manufacturer: 'Производитель',
    model: 'Модель',
    name: 'Название компонента',
    slot: 'Слот',
    capacity: '',
    speed: ''
  }
};

// ============================================
// МОДАЛЬНОЕ ОКНО ДОБАВЛЕНИЯ/РЕДАКТИРОВАНИЯ
// ============================================

interface ComponentFormData {
  componentType: ComponentType;
  name: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  serialNumberYadro: string;
  partNumber: string;
  slot: string;
  status: ComponentStatus;
  capacity?: string;
  speed?: string;
}

interface ComponentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: ComponentFormData) => Promise<void>;
  initialData?: Partial<ComponentFormData>;
  title: string;
  isReplacement?: boolean;
}

const ComponentModal: React.FC<ComponentModalProps> = ({
  isOpen, onClose, onSave, initialData, title, isReplacement
}) => {
  const [formData, setFormData] = useState<ComponentFormData>({
    componentType: 'RAM',
    name: '',
    manufacturer: '',
    model: '',
    serialNumber: '',
    serialNumberYadro: '',
    partNumber: '',
    slot: '',
    status: 'OK',
    capacity: '',
    speed: ''
  });
  const [saving, setSaving] = useState(false);
  const yadroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    } else {
      setFormData({
        componentType: 'RAM',
        name: '',
        manufacturer: '',
        model: '',
        serialNumber: '',
        serialNumberYadro: '',
        partNumber: '',
        slot: '',
        status: 'OK',
        capacity: '',
        speed: ''
      });
    }
  }, [initialData, isOpen]);

  useEffect(() => {
    if (isOpen && yadroInputRef.current) {
      setTimeout(() => yadroInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleChange = (field: keyof ComponentFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.componentType) {
      toast.error('Выберите тип комплектующего');
      return;
    }
    
    if (!formData.serialNumberYadro && !formData.serialNumber) {
      toast.error('Укажите хотя бы один серийный номер');
      return;
    }
    
    setSaving(true);
    try {
      await onSave(formData);
      onClose();
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isReplacement ? (
                <ArrowRightLeft className="text-white/90" size={22} />
              ) : (
                <Plus className="text-white/90" size={22} />
              )}
              <h2 className="text-lg font-semibold text-white">{title}</h2>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="text-white" size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Yadro Serial - приоритетное поле для сканирования */}
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
              <ScanLine size={18} />
              Серийный номер Yadro (наклейка)
            </label>
            <input
              ref={yadroInputRef}
              type="text"
              value={formData.serialNumberYadro}
              onChange={(e) => handleChange('serialNumberYadro', e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-lg font-mono"
              placeholder="Отсканируйте или введите S/N Yadro"
              autoComplete="off"
            />
            <p className="mt-1.5 text-xs text-amber-600">
              Сканируйте штрих-код с наклейки Yadro на комплектующем
            </p>
          </div>

          {/* Row: Type + Status */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Тип комплектующего *</label>
              <select
                value={formData.componentType}
                onChange={(e) => handleChange('componentType', e.target.value as ComponentType)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                disabled={isReplacement}
              >
                {COMPONENT_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Статус</label>
              <select
                value={formData.status}
                onChange={(e) => handleChange('status', e.target.value as ComponentStatus)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="OK">Исправен</option>
                <option value="WARNING">Предупреждение</option>
                <option value="CRITICAL">Критическое</option>
                <option value="UNKNOWN">Неизвестно</option>
              </select>
            </div>
          </div>

          {/* Row: Manufacturer S/N + Slot */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Серийный номер производителя</label>
              <input
                type="text"
                value={formData.serialNumber}
                onChange={(e) => handleChange('serialNumber', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                placeholder="Заводской S/N"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Слот / Позиция</label>
              <input
                type="text"
                value={formData.slot}
                onChange={(e) => handleChange('slot', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.slot || 'Слот'}
              />
            </div>
          </div>

          {/* Row: Manufacturer + Model */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Производитель</label>
              <input
                type="text"
                value={formData.manufacturer}
                onChange={(e) => handleChange('manufacturer', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.manufacturer || 'Производитель'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Модель</label>
              <input
                type="text"
                value={formData.model}
                onChange={(e) => handleChange('model', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.model || 'Модель'}
              />
            </div>
          </div>

          {/* Row: Part Number + Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Part Number (P/N)</label>
              <input
                type="text"
                value={formData.partNumber}
                onChange={(e) => handleChange('partNumber', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
                placeholder="Артикул"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Название</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.name || 'Название'}
              />
            </div>
          </div>

          {/* Row: Capacity + Speed */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Объём (GB)</label>
              <input
                type="text"
                value={formData.capacity}
                onChange={(e) => handleChange('capacity', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.capacity || 'Объём'}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Частота / Скорость</label>
              <input
                type="text"
                value={formData.speed}
                onChange={(e) => handleChange('speed', e.target.value)}
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                placeholder={TYPE_PLACEHOLDERS[formData.componentType]?.speed || 'Скорость'}
              />
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-white bg-gradient-to-r from-indigo-600 to-violet-600 rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save size={18} />
                {isReplacement ? 'Заменить' : 'Сохранить'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО БЫСТРОГО РЕДАКТИРОВАНИЯ S/N
// ============================================

interface EditSerialsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (serials: { serialNumber: string; serialNumberYadro: string }) => Promise<void>;
  component: ServerComponent;
}

const EditSerialsModal: React.FC<EditSerialsModalProps> = ({
  isOpen, onClose, onSave, component
}) => {
  const [serialNumber, setSerialNumber] = useState(component.serialNumber || '');
  const [serialNumberYadro, setSerialNumberYadro] = useState(component.serialNumberYadro || '');
  const [saving, setSaving] = useState(false);
  const yadroInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSerialNumber(component.serialNumber || '');
    setSerialNumberYadro(component.serialNumberYadro || '');
  }, [component]);

  useEffect(() => {
    if (isOpen && yadroInputRef.current) {
      setTimeout(() => yadroInputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!serialNumber && !serialNumberYadro) {
      toast.error('Укажите хотя бы один серийный номер');
      return;
    }
    
    setSaving(true);
    try {
      await onSave({ serialNumber, serialNumberYadro });
      onClose();
    } catch (err) {
      console.error('Save serials error:', err);
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-gradient-to-r from-emerald-600 to-teal-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ScanLine className="text-white/90" size={22} />
              <div>
                <h2 className="text-lg font-semibold text-white">Изменить серийные номера</h2>
                <p className="text-sm text-white/70">{component.name}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
              <X className="text-white" size={20} />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Info */}
          <div className="p-3 bg-slate-50 rounded-lg text-sm">
            <p className="text-slate-600">
              <span className="font-medium">Тип:</span> {COMPONENT_TYPES.find(t => t.value === component.componentType)?.label || component.componentType}
              {component.slot && <span className="ml-3"><span className="font-medium">Слот:</span> {component.slot}</span>}
            </p>
          </div>

          {/* Yadro S/N */}
          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
            <label className="flex items-center gap-2 text-sm font-semibold text-amber-800 mb-2">
              <ScanLine size={18} />
              S/N Yadro (наклейка)
            </label>
            <input
              ref={yadroInputRef}
              type="text"
              value={serialNumberYadro}
              onChange={(e) => setSerialNumberYadro(e.target.value)}
              className="w-full px-4 py-3 bg-white border-2 border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 text-lg font-mono"
              placeholder="Отсканируйте или введите"
              autoComplete="off"
            />
          </div>

          {/* Manufacturer S/N */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              S/N производителя (заводской)
            </label>
            <input
              type="text"
              value={serialNumber}
              onChange={(e) => setSerialNumber(e.target.value)}
              className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-mono"
              placeholder="Заводской серийный номер"
            />
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors font-medium"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-5 py-2.5 text-white bg-gradient-to-r from-emerald-600 to-teal-600 rounded-lg hover:from-emerald-700 hover:to-teal-700 transition-all font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {saving ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                Сохранение...
              </>
            ) : (
              <>
                <Save size={18} />
                Сохранить
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================
// МОДАЛЬНОЕ ОКНО ВЫБОРА РЕЖИМА СИНХРОНИЗАЦИИ
// ============================================

interface SyncModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMode: (mode: 'force' | 'merge', preserveManual: boolean) => void;
  comparisonResult: BMCComparisonResult | null;
  syncing: boolean;
}

const SyncModeModal: React.FC<SyncModeModalProps> = ({
  isOpen, onClose, onSelectMode, comparisonResult, syncing
}) => {
  if (!isOpen || !comparisonResult) return null;

  const totalDiscrepancies = 
    (comparisonResult.summary?.missingInBmc || 0) + 
    (comparisonResult.summary?.newInBmc || 0) + 
    (comparisonResult.summary?.mismatches || 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 px-6 py-4 border-b bg-amber-50">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="font-semibold text-gray-800">Обнаружены расхождения</h3>
            <p className="text-sm text-gray-500">Выберите способ синхронизации с BMC</p>
          </div>
          <button 
            onClick={onClose}
            disabled={syncing}
            className="p-2 hover:bg-amber-100 rounded-lg transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Статистика */}
        <div className="px-6 py-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-700">
                {comparisonResult.summary?.total?.inDb || 0}
              </div>
              <div className="text-xs text-gray-500">В базе</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-700">
                {comparisonResult.summary?.total?.inBmc || 0}
              </div>
              <div className="text-xs text-gray-500">В BMC</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {comparisonResult.summary?.matched || 0}
              </div>
              <div className="text-xs text-gray-500">Совпадают</div>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-lg">
              <div className="text-xl font-bold text-amber-600">
                {totalDiscrepancies}
              </div>
              <div className="text-xs text-gray-500">Различий</div>
            </div>
          </div>

          {/* Детали расхождений */}
          <div className="space-y-2 text-sm mb-4 p-3 bg-slate-50 rounded-lg">
            {comparisonResult.summary?.newInBmc > 0 && (
              <div className="flex items-center gap-2 text-blue-600">
                <Plus size={14} />
                <span>Новых в BMC: <strong>{comparisonResult.summary.newInBmc}</strong></span>
              </div>
            )}
            {comparisonResult.summary?.missingInBmc > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertTriangle size={14} />
                <span>Нет в BMC: <strong>{comparisonResult.summary.missingInBmc}</strong></span>
              </div>
            )}
            {comparisonResult.summary?.mismatches > 0 && (
              <div className="flex items-center gap-2 text-orange-600">
                <ArrowRightLeft size={14} />
                <span>Различия в данных: <strong>{comparisonResult.summary.mismatches}</strong></span>
              </div>
            )}
          </div>
        </div>

        {/* Кнопки действий */}
        <div className="px-6 py-4 border-t bg-gray-50 space-y-3">
          {/* Умное слияние - рекомендуемый вариант */}
          <button
            onClick={() => onSelectMode('merge', true)}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 font-medium transition-colors shadow-lg shadow-green-200"
          >
            <GitMerge className="w-5 h-5" />
            <div className="text-left">
              <div>Умное слияние</div>
              <div className="text-xs font-normal opacity-80">Добавит новые, обновит изменённые</div>
            </div>
          </button>

          {/* Перезапись с сохранением ручных */}
          <button
            onClick={() => onSelectMode('force', true)}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
            <div className="text-left">
              <div>Перезаписать</div>
              <div className="text-xs font-normal opacity-80">Сохранить ручные записи</div>
            </div>
          </button>

          {/* Полная перезапись */}
          <button
            onClick={() => onSelectMode('force', false)}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-3 px-4 py-2 border-2 border-red-300 text-red-600 rounded-xl hover:bg-red-50 disabled:opacity-50 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
            <div className="text-left">
              <div>Полная перезапись</div>
              <div className="text-xs font-normal opacity-70">Удалить ручные записи</div>
            </div>
          </button>

          {/* Отмена */}
          <button
            onClick={onClose}
            disabled={syncing}
            className="w-full px-4 py-2 text-gray-500 hover:bg-gray-100 rounded-xl transition-colors"
          >
            Отмена
          </button>
        </div>

        {/* Индикатор загрузки */}
        {syncing && (
          <div className="absolute inset-0 bg-white/90 flex flex-col items-center justify-center rounded-2xl">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-gray-600 font-medium">Синхронизация...</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// КАРТОЧКА КОМПЛЕКТУЮЩЕГО
// ============================================

interface ComponentCardProps {
  component: ServerComponent;
  onEdit: (component: ServerComponent) => void;
  onEditSerials: (component: ServerComponent) => void;
  onReplace: (component: ServerComponent) => void;
  onDelete: (component: ServerComponent) => void;
  readOnly?: boolean;
}

const ComponentCard: React.FC<ComponentCardProps> = ({
  component, onEdit, onEditSerials, onReplace, onDelete, readOnly
}) => {
  const [expanded, setExpanded] = useState(false);
  const Icon = TypeIcon[component.componentType] || Settings;

  const copySerial = (serial: string, type: string) => {
    navigator.clipboard.writeText(serial);
    toast.success(`${type} скопирован`);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-shadow">
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-slate-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <StatusIcon status={component.status} className="flex-shrink-0" />
          <Icon className="text-slate-500 flex-shrink-0" size={20} />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-slate-900 truncate">
              {component.name || `${component.manufacturer || ''} ${component.model || ''}`}
            </div>
            <div className="text-xs text-slate-500 flex items-center gap-2 flex-wrap">
              {component.slot && (
                <span className="px-1.5 py-0.5 bg-slate-100 rounded text-slate-600">
                  {component.slot}
                </span>
              )}
              {component.serialNumberYadro && (
                <span className="text-amber-600 font-mono">Yadro: {component.serialNumberYadro}</span>
              )}
              {component.serialNumber && component.serialNumber !== component.serialNumberYadro && (
                <span className="font-mono">S/N: {component.serialNumber}</span>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {component.serialNumberYadro && (
            <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-lg flex items-center gap-1">
              <Package size={12} />
              Yadro
            </span>
          )}
          <span className={clsx(
            'px-2 py-1 text-xs font-medium rounded-lg border',
            COMPONENT_STATUS_COLORS[component.status]
          )}>
            {COMPONENT_STATUS_LABELS[component.status]}
          </span>
          {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div className="px-4 py-4 border-t border-slate-100 bg-slate-50/50">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {/* Yadro S/N - выделенное поле */}
            <div className="col-span-2 lg:col-span-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <label className="text-xs font-medium text-amber-700 flex items-center gap-1 mb-1">
                <Package size={12} />
                S/N Yadro (наклейка)
              </label>
              <div className="flex items-center gap-2">
                <span className="font-mono text-amber-900 text-base">
                  {component.serialNumberYadro || '— не указан —'}
                </span>
                {component.serialNumberYadro && (
                  <button
                    onClick={(e) => { e.stopPropagation(); copySerial(component.serialNumberYadro!, 'S/N Yadro'); }}
                    className="p-1 hover:bg-amber-100 rounded"
                    title="Копировать"
                  >
                    <Copy size={14} className="text-amber-600" />
                  </button>
                )}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-500">Производитель</label>
              <p className="font-medium text-slate-800">{component.manufacturer || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500">Модель</label>
              <p className="font-medium text-slate-800">{component.model || '—'}</p>
            </div>
            <div>
              <label className="text-xs text-slate-500">S/N производителя</label>
              <div className="flex items-center gap-1">
                <span className="font-mono text-slate-800">{component.serialNumber || '—'}</span>
                {component.serialNumber && (
                  <button
                    onClick={(e) => { e.stopPropagation(); copySerial(component.serialNumber!, 'S/N'); }}
                    className="p-1 hover:bg-slate-100 rounded"
                  >
                    <Copy size={12} className="text-slate-400" />
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="text-xs text-slate-500">P/N</label>
              <p className="font-mono text-slate-800">{component.partNumber || '—'}</p>
            </div>
            {component.capacity && (
              <div>
                <label className="text-xs text-slate-500">Объём</label>
                <p className="font-medium text-slate-800">{formatBytes(component.capacity)}</p>
              </div>
            )}
            {component.speed && (
              <div>
                <label className="text-xs text-slate-500">Частота</label>
                <p className="font-medium text-slate-800">{component.speed}</p>
              </div>
            )}
            {component.metadata?.rank && (
              <div>
                <label className="text-xs text-slate-500">Ранг</label>
                <p className="font-medium text-slate-800">{component.metadata.rank}</p>
              </div>
            )}
            {component.metadata?.memoryType && (
              <div>
                <label className="text-xs text-slate-500">Тип памяти</label>
                <p className="font-medium text-slate-800">{component.metadata.memoryType}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          {!readOnly && (
            <div className="flex flex-wrap justify-end gap-2 mt-4 pt-3 border-t border-slate-200">
              <button
                onClick={(e) => { e.stopPropagation(); onEditSerials(component); }}
                className="px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 rounded-lg flex items-center gap-1.5 transition-colors"
                title="Быстрое изменение серийных номеров"
              >
                <ScanLine size={14} />
                Изменить S/N
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(component); }}
                className="px-3 py-1.5 text-sm text-indigo-600 hover:bg-indigo-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Edit2 size={14} />
                Редактировать
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onReplace(component); }}
                className="px-3 py-1.5 text-sm text-amber-600 hover:bg-amber-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <ArrowRightLeft size={14} />
                Замена
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(component); }}
                className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} />
                Удалить
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ============================================
// ОСНОВНОЙ КОМПОНЕНТ
// ============================================

const ServerComponentsManager: React.FC<Props> = ({
  serverId, serverIp, apkSerialNumber, readOnly = false
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ComponentsResponse | null>(null);
  const [fetchingFromBmc, setFetchingFromBmc] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingComponent, setEditingComponent] = useState<ServerComponent | null>(null);
  const [editingSerialsComponent, setEditingSerialsComponent] = useState<ServerComponent | null>(null);
  const [replacingComponent, setReplacingComponent] = useState<ServerComponent | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ServerComponent | null>(null);

  // BMC Sync modal states
  const [syncModalOpen, setSyncModalOpen] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<BMCComparisonResult | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Фильтрация по типам
  const [typeFilter, setTypeFilter] = useState<ComponentType | 'ALL'>('ALL');

  // Загрузка данных
  const loadComponents = useCallback(async () => {
    setLoading(true);
    try {
      const response = await getServerComponents(serverId);
      setData(response);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка загрузки комплектующих');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  useEffect(() => {
    loadComponents();
  }, [loadComponents]);

  // Выгрузка с BMC - ИСПРАВЛЕННАЯ ВЕРСИЯ
  const handleFetchFromBmc = async () => {
    setFetchingFromBmc(true);
    try {
      // Сначала делаем сравнение (compare)
      const result = await fetchComponentsFromBMC(serverId, 'compare');
      
      if (result.hasDiscrepancies) {
        // Если есть расхождения - показываем модальное окно выбора режима
        setComparisonResult(result);
        setSyncModalOpen(true);
      } else if (result.summary?.total?.inBmc > 0) {
        // Расхождений нет, но есть данные в BMC - синхронизируем с force
        const syncResult = await fetchComponentsFromBMC(serverId, 'force', true);
        toast.success(syncResult.message || `Загружено ${syncResult.components?.length || 0} комплектующих`);
        await loadComponents();
      } else {
        // Нет данных в BMC
        toast.info('BMC не вернул данных о комплектующих');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка выгрузки с BMC');
    } finally {
      setFetchingFromBmc(false);
    }
  };

  // Обработка выбора режима синхронизации
  const handleSyncWithMode = async (mode: 'force' | 'merge', preserveManual: boolean) => {
    setSyncing(true);
    try {
      const result = await fetchComponentsFromBMC(serverId, mode, preserveManual);
      
      if (mode === 'merge') {
        const { actions } = result;
        toast.success(
          `Слияние завершено: обновлено ${actions?.updated?.length || 0}, добавлено ${actions?.added?.length || 0}`
        );
        if (actions?.flaggedForReview?.length > 0) {
          toast.warning(`${actions.flaggedForReview.length} компонент(ов) требуют проверки`);
        }
      } else {
        toast.success(result.message || `Синхронизировано ${result.components?.length || 0} комплектующих`);
      }
      
      setSyncModalOpen(false);
      setComparisonResult(null);
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка синхронизации');
    } finally {
      setSyncing(false);
    }
  };

  // Закрытие модалки синхронизации
  const handleCloseSyncModal = () => {
    if (!syncing) {
      setSyncModalOpen(false);
      setComparisonResult(null);
    }
  };

  // Добавление нового комплектующего
  const handleAddComponent = async (formData: ComponentFormData) => {
    try {
      await addServerComponent(serverId, {
        componentType: formData.componentType,
        name: formData.name || `${formData.manufacturer || ''} ${formData.model || formData.componentType}`.trim(),
        manufacturer: formData.manufacturer,
        model: formData.model,
        serialNumber: formData.serialNumber,
        serialNumberYadro: formData.serialNumberYadro,
        partNumber: formData.partNumber,
        slot: formData.slot,
        status: formData.status,
        capacity: formData.capacity ? parseInt(formData.capacity) * 1024 * 1024 * 1024 : undefined,
        speed: formData.speed
      });
      toast.success('Комплектующее добавлено');
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка добавления');
      throw err;
    }
  };

  // Редактирование комплектующего
  const handleEditComponent = async (formData: ComponentFormData) => {
    if (!editingComponent) return;
    
    try {
      await updateServerComponent(editingComponent.id, {
        name: formData.name,
        manufacturer: formData.manufacturer,
        model: formData.model,
        serialNumber: formData.serialNumber,
        serialNumberYadro: formData.serialNumberYadro,
        partNumber: formData.partNumber,
        slot: formData.slot,
        status: formData.status
      });
      toast.success('Комплектующее обновлено');
      setEditingComponent(null);
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка обновления');
      throw err;
    }
  };

  // Быстрое редактирование серийных номеров
  const handleEditSerials = async (serials: { serialNumber: string; serialNumberYadro: string }) => {
    if (!editingSerialsComponent) return;
    
    try {
      await updateComponentSerials(editingSerialsComponent.id, {
        serialNumber: serials.serialNumber || undefined,
        serialNumberYadro: serials.serialNumberYadro || undefined
      });
      toast.success('Серийные номера обновлены');
      setEditingSerialsComponent(null);
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка обновления');
      throw err;
    }
  };

  // Замена комплектующего
  const handleReplaceComponent = async (formData: ComponentFormData) => {
    if (!replacingComponent) return;
    
    try {
      await replaceServerComponent(replacingComponent.id, {
        newSerialNumber: formData.serialNumber,
        newSerialNumberYadro: formData.serialNumberYadro,
        newManufacturer: formData.manufacturer,
        newModel: formData.model,
        newPartNumber: formData.partNumber,
        reason: 'Замена комплектующего'
      });
      toast.success('Комплектующее заменено');
      setReplacingComponent(null);
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка замены');
      throw err;
    }
  };

  // Удаление комплектующего
  const handleDeleteComponent = async () => {
    if (!confirmDelete) return;
    
    try {
      await deleteComponent(confirmDelete.id);
      toast.success('Комплектующее удалено');
      setConfirmDelete(null);
      await loadComponents();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка удаления');
    }
  };

  // Фильтрация компонентов
  const filteredComponents = data?.components?.filter(c => {
    const matchesType = typeFilter === 'ALL' || c.componentType === typeFilter;
    const matchesSearch = !searchQuery || 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.serialNumberYadro?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.manufacturer?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.model?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  }) || [];

  // Группировка по типам
  const groupedComponents = filteredComponents.reduce((acc, c) => {
    const type = c.componentType;
    if (!acc[type]) acc[type] = [];
    acc[type].push(c);
    return acc;
  }, {} as Record<string, ServerComponent[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="text-indigo-600" />
            Комплектующие сервера
          </h2>
          {data?.summary && (
            <p className="text-sm text-slate-500 mt-1">
              Всего: {data.summary.totalComponents} • 
              RAM: {data.summary.totalRAM} • 
              Накопители: {data.summary.totalStorage}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!readOnly && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-lg hover:from-indigo-700 hover:to-violet-700 transition-all font-medium flex items-center gap-2 shadow-lg shadow-indigo-200"
              >
                <Plus size={18} />
                Добавить
              </button>
              <button
                onClick={handleFetchFromBmc}
                disabled={fetchingFromBmc}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {fetchingFromBmc ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                BMC
              </button>
            </>
          )}
          <button
            onClick={loadComponents}
            disabled={loading}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Обновить"
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по S/N, модели, производителю..."
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as ComponentType | 'ALL')}
          className="px-4 py-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="ALL">Все типы</option>
          {COMPONENT_TYPES.map(t => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <RefreshCw size={32} className="text-indigo-600 animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && filteredComponents.length === 0 && (
        <div className="text-center py-12 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
          <Package size={48} className="mx-auto text-slate-300 mb-3" />
          <p className="text-slate-500 mb-4">
            {searchQuery ? 'Ничего не найдено' : 'Комплектующие не добавлены'}
          </p>
          {!readOnly && !searchQuery && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium inline-flex items-center gap-2"
              >
                <Plus size={18} />
                Добавить вручную
              </button>
              <button
                onClick={handleFetchFromBmc}
                disabled={fetchingFromBmc}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium inline-flex items-center gap-2 disabled:opacity-50"
              >
                {fetchingFromBmc ? (
                  <RefreshCw size={18} className="animate-spin" />
                ) : (
                  <Download size={18} />
                )}
                Загрузить с BMC
              </button>
            </div>
          )}
        </div>
      )}

      {/* Components list by type */}
      {!loading && Object.keys(groupedComponents).length > 0 && (
        <div className="space-y-6">
          {Object.entries(groupedComponents).map(([type, components]) => {
            const TypeIconComp = TypeIcon[type as ComponentType] || Settings;
            const typeLabel = COMPONENT_TYPES.find(t => t.value === type)?.label || type;
            
            return (
              <div key={type}>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700 mb-3">
                  <TypeIconComp size={18} />
                  {typeLabel}
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full text-xs">
                    {components.length}
                  </span>
                </h3>
                <div className="space-y-2">
                  {components.map(component => (
                    <ComponentCard
                      key={component.id}
                      component={component}
                      onEdit={setEditingComponent}
                      onEditSerials={setEditingSerialsComponent}
                      onReplace={setReplacingComponent}
                      onDelete={setConfirmDelete}
                      readOnly={readOnly}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <ComponentModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSave={handleAddComponent}
        title="Добавить комплектующее"
      />

      {/* Edit Modal */}
      <ComponentModal
        isOpen={!!editingComponent}
        onClose={() => setEditingComponent(null)}
        onSave={handleEditComponent}
        initialData={editingComponent ? {
          componentType: editingComponent.componentType,
          name: editingComponent.name || '',
          manufacturer: editingComponent.manufacturer || '',
          model: editingComponent.model || '',
          serialNumber: editingComponent.serialNumber || '',
          serialNumberYadro: editingComponent.serialNumberYadro || '',
          partNumber: editingComponent.partNumber || '',
          slot: editingComponent.slot || '',
          status: editingComponent.status
        } : undefined}
        title="Редактировать комплектующее"
      />

      {/* Replace Modal */}
      <ComponentModal
        isOpen={!!replacingComponent}
        onClose={() => setReplacingComponent(null)}
        onSave={handleReplaceComponent}
        initialData={replacingComponent ? {
          componentType: replacingComponent.componentType,
          name: '',
          manufacturer: '',
          model: '',
          serialNumber: '',
          serialNumberYadro: '',
          partNumber: '',
          slot: replacingComponent.slot || '',
          status: 'OK'
        } : undefined}
        title={`Замена: ${replacingComponent?.name || ''}`}
        isReplacement
      />

      {/* Quick Edit Serials Modal */}
      {editingSerialsComponent && (
        <EditSerialsModal
          isOpen={!!editingSerialsComponent}
          onClose={() => setEditingSerialsComponent(null)}
          onSave={handleEditSerials}
          component={editingSerialsComponent}
        />
      )}

      {/* BMC Sync Mode Selection Modal */}
      <SyncModeModal
        isOpen={syncModalOpen}
        onClose={handleCloseSyncModal}
        onSelectMode={handleSyncWithMode}
        comparisonResult={comparisonResult}
        syncing={syncing}
      />

      {/* Delete Confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle size={24} />
              <h3 className="text-lg font-semibold">Подтверждение удаления</h3>
            </div>
            <p className="text-slate-600 mb-6">
              Вы уверены, что хотите удалить комплектующее{' '}
              <strong>{confirmDelete.name}</strong>?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDelete(null)}
                className="px-4 py-2 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleDeleteComponent}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ServerComponentsManager;