import dayjs from "dayjs";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import {
  delete2_4byID,
  fetch2_4,
  fetchCategoryDefect24,
} from "src/api/elrsApi";
import { fetchPC, fetchSession, fetchUsers } from "src/api/fcApi";
import { Context } from "src/main";
import { Elrs24BoardItem } from "./Elrs24BoardItem";
import { FilterElrs } from "../ELRS915s/FilterElrs";

export const Elrs24List: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { elrsStore } = context;

  const [firmwareState, setFirmwareState] = useState("");
  const [MAC_address, setMAC_address] = useState("");

  useEffect(() => {
    fetchSession().then((data) => elrsStore.setSessions(data));
    fetchUsers().then((data) => elrsStore.setUsers(data));
    fetchPC().then((data) => elrsStore.setPCs(data));
    fetchCategoryDefect24().then((data) =>
      elrsStore.setDefect_2_4_Categories(data)
    );
    fetch2_4(null, null, null, null, null, null, 30, 1).then((data) => {
      elrsStore.setELRS_2_4s(data.rows);
      elrsStore.setTotalCount(data.count);
      console.log(elrsStore.totalCount);
    });
  }, []);

  useEffect(() => {
    refetch();
  }, [elrsStore.page]);

  const refetch = () => {
    const valueFIRM =
      firmwareState === "true"
        ? true
        : firmwareState === "false"
          ? false
          : null;
    fetch2_4(
      MAC_address === "" ? null : MAC_address,
      valueFIRM,
      elrsStore.selectedPC ? elrsStore.selectedPC.id : null,
      elrsStore.selectedUser ? elrsStore.selectedUser.id : null,
      elrsStore.selectedDefect ? elrsStore.selectedDefect.id : null,
      elrsStore.selectedDate,

      elrsStore.limit,
      elrsStore.page
    ).then((data) => {
      elrsStore.setELRS_2_4s(data.rows);
      elrsStore.setTotalCount(data.count);
    });
  };

  const deleteBoard = async (id: number) => {
    await delete2_4byID(id);
    refetch();
  };

  const fcAllOnPage = elrsStore.ELRS2_4.map((board) => (
    <Elrs24BoardItem
      key={board.id}
      MAC_address={board.MAC_address}
      firmware={board.firmware}
      sessionId={board.sessionId}
      categoryDefectedId={board.categoryDefect24Id}
      createdAt={dayjs(board.createdAt).format("DD.MM.YYYY HH:mm")}
      deleteBoard={() => deleteBoard(board.id)}
    />
  ));

  const [inputValue, setInputValue] = useState(elrsStore.limit.toString());

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Обновляем локальный `inputValue`, чтобы пользователь мог стирать числа
    setInputValue(value);

    // Если значение пустое, не обновляем MobX store
    if (value === "") return;

    //обновляем MobX store
    const numericValue = Number(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      elrsStore.setLimit(numericValue);
    }
  };

  useEffect(() => {
    setInputValue(elrsStore.limit.toString());
  }, [elrsStore.limit]);

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
          Общее количество в базе: {elrsStore.totalCount}
        </h1>
      </div>

      <table className="min-w-full shadow-lg rounded-lg border border-gray-400">
        <thead>
          <tr className=" bg-indigo-700 text-white text-sm uppercase font-semibold">
            <th className="px-4 py-3 border border-gray-400">MAC-address</th>
            <th className="px-4 py-3 border border-gray-400">Прошивка</th>
            <th className="px-4 py-3 border border-gray-400">Компьютер</th>
            <th className="px-4 py-3 border border-gray-400">Сотрудник</th>
            <th className="px-4 py-3 border border-gray-400">Брак</th>
            <th className="px-4 py-3 border border-gray-400">
              Дата добавления
            </th>
          </tr>

          <FilterElrs
            category="24"
            MAC_address={MAC_address}
            setMAC_address={setMAC_address}
            firmwareState={firmwareState}
            setFirmwareState={setFirmwareState}
            firmwareVersion={null}
            setFirmwareVersion={null}
          />
        </thead>
        <tbody>
          {fcAllOnPage.length > 0 ? (
            fcAllOnPage
          ) : (
            <td className="px-4 py-6 text-center text-gray-500">Нет данных</td>
          )}
        </tbody>
      </table>
    </div>
  );
});
