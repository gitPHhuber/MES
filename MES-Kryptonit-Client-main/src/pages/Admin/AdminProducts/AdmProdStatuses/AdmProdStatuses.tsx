import { observer } from "mobx-react-lite";
import { useContext, useEffect } from "react";
import { deleteStatus, fetchStatuses } from "src/api/product_componentApi";
import { Context } from "src/main";
import { productStatusModel } from "src/types/ProductModel";
import { AdmProdOneStatus } from "./AdmProdOneStatus";

export const AdmProdStatuses = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { product_component } = context;

  const updateStatusList = async () => {
    fetchStatuses().then((data) =>
      product_component.setProductStatus(data.data)
    );
  };

  useEffect(() => {
    updateStatusList();
  }, []);

  const deleteProdStatus = async (id: number) => {
    try {
      await deleteStatus(id);
      updateStatusList();
    } catch (error: any) {
      console.error("Ошибка при удалении статуса:", error);
    }
  };

  let statuses = product_component.productStatus?.map(
    (status: productStatusModel) => (
      <AdmProdOneStatus
        deleteStatus={() => deleteProdStatus(status.id)}
        updateStatusList={() => updateStatusList()}
        key={status.id}
        title={status.title}
        ID={status.id}
      />
    )
  );

  return (
    <div className="p-4  bg-gray-100/80 shadow-lg rounded-lg h-screen overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
        Список Статусов Изделий
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {statuses}
      </div>
    </div>
  );
});
