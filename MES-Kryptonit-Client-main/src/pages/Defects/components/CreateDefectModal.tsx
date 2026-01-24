import React, { useState, useEffect } from "react";
import { X, AlertTriangle, ChevronRight } from "lucide-react";
import { fetchDefectCategories, createDefect } from "src/api/defectApi";
import {
  DefectCategory,
  BoardType,
  BOARD_TYPE_LABELS
} from "src/types/DefectTypes";

interface Props {
  onClose: () => void;
  onCreated: () => void;
  // Предзаполнение (если открыли из карточки платы)
  initialBoardType?: BoardType;
  initialSerialNumber?: string;
  initialBoardId?: number;
}

export const CreateDefectModal: React.FC<Props> = ({
  onClose,
  onCreated,
  initialBoardType,
  initialSerialNumber,
  initialBoardId
}) => {
  // Шаги
  const [step, setStep] = useState(initialBoardType ? 2 : 1);
  
  // Данные формы
  const [boardType, setBoardType] = useState<BoardType | "">(initialBoardType || "");
  const [serialNumber, setSerialNumber] = useState(initialSerialNumber || "");
  const [noSerial, setNoSerial] = useState(false);
  const [categoryId, setCategoryId] = useState<number | "">("");
  const [description, setDescription] = useState("");
  
  // Категории
  const [categories, setCategories] = useState<DefectCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  
  // Состояние
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Загрузка категорий при выборе типа платы
  useEffect(() => {
    if (boardType) {
      setLoadingCategories(true);
      fetchDefectCategories(boardType, true)
        .then(setCategories)
        .catch(e => console.error(e))
        .finally(() => setLoadingCategories(false));
    }
  }, [boardType]);

  // Переход к шагу 2
  const goToStep2 = () => {
    if (!boardType) {
      setError("Выберите тип платы");
      return;
    }
    setError("");
    setStep(2);
  };

  // Создание дефекта
  const handleSubmit = async () => {
    if (!categoryId) {
      setError("Выберите категорию дефекта");
      return;
    }
    
    setLoading(true);
    setError("");
    
    try {
      await createDefect({
        boardType: boardType as BoardType,
        boardId: initialBoardId || null,
        serialNumber: noSerial ? null : (serialNumber || null),
        categoryId: categoryId as number,
        description: description || undefined
      });
      
      onCreated();
    } catch (e: any) {
      setError(e.response?.data?.message || "Ошибка при создании");
    } finally {
      setLoading(false);
    }
  };

  // Группировка категорий по severity
  const criticalCategories = categories.filter(c => c.severity === "CRITICAL");
  const majorCategories = categories.filter(c => c.severity === "MAJOR");
  const minorCategories = categories.filter(c => c.severity === "MINOR");

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-orange-500 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertTriangle size={24} />
            <div>
              <h2 className="text-lg font-bold">Регистрация брака</h2>
              <p className="text-orange-100 text-sm">Шаг {step} из 2</p>
            </div>
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
          {step === 1 ? (
            // ШАГ 1: Выбор платы
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Тип платы *
                </label>
                <div className="grid grid-cols-1 gap-2">
                  {(Object.keys(BOARD_TYPE_LABELS) as BoardType[]).map(type => (
                    <button
                      key={type}
                      onClick={() => setBoardType(type)}
                      className={`p-3 border-2 rounded-xl text-left transition-all ${
                        boardType === type
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <span className="font-medium">{BOARD_TYPE_LABELS[type]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Серийный номер / QR
                </label>
                <input
                  type="text"
                  value={serialNumber}
                  onChange={e => setSerialNumber(e.target.value)}
                  disabled={noSerial}
                  placeholder="Введите серийник..."
                  className={`w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 ${
                    noSerial ? "bg-gray-100 text-gray-400" : ""
                  }`}
                />
                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={noSerial}
                    onChange={e => {
                      setNoSerial(e.target.checked);
                      if (e.target.checked) setSerialNumber("");
                    }}
                    className="w-4 h-4 rounded border-gray-300 text-orange-500 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-600">Серийник отсутствует / не читается</span>
                </label>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <button
                onClick={goToStep2}
                disabled={!boardType}
                className="w-full py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold flex items-center justify-center gap-2 transition-all"
              >
                Далее
                <ChevronRight size={18} />
              </button>
            </>
          ) : (
            // ШАГ 2: Описание дефекта
            <>
              {/* Показываем выбранную плату */}
              <div className="mb-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-sm text-gray-500">Плата:</span>
                  <span className="ml-2 font-medium">{BOARD_TYPE_LABELS[boardType as BoardType]}</span>
                  {serialNumber && (
                    <>
                      <span className="mx-2 text-gray-300">|</span>
                      <span className="font-mono text-sm">{serialNumber}</span>
                    </>
                  )}
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-orange-500 hover:text-orange-600"
                >
                  Изменить
                </button>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Категория дефекта *
                </label>
                
                {loadingCategories ? (
                  <div className="p-4 text-center text-gray-500">Загрузка...</div>
                ) : (
                  <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                    {/* Критические */}
                    {criticalCategories.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-red-600 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                          КРИТИЧЕСКИЕ
                        </div>
                        {criticalCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryId(cat.id)}
                            className={`w-full p-3 mb-1 border-2 rounded-lg text-left transition-all ${
                              categoryId === cat.id
                                ? "border-red-500 bg-red-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="font-medium">{cat.title}</div>
                            {cat.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Серьёзные */}
                    {majorCategories.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-yellow-600 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                          СЕРЬЁЗНЫЕ
                        </div>
                        {majorCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryId(cat.id)}
                            className={`w-full p-3 mb-1 border-2 rounded-lg text-left transition-all ${
                              categoryId === cat.id
                                ? "border-yellow-500 bg-yellow-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="font-medium">{cat.title}</div>
                            {cat.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                    
                    {/* Незначительные */}
                    {minorCategories.length > 0 && (
                      <div>
                        <div className="text-xs font-semibold text-gray-500 mb-1 flex items-center gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                          НЕЗНАЧИТЕЛЬНЫЕ
                        </div>
                        {minorCategories.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setCategoryId(cat.id)}
                            className={`w-full p-3 mb-1 border-2 rounded-lg text-left transition-all ${
                              categoryId === cat.id
                                ? "border-gray-500 bg-gray-50"
                                : "border-gray-200 hover:border-gray-300"
                            }`}
                          >
                            <div className="font-medium">{cat.title}</div>
                            {cat.description && (
                              <div className="text-xs text-gray-500 mt-0.5">{cat.description}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Описание (опционально)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  rows={3}
                  placeholder="Опишите проблему подробнее..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 resize-none"
                />
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-all"
                >
                  Назад
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={loading || !categoryId}
                  className="flex-1 py-3 bg-orange-500 hover:bg-orange-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-semibold transition-all"
                >
                  {loading ? "Сохранение..." : "Зарегистрировать"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
