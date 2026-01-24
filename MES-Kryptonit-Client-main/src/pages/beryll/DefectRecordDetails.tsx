/**
 * DefectRecordDetails.tsx - Детальный просмотр и управление записью о браке
 */

import React, { useState, useEffect } from "react";
import {
  X,
  AlertTriangle,
  Server,
  Clock,
  User,
  Wrench,
  Truck,
  CheckCircle,
  Package,
  RotateCcw,
  AlertCircle,
  ChevronRight,
  FileText,
  History,
  Loader2
} from "lucide-react";
import toast from "react-hot-toast";
import { 
  defectRecordApi, 
  inventoryApi,
  substituteApi,
  DefectRecord, 
  DefectRecordStatus,
  ComponentInventory
} from "../../api/beryllExtendedApi";

interface Props {
  record: DefectRecord;
  partTypes: Array<{ value: string; label: string }>;
  onClose: () => void;
  onUpdate: () => void;
}

const STATUS_FLOW: Record<DefectRecordStatus, DefectRecordStatus[]> = {
  NEW: ["DIAGNOSING"],
  DIAGNOSING: ["WAITING_PARTS", "REPAIRING", "SENT_TO_YADRO"],
  WAITING_PARTS: ["REPAIRING", "SENT_TO_YADRO"],
  REPAIRING: ["RESOLVED", "SENT_TO_YADRO"],
  SENT_TO_YADRO: ["RETURNED"],
  RETURNED: ["REPAIRING", "RESOLVED"],
  RESOLVED: ["CLOSED"],
  REPEATED: ["DIAGNOSING"],
  CLOSED: []
};

