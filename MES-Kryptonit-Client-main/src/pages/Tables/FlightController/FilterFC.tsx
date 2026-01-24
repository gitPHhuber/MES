import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "src/main";
import { DateFilter } from "./DateFilter";

interface FilterFCModel {
  unique_device_id: string;
  setUnique_device_id: (value: string) => void;
  firmwareState: string;
  setFirmwareState: (value: string) => void;
  standTestState: string;
  setStandTestState: (value: string) => void;
}

export const FilterFC: React.FC<FilterFCModel> = observer(
  ({
    unique_device_id,
    setUnique_device_id,
    firmwareState,
    setFirmwareState,
    standTestState,
    setStandTestState,
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { flightController } = context;



    // Передаем даты в MobX store
    const handleStartDateChange = (date: string) => {
      flightController.setSelectedStartDate(date);
    };

    const handleEndDateChange = (date: string) => {
      flightController.setSelectedEndDate(date);
    };


    return (
      <tr className="bg-gray-800 text-white text-sm uppercase font-semibold">
        <th className="px-4 py-3 border border-gray-600">
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={unique_device_id}
            onChange={(e) => setUnique_device_id(e.target.value)}
            placeholder="Введите серийный номер FC"
          />

        </th>

        {/* Выбор состояния прошивки */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            value={firmwareState}
            onChange={(e) => setFirmwareState(e.target.value)}
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value="" disabled selected>
              Прошивка
            </option>
            <option value="true">✅ Да</option>
            <option value="false">❌ Нет</option>
          </select>
        </th>

        {/* Выбор компьютера */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            value={flightController.selectedPC ? flightController.selectedPC.id : ""}
            onChange={(e) => {
              const selectedPC = flightController.PCs.find(
                (pc) => pc.id === Number(e.target.value)
              );
              flightController.setSelectedPC(selectedPC ?? null);
            }}
          >
            <option value="" disabled selected>
              Компьютер
            </option>
            {flightController.PCs.map((el) => (
              <option key={el.id} value={el.id}>
                {el.pc_name}
              </option>
            ))}
          </select>
        </th>

        {/* Выбор сотрудника */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            value={flightController.selectedUser ? flightController.selectedUser.id : ""}
            onChange={(e) => {
              const selectedUser = flightController.users.find(
                (user) => user.id === Number(e.target.value)
              );
              flightController.setSelectedUser(selectedUser ?? null)
            }}
          >
            <option value="" disabled selected>
              Сотрудник
            </option>
            {flightController.users.map((el) => (
              <option key={el.id} value={el.id}>
                {el.name} {el.surname}
              </option>
            ))}
          </select>
        </th>

        {/* Выбор категории дефекта */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            value={flightController.selectedDefect ? flightController.selectedDefect.id : ""}
            onChange={(e) => {
              const selectedDefect = flightController.defectCategories.find(
                (defect) => defect.id === Number(e.target.value)
              );
              flightController.setSelectedDefect(selectedDefect ?? null)

            }}
          >
            <option value="" disabled selected>
              Брак
            </option>
            {flightController.defectCategories.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title}
              </option>
            ))}
          </select>
        </th>


        {/* Выбор состояния проверки на стенде */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            value={standTestState}
            onChange={(e) => setStandTestState(e.target.value)}
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value="" disabled selected>
              Тест пройден
            </option>
            <option value="true">✅ Да</option>
            <option value="false">❌ Нет</option>
          </select>
        </th>

        <th className="px-4 py-3 border border-gray-600">
          <DateFilter
          startDate={flightController.selectedStartDate || ""}
  endDate={flightController.selectedEndDate || ""}
            onStartDateChange={handleStartDateChange}
            onEndDateChange={handleEndDateChange} />
        </th>
      </tr>
    );
  }
);
