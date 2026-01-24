import { PreloaderMini } from "src/components/common/PreloaderMini";
import { MiniBetafly } from "./MiniBetafly";
import { BetaflyDevice } from "src/hooks/useBetaflyData";

interface PortCardProps {
  id: number;
  deviceData?: BetaflyDevice;
  serial: string | null;
  flashStatus: string;
  messageDB: string;
  loading: boolean;
  onReadSerial: () => void;
  onFlash: () => void;
  onAddToBase: () => void;
  isHighlighted: boolean;
  deviceHighlight: string | null;
  proMode: boolean;
}

export const PortCardFC: React.FC<PortCardProps> = ({
  id,  
  deviceData,
  serial,
  flashStatus,
  messageDB,
  loading,
  onReadSerial,
  onFlash,
  onAddToBase,
  isHighlighted,
  deviceHighlight,
  proMode
}) => {
  const getFirmwareClass = () => {
    if (flashStatus === "Прошилось") return "text-green-600";
    if (flashStatus === "Не прошито") return "text-gray-600";
    return "bg-rose-500 animate-pulse";
  };

  const getSerialClass = () => {
    if (!serial) return "text-gray-600";
    if (serial.length < 30) return "text-green-600";
    return "bg-rose-500 animate-pulse";
  };

  const getMessageClass = () => {
    if (messageDB === "Не добавлено") return "text-gray-600";
    if (messageDB === "Успешно добавлено") return "text-green-600";
    return "bg-rose-500 animate-pulse";
  };

  return (
    <div className={`border p-4 rounded-lg shadow-md ${isHighlighted ? "bg-green-400" : "bg-white"}`}>
      <h3 className="text-md font-semibold text-center">Порт {id + 1}</h3>

      <div className="flex">
        <button
          className="bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-blue-700 transition duration-200"
          onClick={onReadSerial}
        >
          🔍
        </button>
        <p className="text-sm ml-2 text-center">Серийный номер</p>
      </div>

      <p className={`break-words text-xl font-medium ${getSerialClass()}`}>
        {serial || "серийный номер"}
      </p>

      <MiniBetafly device={deviceData} highlight={deviceHighlight} proMode={proMode}  />
      <div className="flex mt-3">
        <button
          className="bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-red-700 transition duration-200 mt-2"
          onClick={onFlash}
        >
          ⚡
        </button>
        <p className="text-sm mt-2 ml-2 text-center">Состояние прошивки</p>
      </div>

      <p className={`text-xl font-medium ${getFirmwareClass()}`}>
        {flashStatus}
        {loading && <PreloaderMini />}
      </p>

      <div className="flex mt-3">
        <button
          className="bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-blue-700 transition duration-200"
          onClick={onAddToBase}
        >
          📥
        </button>
        <p className="text-sm mt-2 ml-2 text-center">Добавление в базу</p>
      </div>

      <p className={`text-xl font-medium ${getMessageClass()}`}>{messageDB}</p>
    </div>
  );
};
