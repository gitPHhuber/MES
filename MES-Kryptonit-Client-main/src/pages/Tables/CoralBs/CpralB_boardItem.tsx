import { Trash2 } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { Context } from "src/main";

interface OneCoralB_boardItem {
  serial: string;
  firmware: boolean;
  SAW_filter: boolean;
  firmwareVersion: string;
  sessionId: number;
  categoryDefectedId: number;
  createdAt: string;
  deleteBoard: () => void;
}

export const CoralB_boardItem: React.FC<OneCoralB_boardItem> = observer(
  ({
    serial,
    firmware,
    SAW_filter,
    firmwareVersion,
    sessionId,
    categoryDefectedId,
    createdAt,
    deleteBoard,
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { coralBStore, user } = context;

    const [modalType, setModalType] = useState<string | null>(null);

    const currentSession = coralBStore.sessions.find(
      (session) => session.id === sessionId
    );

    const currentPC = coralBStore.PCs.find(
      (pc) => pc.id === currentSession?.PCId
    );

    const currentDefect = coralBStore.defect_coral_B_categories.find(
      (defect) => defect.id === categoryDefectedId
    );

    const currentUser = coralBStore.users.find(
      (user) => user.id === currentSession?.userId
    );

    const openModal = (type: string) => setModalType(type);
    const closeModal = () => setModalType(null);

    return (
      <tr className="text-center hover:bg-gray-500 transition odd:bg-gray-200 even:bg-white">
        <td className="px-4 py-2 border">{serial}</td>
        <td className="px-4 py-2 border">
          {firmware ? "прошито ✅" : "не прошито ❌"}
        </td>
        <td className="px-4 py-2 border">
          {SAW_filter ? "c ПАВ ⏹︎" : "без ПАВ ◻︎"}
        </td>
        <td className="px-4 py-2 border">{firmwareVersion}</td>

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
            title1={`Удалить плату Coral B ${serial} ${createdAt} ?`}
            actionConfirm={deleteBoard}
            onClose={closeModal}
          />
        </Modal>
      </tr>
    );
  }
);
