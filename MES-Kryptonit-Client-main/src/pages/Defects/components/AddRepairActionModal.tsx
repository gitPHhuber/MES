import React, { useState } from "react";
import { X, Wrench } from "lucide-react";
import { addRepairAction } from "src/api/defectApi";
import {
  ActionType,
  ActionResult,
  BoardType,
  ACTION_TYPE_LABELS,
  ACTION_TYPE_ICONS,
  ACTION_RESULT_LABELS
} from "src/types/DefectTypes";

interface Props {
  defectId: number;
  boardType: BoardType;
  onClose: () => void;
  onAdded: () => void;
}

// Типы действий для разных плат
const getActionTypes = (boardType: BoardType): ActionType[] => {
  const common: ActionType[] = ["DIAGNOSIS", "SOLDER", "REPLACE", "FLASH", "TEST", "CLEAN", "OTHER"];
  
  if (boardType === "SMARAGD") {
    return ["DIAGNOSIS", "SOLDER", "REPLACE", "FLASH", "TEST", "CLEAN", "CLONE_DISK", "CABLE_REPLACE", "OTHER"];
  }
  
  return common;
};

export const AddRepairActionModal: React.FC<Props> = ({
  defectId,
  boardType,
  onClose,
  onAdded
}) => {
  const [actionType, setActionType] = useState<ActionType | "">("");
  const [description, setDescription] = useState("");
  const [timeSpent, setTimeSpent] = useState("");
  const [result, setResult] = useState<ActionResult>("PENDING");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const availableActionTypes = getActionTypes(boardType);

  const handleSubmit = async () => {
    if (!actionType) {
      setError("Выберите тип действия");
      return;
    }
    if (!description.trim()) {
      setError("Введите описание");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await addRepairAction(defectId, {
        actionType,
        description: description.trim(),
        timeSpentMinutes: timeSpent ? Number(timeSpent) : undefined,
        result
      });
      
      onAdded();
    } catch (e: any) {
      setError(e.response?.data?.message || "Ошибка при сохранении");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-blue-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench size={24} />
            <h2 className="text-lg font-bold">Добавить действие</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          {/* Тип действия */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Что делали *
            </label>
            <div className="grid grid-cols-3 gap-2">
              {availableActionTypes.map(type => (
                <button
                  key={type}
                  onClick={() => setActionType(type)}
                  className={`p-3 border-2 rounded-xl text-center transition-all ${
                    actionType === type
                      ? "border-blue-500 bg-blue-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="text-2xl block mb-1">{ACTION_TYPE_ICONS[type]}</span>
                  <span className="text-xs font-medium">{ACTION_TYPE_LABELS[type]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Описание */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Описание *
            </label>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
              placeholder="Что конкретно сделали..."
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
            />
          </div>

          {/* Время и результат */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Время (минут)
              </label>
              <input
                type="number"
                value={timeSpent}
                onChange={e => setTimeSpent(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Результат
              </label>
              <select
                value={result}
                onChange={e => setResult(e.target.value as ActionResult)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500"
              >
                <option value="PENDING">В процессе</option>
                <option value="SUCCESS">Успешно</option>
                <option value="PARTIAL">Частично</option>
                <option value="FAILED">Неудача</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
            >
              Отмена
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !actionType || !description.trim()}
              className="flex-1 py-3 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
            >
              {loading ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
