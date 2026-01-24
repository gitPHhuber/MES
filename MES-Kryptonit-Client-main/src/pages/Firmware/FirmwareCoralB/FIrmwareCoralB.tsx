import React, { useContext, useEffect, useState } from "react";
import { sendCommand, checkConnection, fetchData } from "api/firmwareApi";
import { observer } from "mobx-react-lite";
import { Context } from "src/main";
import { FirmCoralBPortCard } from "./FirmCoralBPortCard";
import { createCoral_B_Board } from "src/api/coralBApi";
import { startCoralBFirm, stopCoralBFirm } from "src/api/firmwareControlApi";

export const FirmwareCoralB: React.FC = observer(() => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { firmwareCoralB } = context;

  const [isConnected, setIsConnected] = useState(false);
  const [logs, setLogs] = useState("Логи появятся здесь...");
  const [loadingCommand, setLoadingCommand] = useState<string | null>(null);

  const handleCommand = async (cmd: string) => {
    setLoadingCommand(cmd);
    try {
      await sendCommand(cmd);
      await updateData();
    } finally {
      setLoadingCommand(null);
    }
  };

  const updateData = async () => {
    try {
      const data = await fetchData();
      setLogs(data.logs || "Нет данных");

      if (data.lastCommand === "RD") {
        firmwareCoralB.setFirmwareVersion(data.logs.trim());
      }
      if (["MODE?", "SAW1", "SAW0"].includes(data.lastCommand)) {
        const saw: boolean = data.logs === "0" ? false : true;

        firmwareCoralB.setSAW_mode(saw);
      }

      firmwareCoralB.resetSerial();

      // Обновляем стор из API
      data.serials?.forEach((serial: string, i: number) => {
        firmwareCoralB.setSerial(i, serial);
      });

      data.result?.forEach((status: string, i: number) => {
        firmwareCoralB.setFlashStatus(
          i,
          status === "OK"
            ? "✅ Успешно"
            : status === "ERROR"
            ? "❌ Ошибка"
            : "Не прошито"
        );
      });

      setIsConnected(true);
    } catch {
      setIsConnected(false);
    }
  };

  const startstop = async (on: boolean) => {
    on ? await startCoralBFirm() : await stopCoralBFirm();
  };

  const addBoardsToBase = async (id: number) => {
    const serial: string = firmwareCoralB.serial[id];
    const currentFirm: boolean =
      firmwareCoralB.flashStatus[id] === "✅ Успешно";
    const sessionId = Number(localStorage.getItem("sessionID"));
    const categoryDefectCoralBId = 1;
    const SAW_mode = firmwareCoralB.SAW_mode;
    const firmwareVersion = firmwareCoralB.firmwareVersion;
    if (
      serial !== "" &&
      SAW_mode !== null &&
      firmwareVersion !== null
      // &&
      // currentFirm === true
    ) {
      try {
        await createCoral_B_Board(
          serial,
          currentFirm,
          SAW_mode,
          firmwareVersion,
          sessionId,
          categoryDefectCoralBId
        );
        firmwareCoralB.setCounterTotalForSessionPlus();
        firmwareCoralB.setMessageDB(id, "Успешно добавлено");
      } catch (error) {
        firmwareCoralB.setMessageDB(
          id,
          `Ошибка при добавлении в базу ${error}`
        );
      }
    }
  };

  const addBoardsToBaseALL = async () => {
    for (let i = 0; i <= firmwareCoralB.countPort - 1; i++) {
      addBoardsToBase(i);
    }
  };

  useEffect(() => {
    checkConnection()
      .then(() => setIsConnected(true))
      .catch(() => setIsConnected(false));

    updateData();
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, []);

  console.log(firmwareCoralB);

  return (
    <div className="max-w-screen-xl mx-auto p-4 space-y-6">
      <h1 className="text-3xl font-bold text-gray-800">
        Прошивка плат Coral B
      </h1>

      {/* Индикатор подключения */}
      <div className="fixed top-20 right-6 z-50 w-72">
        <div
          className={`rounded-2xl px-5 py-4 shadow-xl border text-sm transition-all duration-300 ${
            isConnected
              ? "bg-green-50 border-green-300 text-green-800"
              : "bg-red-50 border-red-300 text-red-800"
          }`}
        >
          {isConnected ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-semibold text-base">
                <span className="text-xl">🟢</span>
                <span>Подключено</span>
              </div>
              <div className="text-xs text-gray-700 space-y-1">
                <p>
                  <span className="font-semibold">Версия прошивки:</span>{" "}
                  {firmwareCoralB.firmwareVersion || "—"}
                </p>
                <p>
                  <span className="font-semibold">Режим ПАВ:</span>{" "}
                  {firmwareCoralB.SAW_mode === null
                    ? "неизвестно"
                    : firmwareCoralB.SAW_mode
                    ? "с ПАВ"
                    : "без ПАВ"}
                </p>
              </div>
              <button
                onClick={() => startstop(false)}
                className="w-full mt-1 bg-red-100 text-red-800 hover:bg-red-200 font-medium py-1.5 px-3 rounded-xl text-xs transition"
              >
                ⛔ Отключить
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-semibold text-base">
                <span className="text-xl">🔴</span>
                <span>Нет подключения</span>
              </div>
              <button
                onClick={() => startstop(true)}
                className="w-full bg-green-100 text-green-800 hover:bg-green-200 font-medium py-1.5 px-3 rounded-xl text-xs transition"
              >
                🔌 Подключиться
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Команды */}
      <div className="bg-white p-6 rounded-2xl shadow space-y-4">
        <h2 className="text-2xl font-semibold text-gray-800">
          Команды устройства
        </h2>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={() => handleCommand("RD")}
            className="bg-indigo-600 text-white text-sm font-bold py-3 px-6 rounded-xl shadow hover:bg-indigo-700 transition"
          >
            📄 Версия прошивки (RD)
          </button>

          <button
            onClick={() => handleCommand("MODE?")}
            className="bg-gray-600 text-white text-sm font-bold py-3 px-6 rounded-xl shadow hover:bg-gray-700 transition"
          >
            🧭 Узнать текущий режим (MODE?)
          </button>

          <button
            onClick={() => handleCommand("SAW1")}
            className="bg-gray-600 text-white text-sm font-bold py-3 px-6 rounded-xl shadow hover:bg-gray-700 transition"
          >
            🧪 Установить режим с ПАВ (SAW1)
          </button>

          <button
            onClick={() => handleCommand("SAW0")}
            className="bg-gray-600 text-white text-sm font-bold py-3 px-6 rounded-xl shadow hover:bg-gray-700 transition"
          >
            🚫 Установить режим без ПАВ (SAW0)
          </button>

          <button
            onClick={() => handleCommand("INF0")}
            className="bg-gradient-to-r from-teal-800 to-yellow-600 text-white text-sm font-bold py-3 px-6 rounded-xl shadow hover:from-teal-700 hover:to-yellow-700 transition"
          >
            📊 Тестировать прошивку (INF0)
          </button>
        </div>

        {/* Главная кнопка отдельно и крупнее */}
        <div className="pt-6 space-y-4">
          <button
            onClick={() => handleCommand("FLH0")}
            className="w-full bg-gradient-to-r from-teal-500 to-purple-700 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:from-teal-600 hover:to-purple-800 transition"
          >
            ⚡ Запустить полный цикл (FLH0)
          </button>

          <button
            onClick={addBoardsToBaseALL}
            className="w-full bg-white text-gray-700 border border-gray-300 hover:bg-gray-100 py-3 px-6 rounded-xl shadow transition flex items-center justify-center gap-2"
          >
            📥 Записать все в базу
          </button>
        </div>
      </div>

      {/* Логи */}
      <div className="bg-gray-900 text-white p-4 rounded-xl shadow h-[600px] overflow-y-auto relative">
        <pre className="whitespace-pre-wrap">{logs}</pre>
      </div>

      {/* Порты */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {Array.from({ length: firmwareCoralB.countPort }, (_, i) => (
          <FirmCoralBPortCard
            key={i}
            id={i}
            sendCommand={handleCommand}
            loadingCommand={loadingCommand}
            firmwareCoralB={firmwareCoralB}
            addBoardsToBase={() => addBoardsToBase(i)}
          />
        ))}
      </div>
    </div>
  );
});
