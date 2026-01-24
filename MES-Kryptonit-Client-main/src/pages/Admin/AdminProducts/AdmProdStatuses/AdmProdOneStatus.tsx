import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { AdmProdEditStatus } from "./AdmProdEditStatus";

interface OneStatusProps {
  deleteStatus: () => void;
  updateStatusList: () => void;
  title: string;
  ID: number;
}

export const AdmProdOneStatus: React.FC<OneStatusProps> = ({
  deleteStatus,
  updateStatusList,
  title,
  ID,
}) => {
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500 transition duration-300 hover:shadow-xl relative">
      <h3 className="text-xl font-bold text-gray-800 mb-2 mr-16">
        Наименование статуса: <br></br>
        {title}
      </h3>
      <p>id: {ID}</p>

      {/* Кнопки редактирования и удаления */}
      <div className="absolute top-4 right-4 flex space-x-2">
        <button
          onClick={() => openModal("computerEdit")}
          className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition"
        >
          <Pencil size={18} />
        </button>
        <button
          className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition"
          onClick={() => openModal("statusDelete")}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <Modal isOpen={modalType === "statusDelete"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить статус ${title} ?`}
          actionConfirm={deleteStatus}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modalType === "computerEdit"} onClose={closeModal}>
        <AdmProdEditStatus
          updateStatusList={updateStatusList}
          title={title}
          ID={ID}
          key={ID}
        />
      </Modal>
    </div>
  );
};
