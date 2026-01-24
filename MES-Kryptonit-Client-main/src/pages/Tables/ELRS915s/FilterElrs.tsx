import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "src/main";
import { DateFilterforElrs } from "./DateFilterForELRS";

interface FilterElrsModel {
  category: string;
  MAC_address: string;
  setMAC_address: (value: string) => void;
  firmwareState: string;
  setFirmwareState: (value: string) => void;
  firmwareVersion: string | null;
  setFirmwareVersion: ((value: string) => void) | null;

}

export const FilterElrs: React.FC<FilterElrsModel> = observer(
  ({
    category,
    MAC_address,
    setMAC_address,
    firmwareState,
    setFirmwareState,
    firmwareVersion,
    setFirmwareVersion
  }) => {
    const context = useContext(Context);

    if (!context) {
      throw new Error("Context must be used within a Provider");
    }

    const { elrsStore } = context;

    const categoriesOptions = () => {
      if (category === "915")
        return elrsStore.defect_915_Categories.map((el) => (
          <option key={el.id} value={el.id}>
            {el.title}
          </option>
        ));
      else if (category === "24")
        return elrsStore.defect_2_4_Categories.map((el) => (
          <option key={el.id} value={el.id}>
            {el.title}
          </option>
        ));
    };

    return (
      <tr className="bg-gray-800 text-white text-sm uppercase font-semibold">
        <th className="px-4 py-3 border border-gray-600">
          <input
            className="w-full px-3 py-2 rounded-lg bg-gray-700 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            value={MAC_address}
            onChange={(e) => setMAC_address(e.target.value)}
            placeholder="Введите мак-адресс"
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

        {/* Выбор версии прошивки */}
        {category === "915" &&

          <th className="px-2 py-2 border border-gray-600">
            <select
              value={firmwareVersion ?? ''}
              onChange={(e) => setFirmwareVersion ? setFirmwareVersion(e.target.value) : console.error('setFirmwareVersion is null')}
              className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            >
              <option value="" disabled selected>
                Версия
              </option>
              <option value="002"> 002</option>
              <option value="019">019</option>
            </select>
          </th>
        }

        {/* Выбор компьютера */}
        <th className="px-2 py-2 border border-gray-600">
          <select
            className="w-full p-2 border border-gray-500 rounded-md bg-gray-700 text-white focus:ring-2 focus:ring-indigo-400 transition"
            onChange={(e) => {
              const selectedPC = elrsStore.PCs.find(
                (pc) => pc.id === Number(e.target.value)
              );
              if (selectedPC) elrsStore.setSelectedPC(selectedPC);
            }}
          >
            <option value="" disabled selected>
              Компьютер
            </option>
            {elrsStore.PCs.map((el) => (
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
              const selectedUser = elrsStore.users.find(
                (user) => user.id === Number(e.target.value)
              );
              if (selectedUser) elrsStore.setSelectedUser(selectedUser);
            }}
          >
            <option value="" disabled selected>
              Сотрудник
            </option>
            {elrsStore.users.map((el) => (
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
              if (category === "915") {
                const selectedDefect = elrsStore.defect_915_Categories.find(
                  (defect) => defect.id === Number(e.target.value)
                );
                if (selectedDefect) elrsStore.setSelectedDefect(selectedDefect);
              } else if (category === "24") {
                const selectedDefect = elrsStore.defect_2_4_Categories.find(
                  (defect) => defect.id === Number(e.target.value)
                );
                if (selectedDefect) elrsStore.setSelectedDefect(selectedDefect);
              }
            }}
          >
            <option value="" disabled selected>
              Брак
            </option>

            {categoriesOptions()}
          </select>
        </th>

        <th className="px-4 py-3 border border-gray-600">
          <DateFilterforElrs />
        </th>
      </tr>
    );
  }
);
