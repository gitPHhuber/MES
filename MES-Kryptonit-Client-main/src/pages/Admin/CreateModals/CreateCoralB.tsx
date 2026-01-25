import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import {
  createCoral_B_Board,
  fetchCategoryDefectCoral_B,
} from "src/api/coralBApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { Context } from "src/main";

export const CreateCoralB: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { coralBStore } = context;

  useEffect(() => {
    fetchCategoryDefectCoral_B().then((data) =>
      coralBStore.setDefect_coral_B_categories(data)
    );
  }, []);

  const [uniqId, SetUniqId] = useState<string | null>("");
  const [firmwareVersion, setFirmwareVersion] = useState<string | null>("");
  const [firmwareState, setFirmwareState] = useState("");
  const [SAWState, setSAWState] = useState("");

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [confirm, setConfirm] = useState(false);

  const addCoralB = async () => {
    const defectCategoryId = Number(coralBStore.selectedDefect?.id ?? 1); //Если selectedDefect равен null, то defectCategoryId примет значение 1
    const sessionId = Number(localStorage.getItem("sessionID"));
    const valueFIRM = firmwareState === "true" ? true : false;
    const valueSAW = SAWState === "true" ? true : false;
    try {
      await createCoral_B_Board(
        uniqId,
        valueFIRM,
        valueSAW,
        firmwareVersion,
        sessionId,
        defectCategoryId
      );

      setSuccessMessage(" успешно добавлен");
      setErrorMessage("");
      setRequestId(null);
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при добавлении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      setSuccessMessage("");
    }
    coralBStore.resetSelectedDefect();
  };

  const categotiesDefects = coralBStore.defect_coral_B_categories.map((el) => (
    <option
      onClick={() => {
        coralBStore.setSelectedDefect(el);
        console.log(coralBStore.selectedDefect);
      }}
      key={el.id}
      value={el.id}
    >
      {el.title}
    </option>
  ));

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Добавить Coral B</h2>
      <form>
        <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-md w-full">
          <input
            type="text"
            placeholder="serial"
            className={`w-full p-2 border rounded-lg transition duration-200 ${
              uniqId === null
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : ""
            }`}
            value={uniqId ?? ""}
            onChange={(e) => SetUniqId(e.target.value)}
            disabled={uniqId === null}
          />

          <button
            type="button"
            onClick={() => SetUniqId(uniqId === null ? "" : null)}
            className={`w-full p-2 rounded-lg font-medium text-white transition duration-200 ${
              uniqId === null ? "bg-red-700" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {uniqId === null ? "serial отсутствует ✓" : "serial отсутствует"}
          </button>
        </div>

        {/* Выбор состояния прошивки */}
        <select
          value={firmwareState}
          onChange={(e) => setFirmwareState(e.target.value)}
          className="w-full p-2 border rounded-lg mb-2"
        >
          <option value="" disabled>
            Плата прошитая?
          </option>
          <option value="true">Да</option>
          <option value="false">Нет</option>
        </select>

        {/* Выбор версии прошивки */}
        <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-md w-full">
          <input
            type="text"
            placeholder="версия прошивки"
            className={`w-full p-2 border rounded-lg transition duration-200 ${
              firmwareVersion === null
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : ""
            }`}
            value={firmwareVersion ?? ""}
            onChange={(e) => setFirmwareVersion(e.target.value)}
            disabled={firmwareVersion === null}
          />

          <button
            type="button"
            onClick={() => setFirmwareVersion(firmwareVersion === null ? "" : null)}
            className={`w-full p-2 rounded-lg font-medium text-white transition duration-200 ${
              firmwareVersion === null ? "bg-red-700" : "bg-red-500 hover:bg-red-600"
            }`}
          >
            {firmwareVersion === null ? "версия прошивки отсутствует ✓" : "версия прошивки отсутствует"}
          </button>
        </div>

        {/* Выбор ПАВ */}
        <select
          value={SAWState}
          onChange={(e) => setSAWState(e.target.value)}
          className="w-full p-2 border rounded-lg mb-2"
        >
          <option value="" disabled>
            Плата c ПАВ
          </option>
          <option value="true">с ПАВ</option>
          <option value="false">без ПАВ</option>
        </select>

        {/* Выбор категории дефекта */}
        <select
          className="w-full p-2 border rounded-lg mb-2"
          onChange={(e) => {
            const selectedDefect = coralBStore.defect_coral_B_categories.find(
              (defect) => defect.id === Number(e.target.value)
            );
            if (selectedDefect) coralBStore.setSelectedDefect(selectedDefect);
          }}
        >
          <option value="" disabled>
            Выберите категорию брака
          </option>
          {categotiesDefects}
        </select>

        <button
          className="w-full bg-emerald-600 text-white py-2 rounded-lg hover:bg-emerald-700 transition"
          type="button"
          onClick={() => setConfirm(true)}
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
      {confirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 text-center animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Вы уверены?</h2>
            <p className="text-gray-600 mt-2">Добавить эту плату в базу?</p>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg mr-2"
                onClick={() => {
                  addCoralB();
                  setConfirm(false);
                }}
              >
                ✅ Да, добавить
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
});
