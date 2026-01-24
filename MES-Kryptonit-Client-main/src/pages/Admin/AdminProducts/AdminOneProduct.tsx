import { List, PackageOpen, Pencil, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Modal } from "src/components/Modal/Modal";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { fetchProd_Comp } from "src/api/product_componentApi";
import {
  connectionProduct_ComponentModel,
} from "src/types/ComponentModel";
import { AdminEditProduct } from "./AdminEditProduct";

interface OneProductProps {
  deleteProduct: () => void;
  updateProductsList: () => void;
  title: string;
  ID: number;
}

export const AdminOneProduct: React.FC<OneProductProps> = ({
  deleteProduct,
  updateProductsList,
  title,
  ID,
}) => {
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  const [componentsData, setComponentsData] = useState<
    connectionProduct_ComponentModel[]
  >([]);

  const updateComponentsData = async () => {
    fetchProd_Comp(ID).then((data) => setComponentsData(data.data));
  };

  useEffect(() => {
    updateComponentsData();
  }, []);

  return (
    <div className="bg-white rounded-xl shadow-md overflow-hidden transition-all duration-300 hover:shadow-lg border border-gray-200 hover:border-blue-300 relative group">
  {/* Заголовок и кнопки */}
  <div className="p-5 pb-3 bg-gradient-to-r from-blue-50 to-white">
    <div className="flex justify-between items-start">
      <div>
        <h3 className="text-xl font-bold text-gray-800 truncate pr-10">
          {title}
        </h3>
        <span className="text-sm text-gray-500">Изделие</span>
      </div>
      
      <div className="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={() => openModal("productEdit")}
          className="p-2 bg-white text-blue-600 rounded-full hover:bg-blue-50 transition-all shadow-md hover:shadow-lg"
          title="Редактировать"
        >
          <Pencil size={16} />
        </button>
        <button
          onClick={() => openModal("productDelete")}
          className="p-2 bg-white text-red-600 rounded-full hover:bg-red-50 transition-all shadow-md hover:shadow-lg"
          title="Удалить"
        >
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  </div>

  {/* Таблица комплектующих */}
  <div className="px-5 py-3">
    <div className="flex items-center text-sm font-medium text-gray-500 mb-3">
      <List className="mr-2" size={16} />
      Список комплектующих
    </div>

    {componentsData.length > 0 ? (
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-2">Упаковок</th>
              <th className="px-4 py-2">Комплектующие</th>
              <th className="px-4 py-2">В упаковке</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {componentsData.map((connect) => (
              <tr key={connect.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 text-sm font-medium text-gray-900">
                  {connect.required_quantity}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 mr-3 bg-gray-100 rounded-md overflow-hidden">
                      <img
                        src={`${import.meta.env.VITE_PRODUCT_COMPONENT_API_URL}/static/${connect.Component.image}`}
                        alt={connect.Component.title}
                        className="h-full w-full object-contain"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%23e5e7eb"><path d="M19 5v14H5V5h14m0-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z"/></svg>';
                        }}
                      />
                    </div>
                    <div className="text-sm font-medium text-gray-900">
                      {connect.Component.title}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-500">
                  {connect.Component.quantity} шт.
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="text-center py-6 bg-gray-50 rounded-lg">
        <PackageOpen size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-gray-500">Нет комплектующих</p>
      </div>
    )}
  </div>

      <Modal isOpen={modalType === "productDelete"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить изделие ${title} ?`}
          actionConfirm={deleteProduct}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modalType === "productEdit"} onClose={closeModal}>
        <AdminEditProduct
          ID={ID}
          productTitle={title}
          updateComponentsData={updateComponentsData}
          componentsData={componentsData}
          updateProductsList={updateProductsList}
        />
      </Modal>
    </div>
  );
};
