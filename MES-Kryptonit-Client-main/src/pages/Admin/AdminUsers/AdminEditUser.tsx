import { UserIcon } from "lucide-react";
import { ChangeEvent, useEffect, useState } from "react";
import { fetchCurrentUser, updateUser, updateUserImg } from "src/api/userApi";
import { RequestIdNotice } from "src/components/common/RequestIdNotice";

interface AdminEditUserModel {
  updateUsersList: () => void;
  ID: number;
}

export const AdminEditUser: React.FC<AdminEditUserModel> = ({
  updateUsersList,
  ID,
}) => {
  const [currentUser, setCurrentUser] = useState({
    id: 0,
    login: "",
    password: "",
    role: "",
    name: "",
    surname: "",
    createdAt: "",
    updatedAt: "",
    img: "",
  });

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);

  const [isAvatarEditVisible, setAvatarEditVisible] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleAvatarUpload = async () => {
    if (!selectedFile) {
      alert("Пожалуйста, выберите файл для загрузки");
      return;
    }

    const formData = new FormData();
    formData.append("id", String(currentUser.id));
    formData.append("img", selectedFile);

    try {
      await updateUserImg(formData);
      setAvatarEditVisible(false);
      setSuccessMessage("успешно изменено");
      setErrorMessage("");
      setRequestId(null);
      refetchUser();
      updateUsersList()
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при загрузке изображения. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      setSuccessMessage("");
      console.error("Ошибка при изменении:", error);
    }
  };

  const refetchUser = () => {
    fetchCurrentUser(ID).then((data) => setCurrentUser(data));
  };

  useEffect(() => {
    fetchCurrentUser(ID).then((data) => setCurrentUser(data));
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCurrentUser((prevUser) => ({
      ...prevUser,
      [name]: value, // Динамически обновляем поле по имени
    }));
  };

  const handleSave = async () => {
    try {
      await updateUser(
        currentUser.id,
        currentUser.password,
        currentUser.name,
        currentUser.surname
      );
      setSuccessMessage("успешно изменено");
      setErrorMessage("");
      setRequestId(null);
      refetchUser();
      updateUsersList();
    } catch (error: any) {
      setErrorMessage(
        error.userMessage ??
          `Произошла ошибка при изменении. ${error.response?.data?.message}`
      );
      setRequestId(error.requestId ?? null);
      setSuccessMessage("");
      console.error("Ошибка при изменении:", error);
    }
  };

  return (
    <div className="p-8 max-w-2xl mx-auto bg-gradient-to-br from-blue-50 to-purple-50 shadow-2xl rounded-3xl transform transition-all">
      <h1 className="text-4xl font-extrabold text-gray-900 mb-8 text-center">
        Профиль пользователя
      </h1>

      {/* Аватар */}
      <div className="flex flex-col items-center mb-8">
        <div className="relative w-32 h-32 rounded-full overflow-hidden shadow-lg border-4 border-white hover:border-purple-500 transition-all duration-300">
          {currentUser.img ? (
            <img
              src={import.meta.env.VITE_API_URL + "/" + currentUser.img}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-50">
              <UserIcon className="text-blue-600 w-16 h-16" />
            </div>
          )}
        </div>
      </div>

      {/* Форма загрузки аватара */}
      {isAvatarEditVisible ? (
        <div className="flex flex-col items-center mb-8">
          <input
            type="file"
            onChange={handleFileChange}
            className="mb-4 p-2 bg-white rounded-lg shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-full shadow-lg transform transition-all hover:scale-105 duration-300"
            onClick={handleAvatarUpload}
          >
            Загрузить аватар
          </button>
        </div>
      ) : (
        <div className="flex justify-center mb-8">
          <button
            className="bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white font-semibold py-2 px-6 rounded-full shadow-lg transform transition-all hover:scale-105 duration-300"
            onClick={() => setAvatarEditVisible(true)}
          >
            Изменить аватар
          </button>
        </div>
      )}

      {/* Информация о пользователе */}
      <div className="space-y-6 bg-white p-8 rounded-2xl shadow-xl">
        {/* Логин */}
        <p className="text-lg text-gray-700">
          <span className="font-bold text-purple-600">Логин:</span>{" "}
          <span className="text-gray-900">{currentUser.login}</span>
        </p>

        {/* Пароль */}
        <p className="text-lg text-gray-700">
          <span className="font-bold text-purple-600">Пароль:</span>{" "}
          <input
            type="password"
            name="password"
            value={currentUser.password}
            onChange={handleInputChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </p>

        {/* Роль */}
        <p className="text-lg text-gray-700">
          <span className="font-bold text-purple-600">Роль:</span>{" "}
          <span className="text-gray-900">{currentUser.role}</span>
        </p>

        {/* Имя */}
        <p className="text-lg text-gray-700">
          <span className="font-bold text-purple-600">Имя:</span>{" "}
          <input
            name="name"
            value={currentUser.name}
            onChange={handleInputChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </p>

        {/* Фамилия */}
        <p className="text-lg text-gray-700">
          <span className="font-bold text-purple-600">Фамилия:</span>{" "}
          <input
            name="surname"
            value={currentUser.surname}
            onChange={handleInputChange}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </p>
      </div>

      {/* Кнопки */}
      <div className="mt-8 flex justify-center space-x-4">
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white font-semibold px-6 py-3 rounded-full shadow-lg transform transition-all hover:scale-105 duration-300"
        >
          Сохранить
        </button>
        <button
          onClick={() => {
            refetchUser();
          }}
          className="bg-gradient-to-r from-gray-500 to-gray-700 hover:from-gray-600 hover:to-gray-800 text-white font-semibold px-6 py-3 rounded-full shadow-lg transform transition-all hover:scale-105 duration-300"
        >
          Отмена
        </button>
      </div>
      {successMessage && (
        <div className="mt-4 text-green-500 font-medium">{successMessage}</div>
      )}
      {errorMessage && (
        <div className="mt-4 text-red-500 font-medium">
          {errorMessage}
          <RequestIdNotice requestId={requestId} />
        </div>
      )}
    </div>
  );
};
