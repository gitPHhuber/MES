import FirmwareCoralBStore from "src/store/FirmwareCoralB";

interface FirmPortProps {
  id: number;
  sendCommand: (value: string) => void;
  addBoardsToBase: () => void;
  firmwareCoralB: FirmwareCoralBStore;
  loadingCommand: string | null;
}

export const FirmCoralBPortCard: React.FC<FirmPortProps> = ({
  id,
  firmwareCoralB,
  sendCommand,
  addBoardsToBase,
  loadingCommand,
}) => {
  const flashStatus = firmwareCoralB.flashStatus[id];
  const isSuccess = flashStatus?.includes("✅");

  const isFlashing = loadingCommand === `FLH${id + 1}`;
  const isTesting = loadingCommand === `TST${id + 1}`;
  const isInfo = loadingCommand === `INF${id + 1}`;

  return (
    <div
      key={id}
      className="rounded-2xl shadow-md bg-white p-5 space-y-4 border border-gray-200 hover:shadow-xl transition-all duration-300"
    >
      <h3 className="text-center text-lg font-bold text-gray-800">
        🔌 Порт {id + 1}
      </h3>

      {/* Serial */}
      <div className="flex flex-col">
        <span className="text-xl text-gray-500">Serial:</span>
        <p className="text-xl font-mono text-gray-900 break-all">
          {firmwareCoralB.serial[id] || "—"}
        </p>
      </div>

      {/* Flash status */}
      <div className="flex flex-col">
        <span className="text-xl text-gray-500">Статус прошивки:</span>
        <p
          className={`text-xl font-semibold ${
            isSuccess ? "text-green-600" : "text-red-600"
          }`}
        >
          {flashStatus || "—"}
        </p>
      </div>

      {/* Команды */}
      <div className="flex flex-col gap-2">
        <button
          disabled={isTesting}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
            isTesting
              ? "bg-blue-300 cursor-wait"
              : "bg-blue-600 hover:bg-blue-700"
          }`}
          onClick={() => sendCommand(`TST${id + 1}`)}
        >
          {isTesting ? "⌛ Тест..." : `🔍 Тест-ть питание и RF (TST${id + 1})`}
        </button>

        <button
          disabled={isFlashing}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
            isFlashing
              ? "bg-yellow-300 cursor-wait"
              : "bg-yellow-500 hover:bg-yellow-600"
          }`}
          onClick={() => sendCommand(`FLH${id + 1}`)}
        >
          {isFlashing ? "⌛ Прошивка..." : `⚡ Прошить (FLH${id + 1})`}
        </button>

        <button
          disabled={isInfo}
          className={`w-full px-4 py-2 rounded-lg text-sm font-medium text-white transition ${
            isInfo
              ? "bg-purple-300 cursor-wait"
              : "bg-purple-600 hover:bg-purple-700"
          }`}
          onClick={() => sendCommand(`INF${id + 1}`)}
        >
          {isInfo
            ? "⌛ Получение данных..."
            : `📊 Тест-ть прошивку (INF${id + 1})`}
        </button>
      </div>

      {/* Добавление в БД */}
      <div className="pt-2 border-t border-gray-200 space-y-1">
        <button
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-2 px-4 rounded-lg transition"
          onClick={() => addBoardsToBase}
        >
          📥 Добавить в БД
        </button>

        <div className="text-xs text-gray-500">Статус БД:</div>
        <div className="text-sm text-gray-700">
          {firmwareCoralB.messageDB[id] || "—"}
        </div>
      </div>
    </div>
  );
};
