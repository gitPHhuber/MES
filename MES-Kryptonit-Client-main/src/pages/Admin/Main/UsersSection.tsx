import { ADMIN_PCs_ROUTE, ADMIN_USERS_ROUTE, AUDIT_LOG_ROUTE } from "src/utils/consts";
import { AdminCard } from "./AdminCard";
import ComputerImage from "assets/images/pc.png";
import { Users, History } from "lucide-react"; // Добавили History
import { CREATE_COMPUTER } from "src/utils/constsModalType";

type UsersSectionProps = {
  openModal: (type: string) => void;
};

export const UsersSection: React.FC<UsersSectionProps> = ({ openModal }) => (
  <div className="w-full max-w-4xl mt-8">
    <h2 className="text-xl font-semibold text-gray-700 mb-4">Пользователи и Контроль</h2>

    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <AdminCard
        image={ComputerImage}
        title="Компьютеры"
        description="Управление ПК"
        onAdd={() => openModal(CREATE_COMPUTER)}
        editLink={ADMIN_PCs_ROUTE}
      />
      <AdminCard
        image={<Users className="w-12 h-12 text-purple-600" />}
        title="Пользователи"
        description="Управление пользователями"
        onAdd={() => alert("возможность отсутсвует, раздел в разработке")}
        editLink={ADMIN_USERS_ROUTE}
      />
      {/* НОВАЯ КАРТОЧКА АУДИТА */}
      <AdminCard
        image={<History className="w-12 h-12 text-amber-600" />}
        title="Журнал Аудита"
        description="История действий и изменений"
        editLink={AUDIT_LOG_ROUTE}
      />
    </div>
  </div>
);