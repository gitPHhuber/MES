import {
  UserIcon,
  ShieldCheck,
  MonitorDot,
  User,
  Pencil,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { AdminEditUser } from "./AdminEditUser";

interface AdminOneUserProps {
  updateUsersList: () => void;
  deleteUser: () => void;
  ID: number;
  login: string;
  role: string;
  name: string;
  surName: string;
  img: string | null;
  active: boolean;
  pcName: string | undefined;
  pcIP: string | undefined;
}

export const AdminOneUser: React.FC<AdminOneUserProps> = ({
  updateUsersList,
  deleteUser,
  ID,
  login,
  role,
  name,
  surName,
  img,
  active,
  pcName,
  pcIP,
}) => {
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  return (
    <div className="bg-white shadow-md rounded-xl p-4 flex items-center gap-4 border-l-4 border-blue-500 transition duration-300 hover:shadow-lg overflow-hidden flex-wrap relative">
      {/* Иконка пользователя */}
      {img ? (
        <div className="relative w-24 h-24 rounded-full overflow-hidden shadow-2xl border-4 border-white hover:border-purple-500 transition-all duration-300 transform hover:scale-105 group">
          <img
            src={import.meta.env.VITE_API_URL + "/" + img}
            alt="Аватар пользователя"
            className="w-full h-full object-cover"
          />
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-100 to-purple-100 p-3 rounded-full w-24 h-24 flex items-center justify-center shadow-lg transform transition-all hover:scale-105 duration-300">
          <UserIcon className="text-blue-600 w-12 h-12" />
        </div>
      )}

      {/* Информация о пользователе */}
      <div className="flex-1">
        <h3 className="text-2xl font-bold text-gray-900">
          {name} {surName}
        </h3>
        <p className="text-gray-600 text-sm mt-1">{login}</p>
      </div>

      {/* Статус онлайн/оффлайн */}
      {active ? (
        <div className="flex items-center gap-2 bg-green-50 px-4 py-2 rounded-full shadow-sm">
          <div className="relative">
            <MonitorDot className="text-green-600 w-6 h-6" />
            {/* Анимация мигания для онлайн-статуса */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-ping"></div>
            </div>
          </div>
          <p className="text-sm font-medium text-green-800">
            {pcName} ({pcIP}) – Online
          </p>
        </div>
      ) : (
        <div className="flex items-center gap-2 bg-red-50 px-4 py-2 rounded-full shadow-sm">
          <MonitorDot className="text-red-600 w-6 h-6" />
          <p className="text-sm font-medium text-red-800">Offline</p>
        </div>
      )}

      {/* Роль пользователя */}
      <div className="flex items-center gap-2 bg-gradient-to-r from-blue-50 to-purple-50 px-4 py-2 rounded-full shadow-sm">
        {role === "ADMIN" ? (
          <ShieldCheck className="text-green-600 w-6 h-6" />
        ) : (
          <User className="text-blue-600 w-6 h-6" />
        )}
        <span className="text-gray-700 font-medium">{role}</span>
      </div>

      {/* Кнопки редактирования и удаления */}
      <div className="absolute top-4 right-4 flex space-x-2 z-10">
        <button
          onClick={() => openModal("userEdit")}
          className="p-2 bg-yellow-500 text-white rounded-full shadow-md hover:bg-yellow-600 transition transform hover:scale-110"
        >
          <Pencil size={18} />
        </button>
        <button
          className="p-2 bg-red-500 text-white rounded-full shadow-md hover:bg-red-600 transition transform hover:scale-110"
          onClick={() => openModal("userDelete")}
        >
          <Trash2 size={18} />
        </button>
      </div>

      <Modal isOpen={modalType === "userDelete"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить пользователя ${name} ${surName} ?`}
          actionConfirm={deleteUser}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modalType === "userEdit"} onClose={closeModal}>
        <AdminEditUser ID={ID} updateUsersList={updateUsersList} />
      </Modal>
    </div>
  );
};
