import { useState } from "react";
import { updateComponentRef } from "src/api/product_componentApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { componentModel } from "src/types/ComponentModel";

interface AdminEditComponentProps {
  updateComponentsList: () => void;
  component: componentModel;
  ID: number;
}

export const AdmProdEditComponent: React.FC<AdminEditComponentProps> = ({
  updateComponentsList,
  component,
  ID,
}) => {
  const [newComponentTitle, SetNewComponentTitle] = useState(component.title);
  const [newComponentArticle, SetNewComponentArticle] = useState(
    component.article
  );
  const [newComponentQuantity, SetNewComponentQuantity] = useState(
    component.quantity
  );

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const editComponent = async () => {
    try {
      await updateComponentRef(
        ID,
        newComponentTitle,
        newComponentArticle,
        newComponentQuantity
      );

      setSuccessMessage("Наименование успешно изменено");
      setErrorMessage("");
      setRequestId(null);
      updateComponentsList();
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при изменении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      console.log(error.response?.data?.message);
      setSuccessMessage("");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">
        Изменить продукт {component.title}
      </h2>
      <form>
        <p>Наименование</p>
        <input
          type="text"
          placeholder="Наименование изделия"
          className="w-full p-2 border rounded-lg mb-2"
          value={newComponentTitle}
          onChange={(e) => SetNewComponentTitle(e.target.value)}
        />
        <p>Артикул</p>
        <input
          type="text"
          placeholder="Наименование изделия"
          className="w-full p-2 border rounded-lg mb-2"
          value={newComponentArticle}
          onChange={(e) => SetNewComponentArticle(e.target.value)}
        />
        <p>Наименование</p>
        <input
          type="number"
          placeholder="Наименование изделия"
          className="w-full p-2 border rounded-lg mb-2"
          value={newComponentQuantity}
          onChange={(e) => SetNewComponentQuantity(Number(e.target.value))}
        />

        <button
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          type="button"
          onClick={() => editComponent()}
        >
          Изменить комплектующее
        </button>

        {successMessage && (
          <div className="mt-4 text-green-500 font-medium">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 text-red-500 font-medium">
            {errorMessage}
            <RequestIdNotice requestId={requestId} />
          </div>
        )}
      </form>
    </div>
  );
};
