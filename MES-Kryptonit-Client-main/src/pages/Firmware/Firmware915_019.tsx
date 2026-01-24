import { observer } from "mobx-react-lite";
import plata915_1 from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-03.png";
import plata915_2 from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-05.png";
import { useContext, useEffect, useRef, useState } from "react";
import { Context } from "src/main";
import {
  eraseFlash915,
  getMAC915,
  // transferToMode915,
  uploadFlash915_019,
} from "src/api/firmwareApi";
import { PreloaderMini } from "src/components/common/PreloaderMini";
import { DiamondPlus } from "lucide-react";
import { create915Board } from "src/api/elrsApi";

export const Firmware915_019: React.FC = observer(() => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { firmware915 } = context;

  const abortControllerRef = useRef(new AbortController());
  const [showIcon, setShowIcon] = useState(false);

  useEffect(() => {
    if (firmware915.counterTotalForSession >= 0) {
      setShowIcon(true);
      const timer = setTimeout(() => setShowIcon(false), 7000); // Пропадает через 5 сек
      return () => clearTimeout(timer);
    }
  }, [firmware915.counterTotalForSession]);

  const abortAllRequests = () => {
    abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    firmware915.resetState(); //  все состояния сбрасываются через MobX
  };

  const eraseFlashForPort = async (id: number) => {
    try {
      firmware915.setLoading(id, true);
      const currentFlash = await eraseFlash915(
        id,
        abortControllerRef.current.signal
      );
      currentFlash.message
        ? firmware915.setEraseFlashStatus(id, currentFlash.message)
        : (console.log(currentFlash),
          firmware915.setEraseFlashStatus(id, "Ошибка при очитске флэш"));
      firmware915.setLoading(id, false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`Запрос на порту ${id} отменен`);
      } else {
        console.error(`Ошибка при отчистке flash на порту ${id}:`, error);
      }
      firmware915.setLoading(id, false);
    }
  };

  const eraseFlashForAllPort = async () => {
    await Promise.all(
      Array.from({ length: firmware915.countPort }, (_, i) =>
        eraseFlashForPort(i)
      )
    );
  };

  const getMACForPort = async (id: number) => {
    try {
      firmware915.setLoadingMAC(id, true);
      const currentMAC = await getMAC915(id, abortControllerRef.current.signal);
      if (currentMAC.length < 30) firmware915.setMacAddress(id, currentMAC);
      else {
        console.log(currentMAC);
        firmware915.setMacAddress(id, "Ошбика считывания MAC-адресса");
      }
      firmware915.setLoadingMAC(id, false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log(`Запрос на порту ${id} отменен`);
      } else {
        console.error(
          `Ошибка при считывании мак-адресса на порту ${id}:`,
          error
        );
      }
      firmware915.setLoadingMAC(id, false);
    }
  };

  const getMACForAllPorts = async () => {
    await Promise.all(
      Array.from({ length: firmware915.countPort }, (_, i) => getMACForPort(i))
    );
  };

  const flashForPort = async (id: number) => {
    try {
      firmware915.setLoading(id, true);

      const result = await uploadFlash915_019(
        id,
        abortControllerRef.current.signal
      );
      result.message
        ? firmware915.setFlashStatus(id, result.message)
        : (firmware915.setFlashStatus(id, "Ошибка прошивки"),
          console.log(result));

      firmware915.setLoading(id, false);
    } catch (error: any) {
      if (error.name === "AbortError") {
        const err = `Прошивка на ${id} отменена`;
        firmware915.setFlashStatus(id, err);
        console.log(`Прошивка на порту ${id} отменена`);
      } else {
        console.error(`Ошибка при прошивке на порту ${id}:`, error);
      }
      firmware915.setLoading(id, false);
    }
  };

  const flashForAllPorts = async () => {
    await Promise.all(
      Array.from({ length: firmware915.countPort }, (_, i) => flashForPort(i))
    );
  };

  // const transferToModeForAllPort = async () => {
  //   try {
  //     const data = await transferToMode915(abortControllerRef.current.signal);
  //     console.log(data);
  //   } catch (error: any) {
  //     if (error.name === "AbortError") {
  //       console.log(`Перевод в режим отменен`);
  //     } else {
  //       console.error(`Ошибка при переводе в режим`, error);
  //     }
  //   }
  // };

  const addBoardsToBase = async (id: number) => {
    const MAC_address: string = firmware915.macAddress[id];
    const currentFirm: boolean =
      firmware915.flashStatus[id] === "Успешно прошилось";
    const sessionId = Number(localStorage.getItem("sessionID"));
    const categoryDefect915Id = 1;
    if (
      MAC_address !== null &&
      MAC_address.length < 25 &&
      currentFirm === true
    ) {
      try {
        await create915Board(
          MAC_address,
          currentFirm,
          sessionId,
          categoryDefect915Id,
          "019"
        );
        firmware915.setCounterTotalForSessionPlus();
        firmware915.setMessageDB(id, "Успешно добавлено");
      } catch (error) {
        firmware915.setMessageDB(id, `Ошибка при добавлении в базу ${error}`);
      }
    }
  };

  const addBoardsToBaseALL = async () => {
    for (let i = 0; i <= firmware915.countPort - 1; i++) {
      addBoardsToBase(i);
    }
  };




  const flashAndWriteAll = async () => {
    try {
      // Сначала прошиваем все порты
      await flashForAllPorts();

      // Затем записываем данные в базу
      await addBoardsToBaseALL();

      console.log("Прошивка и запись завершены успешно!");
    } catch (error) {
      console.error("Ошибка при выполнении прошивки и записи:", error);
    }
  };





  const getCardClass = (id: number) => {
    const unique_device_id: string = firmware915._macAddress[id];
    const currentFirm: boolean =
      firmware915.flashStatus[id] === "Успешно прошилось";
    const currentMessageDB: boolean =
      firmware915.messageDB[id] === "Успешно добавлено";

    return unique_device_id &&
      unique_device_id.length < 25 &&
      currentFirm &&
      currentMessageDB
      ? "bg-green-300" // Зеленый фон, если серийник считан и прошивка успешна и добавилось в базу
      : "bg-white"; // Если не прошита, то белый фон
  };

  const getFirmwareClass = (id: number) => {
    let classNameForFirm = "";
    let currentFirm = firmware915.flashStatus[id];

    if (currentFirm === "Успешно прошилось") {
      classNameForFirm = "text-green-600";
    } else if (currentFirm === "Не прошито") {
      classNameForFirm = "text-gray-600";
    } else {
      classNameForFirm = "bg-rose-500 animate-pulse";
    }
    return classNameForFirm;
  };

  const getEraseFirmwareClass = (id: number) => {
    let classNameForFirm = "";
    let currentFirm = firmware915.eraseFlashStatus[id];

    if (currentFirm === "Flash очищен") {
      classNameForFirm = "bg-green-600";
    } else if (currentFirm === "Не сброшено") {
      classNameForFirm = "bg-stone-200";
    } else {
      classNameForFirm = "bg-rose-500 animate-pulse";
    }
    return classNameForFirm;
  };

  const getAddToBaseClass = (id: number) => {
    let classNameForMessageDB = "";
    let currentMessageDB = firmware915.messageDB[id];
    console.log(currentMessageDB);

    if (currentMessageDB === "Не добавлено") {
      classNameForMessageDB = "text-gray-600";
    } else if (currentMessageDB === "Успешно добавлено") {
      classNameForMessageDB = "text-green-600";
    } else {
      classNameForMessageDB = "bg-rose-500 animate-pulse";
    }
    return classNameForMessageDB;
  };

  const getMACAddressClass = (id: number) => {
    let classNameForSerial = "";
    let currentSerial = firmware915._macAddress[id];

    if (!currentSerial) {
      classNameForSerial = "text-gray-600";
    } else if (currentSerial && currentSerial.length < 25) {
      classNameForSerial = "text-green-600";
    } else {
      classNameForSerial = "bg-rose-500 animate-pulse";
    }
    return classNameForSerial;
  };

  return (
    <div className="space-y-4 bg-gray-100/50 min-h-screen">
      <div className="flex items-center justify-between p-6 rounded-xl ">
        {/* Блок с количеством портов */}
        <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm">
          <span className="text-gray-700 font-medium">Количество портов</span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => firmware915.setCountPortMinus()}
              className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition duration-200"
            >
              -
            </button>
            <span className="text-xl font-bold text-gray-800">
              {firmware915.countPort}
            </span>
            <button
              onClick={() => firmware915.setCountPortPlus()}
              className="w-8 h-8 bg-gray-200 text-gray-700 rounded-full flex items-center justify-center hover:bg-gray-300 transition duration-200"
            >
              +
            </button>
          </div>
        </div>

        {/* Заголовок */}
        <h2 className="w-3/5 text-3xl font-bold text-gray-800">
          Прошивка приемника 915 (019, без перевода в режим)
        </h2>
        
      </div>

      <div className="flex justify-around">
        {/* Блок с изображениями */}
        <div className="flex justify-center items-center gap-6">
          <img
            src={plata915_1}
            className="w-28 h-auto rounded-lg shadow-md"
            alt="картинка"
          />
          <img
            src={plata915_2}
            className="w-28 h-auto rounded-lg shadow-md"
            alt="картинка"
          />
        </div>

        <div className="flex flex-col items-center space-y-4">
          {/* Кнопка "Очистить Flash" */}
          <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-blue-600 transition"
            onClick={eraseFlashForAllPort}
          >
            Очистить Flash
          </button>

          {/* Квадратные кнопки с цифрами */}
          <div className="flex flex-wrap justify-center gap-2">
            {Array.from({ length: firmware915.countPort }, (_, i) => i).map(
              (number) => (
                <button
                  key={number}
                  onClick={() => eraseFlashForPort(number)}
                  className={`w-12 h-12  font-bold rounded-lg shadow-md ${getEraseFirmwareClass(
                    number
                  )} hover:bg-gray-300 transition flex items-center justify-center`}
                >
                  {number+1}
                  {firmware915.loading[number] && <PreloaderMini />}
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 w-max gap-2 mt-8">
          <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-blue-600 transition "
            onClick={getMACForAllPorts}
          >
            🔍 Считать
          </button>

          {/* <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-green-500 transition duration-300"
            onClick={flashForAllPorts}
          >
            ⚡ Прошить 
          </button> */}


          
          <button
            className="bg-gradient-to-r from-teal-600 to-purple-700 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:from-teal-700 hover:to-purple-800 transition duration-300"
            onClick={flashAndWriteAll}
          >
            ⚡ Прошить + 📥 Записать
          </button>


          {/* <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-indigo-700 transition duration-300"
            onClick={() => transferToModeForAllPort()}
          >
            🛠️ Перевести в режим
          </button> */}

          {/* <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-indigo-700 transition duration-300"
            onClick={addBoardsToBaseALL}
          >
            📥 Записать
          </button> */}

          <button
            className="bg-red-700 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-rose-600 transition duration-300"
            onClick={abortAllRequests}
          >
            🔄 Перезарядка
          </button>
        </div>
      </div>

      <div className="grid grid-cols-6 gap-4">
        {Array.from({ length: firmware915.countPort }, (_, i) => i).map(
          (id) => (
            <div
              key={id}
              className={`border p-4 rounded-lg shadow-md ${getCardClass(id)}`}
            >
              <h3 className="text-md font-semibold text-center">Порт {id+1}</h3>
              <div className="flex">
                <button
                  className=" bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  onClick={() => getMACForPort(id)}
                >
                  🔍
                </button>

                <p className="text-sm ml-2 text-center">Мак-адрес:</p>
              </div>

              <p
                className={`break-words text-xl   font-medium ${getMACAddressClass(
                  id
                )}`}
              >
                {firmware915.macAddress[id] || "мак-адресс"}
                {firmware915.loadingMAC[id] && <PreloaderMini />}
              </p>

              <div className="flex mt-3">
                <button
                  className="bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-red-700 transition duration-200 mt-2"
                  onClick={() => flashForPort(id)}
                >
                  ⚡
                </button>

                <p className="text-sm mt-2 ml-2 text-center">
                  Состояние прошивки
                </p>
              </div>

              <p className={` text-xl font-medium ${getFirmwareClass(id)}`}>
                <p className={` text-xl font-medium ${getFirmwareClass(id)}`}>
                  {firmware915.flashStatus[id]}
                  {firmware915.loading[id] && <PreloaderMini />}
                </p>
              </p>

              <div className="flex mt-3">
                <button
                  className="bg-blue-200 font-medium py-1 px-2 rounded-lg hover:bg-blue-700 transition duration-200"
                  onClick={() => addBoardsToBase(id)}
                >
                  📥
                </button>
                <p className="text-sm mt-2 ml-2 text-center">
                  Добавление в базу
                </p>
              </div>
              <p className={`text-xl  font-medium ${getAddToBaseClass(id)}`}>
                {firmware915.messageDB[id]}
              </p>
            </div>
          )
        )}
      </div>

      <div className="p-4 bg-gray-100 rounded-lg shadow-md">
        <div className="flex  mr-20 items-center text-lg font-semibold text-gray-800">
          <div className="w-2/3"></div>

          <div className="w-1/3  ml-20 ">
            <div className="flex">
              Всего добавлено в базу за текущий сеанс:
              <span className="ml-2  text-blue-600">
                {firmware915.counterTotalForSession}
              </span>
              {showIcon && (
                <span className="ml-2 text-green-600 animate-pulse">
                  <DiamondPlus size={32} />
                </span>
              )}
            </div>
            <button
              className="bg-red-600 text-white py-2 px-2 rounded-2xl shadow-xl hover:bg-rose-400 transition duration-300"
              onClick={() => firmware915.resetCounterTotalForSession()}
            >
              Обнулить счетчик
            </button>
          </div>

          
        </div>

        <div className="mt-5 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 rounded-md">
          ⚠️ <span className="font-medium">ВНИМАНИЕ:</span> в базу добавляется
          только плата, у которой считался Мак-адрес и на которую загрузилась
          прошивка.
          <br></br>
          Перевод в режим необходимо проверять по индикации мигания светодиода
          на плате.
          <br></br>
          Перезарядка останавливает текущие процессы прошивки, если они есть.
        </div>
      </div>
    </div>
  );
});
