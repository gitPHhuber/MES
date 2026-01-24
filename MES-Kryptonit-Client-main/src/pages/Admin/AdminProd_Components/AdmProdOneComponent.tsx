import { ImageIcon, Pencil, Trash2, Upload } from "lucide-react";
import { ChangeEvent, useState } from "react";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { componentModel } from "src/types/ComponentModel";
import { AdmProdEditComponent } from "./AdmProdEditComponent";
import {
  deleteComponentRefImg,
  updateComponentRefImg,
} from "src/api/product_componentApi";

interface OneComponentProps {
  deleteComponent: () => void;
  updateComponentsList: () => void;
  component: componentModel;
}

export const AdminProdOneComponent: React.FC<OneComponentProps> = ({
  deleteComponent,
  updateComponentsList,
  component,
}) => {
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  const [isAvatarEditVisible, setAvatarEditVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleImageUpload = async () => {
    if (!selectedFile) {
      alert("Пожалуйста, выберите файл для загрузки");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await updateComponentRefImg(component.id, formData);
      updateComponentsList();
    } catch (error: any) {
      console.error("Ошибка при изменении:", error);
    }
  };

  const handleDeleteImg = async () => {
    try {
      await deleteComponentRefImg(component.id);
      updateComponentsList();
    } catch (error: any) {
      console.error("Ошибка при изменении:", error);
    }
  };

  return (
    <div className="bg-gradient-to-br from-white to-gray-50 p-6 rounded-xl shadow-lg border-l-4 border-blue-500 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 relative overflow-hidden group">
      {" "}
      {/* Декоративные элементы */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500 opacity-10 rounded-bl-full"></div>
      {/* Контент */}
      <div className="relative z-10">
        {/* Заголовок и артикул */}
        <div className="mb-4 pr-10">
          {" "}
          <p className="text-sm font-medium text-gray-500 ">Наименование</p>
          <h3 className="text-2xl font-bold text-gray-800 mb-1 truncate">
            {component.title}
          </h3>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-gray-500">Артикул</p>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-semibold rounded-full">
              {component.article}
            </span>
          </div>
        </div>

        {/* Количество */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-500">
            Количество штук в упаковке
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xl font-bold text-gray-800">
              {component.quantity}
            </span>
            <span className="text-gray-400">шт.</span>
          </div>
        </div>

        {/* Место для изображения */}

        {component.image.length > 1 ? (
          <div className="relative w-full h-48 rounded-xl overflow-hidden bg-white shadow-sm border border-gray-100 hover:shadow-md transition-all duration-300 group">
            <img
              src={`${import.meta.env.VITE_PRODUCT_COMPONENT_API_URL}/static/${
                component.image
              }`}
              alt={component.title}
              className="w-full h-full object-contain p-4"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <button
              className="absolute top-2 right-2 p-2 bg-white/80 rounded-full backdrop-blur-sm shadow-sm hover:bg-white transition-all"
              onClick={handleDeleteImg}
            >
              <Trash2 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        ) : (
          <div className="relative w-full h-48 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-dashed border-gray-200 hover:border-purple-300 transition-all duration-300 overflow-hidden">
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
              <div className="relative w-16 h-16 mb-4 text-gray-300 group-hover:text-purple-400 transition-colors duration-300">
                <ImageIcon size={64} strokeWidth={1.5} />
              </div>
              <span className="text-sm font-medium text-gray-500 mb-1">
                Изображение отсутствует
              </span>
            </div>
          </div>
        )}

        {/* Кнопки редактирования и удаления */}
        <div className="absolute top-4 right-4 flex space-x-2">
          <button
            onClick={() => openModal("componentEdit")}
            className="p-2 bg-yellow-400 text-white rounded-full shadow-md hover:bg-yellow-500 transition transform hover:scale-110"
            title="Редактировать"
          >
            <Pencil size={18} />
          </button>
          <button
            className="p-2 bg-red-400 text-white rounded-full shadow-md hover:bg-red-500 transition transform hover:scale-110"
            onClick={() => openModal("componentDelete")}
            title="Удалить"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {isAvatarEditVisible ? (
          <div className="w-full max-w-xs space-y-4 mt-4">
            <div className="relative">
              <label className="block w-full px-4 py-2 bg-white border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors duration-200">
                <span className="text-sm font-medium text-gray-700">
                  Выберите файл не более 5МБ
                </span>
                <input
                  type="file"
                  onChange={handleFileChange}
                  className="rounded-lg w-full shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </label>
            </div>
            <div className="flex space-x-3">
              <button
                className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-medium rounded-lg hover:opacity-90 transition-opacity duration-200 shadow-sm"
                onClick={handleImageUpload}
              >
                Загрузить
              </button>
              <button
                className="px-4 py-2 bg-gray-100 text-gray-600 font-medium rounded-lg hover:bg-gray-200 transition-colors duration-200"
                onClick={() => setAvatarEditVisible(false)}
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <button
            className="mt-3 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white text-sm font-medium rounded-lg hover:shadow-md transition-all duration-200 shadow-sm"
            onClick={() => setAvatarEditVisible(true)}
          >
            <span className="flex items-center">
              <Upload className="w-4 h-4 mr-2" />
              Изменить изображение
            </span>
          </button>
        )}
      </div>
      {/* Модальные окна */}
      <Modal isOpen={modalType === "componentDelete"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить изделие ${component.title}?`}
          actionConfirm={deleteComponent}
          onClose={closeModal}
        />
      </Modal>
      <Modal isOpen={modalType === "componentEdit"} onClose={closeModal}>
        <AdmProdEditComponent
          ID={component.id}
          component={component}
          updateComponentsList={updateComponentsList}
        />
      </Modal>
    </div>
  );
};
