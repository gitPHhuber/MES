import { AdminCard } from "./AdminCard";

import ELRS915Image from "assets/images/radiomaster-bandit-br3-expresslrs-915mhz-03.png";
import FCImage from "assets/images/FC2.png";
import ELRS24Image from "assets/images/24v1.png";
import CoralB1 from "assets/images/CoralB1.png";

import {
  CORAL_B_ROUTE,
  ELRS_2_4_ROUTE,
  ELRS_915_ROUTE,
  FC_ROUTE,
} from "src/utils/consts";
import {
  CREATE_BOARD_24,
  CREATE_BOARD_915,
  CREATE_BOARD_CORAL_B,
  CREATE_BOARD_FC,
} from "src/utils/constsModalType";

type BoardsSectionProps = {
  openModal: (type: string) => void;
};

export const BoardsSection: React.FC<BoardsSectionProps> = ({ openModal }) => (
  <div className="w-full max-w-4xl mt-8">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">Платы</h2>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminCard
        image={FCImage}
        title="FC"
        description="Управление FC"
        onAdd={() => openModal(CREATE_BOARD_FC)}
        editLink={FC_ROUTE}
      />
      <AdminCard
        image={ELRS915Image}
        title="ELRS 915"
        description="Управление elrs 915"
        onAdd={() => openModal(CREATE_BOARD_915)}
        editLink={ELRS_915_ROUTE}
      />
      <AdminCard
        image={ELRS24Image}
        title="ELRS 2.4"
        description="Управление elrs 2.4"
        onAdd={() => openModal(CREATE_BOARD_24)}
        editLink={ELRS_2_4_ROUTE}
      />
      <AdminCard
        image={CoralB1}
        title="Coral B"
        description="Управление Coral B"
        onAdd={() => openModal(CREATE_BOARD_CORAL_B)}
        editLink={CORAL_B_ROUTE}
      />
    </div>
  </div>
);
