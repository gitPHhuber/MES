import { observer } from "mobx-react-lite";
import { useContext } from "react";
import { Context } from "src/main";

export const PagesELRS: React.FC = observer(() => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { elrsStore } = context;

  const pageCount = Math.ceil(elrsStore.totalCount / elrsStore.limit);
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);

  return (
    <div className="flex flex-wrap justify-center items-center gap-2 mt-6 max-w-2xl">
      {pages.map((page) => (
        <button
          key={page}
          onClick={() => elrsStore.setPage(page)}
          className={`px-4 py-2 rounded-lg text-lg font-semibold transition duration-200
            ${
              elrsStore.page === page
                ? "bg-indigo-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-800 hover:bg-indigo-400 hover:text-white"
            }`}
          type="button"
        >
          {page}
        </button>
      ))}
    </div>
  );
});
