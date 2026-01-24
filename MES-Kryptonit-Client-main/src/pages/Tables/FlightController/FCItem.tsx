import { Trash2 } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { Context } from "src/main";

interface OneFCItem {
  unique_device_id: string;
  firmware: boolean;
  sessionId: number;
  categoryDefectedId: number;
  createdAt: string;
  stand_test: boolean;
  deleteFC: () => void;
}

export const FCItem: React.FC<OneFCItem> = observer(
  ({
    unique_device_id,
    firmware,
    sessionId,
    categoryDefectedId,
    createdAt,
    stand_test,
    deleteFC,
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { flightController, user } = context;

    const currentSession = flightController.sessions.find(
      (session) => session.id === sessionId
    );

    const currentPC = flightController.PCs.find(
      (pc) => pc.id === currentSession?.PCId
    );

    const currentDefect = flightController.defectCategories.find(
      (defect) => defect.id === categoryDefectedId
    );

    const currentUser = flightController.users.find(
      (user) => user.id === currentSession?.userId
    );

    const [modalType, setModalType] = useState<string | null>(null);

    const openModal = (type: string) => setModalType(type);
    const closeModal = () => setModalType(null);

    return (
      <tr className="text-center hover:bg-gray-500 transition odd:bg-gray-200 even:bg-white">
        <td className="px-4 py-2 border">{unique_device_id}</td>
        <td className="px-4 py-2 border">
          {firmware ? "прошито ✅" : "не прошито ❌"}
        </td>
        <td className="px-4 py-2 border">{currentPC?.pc_name}</td>
        <td className="px-4 py-2 border">
          {currentUser?.name} {currentUser?.surname}
        </td>
        <td className="px-4 py-2 border">{currentDefect?.title}</td>
        <td className="px-4 py-2 border">
          {stand_test === true ? "пройден ✅" : stand_test === false ? "не пройден ❌" : ""}
        </td>
        <td className="px-4 py-2 border">{createdAt}</td>
        {user.isAdmin && (
          <td>
            {" "}
            <button
              className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition"
              onClick={() => openModal("computerDelete")}
            >
              <Trash2 size={15} />
            </button>
          </td>
        )}

        <Modal isOpen={modalType === "computerDelete"} onClose={closeModal}>
          <ConfirmModal
            title1={`Удалить полетный контроллер  ${unique_device_id} ${createdAt} ?`}
            actionConfirm={deleteFC}
            onClose={closeModal}
          />
        </Modal>
      </tr>
    );
  }
);
