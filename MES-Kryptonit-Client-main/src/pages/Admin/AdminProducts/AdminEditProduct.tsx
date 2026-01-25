import {
  AlertCircle,
  CheckCircle2,
  Edit3,
  List,
  MinusCircle,
  PackageOpen,
  PackageX,
  Plus,
  PlusCircle,
  Save,
  Trash2,
} from "lucide-react";
import { useContext, useEffect, useState } from "react";
import {
  createProd_Comp,
  deleteProd_Comp,
  updateProd_Comp,
  updateProductReference,
} from "src/api/product_componentApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";
import { Context } from "src/main";
import { connectionProduct_ComponentModel } from "src/types/ComponentModel";

interface AdminEditPCProps {
  updateProductsList: () => void;
  updateComponentsData: () => void;
  componentsData: connectionProduct_ComponentModel[];
  productTitle: string;
  ID: number;
}

export const AdminEditProduct: React.FC<AdminEditPCProps> = ({
  updateProductsList,
  updateComponentsData,
  componentsData,
  productTitle,
  ID,
}) => {
  const context = useContext(Context);
  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { product_component } = context;

  const [newProductTitle, SetNewProductTitle] = useState(productTitle);

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const getIdOfConnectComp = () => {
    return componentsData.map((conection) => conection.Component.id);
  }; // возвращает айдишники компонетов которые есть в изделии

  let actualComponents =
    product_component.referencesComponents === null
      ? []
      : product_component.referencesComponents?.filter(
          (component) => !getIdOfConnectComp().includes(component.id)
        );

  useEffect(() => {
    updateComponentsData();
  }, []);

  const editProductTitle = async () => {
    try {
      await updateProductReference(ID, newProductTitle, 1);

      setSuccessMessage("Наименование успешно изменено");
      setErrorMessage("");
      setRequestId(null);
      updateProductsList();
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

  const editQuantity = async (
    connectionID: number,
    component_id: number,
    product_id: number,
    plus: boolean,
    quantity: number
  ) => {
    const newQuantity = plus ? quantity + 1 : quantity - 1;
    try {
      await updateProd_Comp(
        connectionID,
        component_id,
        product_id,
        newQuantity
      );

      updateComponentsData();
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

  const deleteOneConnection = async (id: number) => {
    try {
      await deleteProd_Comp(id);
      updateComponentsData();
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

  const addComptoProd = async (
    component_id: number,
    product_id: number,
    required_quantity: number
  ) => {
    try {
      await createProd_Comp(component_id, product_id, required_quantity);
      updateComponentsData();
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
    <>
      <div className="max-w-4xl mx-auto p-6 bg-white rounded-xl shadow-md">
        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
          <Edit3 className="mr-2 text-blue-500" size={24} />
          Редактирование:{" "}
          <span className="text-blue-600 ml-2">{productTitle}</span>
        </h2>

        <form className="space-y-6">
          {/* Блок изменения названия */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Наименование изделия
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Введите новое название"
                className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={newProductTitle}
                onChange={(e) => SetNewProductTitle(e.target.value)}
              />
              <button
                type="button"
                onClick={() => editProductTitle()}
                className="px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center shadow-md"
              >
                <Save className="mr-2" size={18} />
                Сохранить
              </button>
            </div>
          </div>

          {/* Сообщения об ошибках/успехе */}
          {successMessage && (
            <div className="p-3 bg-green-50 text-green-700 rounded-lg border border-green-200 flex items-center">
              <CheckCircle2 className="mr-2 text-green-500" size={18} />
              {successMessage}
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg border border-red-200 flex items-center">
              <AlertCircle className="mr-2 text-red-500" size={18} />
              <div>
                {errorMessage}
                <RequestIdNotice requestId={requestId} />
              </div>
            </div>
          )}

          {/* Секция комплектующих */}
          <div className="space-y-6">
            {/* Текущие комплектующие */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <List className="mr-2 text-blue-500" size={20} />
                Комплектующие в изделии
              </h3>

              {componentsData.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Кол-во
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Комплектующие
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          В упаковке
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {componentsData.map((connect) => (
                        <tr
                          key={connect.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                title="Уменьшить"
                                type="button"
                                onClick={() =>
                                  editQuantity(
                                    connect.id,
                                    connect.component_id,
                                    connect.product_id,
                                    false,
                                    connect.required_quantity
                                  )
                                }
                                className="p-1 text-red-500 hover:text-red-700 transition"
                              >
                                <MinusCircle size={20} />
                              </button>
                              <span className="font-medium">
                                {connect.required_quantity}
                              </span>
                              <button
                                title="Увеличить"
                                type="button"
                                onClick={() =>
                                  editQuantity(
                                    connect.id,
                                    connect.component_id,
                                    connect.product_id,
                                    true,
                                    connect.required_quantity
                                  )
                                }
                                className="p-1 text-green-500 hover:text-green-700 transition"
                              >
                                <PlusCircle size={20} />
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="font-medium">
                                {connect.Component.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {connect.Component.quantity} шт.
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => deleteOneConnection(connect.id)}
                              className="p-2 text-red-500 hover:text-red-700 transition"
                              title="Удалить"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <PackageOpen className="mx-auto text-gray-400" size={32} />
                  <p className="mt-2 text-gray-500">
                    Нет добавленных комплектующих
                  </p>
                </div>
              )}
            </div>

            {/* Доступные комплектующие */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center">
                <Plus className="mr-2 text-blue-500" size={20} />
                Доступные комплектующие
              </h3>

              {actualComponents?.length > 0 ? (
                <div className="overflow-hidden rounded-xl border border-gray-200 shadow-sm">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Комплектующие
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          В упаковке
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Добавить
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {actualComponents.map((component) => (
                        <tr
                          key={component.id}
                          className="hover:bg-gray-50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center">
                              <span className="font-medium">
                                {component.title}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {component.quantity} шт.
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() => addComptoProd(component.id, ID, 1)}
                              className="p-2 text-green-500 hover:text-green-700 transition"
                              title="Добавить"
                            >
                              <PlusCircle size={20} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                  <PackageX className="mx-auto text-gray-400" size={32} />
                  <p className="mt-2 text-gray-500">
                    Нет доступных комплектующих
                  </p>
                </div>
              )}
            </div>
          </div>
        </form>
      </div>
    </>
  );
};
