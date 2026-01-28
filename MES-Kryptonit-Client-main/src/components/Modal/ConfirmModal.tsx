import React from "react";

interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  confirmColor?: "red" | "green" | "blue";
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "Подтверждение",
  message = "Вы уверены?",
  onConfirm,
  onCancel,
  confirmText = "✅ ДА",
  cancelText = "❌ Отмена",
  confirmColor = "green"
}) => {
  if (!isOpen) return null;

  const confirmColorClasses = {
    red: "bg-red-600 hover:bg-red-700",
    green: "bg-emerald-600 hover:bg-emerald-700",
    blue: "bg-blue-600 hover:bg-blue-700"
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full mx-4">
        <div className="flex flex-col items-center justify-center text-center">
          {title && (
            <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          )}
          {message && (
            <p className="text-gray-600 mt-2">{message}</p>
          )}
          <div className="flex justify-center gap-4 mt-6 w-full">
            <button
              type="button"
              className={`flex-1 ${confirmColorClasses[confirmColor]} text-white py-3 rounded-lg transition font-semibold shadow-lg`}
              onClick={onConfirm}
            >
              {confirmText}
            </button>
            <button
              type="button"
              className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition font-semibold shadow-lg"
              onClick={onCancel}
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;