const DefectRecordDetails: React.FC<Props> = ({ record: initialRecord, partTypes, onClose, onUpdate }) => {
  const [record, setRecord] = useState<DefectRecord>(initialRecord);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "workflow" | "history">("info");
  
  // Данные для workflow
  const [availableComponents, setAvailableComponents] = useState<ComponentInventory[]>([]);
  const [availableSubstitutes, setAvailableSubstitutes] = useState<any[]>([]);
  
  // Формы для разных действий
  const [diagnosisData, setDiagnosisData] = useState({
    repairPartType: record.repairPartType || "",
    defectPartSerialYadro: record.defectPartSerialYadro || "",
    defectPartSerialManuf: record.defectPartSerialManuf || "",
    problemDescription: record.problemDescription || "",
    notes: ""
  });
  
  const [replacementData, setReplacementData] = useState({
    replacementPartSerialYadro: "",
    replacementPartSerialManuf: "",
    replacementInventoryId: 0,
    repairDetails: ""
  });
  
  const [yadroData, setYadroData] = useState({
    ticketNumber: "",
    subject: "",
    description: record.problemDescription || "",
    trackingNumber: ""
  });
  
  const [returnData, setReturnData] = useState({
    resolution: "",
    replacementSerialYadro: "",
    replacementSerialManuf: "",
    condition: "REFURBISHED"
  });
  
  const [resolveData, setResolveData] = useState({
    resolution: "",
    notes: ""
  });

  // Перезагрузка записи
  const reloadRecord = async () => {
    try {
      const response = await defectRecordApi.getById(record.id);
      setRecord(response.data);
      onUpdate();
    } catch (error) {
      console.error("Error reloading record:", error);
    }
  };

  // Загрузка доступных компонентов
  useEffect(() => {
    const loadComponents = async () => {
      if (record.repairPartType) {
        try {
          const response = await inventoryApi.getAvailableByType(record.repairPartType, 20);
          setAvailableComponents(response.data);
        } catch (error) {
          console.error("Error loading components:", error);
        }
      }
    };
    
    const loadSubstitutes = async () => {
      try {
        const response = await substituteApi.getAvailable();
        setAvailableSubstitutes(response.data);
      } catch (error) {
        console.error("Error loading substitutes:", error);
      }
    };
    
    loadComponents();
    loadSubstitutes();
  }, [record.repairPartType]);

  // Workflow actions
  const handleStartDiagnosis = async () => {
    setLoading(true);
    try {
      await defectRecordApi.startDiagnosis(record.id);
      toast.success("Диагностика начата");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteDiagnosis = async () => {
    setLoading(true);
    try {
      await defectRecordApi.completeDiagnosis(record.id, diagnosisData);
      toast.success("Диагностика завершена");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleSetWaitingParts = async () => {
    setLoading(true);
    try {
      await defectRecordApi.setWaitingParts(record.id, "Ожидание запасных частей");
      toast.success("Статус обновлён");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleReserveComponent = async (inventoryId: number) => {
    setLoading(true);
    try {
      await defectRecordApi.reserveComponent(record.id, inventoryId);
      toast.success("Компонент зарезервирован");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleStartRepair = async () => {
    setLoading(true);
    try {
      await defectRecordApi.startRepair(record.id);
      toast.success("Ремонт начат");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handlePerformReplacement = async () => {
    setLoading(true);
    try {
      await defectRecordApi.performReplacement(record.id, {
        replacementPartSerialYadro: replacementData.replacementPartSerialYadro || undefined,
        replacementPartSerialManuf: replacementData.replacementPartSerialManuf || undefined,
        replacementInventoryId: replacementData.replacementInventoryId || undefined,
        repairDetails: replacementData.repairDetails || undefined
      });
      toast.success("Замена выполнена");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleSendToYadro = async () => {
    setLoading(true);
    try {
      await defectRecordApi.sendToYadro(record.id, yadroData);
      toast.success("Отправлено в Ядро");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnFromYadro = async () => {
    setLoading(true);
    try {
      await defectRecordApi.returnFromYadro(record.id, {
        resolution: returnData.resolution,
        replacementSerialYadro: returnData.replacementSerialYadro || undefined,
        replacementSerialManuf: returnData.replacementSerialManuf || undefined,
        condition: returnData.condition as any
      });
      toast.success("Возврат из Ядро зафиксирован");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleIssueSubstitute = async (substituteId?: number) => {
    setLoading(true);
    try {
      await defectRecordApi.issueSubstitute(record.id, substituteId);
      toast.success("Подменный сервер выдан");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubstitute = async () => {
    setLoading(true);
    try {
      await defectRecordApi.returnSubstitute(record.id);
      toast.success("Подменный сервер возвращён");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = async () => {
    if (!resolveData.resolution.trim()) {
      toast.error("Укажите резолюцию");
      return;
    }
    
    setLoading(true);
    try {
      await defectRecordApi.resolve(record.id, resolveData);
      toast.success("Запись закрыта");
      await reloadRecord();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка");
    } finally {
      setLoading(false);
    }
  };

  // Форматирование
  const formatDate = (dateStr: string | null): string => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const getPartTypeLabel = (type: string | null): string => {
    if (!type) return "Не определён";
    return partTypes.find(t => t.value === type)?.label || type;
  };

  const isSlaBreached = (): boolean => {
    if (!record.slaDeadline) return false;
    if (record.status === "RESOLVED" || record.status === "CLOSED") return false;
    return new Date(record.slaDeadline) < new Date();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl my-8">
        {/* Заголовок */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${
          record.isRepeatedDefect ? "bg-red-50" : isSlaBreached() ? "bg-orange-50" : "bg-gray-50"
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              record.isRepeatedDefect ? "bg-red-100" : "bg-gray-100"
            }`}>
              <AlertTriangle className={`w-5 h-5 ${
                record.isRepeatedDefect ? "text-red-600" : "text-gray-600"
              }`} />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                Запись #{record.id}
                {record.isRepeatedDefect && (
                  <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    Повторный брак
                  </span>
                )}
                {isSlaBreached() && (
                  <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                    SLA нарушен
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-500">
                {record.server?.apkSerialNumber} • {record.server?.hostname}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Табы */}
        <div className="border-b px-6">
          <div className="flex gap-4">
            {[
              { id: "info", label: "Информация", icon: FileText },
              { id: "workflow", label: "Workflow", icon: ChevronRight },
              { id: "history", label: "История", icon: History }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Контент */}
        <div className="p-6">
          {activeTab === "info" && (
            <div className="space-y-6">
              {/* Основная информация */}
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Статус</div>
                    <div className="mt-1">
                      <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                        record.status === "RESOLVED" ? "bg-green-100 text-green-800" :
                        record.status === "CLOSED" ? "bg-gray-100 text-gray-800" :
                        "bg-blue-100 text-blue-800"
                      }`}>
                        {record.status}
                      </span>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Заявка Ядро</div>
                    <div className="mt-1 font-mono text-blue-600">
                      {record.yadroTicketNumber || "—"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Тип дефекта</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-gray-400" />
                      {getPartTypeLabel(record.repairPartType)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">Обнаружен</div>
                    <div className="mt-1 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {formatDate(record.detectedAt)}
                    </div>
                  </div>
                  
                  {record.detectedBy && (
                    <div>
                      <div className="text-sm text-gray-500">Кем обнаружен</div>
                      <div className="mt-1 flex items-center gap-2">
                        <User className="w-4 h-4 text-gray-400" />
                        {record.detectedBy.surname} {record.detectedBy.name}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm text-gray-500">Дедлайн SLA</div>
                    <div className={`mt-1 flex items-center gap-2 ${
                      isSlaBreached() ? "text-red-600" : ""
                    }`}>
                      {isSlaBreached() ? (
                        <AlertCircle className="w-4 h-4" />
                      ) : (
                        <Clock className="w-4 h-4 text-gray-400" />
                      )}
                      {formatDate(record.slaDeadline)}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">S/N дефектной детали (Ядро)</div>
                    <div className="mt-1 font-mono">
                      {record.defectPartSerialYadro || "—"}
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm text-gray-500">S/N дефектной детали (Произв.)</div>
                    <div className="mt-1 font-mono">
                      {record.defectPartSerialManuf || "—"}
                    </div>
                  </div>
                  
                  {record.substituteServer && (
                    <div>
                      <div className="text-sm text-gray-500">Подменный сервер</div>
                      <div className="mt-1 flex items-center gap-2">
                        <Server className="w-4 h-4 text-gray-400" />
                        {record.substituteServer.apkSerialNumber}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Описание проблемы */}
              <div>
                <div className="text-sm text-gray-500 mb-1">Описание проблемы</div>
                <div className="p-3 bg-gray-50 rounded-lg text-gray-700">
                  {record.problemDescription || "Не указано"}
                </div>
              </div>
              
              {/* Резолюция */}
              {record.resolution && (
                <div>
                  <div className="text-sm text-gray-500 mb-1">Резолюция</div>
                  <div className="p-3 bg-green-50 rounded-lg text-gray-700">
                    {record.resolution}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "workflow" && (
            <div className="space-y-6">
              {/* Текущий статус и доступные действия */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="font-medium text-blue-800 mb-2">
                  Текущий статус: {record.status}
                </div>
                <div className="text-sm text-blue-600">
                  Доступные переходы: {STATUS_FLOW[record.status]?.join(", ") || "нет"}
                </div>
              </div>

              {/* Действия в зависимости от статуса */}
              {record.status === "NEW" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Начать диагностику</h3>
                  <button
                    onClick={handleStartDiagnosis}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Начать диагностику
                  </button>
                </div>
              )}

              {record.status === "DIAGNOSING" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Завершить диагностику</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Тип дефекта</label>
                      <select
                        value={diagnosisData.repairPartType}
                        onChange={(e) => setDiagnosisData(prev => ({ ...prev, repairPartType: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg"
                      >
                        <option value="">Выберите тип</option>
                        {partTypes.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Заключение диагностики</label>
                    <textarea
                      value={diagnosisData.notes}
                      onChange={(e) => setDiagnosisData(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Результаты диагностики..."
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handleCompleteDiagnosis}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Завершить диагностику
                    </button>
                    <button
                      onClick={handleSetWaitingParts}
                      disabled={loading}
                      className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                    >
                      Ожидание запчастей
                    </button>
                    <button
                      onClick={handleSendToYadro}
                      disabled={loading}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      Отправить в Ядро
                    </button>
                  </div>
                </div>
              )}

              {record.status === "WAITING_PARTS" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Ожидание запчастей</h3>
                  
                  {availableComponents.length > 0 && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-2">Доступные компоненты для замены</label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {availableComponents.map(comp => (
                          <div 
                            key={comp.id}
                            className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                          >
                            <div>
                              <div className="font-mono text-sm">{comp.serialNumber}</div>
                              <div className="text-xs text-gray-500">{comp.manufacturer} {comp.model}</div>
                            </div>
                            <button
                              onClick={() => handleReserveComponent(comp.id)}
                              disabled={loading}
                              className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
                            >
                              Зарезервировать
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <button
                    onClick={handleStartRepair}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Начать ремонт
                  </button>
                </div>
              )}

              {record.status === "REPAIRING" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Выполнение замены</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">S/N новой детали (Ядро)</label>
                      <input
                        type="text"
                        value={replacementData.replacementPartSerialYadro}
                        onChange={(e) => setReplacementData(prev => ({ ...prev, replacementPartSerialYadro: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">S/N новой детали (Произв.)</label>
                      <input
                        type="text"
                        value={replacementData.replacementPartSerialManuf}
                        onChange={(e) => setReplacementData(prev => ({ ...prev, replacementPartSerialManuf: e.target.value }))}
                        className="w-full px-3 py-2 border rounded-lg font-mono"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Детали ремонта</label>
                    <textarea
                      value={replacementData.repairDetails}
                      onChange={(e) => setReplacementData(prev => ({ ...prev, repairDetails: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                      placeholder="Описание выполненных работ..."
                    />
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={handlePerformReplacement}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      Выполнить замену и закрыть
                    </button>
                  </div>
                </div>
              )}

              {record.status === "SENT_TO_YADRO" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Возврат из Ядро</h3>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Резолюция от Ядро</label>
                    <textarea
                      value={returnData.resolution}
                      onChange={(e) => setReturnData(prev => ({ ...prev, resolution: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border rounded-lg"
                    />
                  </div>
                  
                  <button
                    onClick={handleReturnFromYadro}
                    disabled={loading}
                    className="flex items-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                    Зафиксировать возврат
                  </button>
                </div>
              )}

              {/* Подменный сервер */}
              {!record.substituteServerId && record.status !== "RESOLVED" && record.status !== "CLOSED" && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Подменный сервер</h3>
                  {availableSubstitutes.length > 0 ? (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleIssueSubstitute()}
                        disabled={loading}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50"
                      >
                        Выдать подменный сервер
                      </button>
                      <span className="text-sm text-gray-500 self-center">
                        Доступно: {availableSubstitutes.length}
                      </span>
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">Нет доступных подменных серверов</p>
                  )}
                </div>
              )}
              
              {record.substituteServerId && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Подменный сервер выдан</h3>
                  <div className="flex items-center gap-4">
                    <span className="font-mono">{record.substituteServer?.apkSerialNumber}</span>
                    <button
                      onClick={handleReturnSubstitute}
                      disabled={loading}
                      className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                    >
                      Вернуть
                    </button>
                  </div>
                </div>
              )}

              {/* Закрытие записи */}
              {(record.status === "REPAIRING" || record.status === "RETURNED") && (
                <div className="pt-4 border-t">
                  <h3 className="font-medium mb-2">Закрыть запись</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Резолюция</label>
                      <textarea
                        value={resolveData.resolution}
                        onChange={(e) => setResolveData(prev => ({ ...prev, resolution: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border rounded-lg"
                        placeholder="Итоговая резолюция..."
                      />
                    </div>
                    <button
                      onClick={handleResolve}
                      disabled={loading || !resolveData.resolution.trim()}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <CheckCircle className="w-4 h-4" />
                      Закрыть запись
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "history" && (
            <div className="text-gray-500 text-center py-8">
              История изменений будет здесь
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DefectRecordDetails;
