interface ConfirmModalProps {
  title1: string;
  actionConfirm: () => void;
  onClose: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  title1,
  actionConfirm,
  onClose,
}) => {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <h2 className="text-xl font-bold text-gray-800">Вы уверены?</h2>
      <p className="text-gray-600 mt-2">{title1}</p>

      <div className="flex justify-center gap-4 mt-6 w-full max-w-xs">
        <button
          type="button"
          className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg"
          onClick={actionConfirm}
        >
          ✅ ДА
        </button>
        <button
          type="button"
          className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition font-semibold shadow-lg"
          onClick={onClose}
        >
          ❌ Отмена
        </button>
      </div>
    </div>
  );
};
