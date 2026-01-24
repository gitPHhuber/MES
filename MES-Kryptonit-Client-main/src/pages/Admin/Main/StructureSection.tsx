import React from "react";
import { AdminCard } from "./AdminCard";
import { Network } from "lucide-react";
import { STRUCTURE_ROUTE } from "src/utils/consts";

export const StructureSection: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mt-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">Организация производства</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminCard
          image={<Network className="w-12 h-12 text-indigo-600" />}
          title="Структура и Иерархия"
          description="Управление участками, бригадами и назначение ответственных"
          editLink={STRUCTURE_ROUTE}
        />
      </div>
    </div>
  );
};