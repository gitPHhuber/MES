import { observer } from "mobx-react-lite"
import { useContext, useEffect } from "react";
import { deleteComponentRef, fetchComponentsRef } from "src/api/product_componentApi";
import { Context } from "src/main";
import { componentModel } from "src/types/ComponentModel";
import { AdminProdOneComponent } from "./AdmProdOneComponent";

export const AdmProdComponents: React.FC = observer(() => {

      const context = useContext(Context);    
      if (!context) {
        throw new Error("Context must be used within a Provider");
      }
      const { product_component } = context;

  const updateComponentsList = async () => {
    fetchComponentsRef().then((data) =>
      product_component.setReferencesComponents(data.data)
    );
  };

   useEffect(() => {
      updateComponentsList();
    }, []);


  const deleteComponent = async (id: number) => {
    try {
      await deleteComponentRef(id);
      updateComponentsList();
    } catch (error: any) {
      console.error("Ошибка при удалении изделия:", error);
    }
  };


 let components = product_component.referencesComponents?.map((component: componentModel) => (
    <AdminProdOneComponent
    deleteComponent={() => deleteComponent(component.id)}
    updateComponentsList = {()=> updateComponentsList()}
    key={component.id}
    component={component}
    
    />
  )  )


    return (
        <div className="p-4  bg-gray-100/80 shadow-lg rounded-lg h-screen overflow-y-auto">
        <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
         Список Комплектующих
       </h2>
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 p-6">
         {components}
       </div>
     </div>
    )
})