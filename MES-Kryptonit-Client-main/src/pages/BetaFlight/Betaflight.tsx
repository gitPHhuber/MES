import React, { useState, useEffect } from "react";

export const Betaflight: React.FC = () => {
  const [attitude, setAttitude] = useState({ roll: 0, pitch: 0, yaw: 0 });
  const [serialPort, setSerialPort] = useState<SerialPort | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Открытие последовательного порта
  const openSerialPort = async () => {
    try {
      if (serialPort) {
        console.log("Устройство уже подключено");
        return;
      }

      const port = await navigator.serial.requestPort();
      await port.open({ baudRate: 115200 });

      setSerialPort(port);
      setIsConnected(true);
      console.log("Устройство подключено");

      // Запускаем потоковое обновление
      startReadingAttitude(port);
    } catch (error) {
      console.error("Ошибка при подключении:", error);
    }
  };

  // Отправка команды MSP
  const sendMspCommand = async (port: SerialPort, commandCode: number) => {
    try {
      if (!port.writable) {
        throw new Error("Порт недоступен для записи");
      }

      const writer = port.writable.getWriter();
      const commandBuffer = new Uint8Array([
        36,
        77,
        60,
        0,
        commandCode,
        commandCode ^ 0x00, // MSP-протокол
      ]);

      await writer.write(commandBuffer);
      writer.releaseLock();
    } catch (error) {
      console.error("Ошибка отправки MSP-команды:", error);
    }
  };

  // Чтение данных в потоке (10 раз в секунду)
  const startReadingAttitude = async (port: SerialPort) => {
    try {
      if (!port.readable) {
        throw new Error("Порт недоступен для чтения");
      }

      const reader = port.readable.getReader();

      const readLoop = async () => {
        while (true) {
          try {
            await sendMspCommand(port, 108); // MSP_ATTITUDE

            const { value, done } = await reader.read();
            if (done) break;

            if (value) {
              parseAttitudeData(value);
            }

            await new Promise((resolve) => setTimeout(resolve, 10)); // 10 раз в секунду (100 мс)
          } catch (error) {
            console.error("Ошибка в потоке чтения:", error);
            break;
          }
        }
        reader.releaseLock();
      };

      readLoop();
    } catch (error) {
      console.error("Ошибка при запуске потока чтения:", error);
    }
  };

  // Разбор данных MSP_ATTITUDE

  const parseAttitudeData = (data: Uint8Array) => {
    if (data.length < 12) {
      console.error("Ошибка: пришел слишком короткий пакет", data);
      return;
    }

    const dv = new DataView(data.buffer);

    try {
      console.log("Сырой MSP_ATTITUDE:", Array.from(data));

      const roll = dv.getInt16(5, true) / 10;
      const pitch = dv.getInt16(7, true) / 10;
      const yaw = dv.getInt16(9, true) / 1;

      console.log(`ROLL=${roll}, PITCH=${pitch}, YAW=${yaw}`);

      setAttitude({ roll, pitch, yaw });
    } catch (e) {
      console.error("Ошибка при разборе данных:", e, data);
    }
  };

  // Закрытие порта при размонтировании
  useEffect(() => {
    return () => {
      if (serialPort) {
        serialPort.close();
      }
    };
  }, [serialPort]);

  return (
    <div className="p-4">
      <h1 className="text-xl font-bold mb-4">Ориентация полетника:</h1>
      <button
        className="px-4 py-2 bg-blue-500 text-white rounded-md"
        onClick={openSerialPort}
      >
        {isConnected ? "Подключено" : "Подключиться"}
      </button>
      <div className="mt-4 text-lg">
        <p>
          Рыскание (Yaw): <b>{attitude.yaw.toFixed(1)}°</b>
        </p>
        <p>
          Тангаж (Pitch): <b>{attitude.pitch.toFixed(1)}°</b>
        </p>
        <p>
          Крен (Roll): <b>{attitude.roll.toFixed(1)}°</b>
        </p>
      </div>
    </div>
  );
};
