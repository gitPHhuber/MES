/**
 * DefectRecordModal.tsx - Модальное окно создания записи о браке
 */

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Search, Server, Loader2 } from "lucide-react";
import toast from "react-hot-toast";
import { defectRecordApi, TicketPriority } from "../../api/beryll/beryllExtendedApi";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  partTypes: Array<{ value: string; label: string }>;
  preselectedServerId?: number;
}

const PRIORITIES: Array<{ value: TicketPriority; label: string; color: string }> = [
  { value: "LOW", label: "Низкий", color: "text-gray-600" },
  { value: "MEDIUM", label: "Средний", color: "text-blue-600" },
  { value: "HIGH", label: "Высокий", color: "text-orange-600" },
  { value: "CRITICAL", label: "Критический", color: "text-red-600" }
];

const DefectRecordModal: React.FC<Props> = ({ onClose, onSuccess, partTypes, preselectedServerId }) => {
  const [loading, setLoading] = useState(false);
  const [serverSearch, setServerSearch] = useState("");
  const [serverSearchResults, setServerSearchResults] = useState<any[]>([]);
  const [searchingServer, setSearchingServer] = useState(false);
  
  const [formData, setFormData] = useState({
    serverId: preselectedServerId || 0,
    serverDisplay: "",
    yadroTicketNumber: "",
    hasSPISI: false,
    clusterCode: "",
    problemDescription: "",
    repairPartType: "",
    defectPartSerialYadro: "",
    defectPartSerialManuf: "",
    notes: "",
    priority: "MEDIUM" as TicketPriority
  });

  // Поиск серверов
  useEffect(() => {
    const searchServers = async () => {
      if (serverSearch.length < 2) {
        setServerSearchResults([]);
        return;
      }
      
      setSearchingServer(true);
      try {
        // Здесь должен быть API вызов для поиска серверов
        const response = await fetch(`/api/beryll/servers?search=${encodeURIComponent(serverSearch)}&limit=10`);
        const data = await response.json();
        setServerSearchResults(data.rows || []);
      } catch (error) {
        console.error("Error searching servers:", error);
      } finally {
        setSearchingServer(false);
      }
    };
    
    const debounce = setTimeout(searchServers, 300);
    return () => clearTimeout(debounce);
  }, [serverSearch]);

  const selectServer = (server: any) => {
    setFormData(prev => ({
      ...prev,
      serverId: server.id,
      serverDisplay: `${server.apkSerialNumber || server.ipAddress} - ${server.hostname || ""}`
    }));
    setServerSearch("");
    setServerSearchResults([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.serverId) {
      toast.error("Выберите сервер");
      return;
    }
    
    if (!formData.problemDescription?.trim()) {
      toast.error("Укажите описание проблемы");
      return;
    }
    
    setLoading(true);
    try {
      await defectRecordApi.create({
        serverId: formData.serverId,
        yadroTicketNumber: formData.yadroTicketNumber || undefined,
        hasSPISI: formData.hasSPISI,
        clusterCode: formData.clusterCode || undefined,
        problemDescription: formData.problemDescription,
        repairPartType: formData.repairPartType || undefined,
        defectPartSerialYadro: formData.defectPartSerialYadro || undefined,
        defectPartSerialManuf: formData.defectPartSerialManuf || undefined,
        notes: formData.notes || undefined,
        priority: formData.priority
      });
      
      toast.success("Запись о браке создана");
      onSuccess();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка создания записи");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Заголовок */}
        <div className="px-6 py-4 border-b flex items-center justify-between bg-red-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Новая запись о браке</h2>
              <p className="text-sm text-gray-500">Зарегистрируйте дефект сервера</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Форма */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Выбор сервера */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Сервер <span className="text-red-500">*</span>
            </label>
            {formData.serverId ? (
              <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                <Server className="w-5 h-5 text-gray-400" />
                <span className="flex-1">{formData.serverDisplay}</span>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, serverId: 0, serverDisplay: "" }))}
                  className="text-red-500 hover:text-red-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={serverSearch}
                  onChange={(e) => setServerSearch(e.target.value)}
                  placeholder="Поиск по серийному номеру, IP, hostname..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                {searchingServer && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
                )}
                
                {/* Результаты поиска */}
                {serverSearchResults.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border rounded-lg shadow-lg z-10 max-h-60 overflow-y-auto">
                    {serverSearchResults.map((server) => (
                      <button
                        key={server.id}
                        type="button"
                        onClick={() => selectServer(server)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Server className="w-4 h-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{server.apkSerialNumber || server.ipAddress}</div>
                          <div className="text-sm text-gray-500">{server.hostname}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Номер заявки Ядро */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Номер заявки в Ядро
              </label>
              <input
                type="text"
                value={formData.yadroTicketNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, yadroTicketNumber: e.target.value }))}
                placeholder="INC123456"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Код кластера
              </label>
              <input
                type="text"
                value={formData.clusterCode}
                onChange={(e) => setFormData(prev => ({ ...prev, clusterCode: e.target.value }))}
                placeholder="cl1-master1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              />
            </div>
          </div>

          {/* Приоритет и СПиСИ */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Приоритет
              </label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value as TicketPriority }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                {PRIORITIES.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center">
              <label className="flex items-center gap-2 cursor-pointer mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasSPISI}
                  onChange={(e) => setFormData(prev => ({ ...prev, hasSPISI: e.target.checked }))}
                  className="w-4 h-4 text-red-600 rounded"
                />
                <span className="text-sm text-gray-700">Наличие СПиСИ</span>
              </label>
            </div>
          </div>

          {/* Тип дефекта */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Тип дефектного компонента
            </label>
            <select
              value={formData.repairPartType}
              onChange={(e) => setFormData(prev => ({ ...prev, repairPartType: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
            >
              <option value="">Не определён</option>
              {partTypes.map((type) => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
          </div>

          {/* Серийные номера дефектного компонента */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S/N дефектной детали (Ядро)
              </label>
              <input
                type="text"
                value={formData.defectPartSerialYadro}
                onChange={(e) => setFormData(prev => ({ ...prev, defectPartSerialYadro: e.target.value }))}
                placeholder="Y1P6A0GN2E02B"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                S/N дефектной детали (Производитель)
              </label>
              <input
                type="text"
                value={formData.defectPartSerialManuf}
                onChange={(e) => setFormData(prev => ({ ...prev, defectPartSerialManuf: e.target.value }))}
                placeholder="ZRT0LJEG"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 font-mono"
              />
            </div>
          </div>

          {/* Описание проблемы */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Описание проблемы <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.problemDescription}
              onChange={(e) => setFormData(prev => ({ ...prev, problemDescription: e.target.value }))}
              rows={4}
              placeholder="Опишите выявленный дефект..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>

          {/* Примечания */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Примечания
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={2}
              placeholder="Дополнительная информация..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
            />
          </div>
        </form>

        {/* Кнопки */}
        <div className="px-6 py-4 border-t bg-gray-50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !formData.serverId}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Создать запись
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefectRecordModal;
