import { useContext, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { login } from "src/api/userApi";
import { Context } from "src/main";
import { REGISTRATION_ROUTE, SELECT_PC_ROUTE } from "src/utils/consts";

export const Login: React.FC = () => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { user } = context;

  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const navigate = useNavigate();

  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");

  const signIN = async (event: React.FormEvent) => {
    event.preventDefault();

    try {
      const currentUser = await login(loginName, password);

      user.setUser(currentUser);
      user.setIsAuth(true);

      console.log(user.user);
      setSuccessMessage("Авторизация прошла успешно");
      setErrorMessage("");
      localStorage.removeItem("pcID");
      localStorage.removeItem("sessionID"); 

      setTimeout(() => {
        navigate(SELECT_PC_ROUTE);
        window.location.reload();
      }, 1000);
    } catch (error: any) {
      setErrorMessage(
        `Произошла ошибка при авторизации. ${error.response.data.message}`
      );
      setSuccessMessage("");
      console.error("Ошибка при регистрации:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-yellow-200 to-green-300">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-2xl font-bold mb-4">
          Войти в существующий аккаунт
        </h2>
        <form>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Логин
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
            />
          </div>
          <div className="mb-6">
            <label
              className="block text-gray-700 text-sm font-bold mb-2"
              htmlFor="password"
            >
              Пароль
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <button
              onClick={signIN}
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline"
            >
              Войти
            </button>

            <NavLink
              to={REGISTRATION_ROUTE}
              className="inline-block align-baseline font-bold text-sm text-blue-500 hover:text-blue-800"
            >
              Нет аккаунта?
            </NavLink>
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
};
