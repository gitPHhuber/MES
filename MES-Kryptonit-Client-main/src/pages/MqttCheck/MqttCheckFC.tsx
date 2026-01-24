import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { mqttGetStatus, reloadTestFC, startTestFC } from "src/api/mqttApi";
import FC1 from "assets/images/FC1.png";
import FC2 from "assets/images/FC2.png";
import standFC from "assets/images/standFC.png";
import { CircleXIcon } from "lucide-react";
import { changeStandTestResult } from "src/api/fcApi";

// Интерфейс для тестов
interface Tests {
  [key: string]: string; // Название теста -> результат
}

// Интерфейс для данных о стенде
interface StandData {
  tests: Tests;
  fc_id: string | null;
}

// Интерфейс для statusData
interface StatusData {
  [placeId: string]: StandData; // PlaceID -> данные о стенде
}

const socket = io(import.meta.env.VITE_MQTT_API_URL);

export const MqttCheckFC: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusData>({});
  const prevStatusData = useRef<StatusData>({}); // Храним предыдущее состояние

  const [standId, setStandId] = useState("");
  const [hiddenRows, setHiddenRows] = useState<string[]>([]); // Список скрытых строк
  const [startTestNotify, setStartTestNotify] = useState("");

  // Проверяем, есть ли хотя бы один стенд с ошибкой подключения
  const hasConnectionError = Object.values(statusData).some(
    (data: StandData) => data.tests["FC Connection"] === "❌ Ошибка подключения"
  );

  useEffect(() => {
    const fetchStatus = async () => {
      const data = await mqttGetStatus();
      setStatusData(data);
      prevStatusData.current = data;
    };

    fetchStatus();

    socket.on("mqtt-message", (newData: StatusData) => {
      // Проверяем изменения для каждого стенда
      Object.entries(newData).forEach(([placeId, newStandData]) => {
        const prevStandData = prevStatusData.current[placeId] || {
          tests: {},
          fc_id: null,
        };

        // Если появился Result или он изменился
        if (
          newStandData.tests.Result &&
          newStandData.tests.Result !== prevStandData.tests.Result
        ) {
          const stand_test = newStandData.tests.Result === "✅ Пройден";
          console.log(`Detected Result change for ${placeId}:`, {
            oldResult: prevStandData.tests.Result,
            newResult: newStandData.tests.Result,
            stand_test,
            fc_id: newStandData.fc_id,
          });

          if (newStandData.fc_id) {
            const sessionId = Number(localStorage.getItem("sessionID"));
            changeStandTestResult(newStandData.fc_id, sessionId, stand_test)
              .then(() => console.log(`Status updated for ${placeId}`))
              .catch((err) =>
                console.error(`Update error for ${placeId}:`, err)
              );
          }
        }
      });

      setStatusData(newData);
      prevStatusData.current = newData;
    });

    return () => {
      socket.off("mqtt-message");
    };
  }, []);

  const handleStartTest = async () => {
    if (!standId) {
      alert("Введите ID стенда!");
      return;
    }

    try {
      await startTestFC(standId);
      setStartTestNotify(`Тест для стенда ${standId} запущен!`);
      setTimeout(() => {
        setStartTestNotify("");
      }, 5000);
    } catch (error) {
      alert("Ошибка при запуске теста");
      console.error(error);
    }
  };
  const handleReloadTest = async () => {
    if (!standId) {
      alert("Введите ID стенда!");
      return;
    }

    try {
      await reloadTestFC(standId);
    } catch (error) {
      alert("Ошибка при перезарядке теста");
      console.error(error);
    }
  };

  // Функция для скрытия строки
  const handleHideRow = (placeId: string) => {
    setHiddenRows((prev) => [...prev, placeId]);
  };

  const allTests = [
    "UID",
    "FONT",
    "PRECONFIG",
    "Power",
    "Buzzer",
    "Boot",
    "UARTs",
    "Analog",
    "Motors",
    "OSD",
    "IMU",
    "Baro",
    "PinIO",
    "Config",
    "POSTCONFIG",
    "Result",
  ];

  return (
    <div className="w-full min-h-screen bg-gray-100/50 p-8">
      <div className="mx-auto">
        {/* Заголовок с картинками */}
        <div className="flex items-center justify-center space-x-4 mb-8">
          <h2 className="text-3xl font-bold text-gray-800">Проверка FC</h2>
          <img src={FC1} alt="FC Icon" className="w-16 h-16" />
          <img src={FC2} alt="FC Icon" className="w-16 h-16" />
          <h2 className="text-3xl font-bold text-gray-800">на стендах</h2>
          <img src={standFC} alt="Stand Icon" className="w-32 h-48" />
        </div>
        <h2 className="text-3xl animate-bounce font-bold text-gray-800">
          {startTestNotify}
        </h2>

        {/* Поле ввода и кнопка */}
        <div className="flex space-x-4 mb-6">
          <input
            type="text"
            className="border p-2 rounded w-full shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Введите ID стенда"
            value={standId}
            onChange={(e) => setStandId(e.target.value)}
          />
          <button
            className="bg-blue-500 text-white px-6 py-2 rounded shadow-lg hover:bg-blue-600 transition-colors"
            onClick={handleStartTest}
          >
            Начать тест
          </button>
          <button
            className="bg-red-500 text-white px-6 py-2 rounded shadow-lg hover:bg-red-700 transition-colors"
            onClick={handleReloadTest}
          >
            Перезарядка
          </button>
        </div>

        {/* Таблица */}
        <div className="w-full overflow-x-auto shadow-lg rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-blue-500 text-white">
                <th className="border p-3">PlaceID</th>
                <th className="border p-3">FC ID</th>
                {/* Условно отображаем колонку "Статус подключения" */}
                {hasConnectionError && (
                  <th className="border p-3">Статус подключения FC</th>
                )}
                {allTests.map((test) => (
                  <th key={test} className="border p-3">
                    {test}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.entries(statusData)
                .filter(([placeId]) => !hiddenRows.includes(placeId)) // Фильтруем скрытые строки
                .map(([placeId, data]) => (
                  <tr
                    key={placeId}
                    className={
                      data.tests.Result === "✅ Пройден"
                        ? "bg-green-200   hover:bg-green-500 transition-colors"
                        : data.tests.Result === "❌ Ошибка"
                        ? "animate-pulse bg-red-300   hover:bg-red-500 transition-colors"
                        : " bg-neutral-200   hover:bg-gray-500 transition-colors"
                    }
                  >
                    <td className="border border-sky-500 p-3">{placeId}</td>
                    <td className="border border-sky-500 p-3">
                      {hasConnectionError && (
                        <div
                          className={`${
                            data.tests["FC Connection"] ===
                            "❌ Ошибка подключения"
                              ? "animate-pulse bg-red-200"
                              : ""
                          }`}
                        >
                          {data.tests["FC Connection"] || ""}
                        </div>
                      )}

                      {data.fc_id || "—"}
                    </td>
                    {/* Условно отображаем ячейку "Статус подключения" */}

                    {allTests.map((test) => (
                      <td key={test} className="border border-sky-500 p-3">
                        {data.tests[test] || "—"}
                      </td>
                    ))}

                    {/* Кнопка "Скрыть" */}
                    <td className="border border-sky-500 p-3">
                      <button
                        className="bg-red-500 text-white px-1 py-1 rounded hover:bg-red-800 transition-colors"
                        onClick={() => handleHideRow(placeId)}
                      >
                        {<CircleXIcon />}
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
