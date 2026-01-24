import { useState } from "react";
import { createProductReference } from "src/api/product_componentApi";

export const CreateProduct: React.FC = () => {
  const [title, SetTitle] = useState("");
  

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [confirm, setConfirm] = useState(false);



  const addProduct = async () => {
    try {
        await createProductReference(title,1)
      SetTitle("");
      setSuccessMessage("Изделие успешно добавлено");
      setErrorMessage("");
    } catch (error: any) {
      setErrorMessage(
        `Произошла ошибка при добавлении. ${error.response.data.message}`
      );
      console.log(error.response.data.message);
      setSuccessMessage("");
    }
  };

  return (
    <div>
      <h2 className="text-xl font-bold mb-4">Добавить изделие</h2>
      <form>
        <input
          type="text"
          placeholder="Наименование"
          className="w-full p-2 border rounded-lg mb-2"
          value={title}
          onChange={(e) => SetTitle(e.target.value)}
        />
        <button
          className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition"
          type="button"
          onClick={() => setConfirm(true)}
        >
          Добавить
        </button>
      </form>
      {successMessage && (
        <div className="mt-4 text-green-500 font-medium">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="mt-4 text-red-500 font-medium">{errorMessage}</div>
      )}

      {confirm && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-96 text-center animate-fadeIn">
            <h2 className="text-xl font-bold text-gray-800">Вы уверены?</h2>
            <p className="text-gray-600 mt-2">
              Добавить это изделие {title} в базу?
            </p>

            <div className="flex justify-between mt-6">
              <button
                type="button"
                className="flex-1 bg-emerald-600 text-white py-3 rounded-lg hover:bg-emerald-700 transition font-semibold shadow-lg mr-2"
                onClick={() => {
                  addProduct();
                  setConfirm(false);
                }}
              >
                ✅ Да, добавить
              </button>
              <button
                type="button"
                className="flex-1 bg-gray-300 text-gray-800 py-3 rounded-lg hover:bg-gray-400 transition font-semibold shadow-lg ml-2"
                onClick={() => setConfirm(false)}
              >
                ❌ Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
