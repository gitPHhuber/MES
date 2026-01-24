import React from "react";
import { AdminCard } from "./AdminCard";
import { Package } from "lucide-react";
import { ADMIN_WAREHOUSE_ROUTE } from "src/utils/consts";

export const WarehouseSection: React.FC = () => {
  return (
    <div className="w-full max-w-4xl mt-8">
      <h2 className="text-xl font-semibold text-gray-700 mb-4">
        Склад и приёмка
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AdminCard
          image={<Package className="w-12 h-12 text-emerald-600" />}
          title="Приёмка и склад"
          description="Поставки, коробки и этикетки"
          editLink={ADMIN_WAREHOUSE_ROUTE}
        />
      </div>
    </div>
  );
};
