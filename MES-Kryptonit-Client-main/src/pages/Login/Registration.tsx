import { observer } from "mobx-react-lite";
import { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { registration } from "src/api/userApi";
import { Context } from "src/main";
import { SELECT_PC_ROUTE } from "src/utils/consts";

export const Registration: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }
  const { user } = context;

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();

  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [surname, setSurname] = useState("");

  const signUP = async (event: React.FormEvent) => {
    event.preventDefault(); 
    try {
      const currentUser = await registration(login, password, name, surname);
      user.setUser(currentUser);
      user.setIsAuth(true);
      setSuccessMessage("Регистрация прошла успешно!");
      setErrorMessage("");
      localStorage.removeItem("pcID"); 
      localStorage.removeItem("sessionID"); 
      setTimeout(() => {
        navigate(SELECT_PC_ROUTE);
        window.location.reload();

      }, 2000);
    } catch (error: any) {
      setErrorMessage(
        `Произошла ошибка при регистрации. ${error.response.data.message}`
      );
      setSuccessMessage("");
      console.error("Ошибка при регистрации:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-200 to-green-300">
      <div className="max-w-md w-full p-6 bg-white shadow-md rounded-lg">
        <h2 className="text-2xl font-semibold mb-4">Регистрация</h2>

        <form>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Логин
            </label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-300 focus:border-blue-500"
              value={login}
              onChange={(e) => setLogin(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700"
            >
              Пароль
            </label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-300 focus:border-blue-500"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Имя
            </label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-300 focus:border-blue-500"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Фамилия
            </label>
            <input
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring focus:ring-blue-300 focus:border-blue-500"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <button
              onClick={signUP}
              type="submit"
              className="w-full bg-blue-500 text-white font-medium py-2 px-4 rounded-md hover:bg-blue-600 focus:outline-none focus:ring focus:ring-blue-300"
            >
              Зарегистрироваться
            </button>
          </div>
        </form>
        {successMessage && (
          <div className="mt-4 text-green-500 font-medium">
            {successMessage}
          </div>
        )}
        {errorMessage && (
          <div className="mt-4 text-red-500 font-medium">{errorMessage}</div>
        )}
      </div>
    </div>
  );
});
