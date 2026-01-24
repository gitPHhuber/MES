import plata915_1 from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-03.png";
import plata915_2 from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-05.png";
import { Elrs915List } from "./Elrs915List";
import { PagesELRS } from "./PagesELRS";

export const ELRS915s: React.FC = () => {
  return (
    <div className="flex  h-screen bg-gray-100/60">
      {/* Основной контент */}
      <main className="flex-1 p-6 flex flex-col overflow-y-auto h-screen">
        {/* Заголовок страницы */}
        <header className=" flex  mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            ELRS приемник 915
          </h1>

          {/* Блок с изображениями */}
          <div className="flex ml-10 justify-center items-center gap-6">
            <img
              src={plata915_1}
              className="w-24 h-auto rounded-lg shadow-md"
              alt="915"
            />
            <img
              src={plata915_2}
              className="w-24 h-auto rounded-lg shadow-md"
              alt="915"
            />
          </div>
        </header>

        {/* Контент */}
        <div className="flex-1 bg-white shadow-md rounded-lg">
          <Elrs915List />
        </div>

        {/* Пагинация */}
        <div className="mt-6 flex justify-center">
          <PagesELRS />
        </div>
      </main>
    </div>
  );
};
