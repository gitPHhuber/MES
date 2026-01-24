import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "src/main";
import { DateFilterForCoralB } from "./DateFilterForCoralB";

interface FilterCoralBModel {
  serial: string;
  setSerial: (value: string) => void;
  firmwareState: string;
  setFirmwareState: (value: string) => void;
  SAW_filter: string;
  setSAW_Filter: (value: string) => void;
  firmwareVersion: string;
  setFirmwareVersion: (value: string) => void;
}

export const FilterCoralB: React.FC<FilterCoralBModel> = observer(
  ({
    serial,
    setSerial,
    firmwareState,
    setFirmwareState,
    SAW_filter,
    setSAW_Filter,
    firmwareVersion,
    setFirmwareVersion,
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { coralBStore } = context;

    return (
      <tr className="bg-gray-800 text-white text-sm uppercase font-semibold">
        <th className="px-4 py-3 border border-gray-600">
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={serial}
            onChange={(e) => setSerial(e.target.value)}
            placeholder="Введите серийный номер"
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

        {/* Выбор ПАВ */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            value={SAW_filter}
            onChange={(e) => setSAW_Filter(e.target.value)}
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
          >
            <option value="" disabled selected>
              ПАВ
            </option>
            <option value="true">с ПАВ</option>
            <option value="false">без ПАВ</option>
          </select>
        </th>

        {/* выбор версии */}

        <th className="px-4 py-3 border border-gray-600">
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={firmwareVersion}
            onChange={(e) => setFirmwareVersion(e.target.value)}
            placeholder="Введите версию прошивки"
          />
        </th>

        {/* Выбор компьютера */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            onChange={(e) => {
              const selectedPC = coralBStore.PCs.find(
                (pc) => pc.id === Number(e.target.value)
              );
              if (selectedPC) coralBStore.setSelectedPC(selectedPC);
            }}
          >
            <option value="" disabled selected>
              Компьютер
            </option>
            {coralBStore.PCs.map((el) => (
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
            onChange={(e) => {
              const selectedUser = coralBStore.users.find(
                (user) => user.id === Number(e.target.value)
              );
              if (selectedUser) coralBStore.setSelectedUser(selectedUser);
            }}
          >
            <option value="" disabled selected>
              Сотрудник
            </option>
            {coralBStore.users.map((el) => (
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
            onChange={(e) => {
              const selectedDefect = coralBStore.defect_coral_B_categories.find(
                (defect) => defect.id === Number(e.target.value)
              );
              if (selectedDefect) coralBStore.setSelectedDefect(selectedDefect);
            }}
          >
            <option value="" disabled selected>
              Брак
            </option>
            {coralBStore.defect_coral_B_categories.map((el) => (
              <option key={el.id} value={el.id}>
                {el.title}
              </option>
            ))}
          </select>
        </th>

        <th className="px-4 py-3 border border-gray-600">
          <DateFilterForCoralB />
        </th>
      </tr>
    );
  }
);
