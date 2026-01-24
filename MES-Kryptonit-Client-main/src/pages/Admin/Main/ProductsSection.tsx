import {
  ADMIN_COMPONENTS_ROUTE,
  ADMIN_PRODUCTS_ROUTE,
  ADMIN_PRODUCTS_STATUSES_ROUTE,
} from "src/utils/consts";
import { AdminCard } from "./AdminCard";
import ProductImage from "assets/images/ProductBox.jpg";
import StatusImg from "assets/images/statuses.png";
import ComponentsImg from "assets/images/components.jpg";
import {
  CREATE_COMPONENT,
  CREATE_PRODUCT,
  CREATE_PRODUCT_STATUSES,
} from "src/utils/constsModalType";

type ProductsSectionProps = {
  openModal: (type: string) => void;
};

export const ProductsSection: React.FC<ProductsSectionProps> = ({
  openModal,
}) => (
  <div className="w-full max-w-4xl mt-8">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">
      Изделия и комплектующие
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminCard
        image={ProductImage}
        title="Изделия"
        description="Управление изделиями"
        onAdd={() => openModal(CREATE_PRODUCT)}
        editLink={ADMIN_PRODUCTS_ROUTE}
      />
      <AdminCard
        image={StatusImg}
        title=" Статусы изделий"
        description="Управление статусами"
        onAdd={() => openModal(CREATE_PRODUCT_STATUSES)}
        editLink={ADMIN_PRODUCTS_STATUSES_ROUTE}
      />
      <AdminCard
        image={ComponentsImg}
        title=" Комплектующие"
        description="Управление комплектующими"
        onAdd={() => openModal(CREATE_COMPONENT)}
        editLink={ADMIN_COMPONENTS_ROUTE}
      />
    </div>
  </div>
);
