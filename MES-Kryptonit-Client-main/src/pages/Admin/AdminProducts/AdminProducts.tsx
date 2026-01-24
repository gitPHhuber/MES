import { useContext, useEffect } from "react";
import { Context } from "src/main";

import { observer } from "mobx-react-lite";
import {
  deleteProductReference,
  fetchComponentsRef,
  fetchProductsReference,
} from "src/api/product_componentApi";
import { productModel } from "src/types/ProductModel";
import { AdminOneProduct } from "./AdminOneProduct";
import { Box } from "lucide-react";

export const AdminProducts: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { product_component } = context;

  const updateProductsList = async () => {
    fetchProductsReference().then((data) =>
      product_component.setReferencesProducts(data.data)
    );
  };

  const updateComponentsList = async () => {
    fetchComponentsRef().then((data) =>
      product_component.setReferencesComponents(data.data)
    );
  };

  useEffect(() => {
    updateProductsList();
    updateComponentsList();
  }, []);

  const deleteProduct = async (id: number) => {
    try {
      await deleteProductReference(id);
      updateProductsList();
    } catch (error: any) {
      console.error("Ошибка при удалении изделия:", error);
    }
  };

  let products = product_component.referencesProducts?.map(
    (product: productModel) => (
      <AdminOneProduct
        deleteProduct={() => deleteProduct(product.id)}
        updateProductsList={() => updateProductsList()}
        key={product.id}
        ID={product.id}
        title={product.title}
      />
    )
  );

  return (
    <div className="p-6 bg-gradient-to-br from-gray-50/80 to-gray-100/80 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 bg-white rounded-xl shadow-sm p-5 border-l-4 border-blue-500">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Box className="mr-3 text-blue-500" size={24} />
            Список Изделий
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {products}
        </div>
      </div>
    </div>
  );
});
