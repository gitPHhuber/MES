import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import { Context } from "src/main";
import { FCItem } from "./FCItem";
import {
  deleteFCbyID,
  fetchCategoryDefect,
  fetchFC,
  fetchPC,
  fetchSession,
  fetchUsers,
} from "src/api/fcApi";
import { FilterFC } from "./FilterFC";
import dayjs from "dayjs";

export const FlightControllerList = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { flightController } = context;

  const [firmwareState, setFirmwareState] = useState("");
  const [standTestState, setStandTestState] = useState("");
  const [unique_device_id, setUnique_device_id] = useState("");

  const parseFilterValue = (value: string): boolean | null => {
    if (value === "true") return true;
    if (value === "false") return false;
    return null;
  };






  // Функция для загрузки данных с фильтрами
  const loadData = async (page: number = flightController.page) => {
    const valueFIRM = parseFilterValue(firmwareState);
    const valueStandTest = parseFilterValue(standTestState);

    const data = await fetchFC(
      unique_device_id === "" ? null : unique_device_id,
      valueFIRM,
      flightController.selectedPC ? flightController.selectedPC.id : null,
      flightController.selectedUser ? flightController.selectedUser.id : null,
      flightController.selectedDefect ? flightController.selectedDefect.id : null,
      valueStandTest,
      flightController.selectedStartDate,
      flightController.selectedEndDate,
      flightController.limit,
      page
    );
    
    flightController.setFCs(data.rows);
    flightController.setTotalCount(data.count);
    return data;
  };

  // Функция для загрузки справочных данных
  const loadReferenceData = async () => {
    const [sessions, users, pcs, defects] = await Promise.all([
      fetchSession(),
      fetchUsers(),
      fetchPC(),
      fetchCategoryDefect()
    ]);
    
    flightController.setSessions(sessions);
    flightController.setUsers(users);
    flightController.setPCs(pcs);
    flightController.setDefectCategories(defects);
  };




  useEffect(() => {
    const initializeData = async () => {
      await loadReferenceData();
      await loadData(1);
    };
    
    initializeData();
  }, []);

  useEffect(() => {
    loadData();
  }, [flightController.page]);

  const refetch = () => {
    loadData();
  };

  const deleteFC = async (id: number) => {
    await deleteFCbyID(id);
    refetch();
  };

  // Функция сброса всех фильтров
  const resetAllFilters = async () => {
    // Сбрасываем локальные состояния
    setFirmwareState("");
    setStandTestState("");
    setUnique_device_id("");
    
    // Сбрасываем состояния в MobX store
    flightController.resetAll();
    
    // Перезагружаем данные с очищенными фильтрами
    await loadData(1);
  };

  const fcAllOnPage = flightController.FCs.map((fc) => (
    <FCItem
      key={fc.id}
      unique_device_id={fc.unique_device_id}
      firmware={fc.firmware}
      sessionId={fc.sessionId}
      categoryDefectedId={fc.categoryDefectId}
      stand_test={fc.stand_test}
      createdAt={dayjs(fc.createdAt).format("DD.MM.YYYY HH:mm")}
      deleteFC={() => deleteFC(fc.id)}
    />
  ));

  const [inputValue, setInputValue] = useState(
    flightController.limit.toString()
  );
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    // Обновляем локальный `inputValue`, чтобы пользователь мог стирать числа
    setInputValue(value);

    // Если значение пустое, не обновляем MobX store
    if (value === "") return;

    //обновляем MobX store
    const numericValue = Number(value);
    if (!isNaN(numericValue) && numericValue > 0) {
      flightController.setLimit(numericValue);
    }
  };

  useEffect(() => {
    setInputValue(flightController.limit.toString());
  }, [flightController.limit]);






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

      <div className="flex justify-between items-center mt-4">
         <button
          type="button"
          onClick={resetAllFilters}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition duration-200 font-medium"
          title="Сбросить все фильтры"
        >
          🗑️ Сбросить фильтры
        </button>

        <button
          type="button"
          onClick={refetch}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition duration-200 font-medium"
          title="Применить текущие фильтры"
        >
          🔄 Обновить с учетом фильтров
        </button>
      </div>

      <div className="flex mt-4">
        <div className="w-3/4"></div>
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Общее количество в базе: {flightController.totalCount}
        </h1>
      </div>

      <table className="min-w-full shadow-lg rounded-lg border border-gray-400">
        <thead>
          <tr className=" bg-indigo-700 text-white text-sm uppercase font-semibold">
            <th className="px-4 py-3 border border-gray-400">Серийный номер</th>
            <th className="px-4 py-3 border border-gray-400">Прошивка</th>
            <th className="px-4 py-3 border border-gray-400">Компьютер</th>
            <th className="px-4 py-3 border border-gray-400">Сотрудник</th>
            <th className="px-4 py-3 border border-gray-400">Брак</th>
            <th className="px-4 py-3 border border-gray-400">Стенд Тест</th>
            <th className="px-4 py-3 border border-gray-400">
              Дата добавления
            </th>
          </tr>

          <FilterFC
            unique_device_id={unique_device_id}
            setUnique_device_id={setUnique_device_id}
            firmwareState={firmwareState}
            setFirmwareState={setFirmwareState}
            standTestState={standTestState}
            setStandTestState={setStandTestState}
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
