import { Trash2 } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { Context } from "src/main";

interface One24BoardItem {
  MAC_address: string;
  firmware: boolean;
  sessionId: number;
  categoryDefectedId: number;
  createdAt: string;
  deleteBoard: () => void;
}

export const Elrs24BoardItem: React.FC<One24BoardItem> = observer(
  ({
    MAC_address,
    firmware,
    sessionId,
    categoryDefectedId,
    createdAt,
    deleteBoard,
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { elrsStore, user } = context;

    const currentSession = elrsStore.sessions.find(
      (session) => session.id === sessionId
    );

    const currentPC = elrsStore.PCs.find(
      (pc) => pc.id === currentSession?.PCId
    );

    const currentDefect = elrsStore.defect_2_4_Categories.find(
      (defect) => defect.id === categoryDefectedId
    );

    const currentUser = elrsStore.users.find(
      (user) => user.id === currentSession?.userId
    );

    const [modalType, setModalType] = useState<string | null>(null);

    const openModal = (type: string) => setModalType(type);
    const closeModal = () => setModalType(null);

    return (
      <tr className="text-center hover:bg-gray-500 transition odd:bg-gray-200 even:bg-white">
        <td className="px-4 py-2 border">{MAC_address}</td>
        <td className="px-4 py-2 border">
          {firmware ? "прошито ✅" : "не прошито ❌"}
        </td>
        <td className="px-4 py-2 border">{currentPC?.pc_name}</td>
        <td className="px-4 py-2 border">
          {currentUser?.name} {currentUser?.surname}
        </td>
        <td className="px-4 py-2 border">{currentDefect?.title}</td>
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
            title1={`Удалить приемник 2.4 ${MAC_address} ${createdAt} ?`}
            actionConfirm={deleteBoard}
            onClose={closeModal}
          />
        </Modal>
      </tr>
    );
  }
);
