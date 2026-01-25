import { useState } from "react";
import { createStatus } from "src/api/product_componentApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";

export const CreateProdStatus: React.FC = () => {
  const [title, setTitle] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  const addStatus = async () => {
    try {
      await createStatus(title);

      setTitle("");
      closeModal();
      setSuccessMessage("Статус успешно добавлен");

      setErrorMessage("");
      setRequestId(null);
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при добавлении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      console.log(error.response?.data?.message);
      setSuccessMessage("");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Добавить статус изделия</h2>
      <form>
        <input
          type="text"
          placeholder="Наименование"
          className="w-full p-2 border rounded-lg mb-2"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        <button
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          type="button"
          onClick={() => openModal("statusAdd")}
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

      <Modal isOpen={modalType === "statusAdd"} onClose={closeModal}>
        <ConfirmModal
          title1={`Добавить новый статус ${title} ?`}
          actionConfirm={addStatus}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
};
