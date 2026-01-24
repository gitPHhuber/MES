import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { Context } from "src/main";
import { defectModelFull } from "src/types/DefectModel";
import { AdminOneDefect } from "./AdminOneDefect";
import {
  deleteCategoryDefectCoral_B,
  fetchCategoryDefectCoral_B,
  updateCategoryDefectCoral_B,
} from "src/api/coralBApi";
import { BookOpenCheck } from "lucide-react";

export const AdminDefect_Coral_B_categories: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { coralBStore } = context;

  const updateDefectCategoriesList = async () => {
    fetchCategoryDefectCoral_B().then((data) =>
      coralBStore.setDefect_coral_B_categories(data)
    );
  };

  useEffect(() => {
    updateDefectCategoriesList();
  }, []);

  const deleteCurrentDefectCategories = async (id: number) => {
    try {
      await deleteCategoryDefectCoral_B(id);
      updateDefectCategoriesList();
    } catch (error: any) {
      console.error("Ошибка при удалении категории брака Coral B:", error);
    }
  };

  const updateCurrentDefect = async (
    ID: number,
    currentTitle: string,
    currentDescription: string
  ) => {
    await updateCategoryDefectCoral_B(ID, currentTitle, currentDescription);
    updateDefectCategoriesList();
  };

  let defectCategoriesALL = coralBStore.defect_coral_B_categories.map(
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
    <div className="p-6 bg-gradient-to-br from-gray-50/80 to-gray-100/80 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <BookOpenCheck className="mr-3 text-blue-500" size={24} />
            Список Категорий брака Coral B
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {defectCategoriesALL}
        </div>
      </div>
    </div>
  );
});
