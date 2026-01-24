import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import {
  deleteCategoryDefect24,
  fetchCategoryDefect24,
  updateCategoryDefect24,
} from "src/api/elrsApi";
import { Context } from "src/main";
import { defectModelFull } from "src/types/DefectModel";
import { AdminOneDefect } from "./AdminOneDefect";

export const AdminDefect_2_4_Categories: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { elrsStore } = context;

  const updateDefectCategoriesList = async () => {
    fetchCategoryDefect24().then((data) =>
      elrsStore.setDefect_2_4_Categories(data)
    );
  };

  useEffect(() => {
    updateDefectCategoriesList();
  }, []);

  const deleteCurrentDefectCategories = async (id: number) => {
    try {
      await deleteCategoryDefect24(id);
      updateDefectCategoriesList();
    } catch (error: any) {
      console.error("Ошибка при удалении категории брака 2,4:", error);
    }
  };

  const updateCurrentDefect = async (
    ID: number,
    currentTitle: string,
    currentDescription: string
  ) => {
    await updateCategoryDefect24(ID, currentTitle, currentDescription);
    updateDefectCategoriesList();
  };

  let defectCategoriesALL = elrsStore.defect_2_4_Categories.map(
    (defect: defectModelFull) => (
      <AdminOneDefect
        key={defect.id}
        title={defect.title}
        description={defect.description}
        ID={defect.id}
        updateCurrentDefect={updateCurrentDefect}
        updateDefectCategoriesList={() => updateDefectCategoriesList()}
        deleteDefectCategory={() => deleteCurrentDefectCategories(defect.id)}
      />
    )
  );

  return (
    <div className="p-4  bg-gray-100/80 shadow-lg rounded-lg h-screen overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
        Список Категорий брака приемников 2,4
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {defectCategoriesALL}
      </div>
    </div>
  );
});
