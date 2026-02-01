/**
 * DefectRecordModal.tsx
 * 
 * ИСПРАВЛЕНО: 
 * 1. Добавлена возможность ввода серийника сервера вручную (даже если сервера нет в базе)
 * 2. Показывается apkSerialNumber вместо #id
 * 3. Используется combobox с поиском и ручным вводом
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { X, AlertTriangle, Server, Loader2, Search, ChevronDown } from "lucide-react";
import toast from "react-hot-toast";
import { createDefectRecord, updateDefectRecord, BeryllDefectRecord, RepairPartType } from "src/api/beryllApi";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  servers: Array<{ id: number; apkSerialNumber: string; hostname?: string }>;
  users: Array<{ id: number; name: string; surname: string }>;
  editRecord?: BeryllDefectRecord | null;
}

const PART_TYPES: Array<{ value: RepairPartType; label: string }> = [
  { value: "RAM", label: "ОЗУ" },
  { value: "MOTHERBOARD", label: "Материнская плата" },
  { value: "CPU", label: "Процессор" },
  { value: "HDD", label: "HDD диск" },
  { value: "SSD", label: "SSD диск" },
  { value: "PSU", label: "Блок питания" },
  { value: "FAN", label: "Вентилятор" },
  { value: "RAID", label: "RAID контроллер" },
  { value: "NIC", label: "Сетевая карта" },
  { value: "BACKPLANE", label: "Backplane" },
  { value: "BMC", label: "BMC модуль" },
  { value: "CABLE", label: "Кабель" },
  { value: "OTHER", label: "Другое" },
];

/**
 * Компонент комбо-бокса с поиском и возможностью ручного ввода
 */
interface ServerComboboxProps {
  servers: Array<{ id: number; apkSerialNumber: string; hostname?: string }>;
  value: { serverId: number | null; serverSerial: string };
  onChange: (value: { serverId: number | null; serverSerial: string }) => void;
  placeholder?: string;
}

