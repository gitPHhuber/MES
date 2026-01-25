import { useState } from "react";
import { updatePC } from "src/api/fcApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";

interface AdminEditPCProps {
  updatePCList: () => void;
  PCname: string;
  IP: string;
  Cabinet: string;
  ID: number;
}

export const AdminEditPC: React.FC<AdminEditPCProps> = ({
  updatePCList,

  IP,
  PCname,
  Cabinet,
  ID,
}) => {
  const [ip, SetIp] = useState(IP);
  const [pc_name, SetPc_name] = useState(PCname);
  const [cabinet, SetCabinet] = useState(Cabinet);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState(false);

  const editPC = async () => {
    try {
      await updatePC(ID, ip, pc_name, cabinet);

      SetIp("");
      SetPc_name("");
      SetCabinet("");
      setSuccessMessage("Компьютер успешно изменен");
      setErrorMessage("");
      setRequestId(null);
      updatePCList();
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при изменении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      console.log(error.response.data.message);
      setSuccessMessage("");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Изменить компьютер</h2>
      <form>
        <input
          type="text"
          placeholder="Имя компьютера"
          className="w-full p-2 border rounded-lg mb-2"
          value={pc_name}
          onChange={(e) => SetPc_name(e.target.value)}
        />
        <input
          type="text"
          placeholder="IP-адрес"
          className="w-full p-2 border rounded-lg mb-2"
          value={ip}
          onChange={(e) => SetIp(e.target.value)}
        />
        <input
          type="text"
          placeholder="Кабинет"
          className="w-full p-2 border rounded-lg mb-2"
          value={cabinet}
          onChange={(e) => SetCabinet(e.target.value)}
        />
        <button
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          type="button"
          onClick={() => setConfirm(true)}
        >
          Изменить
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

      {confirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 text-center animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Вы уверены?</h2>
            <p className="text-gray-600 mt-2">Изменить этот компьютер?</p>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg mr-2"
                onClick={() => {
                  editPC();
                  setConfirm(false);
                }}
              >
                ✅ Да, изменить
              </button>
              <button
                type="button"
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition font-semibold shadow-lg ml-2"
                onClick={() => setConfirm(false)}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
