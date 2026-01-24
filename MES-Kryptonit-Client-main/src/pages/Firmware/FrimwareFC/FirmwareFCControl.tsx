import React, { useEffect, useState } from "react";

interface FirmwareControlsProps {
    onReadAll: () => void;
    onFlashAll: () => Promise<void>;
    onWriteAll: () => Promise<void>;

    onAbortAll: () => void;
}

export const FirmwareFCControls: React.FC<FirmwareControlsProps> = ({
    onReadAll,
    onFlashAll,
    onWriteAll,
    onAbortAll,
}) => {

    const [isDisabled, setIsDisabled] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [isFlashing, setIsFlashing] = useState(false);


    useEffect(() => {
        if (countdown > 0) {
            const timer = setTimeout(() => {
                setCountdown(prev => prev - 1);
            }, 1000);

            return () => clearTimeout(timer);
        } else if (countdown === 0 && isDisabled) {
            setIsDisabled(false);
        }
    }, [isDisabled, countdown]);

    const handleReadAll = () => {
        onReadAll();
        setIsDisabled(true);
        setCountdown(5); // 5 секунд


    }

    const flashAndWriteAll = async () => {
        if (isDisabled) return;
        setIsFlashing(true)
        try {
            // Сначала прошиваем все порты
            await onFlashAll();

            // Затем записываем данные в базу
            await onWriteAll();

            console.log("Прошивка и запись завершены успешно!");
        } catch (error) {
            console.error("Ошибка при выполнении прошивки и записи:", error);
        } finally {setIsFlashing(false)}
    };

    return (
        <div className="grid grid-cols-2 w-max gap-2 mt-8">
            <button
                className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-blue-600 transition"
                onClick={handleReadAll}
            >
                🔍 Считать
            </button>


            {/* Кнопка Прошить + Записать */}
            <button
                className={`bg-gradient-to-r from-teal-600 to-purple-700 text-lg font-bold py-4 px-8 rounded-2xl shadow-xl transition duration-300 ${ isFlashing
                    ? "bg-orange-500 text-white cursor-wait opacity-80" 
                    : isDisabled
                    ? "bg-gray-400 text-gray-600 cursor-wait opacity-60" 
                    : "bg-gradient-to-r from-teal-600 to-purple-700 text-white hover:from-teal-700 hover:to-purple-800"
                }`}
                onClick={flashAndWriteAll}
                disabled={isDisabled}
// title={isDisabled ? (isFlashing ? "Идет прошивка..." : `Доступно через: ${countdown} сек`) : "Прошить и записать"}           
 >
                <div className="gap-2">
                    {isFlashing ? "⏳ Прошивается..." : "⚡ Прошить + 📥 Записать"}
                    {isDisabled && countdown > 0 && (
                        <div className="ml-2 text-sm bg-white/20 px-2 py-1 rounded-full">
                            {countdown}сек
                        </div>
                    )}
                </div>
            </button>

            {/* <button
                className="bg-gradient-to-r from-teal-600 to-purple-700 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:from-teal-700 hover:to-purple-800 transition duration-300"
                onClick={flashAndWriteAll}
                disabled={disable}
            >
                ⚡ Прошить + 📥 Записать
            </button> */}

            {/* <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-green-500 transition duration-300"
            onClick={flashForAllPorts}
          >
            ⚡ Прошить
          </button>

          <button
            className="bg-teal-600 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-indigo-700 transition duration-300"
            onClick={addFCtoBaseALL}
          >
            📥 Записать
          </button> */}

            <button
                className="bg-red-700 text-white text-lg font-bold py-4 px-8 rounded-2xl shadow-xl hover:bg-rose-600 transition duration-300"
                onClick={onAbortAll}
            >
                🔄 Перезарядка
            </button>
        </div>
    );
};
