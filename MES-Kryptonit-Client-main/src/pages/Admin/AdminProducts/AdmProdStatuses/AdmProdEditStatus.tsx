import { useState } from "react";
import { updateStatus } from "src/api/product_componentApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";

interface AdmProdEditStatusProps {
    updateStatusList: () => void;
    title: string;
    ID: number;
  }

export const AdmProdEditStatus: React.FC<AdmProdEditStatusProps> = ({updateStatusList,title,ID}) => {





  const [newTitle, setNewTitle] = useState(title);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);



  const editStatus = async () => {
    try {
      await updateStatus(ID, newTitle)
      setNewTitle("");
      closeModal();
      setSuccessMessage("Статус успешно изменен");

      setErrorMessage("");
      setRequestId(null);
      updateStatusList();
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при изменении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      console.log(error.response?.data?.message);
      setSuccessMessage("");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Изменить статус изделия</h2>
      <form>
        <input
          type="text"
          placeholder="Наименование"
          className="w-full p-2 border rounded-lg mb-2"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
        />

        <button
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          type="button"
          onClick={() => openModal("statusEdit")}
        >
          Добавить
        </button>
      </form>

      {successMessage && (
        <div className="mt-4 text-green-500 font-medium">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="mt-4 text-red-500 font-medium">
          {errorMessage}
          <RequestIdNotice requestId={requestId} />
        </div>
      )}

      <Modal isOpen={modalType === "statusEdit"} onClose={closeModal}>
        <ConfirmModal
          title1={`Изменить статус ${title} на новый: ${newTitle}?`}
          actionConfirm={editStatus}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
};
