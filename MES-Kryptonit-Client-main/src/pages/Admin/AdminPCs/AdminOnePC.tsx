import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Modal } from "src/components/Modal/Modal";
import { AdminEditPC } from "./AdminEditPC";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";

interface OnePCProps {
  deleteComputer: () => void;
  updatePCList: () => void;
  PCname: string;
  IP: string;
  cabinet: string;
  ID: number;
}

export const AdminOnePC: React.FC<OnePCProps> = ({
  deleteComputer,
  updatePCList,
  PCname,
  IP,
  cabinet,
  ID,
}) => {
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  return (
    <div className="bg-white p-4 rounded-lg shadow-lg border-l-4 border-blue-500 transition duration-300 hover:shadow-xl relative">
      <h3 className="text-xl font-bold text-gray-800 mb-2">Имя пк: {PCname}</h3>
      <p className="text-gray-600">
        <span className="font-semibold">IP:</span> {IP}
      </p>
      <p className="text-gray-600">
        <span className="font-semibold">Кабинет:</span> {cabinet}
      </p>

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
          onClick={() => openModal("computerDelete")}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <Modal isOpen={modalType === "computerDelete"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить компьютер ${PCname} ?`}
          actionConfirm={deleteComputer}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modalType === "computerEdit"} onClose={closeModal}>
        <AdminEditPC
          ID={ID}
          PCname={PCname}
          IP={IP}
          Cabinet={cabinet}
          updatePCList={updatePCList}
        />
      </Modal>
    </div>
  );
};
