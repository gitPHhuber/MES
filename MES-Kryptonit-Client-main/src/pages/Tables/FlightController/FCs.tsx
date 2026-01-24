import { FlightControllerList } from "./FCList";
import { Pages } from "./Pages";
import FC1 from 'assets/images/FC1.png'
import FC2 from 'assets/images/FC2.png'

export const FCs: React.FC = () => {
  return (
    <div className="flex  h-screen bg-gray-100/60">
      

      {/* Основной контент */}
      <main className="flex-1 p-6 flex flex-col overflow-y-auto h-screen">
        {/* Заголовок страницы */}
        <header className=" flex  mb-6">
          <h1 className="text-3xl font-bold text-gray-800">
            Полетный контроллер (FC)
          </h1>

           {/* Блок с изображениями */}
        <div className="flex ml-10 justify-center items-center gap-6">
          <img
            src={FC2}
            className="w-24 h-auto rounded-lg shadow-md"
            alt="FC1"
          />
          <img
            src={FC1}
            className="w-24 h-auto rounded-lg shadow-md"
            alt="FC2"
          />
        </div>
        </header>

        {/* Контент */}
        <div className="flex-1 bg-white shadow-md rounded-lg">
          <FlightControllerList />
        </div>

        {/* Пагинация */}
        <div className="mt-6 flex justify-center">
          <Pages />
        </div>
      </main>

     
    </div>
  );
};
