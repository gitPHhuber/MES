import { DiamondPlus } from "lucide-react";
import { observer } from "mobx-react-lite";
import { useContext, useEffect, useRef, useState } from "react";
import { createFC } from "src/api/fcApi";
import { getSerialId, startWork, stopWork, uploadFont } from "src/api/firmwareApi";
import { Context } from "src/main";
import FC1 from "assets/images/FC1.png";
import FC2 from "assets/images/FC2.png";
import { toJS } from "mobx";
import { useDeepCompareEffect } from "react-use";
import { PortCardFC } from "./PortCard";
import { FirmwareFCControls } from "./FirmwareFCControl";
import { useBetaflyData } from "src/hooks/useBetaflyData";


export const FirmwareFC: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { firmwareFC } = context;

  const [socketKey, setSocketKey] = useState(0);

  const { devices, deviceHighlight, startChecking, resetDeviceHiglicht } = useBetaflyData(socketKey);



  const abortControllerRef = useRef(new AbortController());
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    if (firmwareFC.counterTotalForSession >= 0) {
      setShowIcon(true);
      const timer = setTimeout(() => setShowIcon(false), 7000); // Пропадает через 7 сек
      return () => clearTimeout(timer);
    }
  }, [firmwareFC.counterTotalForSession]);

  const [highlightedCards, setHighlightedCards] = useState<{
    [key: number]: boolean;
  }>({});

  // Функция для активации зеленого фона на 7 секунд
  const activateGreenBackground = (id: number) => {
    setHighlightedCards((prev) => ({ ...prev, [id]: true })); // Устанавливаем зеленый фон
    setTimeout(() => {
      setHighlightedCards((prev) => ({ ...prev, [id]: false })); // Через 7 секунд сбрасываем
    }, 7000);
  };

  useDeepCompareEffect(() => {
    Array.from({ length: firmwareFC.countPort }, (_, id) => {
      if (
        firmwareFC.serialIdsFC[id] &&
        firmwareFC.flashStatus[id] === "Прошилось" &&
        firmwareFC.messageDB[id] === "Успешно добавлено"
      ) {
        activateGreenBackground(id);
      }
    });
  }, [
    firmwareFC.serialIdsFC,
    toJS(firmwareFC.flashStatus),
    toJS(firmwareFC.messageDB),
    firmwareFC.countPort,
  ]);

  const abortAllRequests = () => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    firmwareFC.resetState(); // Теперь все состояния сбрасываются через MobX
    stopWork();
    resetDeviceHiglicht();
  };

  const getSerialForPort = async (id: number) => {
    try {
      const currentId = await getSerialId(
        id,
        abortControllerRef.current.signal
      );
      firmwareFC.setSerialIdsFC(id, currentId.serial_number);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`Запрос на порту ${id} отменен`);
      } else {
        console.error(`Ошибка при считывании серийника на порту ${id}:`, error);
      }
    }
  };

  const getSerialForAllPorts = async () => {
    await stopWork();
    await Promise.all(
      Array.from({ length: firmwareFC.countPort }, (_, i) =>
        getSerialForPort(i)
      )
    );
    await startWork();
    setSocketKey((k) => k + 1); // пересоздаст хук → пересоздаст WS

    startChecking()
  };

  const flashForPort = async (id: number) => {
    if (deviceHighlight[`/dev/ttyACM${id}`]=== 'red' ) {firmwareFC.setFlashStatus(id, 'БРАК'); return}
    try {
      firmwareFC.setLoading(id, true);

      const result = await uploadFont(id, abortControllerRef.current.signal);

      firmwareFC.setFlashStatus(id, result.status);
      firmwareFC.setLoading(id, false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        const err = `Прошивка на ${id} отменена`;
        firmwareFC.setFlashStatus(id, err);
        console.log(`Прошивка на порту ${id} отменена`);
      } else {
        console.error(`Ошибка при прошивке на порту ${id}:`, error);
      }
      firmwareFC.setLoading(id, false);
    }
  };

  const flashForAllPorts = async () => {
    await stopWork();
    await Promise.all(
      Array.from({ length: firmwareFC.countPort }, (_, i) => flashForPort(i))
    );
  };

  const addFCtoBase = async (id: number) => {
    const unique_device_id: string = firmwareFC.serialIdsFC[id];
    const currentFirm: boolean = firmwareFC.flashStatus[id] === "Прошилось";
    const sessionId = Number(localStorage.getItem("sessionID"));
    const categoryDefectId = 1;
    if (
      unique_device_id !== null &&
      unique_device_id.length < 35 &&
      currentFirm === true
    ) {
      try {
        await createFC(
          unique_device_id,
          currentFirm,
          sessionId,
          categoryDefectId
        );
        firmwareFC.setCounterTotalForSessionPlus();
        firmwareFC.setMessageDB(id, "Успешно добавлено");
      } catch (error) {
        firmwareFC.setMessageDB(id, `Ошибка при добавлении в базу ${error}`);
      }
    }
  };

  const addFCtoBaseALL = async () => {
    for (let i = 0; i <= firmwareFC.countPort - 1; i++) {
      addFCtoBase(i);
    }
  };

  return (
    <div className="space-y-4 bg-gray-100/50 min-h-screen">
      <h2 className="text-3xl font-bold text-center text-gray-800 ">
        Прошивка Полетного контроллера (FC)
      </h2>

      <div className="flex justify-around">
        {/* Блок с количеством портов */}
        <div className="flex h-16 items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
          <span className="text-gray-700 font-medium">Количество портов</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => firmwareFC.setCountPortMinus()}
              className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition duration-200"
            >
              -
            </button>
            <span className="text-xl font-bold text-gray-800">
              {firmwareFC.countPort}
            </span>
            <button
              onClick={() => firmwareFC.setCountPortPlus()}
              className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition duration-200"
            >
              +
            </button>
          </div>

          {/* Блок с переключателем Pro Mode */}
          <div className="flex h-16 items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
            <span className="text-gray-700 font-medium">Pro Режим</span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={firmwareFC.proMode} // предполагая, что есть такое свойство
                onChange={() => firmwareFC.setProMode()}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>

        {/* Блок с изображениями */}
        <div className="flex justify-center items-center gap-6">
          <img
            src={FC2}
            className="w-40 h-auto rounded-lg shadow-md"
            alt="FC1"
          />
          <img
            src={FC1}
            className="w-40 h-auto rounded-lg shadow-md"
            alt="FC2"
          />
        </div>

        <FirmwareFCControls
          onReadAll={getSerialForAllPorts}
          onFlashAll={flashForAllPorts}
          onWriteAll={addFCtoBaseALL}
          onAbortAll={abortAllRequests}
        />
      </div>

      <div className="grid grid-cols-5 gap-4">
        {Array.from({ length: firmwareFC.countPort }, (_, i) => i).map((id) => {
          const portPath = `/dev/ttyACM${id}`;
          const device = devices.find((d) => d.port?.trim() === portPath?.trim()); // ищем устройство по порту
          return (
            <PortCardFC
              key={id}
              id={id}
              deviceData={device} // передаём данные конкретной платы
              serial={firmwareFC.serialIdsFC[id]}
              flashStatus={firmwareFC.flashStatus[id]}
              messageDB={firmwareFC.messageDB[id]}
              loading={firmwareFC.loading[id]}
              onReadSerial={() => getSerialForPort(id)}
              onFlash={() => flashForPort(id)}
              onAddToBase={() => addFCtoBase(id)}
              isHighlighted={highlightedCards[id]}
              deviceHighlight={deviceHighlight[`/dev/ttyACM${id}`]}
              proMode={firmwareFC.proMode}
            />
          )
        }
        )}
      </div>

      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
        <div className="flex  mr-20 items-center text-lg font-semibold text-gray-800">
          <div className="w-2/3"></div>

          <div className="w-1/3  ml-20 ">
            <div className="flex">
              Всего добавлено в базу за текущий сеанс:
              <span className="ml-2  text-blue-600">
                {firmwareFC.counterTotalForSession}
              </span>
              {showIcon && (
                <span className="ml-2 text-green-600 animate-pulse">
                  <DiamondPlus size={32} />
                </span>
              )}
            </div>
            <button
              className="bg-red-600 text-white py-2 px-2 rounded-2xl shadow-xl hover:bg-rose-400 transition duration-300"
              onClick={() => firmwareFC.resetCounterTotalForSession()}
            >
              Обнулить счетчик
            </button>
          </div>
        </div>

        <div className="mt-5 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
          ⚠️ <span className="font-medium">ВНИМАНИЕ:</span> в базу добавляется
          только плата, у которой считался номер и на которую загрузился шрифт.
          <br></br>
          Перезарядка останавливает текущие процессы прошивки, если они есть.
        </div>
      </div>
    </div>
  );
});
