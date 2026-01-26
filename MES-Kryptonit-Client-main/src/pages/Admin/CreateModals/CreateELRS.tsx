import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import {
  create2_4Board,
  create915Board,
  fetchCategoryDefect24,
  fetchCategoryDefect915,
} from "src/api/elrsApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { Context } from "src/main";

interface CreateBoardModel {
  BoardName: string;
}

export const CreateBoard: React.FC<CreateBoardModel> = observer(
  ({ BoardName }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { elrsStore } = context;

    useEffect(() => {
      if (BoardName === "приемник915") {
        fetchCategoryDefect915().then((data) =>
          elrsStore.setDefect_915_Categories(data)
        );
      } else {
        fetchCategoryDefect24().then((data) =>
          elrsStore.setDefect_2_4_Categories(data)
        );
      }
    }, []);

    const [uniqId, SetUniqId] = useState<string | null>("");
    const [firmwareState, setFirmwareState] = useState("");
    const [firmwareVersion, setFirmwareVersion] = useState("");

    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [requestId, setRequestId] = useState<string | null>(null);

    const [confirm, setConfirm] = useState(false);

    const addFC = async () => {
      const defectCategoryId = Number(elrsStore.selectedDefect?.id ?? 1); //Если selectedDefect равен null, то defectCategoryId примет значение 1
      const sessionId = Number(localStorage.getItem("sessionID"));
      const valueFIRM = firmwareState === "true" ? true : false;
      try {
        if (BoardName === "приемник915") {
          await create915Board(uniqId, valueFIRM, sessionId, defectCategoryId, firmwareVersion === "" ? null : firmwareVersion);
        } else {
          await create2_4Board(uniqId, valueFIRM, sessionId, defectCategoryId);
        }
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
      elrsStore.resetSelectedDefect();

    };

    const categoties915 = elrsStore.defect_915_Categories.map((el) => (
      <option
        onClick={() => {
          elrsStore.setSelectedDefect(el);
          console.log(elrsStore.selectedDefect);
        }}
        key={el.id}
        value={el.id}
      >
        {el.title}
      </option>
    ));

    const categoties24 = elrsStore.defect_2_4_Categories.map((el) => (
      <option
        onClick={() => {
          elrsStore.setSelectedDefect(el);
          console.log(elrsStore.selectedDefect);
        }}
        key={el.id}
        value={el.id}
      >
        {el.title}
      </option>
    ));

    return (
      <div>
        <h2 className="text-xl font-bold mb-4">Добавить {BoardName}</h2>
        <form>
          <div className="flex flex-col items-center space-y-2 p-4 border rounded-lg shadow-md w-full">
            <input
              type="text"
              placeholder="MAC-address "
              className={`w-full p-2 border rounded-lg transition duration-200 ${uniqId === null
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
              className={`w-full p-2 rounded-lg font-medium text-white transition duration-200 ${uniqId === null ? "bg-red-700" : "bg-red-500 hover:bg-red-600"
                }`}
            >
              {uniqId === null
                ? "MAC-address отсутствует ✓"
                : "MAC-address отсутствует"}
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



          {(BoardName === "приемник915") &&
            <input
              type="text"
              placeholder="Версия прошивки"
              className={`w-full p-2 border rounded-lg transition duration-200`}
              value={firmwareVersion}
              onChange={(e) => setFirmwareVersion(e.target.value)}
            />
          }

          {/* Выбор категории дефекта */}
          <select
            className="w-full p-2 border rounded-lg mb-2"
            onChange={(e) => {
              if (BoardName === "приемник915") {
                const selectedDefect = elrsStore.defect_915_Categories.find(
                  (defect) => defect.id === Number(e.target.value)
                );
                if (selectedDefect) elrsStore.setSelectedDefect(selectedDefect);
              } else {
                const selectedDefect = elrsStore.defect_2_4_Categories.find(
                  (defect) => defect.id === Number(e.target.value)
                );
                if (selectedDefect) elrsStore.setSelectedDefect(selectedDefect);
              }
            }}
          >
            <option value="" disabled>
              Выберите категорию брака
            </option>
            {BoardName === "приемник915" ? categoties915 : categoties24}
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
          <div className="mt-4 text-green-500 font-medium">
            {successMessage}
          </div>
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
              <p className="text-gray-600 mt-2">
                Добавить этот контроллер в базу?
              </p>

              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg mr-2"
                  onClick={() => {
                    addFC();
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
  }
);
