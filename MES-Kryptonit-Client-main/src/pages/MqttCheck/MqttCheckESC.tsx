import { useState, useEffect, useRef } from "react";
import io from "socket.io-client";
import { mqttGetStatusESC, reloadTestESC, startTestESC } from "src/api/mqttApi";
import ESC1 from "assets/images/ESC1.png";
import ESC2 from "assets/images/ESC2.png";
import standESC1 from "assets/images/StandESC1.png";
import standESC2 from "assets/images/StandESC2.png";
import { BrushIcon, CircleXIcon } from "lucide-react";

// Интерфейс для тестов
interface Tests {
  [key: string]: string; // Название теста -> результат
}

// Интерфейс для данных о стенде
interface StandData {
  tests: Tests;
}

// Интерфейс для statusData
interface StatusData {
  [placeId: string]: StandData; // PlaceID -> данные о стенде
}

const socket = io(import.meta.env.VITE_MQTT_API_URL);

export const MqttCheckESC: React.FC = () => {
  const [statusData, setStatusData] = useState<StatusData>({});
  const prevStatusData = useRef<StatusData>({}); // Храним предыдущее состояние

  const [hiddenRows, setHiddenRows] = useState<string[]>([]); // Список скрытых placeID
  const [startTestNotify, setStartTestNotify] = useState("");

  useEffect(() => {
    const fetchStatus = async () => {
      const data = await mqttGetStatusESC();
      setStatusData(data);
      prevStatusData.current = data;
    };

    fetchStatus();

    socket.on("mqtt-message-esc", (newData: StatusData) => {
      // Проверяем изменения для каждого стенда
      Object.entries(newData).forEach(([placeId, newStandData]) => {
        const prevStandData = prevStatusData.current[placeId] || {
          tests: {},
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
          });
        }
      });

      setStatusData(newData);
      prevStatusData.current = newData;
    });

    return () => {
      socket.off("mqtt-message-esc");
    };
  }, []);

  const handleStartTest = async (standId: string) => {
    if (!standId) {
      alert("Введите ID стенда!");
      return;
    }

    try {
      await startTestESC(standId);
      setStartTestNotify(`Тест для стенда ${standId} запущен!`);
      setTimeout(() => {
        setStartTestNotify("");
      }, 5000);
    } catch (error) {
      alert("Ошибка при запуске теста");
      console.error(error);
    }
  };

  const startTestAll = async () => {
    //надо запускать handleStartTest со всеми PlaceId
    const allIds = Object.keys(statusData);
    const allIdsWithoutHidden = allIds.filter(el_A => !hiddenRows.includes(el_A));

    if (allIds.length === 0) {
      alert("Нет доступных стендов для запуска теста.");
      return;
    }

    setStartTestNotify("Запускаем тесты на всех стендах...");

    for (const id of allIdsWithoutHidden) {
      await handleStartTest(id);
    }

    setStartTestNotify("✅ Все тесты запущены!");
    setTimeout(() => setStartTestNotify(""), 5000);
  };

  const handleReloadTest = async (standId: string) => {
    if (!standId) {
      alert("Введите ID стенда!");
      return;
    }

    try {
      await reloadTestESC(standId);
    } catch (error) {
      alert("Ошибка при перезарядке теста");
      console.error(error);
    }
  };

  const reloadAll = async () => {
    //надо запускать handleReloadTest со всеми PlaceId
    const allIds = Object.keys(statusData);
    if (allIds.length === 0) {
      alert("Нет доступных стендов для перезарядки.");
      return;
    }

    for (const id of allIds) {
      await handleReloadTest(id);
    }
  };

  // Функция для скрытия строки
  const handleHideRow = (placeId: string) => {
    setHiddenRows((prev) => [...prev, placeId]);
  };

  const allTests = [
    "Connector",
    "Polarity",
    "Power",
    "Telemetry",
    "Motors",
    "Result",
  ];

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-gray-100/50 to-blue-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Заголовок с картинками */}
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8 p-6 bg-white/80 rounded-2xl shadow-xl backdrop-blur-sm border border-white">
          <div className="flex items-center gap-4 flex-wrap justify-center">
            <h2 className="text-4xl font-extrabold text-gray-800 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-800">
              Проверка ESC
            </h2>
            <div className="flex items-center gap-2">
              <img
                src={ESC1}
                alt="FC Icon"
                className="w-14 h-14 object-contain transition-transform hover:scale-110"
              />
              <img
                src={ESC2}
                alt="FC Icon"
                className="w-14 h-14 object-contain transition-transform hover:scale-110"
              />
            </div>
            <h2 className="text-4xl font-extrabold text-gray-800">
              на стендах
            </h2>
            <div className="flex items-center gap-2">
              <img
                src={standESC1}
                alt="Stand Icon"
                className="w-28 h-40 object-contain hover:rotate-1 transition-transform"
              />
              <img
                src={standESC2}
                alt="Stand Icon"
                className="w-40 h-28 object-contain hover:-rotate-1 transition-transform"
              />
            </div>
          </div>
        </div>

        {/* Уведомление о начале теста */}
        {startTestNotify && (
          <div className="mb-8 animate-fade-in">
            <div className="bg-indigo-600 text-white px-6 py-4 rounded-xl shadow-lg flex items-center justify-center gap-3">
              <svg
                className="w-6 h-6 animate-spin"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              <span className="text-xl font-semibold">{startTestNotify}</span>
            </div>
          </div>
        )}

        {/* Панель управления */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <button
            className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
            onClick={startTestAll}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            Начать тест на всех выбранных стендах
          </button>

          <button
            className="bg-gradient-to-r from-red-500 to-rose-600 text-white px-6 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center gap-2"
            onClick={reloadAll}
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            Очистить таблицу
          </button>
        </div>

        {/* Таблица */}
        <div className="w-full overflow-hidden rounded-2xl shadow-2xl bg-white/90 backdrop-blur-sm border border-white">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
                <th className="p-4 text-left rounded-tl-2xl">PlaceID</th>
                {allTests.map((test) => (
                  <th key={test} className="p-4 text-left">
                    <div className="flex items-center gap-2">{test}</div>
                  </th>
                ))}
                <th className="p-4 text-left rounded-tr-2xl">Действия</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(statusData)
                .filter(([placeId]) => !hiddenRows.includes(placeId))
                .map(([placeId, data]) => (
                  <tr
                    key={placeId}
                    className={`border-t border-gray-200 transition-all duration-200 hover:bg-gray-50/80 ${
                      data.tests.Result === "✅ Пройден"
                        ? "bg-green-200 hover:bg-green-500 transition-colors"
                        : data.tests.Result === "❌ Ошибка"
                        ? "animate-pulse bg-red-300   hover:bg-red-500 transition-colors"
                        : " bg-gray-50 hover:bg-gray-100"
                    }`}
                  >
                    <td className="p-4 flex items-center gap-3">
                      <button
                        onClick={() => handleReloadTest(placeId)}
                        className="p-2 rounded-lg bg-white shadow hover:bg-gray-100 transition-colors border border-gray-200 hover:border-blue-300 group"
                        title="очистить результаты стенда"
                      >
                        <BrushIcon
                          className="text-rose-500 group-hover:text-rose-700 transition-colors"
                          strokeWidth={1.5}
                        />
                      </button>
                      <span className="font-medium text-gray-800">
                        {placeId || "—"}
                      </span>
                      <button
                        onClick={() => handleStartTest(placeId)}
                        title="Запустить тест на стенде ${placeId} "
                        className="ml-auto px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600 transition-colors flex items-center gap-2"
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13 10V3L4 14h7v7l9-11h-7z"
                          />
                        </svg>
                        Тест
                      </button>
                    </td>

                    {allTests.map((test) => (
                      <td key={test} className="p-4">
                        <div
                          className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                            data.tests[test] === "✅ Пройден"
                              ? "bg-green-100 text-green-800"
                              : data.tests[test] === "❌ Ошибка"
                              ? "bg-rose-100 text-rose-800"
                              : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {data.tests[test] || "—"}
                        </div>
                      </td>
                    ))}

                    <td className="p-4">
                      <button
                        onClick={() => handleHideRow(placeId)}
                        className="p-2 text-gray-500 hover:text-rose-600 transition-colors hover:bg-rose-50 rounded-lg"
                        title="Скрыть строку"
                      >
                        <CircleXIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>

        {/* Подсказка */}
        <div className="mt-6 text-center text-sm text-gray-500">
          <p>Используйте кнопки управления для тестирования ESC на стендах</p>
        </div>
      </div>
    </div>
  );
};
