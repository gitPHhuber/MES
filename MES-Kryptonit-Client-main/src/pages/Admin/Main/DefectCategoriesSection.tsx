import { AdminCard } from "./AdminCard";

import ELRS915Image from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-03.png";
import FCImage from "assets/images/FC2.png";
import ELRS24Image from "assets/images/24v1.png";
import CoralB1 from "assets/images/CoralB1.png";

import {
  ADMIN_DEFECTS_FC_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_915_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_2_4_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_CORAL_B_CATEGORIES_ROUTE,
} from "src/utils/consts";
import {
  CREATE_DEFECT_24,
  CREATE_DEFECT_915,
  CREATE_DEFECT_CORAL_B,
  CREATE_DEFECT_FC,
} from "src/utils/constsModalType";

type DefectCategoriesSectionProps = {
  openModal: (type: string) => void;
};

export const DefectCategoriesSection: React.FC<
  DefectCategoriesSectionProps
> = ({ openModal }) => (
  <div className="w-full max-w-4xl">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">
      Категории брака
    </h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminCard
        image={FCImage}
        title="Категории брака FC"
        description="Управление категориями брака для FC"
        onAdd={() => openModal(CREATE_DEFECT_FC)}
        editLink={ADMIN_DEFECTS_FC_CATEGORIES_ROUTE}
      />
      <AdminCard
        image={ELRS915Image}
        title="Категории брака 915"
        description="Управление категориями брака для 915"
        onAdd={() => openModal(CREATE_DEFECT_915)}
        editLink={ADMIN_DEFECTS_915_CATEGORIES_ROUTE}
      />
      <AdminCard
        image={ELRS24Image}
        title="Категории брака 2.4"
        description="Управление категориями брака для 2.4"
        onAdd={() => openModal(CREATE_DEFECT_24)}
        editLink={ADMIN_DEFECTS_2_4_CATEGORIES_ROUTE}
      />
      <AdminCard
        image={CoralB1}
        title="Категории брака Coral B"
        description="Управление категориями брака для Coral B"
        onAdd={() => openModal(CREATE_DEFECT_CORAL_B)}
        editLink={ADMIN_DEFECTS_CORAL_B_CATEGORIES_ROUTE}
      />
    </div>
  </div>
);
