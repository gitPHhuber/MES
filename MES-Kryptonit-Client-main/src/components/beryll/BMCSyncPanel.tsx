import React, { useState, useCallback } from 'react';
import { 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  X, 
  Server, 
  HardDrive,
  Cpu,
  MemoryStick,
  Plus,
  Minus,
  ArrowLeftRight,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'react-toastify';
import { $authHost } from '../../http';

interface ComponentDifference {
  field: string;
  db: string | null;
  bmc: string | null;
}

interface ComparisonMismatch {
  dbComponent: ServerComponent;
  bmcComponent: BMCComponent;
  differences: ComponentDifference[];
}

interface ComparisonMissing {
  dbComponent: ServerComponent;
  isManual: boolean;
  reason: string;
}

interface ComparisonNew {
  bmcComponent: BMCComponent;
  reason: string;
}

interface ComparisonResult {
  success: boolean;
  hasDiscrepancies: boolean;
  mode: string;
  summary: {
    total: { inDb: number; inBmc: number };
    matched: number;
    missingInBmc: number;
    newInBmc: number;
    mismatches: number;
  };
  details: {
    matched: { dbComponent: ServerComponent; bmcComponent: BMCComponent }[];
    missingInBmc: ComparisonMissing[];
    newInBmc: ComparisonNew[];
    mismatches: ComparisonMismatch[];
  };
  message?: string;
}

interface ServerComponent {
  id: number;
  componentType: string;
  name: string;
  serialNumber: string | null;
  model: string | null;
  slot: string | null;
  status: string;
  dataSource: string;
  bmcDiscrepancy?: boolean;
  bmcDiscrepancyReason?: string;
}

interface BMCComponent {
  componentType: string;
  name?: string;
  serialNumber: string | null;
  model: string | null;
  slot: string | null;
  status: string;
  manufacturer?: string;
}

interface BMCSyncPanelProps {
  serverId: number;
  onSyncComplete: () => void;
}

const COMPONENT_ICONS: Record<string, React.ReactNode> = {
  CPU: <Cpu className="w-4 h-4" />,
  RAM: <MemoryStick className="w-4 h-4" />,
  HDD: <HardDrive className="w-4 h-4" />,
  SSD: <HardDrive className="w-4 h-4" />,
  default: <Server className="w-4 h-4" />
};

const getComponentIcon = (type: string) => {
  return COMPONENT_ICONS[type] || COMPONENT_ICONS.default;
};

export const BMCSyncPanel: React.FC<BMCSyncPanelProps> = ({ serverId, onSyncComplete }) => {
  const [loading, setLoading] = useState(false);
  const [comparison, setComparison] = useState<ComparisonResult | null>(null);
  const [expanded, setExpanded] = useState({
    missingInBmc: true,
    newInBmc: true,
    mismatches: true,
    matched: false
  });

  // Сравнить с BMC
  const handleCompare = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await $authHost.post(`/api/beryll/servers/${serverId}/components/fetch`, {
        mode: 'compare'
      });
      setComparison(data);
      
      if (data.hasDiscrepancies) {
        toast.warning(`Обнаружены расхождения с BMC`);
      } else {
        toast.success('Расхождений не обнаружено');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка сравнения с BMC');
    } finally {
      setLoading(false);
    }
  }, [serverId]);

  // Принудительная синхронизация
  const handleForceSync = useCallback(async (preserveManual: boolean) => {
    if (!confirm(preserveManual 
      ? 'Перезаписать все компоненты с BMC? Вручную добавленные будут сохранены.'
      : 'Перезаписать ВСЕ компоненты с BMC? Включая добавленные вручную!')) {
      return;
    }
    
    setLoading(true);
    try {
      const { data } = await $authHost.post(`/api/beryll/servers/${serverId}/components/fetch`, {
        mode: 'force',
        preserveManual
      });
      toast.success(`Синхронизировано ${data.components?.length || 0} компонентов`);
      setComparison(null);
      onSyncComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка синхронизации');
    } finally {
      setLoading(false);
    }
  }, [serverId, onSyncComplete]);

  // Умное слияние
  const handleMerge = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await $authHost.post(`/api/beryll/servers/${serverId}/components/fetch`, {
        mode: 'merge'
      });
      
      const { actions } = data;
      toast.success(
        `Слияние завершено: обновлено ${actions.updated.length}, добавлено ${actions.added.length}`
      );
      
      if (actions.flaggedForReview.length > 0) {
        toast.warning(`${actions.flaggedForReview.length} компонент(ов) требуют проверки`);
      }
      
      setComparison(null);
      onSyncComplete();
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Ошибка слияния');
    } finally {
      setLoading(false);
    }
  }, [serverId, onSyncComplete]);

  const toggleSection = (section: keyof typeof expanded) => {
    setExpanded(prev => ({ ...prev, [section]: !prev[section] }));
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Server className="w-5 h-5 text-blue-600" />
          Синхронизация с BMC
        </h3>
        
        <button
          onClick={handleCompare}
          disabled={loading}
          className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Сравнить с BMC
        </button>
      </div>

      {comparison && (
        <div className="space-y-4">
          {/* Summary */}
          <div className={`p-3 rounded-lg ${comparison.hasDiscrepancies ? 'bg-amber-50 border border-amber-200' : 'bg-green-50 border border-green-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {comparison.hasDiscrepancies ? (
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              ) : (
                <Check className="w-5 h-5 text-green-600" />
              )}
              <span className="font-medium">
                {comparison.hasDiscrepancies ? 'Обнаружены расхождения' : 'Данные синхронизированы'}
              </span>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
              <div className="bg-white/50 rounded p-2">
                <div className="text-gray-500">В БД</div>
                <div className="font-medium">{comparison.summary.total.inDb}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-gray-500">В BMC</div>
                <div className="font-medium">{comparison.summary.total.inBmc}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-gray-500">Совпадают</div>
                <div className="font-medium text-green-600">{comparison.summary.matched}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-gray-500">Нет в BMC</div>
                <div className="font-medium text-amber-600">{comparison.summary.missingInBmc}</div>
              </div>
              <div className="bg-white/50 rounded p-2">
                <div className="text-gray-500">Новые в BMC</div>
                <div className="font-medium text-blue-600">{comparison.summary.newInBmc}</div>
              </div>
            </div>
          </div>

          {/* Missing in BMC */}
          {comparison.details.missingInBmc.length > 0 && (
            <div className="border border-amber-200 rounded-lg">
              <button
                onClick={() => toggleSection('missingInBmc')}
                className="w-full flex items-center justify-between p-3 bg-amber-50 rounded-t-lg"
              >
                <span className="flex items-center gap-2 font-medium text-amber-800">
                  <Minus className="w-4 h-4" />
                  Нет в BMC ({comparison.details.missingInBmc.length})
                </span>
                {expanded.missingInBmc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expanded.missingInBmc && (
                <div className="p-3 space-y-2">
                  {comparison.details.missingInBmc.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        {getComponentIcon(item.dbComponent.componentType)}
                        <div>
                          <div className="font-medium">{item.dbComponent.name}</div>
                          <div className="text-xs text-gray-500">
                            S/N: {item.dbComponent.serialNumber || 'н/д'} | {item.reason}
                          </div>
                        </div>
                      </div>
                      {item.isManual && (
                        <span className="px-2 py-1 text-xs bg-purple-100 text-purple-700 rounded">
                          Ручной ввод
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* New in BMC */}
          {comparison.details.newInBmc.length > 0 && (
            <div className="border border-blue-200 rounded-lg">
              <button
                onClick={() => toggleSection('newInBmc')}
                className="w-full flex items-center justify-between p-3 bg-blue-50 rounded-t-lg"
              >
                <span className="flex items-center gap-2 font-medium text-blue-800">
                  <Plus className="w-4 h-4" />
                  Новые в BMC ({comparison.details.newInBmc.length})
                </span>
                {expanded.newInBmc ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expanded.newInBmc && (
                <div className="p-3 space-y-2">
                  {comparison.details.newInBmc.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                      {getComponentIcon(item.bmcComponent.componentType)}
                      <div>
                        <div className="font-medium">
                          {item.bmcComponent.manufacturer} {item.bmcComponent.model}
                        </div>
                        <div className="text-xs text-gray-500">
                          S/N: {item.bmcComponent.serialNumber || 'н/д'} | Слот: {item.bmcComponent.slot || 'н/д'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Mismatches */}
          {comparison.details.mismatches.length > 0 && (
            <div className="border border-orange-200 rounded-lg">
              <button
                onClick={() => toggleSection('mismatches')}
                className="w-full flex items-center justify-between p-3 bg-orange-50 rounded-t-lg"
              >
                <span className="flex items-center gap-2 font-medium text-orange-800">
                  <ArrowLeftRight className="w-4 h-4" />
                  Расхождения данных ({comparison.details.mismatches.length})
                </span>
                {expanded.mismatches ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {expanded.mismatches && (
                <div className="p-3 space-y-2">
                  {comparison.details.mismatches.map((item, idx) => (
                    <div key={idx} className="p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2 mb-2">
                        {getComponentIcon(item.dbComponent.componentType)}
                        <span className="font-medium">{item.dbComponent.name}</span>
                        <span className="text-xs text-gray-500">S/N: {item.dbComponent.serialNumber}</span>
                      </div>
                      <div className="ml-6 space-y-1">
                        {item.differences.map((diff, dIdx) => (
                          <div key={dIdx} className="text-sm flex items-center gap-2">
                            <span className="text-gray-500 w-24">{diff.field}:</span>
                            <span className="text-red-600 line-through">{diff.db || 'пусто'}</span>
                            <span>→</span>
                            <span className="text-green-600">{diff.bmc || 'пусто'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {comparison.hasDiscrepancies && (
            <div className="flex flex-wrap gap-2 pt-4 border-t">
              <button
                onClick={handleMerge}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                Умное слияние
              </button>
              
              <button
                onClick={() => handleForceSync(true)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50"
              >
                <RefreshCw className="w-4 h-4" />
                Перезаписать (сохранить ручные)
              </button>
              
              <button
                onClick={() => handleForceSync(false)}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                <X className="w-4 h-4" />
                Полная перезапись
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Компонент-индикатор расхождения для отдельного компонента в списке
export const DiscrepancyBadge: React.FC<{ 
  hasDiscrepancy: boolean; 
  reason?: string;
}> = ({ hasDiscrepancy, reason }) => {
  if (!hasDiscrepancy) return null;
  
  const reasonLabels: Record<string, string> = {
    NOT_FOUND_IN_BMC: 'Не найден в BMC',
    REMOVED_FROM_BMC: 'Удалён из BMC',
    DATA_MISMATCH: 'Данные отличаются',
    SERIAL_CHANGED: 'Изменён S/N'
  };
  
  return (
    <span 
      className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-amber-100 text-amber-800 rounded-full"
      title={reason ? reasonLabels[reason] || reason : 'Расхождение с BMC'}
    >
      <AlertTriangle className="w-3 h-3" />
      BMC
    </span>
  );
};

export default BMCSyncPanel;