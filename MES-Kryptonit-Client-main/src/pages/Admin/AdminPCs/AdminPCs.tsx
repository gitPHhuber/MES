import { useContext, useEffect } from "react";
import { deletePC, fetchPC } from "src/api/fcApi";
import { Context } from "src/main";
import { AdminOnePC } from "./AdminOnePC";
import { pcModelFull } from "src/types/PCModel";
import { observer } from "mobx-react-lite";

export const AdminPCs: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { flightController } = context;

  const updatePCList = async () => {
    fetchPC().then((data) => flightController.setPCs(data));
  };

  useEffect(() => {
    updatePCList();
  }, []);

  const deleteComputer = async (id: number) => {
    try {
      await deletePC(id);
      updatePCList()
    } catch (error: any) {
      console.error("Ошибка при удалении компа:", error);
    }
  };

  let PCs = flightController.PCs.map((el: pcModelFull) => (
    <AdminOnePC
      deleteComputer={() => deleteComputer(el.id)}
      updatePCList = {()=> updatePCList()}
      key={el.id}
      ID={el.id}
      PCname={el.pc_name}
      IP={el.ip}
      cabinet={el.cabinet}
    />
  ));

  return (
    <div className="p-4  bg-gray-100/80 shadow-lg rounded-lg h-screen overflow-y-auto">
      <h2 className="text-xl font-bold text-gray-900 mb-4 border-b-2 pb-2">
        Список ПК
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 p-6">
        {PCs}
      </div>
    </div>
  );
});
