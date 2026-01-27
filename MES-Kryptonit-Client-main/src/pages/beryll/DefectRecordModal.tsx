/**
 * DefectRecordModal.tsx - Форма создания/редактирования записи о браке
 * 
 * ПОЛНЫЙ НАБОР ПОЛЕЙ из Excel:
 * - Номер заявки в Ядре
 * - Серийный номер сервера
 * - Наличие СПиСИ
 * - Кластер
 * - Заявленная проблема
 * - Дата обнаружения
 * - Диагностик
 * - Тип детали
 * - S/N бракованной детали (Ядро + производитель)
 * - S/N замены (Ядро + производитель)
 * - Примечания
 * - Повторный брак (причина, дата)
 * - Сервер для подмены
 * - Отправка в Ядро / Возврат из Ядро
 * 
 * Положить в: MES-Kryptonit-Client-main/src/pages/Beryll/components/DefectRecordModal.tsx
 */

import React, { useState, useEffect } from "react";
import { X, AlertTriangle, Server, Loader2 } from "lucide-react";
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

const DefectRecordModal: React.FC<Props> = ({ 
  isOpen, onClose, onSuccess, servers, users, editRecord 
}) => {
  const [loading, setLoading] = useState(false);
  
  // Основные поля
  const [serverId, setServerId] = useState<number | "">("");
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
  
  // Подмена
  const [substituteServerSerial, setSubstituteServerSerial] = useState("");
  
  // Ядро
  const [sentToYadroAt, setSentToYadroAt] = useState("");
  const [returnedFromYadroAt, setReturnedFromYadroAt] = useState("");

  // Инициализация при редактировании
  useEffect(() => {
    if (editRecord) {
      setServerId(editRecord.serverId);
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
      setServerId("");
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
  }, [editRecord, isOpen]);

  const handleSubmit = async () => {
    if (!serverId) {
      toast.error("Выберите сервер");
      return;
    }
    if (!problemDescription.trim()) {
      toast.error("Укажите описание проблемы");
      return;
    }

    setLoading(true);
    try {
      const data = {
        serverId: Number(serverId),
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-red-50">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={20} />
            {editRecord ? "Редактирование записи о браке" : "Новая запись о браке"}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-red-100 rounded-lg">
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* === ЛЕВАЯ КОЛОНКА === */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b pb-2">Основная информация</h3>
              
              {/* Сервер */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сервер <span className="text-red-500">*</span>
                </label>
                <select
                  value={serverId}
                  onChange={(e) => setServerId(e.target.value ? Number(e.target.value) : "")}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500"
                >
                  <option value="">-- Выберите сервер --</option>
                  {servers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.apkSerialNumber} {s.hostname ? `(${s.hostname})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* Номер заявки */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Номер заявки в Ядре
                </label>
                <input
                  type="text"
                  value={yadroTicketNumber}
                  onChange={(e) => setYadroTicketNumber(e.target.value)}
                  placeholder="INC123456"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* СПиСИ + Кластер */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Наличие СПиСИ
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasSPISI}
                      onChange={(e) => setHasSPISI(e.target.checked)}
                      className="w-4 h-4 rounded"
                    />
                    <span>Да</span>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Кластер
                  </label>
                  <input
                    type="text"
                    value={clusterCode}
                    onChange={(e) => setClusterCode(e.target.value)}
                    placeholder="240008"
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
              </div>
              
              {/* Проблема */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заявленная проблема <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={problemDescription}
                  onChange={(e) => setProblemDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="Описание проблемы..."
                />
              </div>
              
              {/* Дата + Диагностик */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Дата обнаружения
                  </label>
                  <input
                    type="date"
                    value={detectedAt}
                    onChange={(e) => setDetectedAt(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Диагностик
                  </label>
                  <select
                    value={diagnosticianId}
                    onChange={(e) => setDiagnosticianId(e.target.value ? Number(e.target.value) : "")}
                    className="w-full px-3 py-2 border rounded-lg"
                  >
                    <option value="">-- Выберите --</option>
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
            
            {/* === ПРАВАЯ КОЛОНКА === */}
            <div className="space-y-4">
              <h3 className="font-medium text-gray-700 border-b pb-2">Детали ремонта</h3>
              
              {/* Тип детали */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Тип детали
                </label>
                <select
                  value={repairPartType}
                  onChange={(e) => setRepairPartType(e.target.value as RepairPartType)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="">-- Не определён --</option>
                  {PART_TYPES.map(pt => (
                    <option key={pt.value} value={pt.value}>{pt.label}</option>
                  ))}
                </select>
              </div>
              
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
                  Детали ремонта / Результат диагностики
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
              
              {/* Подмена */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Сервер для подмены (S/N)
                </label>
                <input
                  type="text"
                  value={substituteServerSerial}
                  onChange={(e) => setSubstituteServerSerial(e.target.value)}
                  placeholder="Серийный номер"
                  className="w-full px-3 py-2 border rounded-lg"
                />
              </div>
              
              {/* Ядро */}
              <div className="p-3 bg-indigo-50 rounded-lg">
                <label className="block text-sm font-medium text-indigo-700 mb-2">
                  Отправка в Ядро
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-xs text-gray-500">Отправлен</span>
                    <input
                      type="date"
                      value={sentToYadroAt}
                      onChange={(e) => setSentToYadroAt(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <span className="text-xs text-gray-500">Возвращён</span>
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

        {/* Footer */}
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