const ServerCombobox: React.FC<ServerComboboxProps> = ({
  servers,
  value,
  onChange,
  placeholder = "Поиск по S/N, hostname..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState(value.serverSerial || "");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Фильтрация серверов
  const filteredServers = useMemo(() => {
    if (!search.trim()) return servers.slice(0, 20);
    const q = search.toLowerCase();
    return servers.filter(s => 
      s.apkSerialNumber?.toLowerCase().includes(q) ||
      s.hostname?.toLowerCase().includes(q)
    ).slice(0, 20);
  }, [servers, search]);

  // Закрытие при клике вне компонента
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Синхронизация поля ввода с value
  useEffect(() => {
    if (value.serverSerial && value.serverSerial !== search) {
      setSearch(value.serverSerial);
    }
  }, [value.serverSerial]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearch(newValue);
    setIsOpen(true);
    
    // Проверяем, есть ли точное совпадение
    const exactMatch = servers.find(s => 
      s.apkSerialNumber?.toLowerCase() === newValue.toLowerCase()
    );
    
    if (exactMatch) {
      onChange({ serverId: exactMatch.id, serverSerial: exactMatch.apkSerialNumber });
    } else {
      // Ручной ввод - serverId = null
      onChange({ serverId: null, serverSerial: newValue });
    }
  };

  const handleSelect = (server: { id: number; apkSerialNumber: string; hostname?: string }) => {
    setSearch(server.apkSerialNumber);
    onChange({ serverId: server.id, serverSerial: server.apkSerialNumber });
    setIsOpen(false);
  };

  const handleFocus = () => {
    setIsOpen(true);
  };

  // Отображаемое значение
  const displayValue = search || "";

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
        <input
          ref={inputRef}
          type="text"
          value={displayValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder={placeholder}
          className="w-full pl-9 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
        >
          <ChevronDown size={16} className={`text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {/* Выпадающий список */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredServers.length === 0 ? (
            <div className="p-3 text-sm text-gray-500">
              {search.trim() ? (
                <div>
                  <p>Серверов не найдено</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Серийник "{search}" будет сохранён как есть
                  </p>
                </div>
              ) : (
                "Начните вводить серийный номер..."
              )}
            </div>
          ) : (
            <>
              {/* Если введён текст, которого нет в списке — показать опцию ручного ввода */}
              {search.trim() && !filteredServers.some(s => 
                s.apkSerialNumber?.toLowerCase() === search.toLowerCase()
              ) && (
                <div 
                  className="px-3 py-2 text-sm bg-amber-50 border-b cursor-pointer hover:bg-amber-100"
                  onClick={() => {
                    onChange({ serverId: null, serverSerial: search });
                    setIsOpen(false);
                  }}
                >
                  <span className="text-amber-700">Использовать: </span>
                  <span className="font-mono font-medium">{search}</span>
                  <span className="text-xs text-amber-600 ml-2">(ручной ввод)</span>
                </div>
              )}
              
              {filteredServers.map(server => (
                <div
                  key={server.id}
                  onClick={() => handleSelect(server)}
                  className={`px-3 py-2 cursor-pointer hover:bg-gray-100 ${
                    value.serverId === server.id ? 'bg-red-50' : ''
                  }`}
                >
                  <div className="font-mono text-sm font-medium">
                    {server.apkSerialNumber}
                  </div>
                  {server.hostname && (
                    <div className="text-xs text-gray-500">
                      {server.hostname}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* Индикатор режима */}
      {value.serverSerial && (
        <div className="mt-1 text-xs">
          {value.serverId ? (
            <span className="text-green-600">✓ Сервер найден в базе</span>
          ) : (
            <span className="text-amber-600">⚠ Ручной ввод (сервер не в базе)</span>
          )}
        </div>
      )}
    </div>
  );
};

const DefectRecordModal: React.FC<Props> = ({ 
  isOpen, onClose, onSuccess, servers, users, editRecord 
}) => {
  const [loading, setLoading] = useState(false);
  
  // Основная информация
  // ИЗМЕНЕНО: вместо serverId используем объект { serverId, serverSerial }
  const [serverValue, setServerValue] = useState<{ serverId: number | null; serverSerial: string }>({
    serverId: null,
    serverSerial: ""
  });
  const [yadroTicketNumber, setYadroTicketNumber] = useState("");
  const [hasSPISI, setHasSPISI] = useState(false);
  const [clusterCode, setClusterCode] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [detectedAt, setDetectedAt] = useState(new Date().toISOString().split("T")[0]);
  const [diagnosticianId, setDiagnosticianId] = useState<number | "">("");
  
  // Детали ремонта
  const [repairPartType, setRepairPartType] = useState<RepairPartType | "">("");
  const [defectPartSerialYadro, setDefectPartSerialYadro] = useState("");
  const [defectPartSerialManuf, setDefectPartSerialManuf] = useState("");
  const [replacementPartSerialYadro, setReplacementPartSerialYadro] = useState("");
  const [replacementPartSerialManuf, setReplacementPartSerialManuf] = useState("");
  const [diagnosisResult, setDiagnosisResult] = useState("");
  const [notes, setNotes] = useState("");
  
  // Повторный брак
  const [isRepeatedDefect, setIsRepeatedDefect] = useState(false);
  const [repeatedDefectReason, setRepeatedDefectReason] = useState("");
  const [repeatedDefectDate, setRepeatedDefectDate] = useState("");
  
  // Подменный сервер
  const [substituteServerSerial, setSubstituteServerSerial] = useState("");
  
  // Отправка в Ядро
  const [sentToYadroAt, setSentToYadroAt] = useState("");
  const [returnedFromYadroAt, setReturnedFromYadroAt] = useState("");

  // Заполнение формы при редактировании
  useEffect(() => {
    if (editRecord) {
      // Находим сервер в списке
      const server = servers.find(s => s.id === editRecord.serverId);
      setServerValue({
        serverId: editRecord.serverId,
        serverSerial: server?.apkSerialNumber || editRecord.serverSerial || ""
      });
      setYadroTicketNumber(editRecord.yadroTicketNumber || "");
      setHasSPISI(editRecord.hasSPISI || false);
      setClusterCode(editRecord.clusterCode || "");
      setProblemDescription(editRecord.problemDescription || "");
      setDetectedAt(editRecord.detectedAt?.split("T")[0] || "");
      setDiagnosticianId(editRecord.diagnosticianId || "");
      setRepairPartType(editRecord.repairPartType || "");
      setDefectPartSerialYadro(editRecord.defectPartSerialYadro || "");
      setDefectPartSerialManuf(editRecord.defectPartSerialManuf || "");
      setReplacementPartSerialYadro(editRecord.replacementPartSerialYadro || "");
      setReplacementPartSerialManuf(editRecord.replacementPartSerialManuf || "");
      setDiagnosisResult(editRecord.diagnosisResult || "");
      setNotes(editRecord.notes || "");
      setIsRepeatedDefect(editRecord.isRepeatedDefect || false);
      setRepeatedDefectReason(editRecord.repeatedDefectReason || "");
      setRepeatedDefectDate(editRecord.repeatedDefectDate?.split("T")[0] || "");
      setSubstituteServerSerial(editRecord.substituteServerSerial || "");
      setSentToYadroAt(editRecord.sentToYadroAt?.split("T")[0] || "");
      setReturnedFromYadroAt(editRecord.returnedFromYadroAt?.split("T")[0] || "");
    } else {
      // Сброс формы
      setServerValue({ serverId: null, serverSerial: "" });
      setYadroTicketNumber("");
      setHasSPISI(false);
      setClusterCode("");
      setProblemDescription("");
      setDetectedAt(new Date().toISOString().split("T")[0]);
      setDiagnosticianId("");
      setRepairPartType("");
      setDefectPartSerialYadro("");
      setDefectPartSerialManuf("");
      setReplacementPartSerialYadro("");
      setReplacementPartSerialManuf("");
      setDiagnosisResult("");
      setNotes("");
      setIsRepeatedDefect(false);
      setRepeatedDefectReason("");
      setRepeatedDefectDate("");
      setSubstituteServerSerial("");
      setSentToYadroAt("");
      setReturnedFromYadroAt("");
    }
  }, [editRecord, isOpen, servers]);

  const handleSubmit = async () => {
    // Проверка: должен быть либо serverId, либо serverSerial
    if (!serverValue.serverId && !serverValue.serverSerial.trim()) {
      toast.error("Укажите сервер (выберите из списка или введите серийный номер)");
      return;
    }
    if (!problemDescription.trim()) {
      toast.error("Укажите описание проблемы");
      return;
    }

    setLoading(true);
    try {
      const data: any = {
        // ИЗМЕНЕНО: передаём и serverId, и serverSerial
        serverId: serverValue.serverId || undefined,
        serverSerial: serverValue.serverSerial || undefined,
        yadroTicketNumber: yadroTicketNumber || null,
        hasSPISI,
        clusterCode: clusterCode || null,
        problemDescription,
        detectedAt: detectedAt ? new Date(detectedAt).toISOString() : null,
        diagnosticianId: diagnosticianId ? Number(diagnosticianId) : null,
        repairPartType: repairPartType || null,
        defectPartSerialYadro: defectPartSerialYadro || null,
        defectPartSerialManuf: defectPartSerialManuf || null,
        replacementPartSerialYadro: replacementPartSerialYadro || null,
        replacementPartSerialManuf: replacementPartSerialManuf || null,
        diagnosisResult: diagnosisResult || null,
        notes: notes || null,
        isRepeatedDefect,
        repeatedDefectReason: isRepeatedDefect ? repeatedDefectReason : null,
        repeatedDefectDate: isRepeatedDefect && repeatedDefectDate ? new Date(repeatedDefectDate).toISOString() : null,
        substituteServerSerial: substituteServerSerial || null,
        sentToYadroAt: sentToYadroAt ? new Date(sentToYadroAt).toISOString() : null,
        sentToYadroRepair: !!sentToYadroAt,
        returnedFromYadroAt: returnedFromYadroAt ? new Date(returnedFromYadroAt).toISOString() : null,
        returnedFromYadro: !!returnedFromYadroAt,
      };

      if (editRecord) {
        await updateDefectRecord(editRecord.id, data);
        toast.success("Запись обновлена");
      } else {
        await createDefectRecord(data);
        toast.success("Запись создана");
      }
      
      onSuccess();
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.message || "Ошибка сохранения");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Заголовок */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            {editRecord ? "Редактирование записи о браке" : "Добавить запись о браке"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Контент */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Левая колонка */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b pb-2">Основная информация</h3>
              
              {/* ИСПРАВЛЕНО: Сервер - комбобокс с поиском и ручным вводом */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сервер <span className="text-red-500">*</span>
                </label>
                <ServerCombobox
                  servers={servers}
                  value={serverValue}
                  onChange={setServerValue}
                  placeholder="Поиск по S/N, hostname..."
                />
              </div>
              
              {/* Номер заявки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заявка Ядро
                </label>
                <input
                  type="text"
                  value={yadroTicketNumber}
                  onChange={(e) => setYadroTicketNumber(e.target.value)}
                  placeholder="INC123456"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* СПиСИ и Кластер */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Код кластера
                  </label>
                  <input
                    type="text"
                    value={clusterCode}
                    onChange={(e) => setClusterCode(e.target.value)}
                    placeholder="240008"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Наличие СПиСИ
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer mt-2">
                    <input
                      type="checkbox"
                      checked={hasSPISI}
                      onChange={(e) => setHasSPISI(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>Да</span>
                  </label>
                </div>
              </div>
              
              {/* Описание проблемы */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Описание проблемы <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="ECC Error, не работает вентилятор..."
                />
              </div>
              
              {/* Дата и диагностик */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Тип детали
                  </label>
                  <select
                    value={repairPartType}
                    onChange={(e) => setRepairPartType(e.target.value as RepairPartType)}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">— Выб —</option>
                    {PART_TYPES.map(pt => (
                      <option key={pt.value} value={pt.value}>{pt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Диагност
                  </label>
                  <select
                    value={diagnosticianId}
                    onChange={(e) => setDiagnosticianId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">— Выб —</option>
                    {users.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.surname} {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Примечания */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Примечания
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            {/* Правая колонка */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b pb-2">Детали ремонта</h3>
              
              {/* S/N бракованной детали */}
              <div className="p-3 bg-red-50 rounded-lg">
                <label className="block text-sm font-medium text-red-700 mb-2">
                  S/N бракованной детали
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={defectPartSerialYadro}
                    onChange={(e) => setDefectPartSerialYadro(e.target.value)}
                    placeholder="S/N Ядро"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={defectPartSerialManuf}
                    onChange={(e) => setDefectPartSerialManuf(e.target.value)}
                    placeholder="S/N производителя"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              
              {/* S/N замены */}
              <div className="p-3 bg-green-50 rounded-lg">
                <label className="block text-sm font-medium text-green-700 mb-2">
                  S/N замены
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={replacementPartSerialYadro}
                    onChange={(e) => setReplacementPartSerialYadro(e.target.value)}
                    placeholder="S/N Ядро"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                  <input
                    type="text"
                    value={replacementPartSerialManuf}
                    onChange={(e) => setReplacementPartSerialManuf(e.target.value)}
                    placeholder="S/N производителя"
                    className="px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>
              
              {/* Результат диагностики */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Результат диагностики
                </label>
                <textarea
                  value={diagnosisResult}
                  onChange={(e) => setDiagnosisResult(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* Повторный брак */}
              <div className="p-3 bg-orange-50 rounded-lg">
                <label className="flex items-center gap-2 cursor-pointer mb-2">
                  <input
                    type="checkbox"
                    checked={isRepeatedDefect}
                    onChange={(e) => setIsRepeatedDefect(e.target.checked)}
                    className="w-4 h-4 rounded"
                  />
                  <span className="font-medium text-orange-700">Повторный брак</span>
                </label>
                {isRepeatedDefect && (
                  <div className="space-y-2 mt-2">
                    <input
                      type="text"
                      value={repeatedDefectReason}
                      onChange={(e) => setRepeatedDefectReason(e.target.value)}
                      placeholder="Причина повторного брака"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                    <input
                      type="date"
                      value={repeatedDefectDate}
                      onChange={(e) => setRepeatedDefectDate(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                )}
              </div>
              
              {/* Сервер для подмены */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сервер для подмены (S/N)
                </label>
                <input
                  type="text"
                  value={substituteServerSerial}
                  onChange={(e) => setSubstituteServerSerial(e.target.value)}
                  placeholder="Серийный номер подменного сервера"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* Отправка в Ядро */}
              <div className="p-3 bg-indigo-50 rounded-lg">
                <label className="block text-sm font-medium text-indigo-700 mb-2">
                  Отправка в Ядро
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Дата отправки</span>
                    <input
                      type="date"
                      value={sentToYadroAt}
                      onChange={(e) => setSentToYadroAt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Дата возврата</span>
                    <input
                      type="date"
                      value={returnedFromYadroAt}
                      onChange={(e) => setReturnedFromYadroAt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Футер */}
        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded-lg hover:bg-gray-100"
          >
            Отмена
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {editRecord ? "Сохранить" : "Создать запись"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DefectRecordModal;