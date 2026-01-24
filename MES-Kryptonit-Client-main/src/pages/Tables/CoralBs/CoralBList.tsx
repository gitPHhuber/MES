import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { fetchPC, fetchSession, fetchUsers } from "src/api/fcApi";
import { Context } from "src/main";
import {
  deleteCoral_BbyID,
  fetchCategoryDefectCoral_B,
  fetchCoral_B,
} from "src/api/coralBApi";
import { CoralB_boardItem } from "./CpralB_boardItem";
import { FilterCoralB } from "./FilterCoralB";

export const CoralBList: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { coralBStore } = context;

  const [firmwareState, setFirmwareState] = useState("");
  const [serial, setSerial] = useState("");
  const [SAW_filter, setSAW_Filter] = useState("");
  const [firmwareVersion, setFirmwareVersion] = useState("");

  const [inputValue, setInputValue] = useState(coralBStore.limit.toString());

  useEffect(() => {
    fetchSession().then((data) => coralBStore.setSessions(data));
    fetchUsers().then((data) => coralBStore.setUsers(data));
    fetchPC().then((data) => coralBStore.setPCs(data));
    fetchCategoryDefectCoral_B().then((data) =>
      coralBStore.setDefect_coral_B_categories(data)
    );
    fetchCoral_B(null, null, null, null, null, null, null, null, 30, 1).then(
      (data) => {
        coralBStore.setCoralBs(data.rows);
        coralBStore.setTotalCount(data.count);
      }
    );
  }, []);

  useEffect(() => {
    refetch();
  }, [coralBStore.page]);

  const refetch = () => {
    const valueFIRM =
      firmwareState === "true"
        ? true
        : firmwareState === "false"
        ? false
        : null;
    const valueSAW =
      SAW_filter === "true" ? true : SAW_filter === "false" ? false : null;
    fetchCoral_B(
      serial === "" ? null : serial,
      valueFIRM,
      valueSAW,
      firmwareVersion === "" ? null : firmwareVersion,
      coralBStore.selectedPC ? coralBStore.selectedPC.id : null,
      coralBStore.selectedUser ? coralBStore.selectedUser.id : null,
      coralBStore.selectedDefect ? coralBStore.selectedDefect.id : null,
      coralBStore.selectedDate,

      coralBStore.limit,
      coralBStore.page
    ).then((data) => {
      coralBStore.setCoralBs(data.rows);
      coralBStore.setTotalCount(data.count);
    });
  };

  const deleteBoard = async (id: number) => {
    await deleteCoral_BbyID(id);
    refetch();
  };

  /// вот это поменять

  const boardsAllOnPage = coralBStore.coralBs.map((board) => (
    <CoralB_boardItem
      key={board.id}
      serial={board.serial}
      firmware={board.firmware}
      SAW_filter={board.SAW_filter}
      firmwareVersion={board.firmwareVersion}
      sessionId={board.sessionId}
      categoryDefectedId={board.categoryDefectCoralBId}
      createdAt={dayjs(board.createdAt).format("DD.MM.YYYY HH:mm")}
      deleteBoard={() => deleteBoard(board.id)}
    />
  ));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Обновляем локальный `inputValue`, чтобы пользователь мог стирать числа
    setInputValue(value);

    // Если значение пустое, не обновляем MobX store
    if (value === "") return;

    //обновляем MobX store
    const numericValue = Number(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      coralBStore.setLimit(numericValue);
    }
  };

  useEffect(() => {
    setInputValue(coralBStore.limit.toString());
  }, [coralBStore.limit]);

  return (
    <div className="overflow-x-auto p-6 bg-white shadow-lg rounded-lg">
      <div className=" flex items-center gap-4 bg-gray-100 p-4 rounded-lg shadow-sm">
        <div className="w-3/4"> </div>

        <label className="text-gray-800 font-medium whitespace-nowrap">
          На одной странице:
        </label>
        <div className="relative">
          <input
            value={inputValue}
            type="number"
            min={0}
            onChange={handleChange}
            className="w-24 p-2 text-center border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-sm"
          />
        </div>
      </div>

      <div className="flex mt-4">
        <div className="w-3/4"></div>
        <button
          type="reset"
          onClick={refetch}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-sky-700 text-gray transition duration-200"
        >
          Обновить с учетом фильтрации
        </button>
      </div>

      <div className="flex mt-4">
        <div className="w-3/4"></div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Общее количество в базе: {coralBStore.totalCount}
        </h1>
      </div>

      <table className="min-w-full shadow-lg rounded-lg border border-gray-400">
        <thead>
          <tr className=" bg-indigo-700 text-white text-sm uppercase font-semibold">
            <th className="px-4 py-3 border border-gray-400">Серийный номер</th>
            <th className="px-4 py-3 border border-gray-400">Прошивка</th>
            <th className="px-4 py-3 border border-gray-400">ПАВ</th>
            <th className="px-4 py-3 border border-gray-400">
              Версия прошивки
            </th>
            <th className="px-4 py-3 border border-gray-400">Компьютер</th>
            <th className="px-4 py-3 border border-gray-400">Сотрудник</th>
            <th className="px-4 py-3 border border-gray-400">Брак</th>
            <th className="px-4 py-3 border border-gray-400">
              Дата добавления
            </th>
          </tr>

          <FilterCoralB
            serial={serial}
            setSerial={setSerial}
            firmwareState={firmwareState}
            setFirmwareState={setFirmwareState}
            SAW_filter={SAW_filter}
            setSAW_Filter={setSAW_Filter}
            firmwareVersion={firmwareVersion}
            setFirmwareVersion={setFirmwareVersion}
          />
        </thead>
        <tbody>
          {boardsAllOnPage.length > 0 ? (
            boardsAllOnPage
          ) : (
            <td className="px-4 py-6 text-center text-gray-500">Нет данных</td>
          )}
        </tbody>
      </table>
    </div>
  );
});
