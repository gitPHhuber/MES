import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "src/main";

export const PagesCoralB: React.FC = observer(() => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { coralBStore } = context;

  const pageCount = Math.ceil(coralBStore.totalCount / coralBStore.limit);

  const currentPage = coralBStore.page;

  // Определяем диапазон страниц для отображения
  const getVisiblePages = () => {
    const visiblePages = [];
    const range = 2; // Количество страниц с каждой стороны от текущей

    // Всегда добавляем первую страницу
    visiblePages.push(1);

    // Добавляем страницы вокруг текущей
    const start = Math.max(2, currentPage - range);
    const end = Math.min(pageCount - 1, currentPage + range);
    if (start > 2) {
      visiblePages.push("...");
    }

    for (let i = start; i <= end; i++) {
      visiblePages.push(i);
    }

    if (end < pageCount - 1) {
      visiblePages.push("...");
    }

    // Всегда добавляем последнюю страницу, если она не первая
    if (pageCount > 1) {
      visiblePages.push(pageCount);
    }

    return visiblePages;
  };

  const visiblePages = getVisiblePages();

  // const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-6 max-w-2xl">
      <button
        onClick={() => coralBStore.setPage(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
      >
        Назад
      </button>

      {visiblePages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-2 py-2">
            ...
          </span>
        ) : (
          <button
            key={page}
            onClick={() => coralBStore.setPage(page as number)}
            className={`px-4 py-2 rounded-lg text-lg font-semibold transition duration-200
              ${
                currentPage === page
                  ? "bg-indigo-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-800 hover:bg-indigo-400 hover:text-white"
              }`}
            type="button"
          >
            {page}
          </button>
        )
      )}

      <button
        onClick={() =>
          coralBStore.setPage(Math.min(pageCount, currentPage + 1))
        }
        disabled={currentPage === pageCount}
        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-semibold disabled:opacity-50"
      >
        Вперед
      </button>

      {/* 
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => flightController.setPage(page)}
          className={`px-4 py-2 rounded-lg text-lg font-semibold transition duration-200
            ${
              flightController.page === page
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-800 hover:bg-indigo-400 hover:text-white"
            }`}
          type="button"
        >
          {page}
        </button>
      ))} */}
    </div>
  );
});
