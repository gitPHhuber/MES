import Photo from "assets/images/Kryptonit.png";
import {Monitor, Plane, User} from "lucide-react";
import React, {useState} from "react";
import {NavLink} from "react-router-dom";
import {BETAFLIGHT_ROUTE, USERS_ROUTE} from "src/utils/consts";

export const StartPage: React.FC = () => {
    const releases = [
        {
            version: "MVP 1.00",
            date: "14.02.2025",
            description:
                "Реализована авторизация, роли пользователя, прошивка FC, добавление в базу, считывание и фильтрация FC, панель админа.",
        },
        {
            version: "1.01",
            date: "17.02.2025",
            description: "Улучшена фильтрация данных FC на странице FC",
        },
        {
            version: "1.02",
            date: "20.02.2025",
            description:
                "Скорость записи FC увеличена более чем в 10 раз. Оптимизирован вывод информации. Обновленный дизайн в прошивке.",
        },
        {
            version: "1.03",
            date: "26.02.2025",
            description:
                "Добавлена страница пользователя, возможность редактирования пользователей. Пофикшена проблема с подвисшей сессией. Добавлена возможность удаления FC из таблицы.",
        },
        {
            version: "1.10",
            date: "04.03.2025",
            description:
                "Добавлено: прошивка 915, прошивка 2.4. Исправлена проблема, при которой пользователь мог за один раз выбрать несколько ПК. Отредактировано меню навигации.",
        },
        {
            version: "1.11",
            date: "06.03.2025",
            description:
                "Добавлено: таблица с фильтрацией для приемников 915; таблица с фильтрацией для приемников 2.4; работа с 915 и 2.4 в панели админа, ввод и удаление большого количества брака для 915 и 2.4 (для админа).",
        },
        {
            version: "1.12",
            date: "10.03.2025",
            description: "Проработаны ошибки, переделан интерфейс панели админа.",
        },
        {
            version: "1.13",
            date: "15.03.2025",
            description: "Добавлена проверка FC на стендах.",
        },
        {
            version: "1.14",
            date: "08.04.2025",
            description:
                "При проверке FC на стенде происходит запись в таблицу. В таблице виден результат",
        },
        {
            version: "2.0",
            date: "28.05.2025",
            description:
                "Внедрена прошивка плат Coral B (интерфейс прошивки, таблица отслеживания). Добавлено управление Coral B в админ панели. В админ панели добавлен раздел  `Изделия и комплектующие`, позволяющий управлять производимой продукцией",
        },
        {
            version: "2.01",
            date: "30.05.2025",
            description:
                "Добавлен интерфейс тестирования ESC на стендах в разделе прошивки",
        },
        {
            version: "2.02",
            date: "05.09.2025",
            description:
                "Добавлен выбор версий прошивки ELRS приемнкиов 915, добавлена фильтрация по периоду в таблице + сброс фильтров FC",
        },
          {
            version: "2.03",
            date: "18.09.2025",
            description:
                "Добавлен про режим в прошивку FC, определяющий работу гироскопа, акселерометра и барометра",
        },
    ];

    const [showAll, setShowAll] = useState(false);

    // Показываем 3 последних версии, если не нажата кнопка "Показать больше"
    const visibleReleases = showAll ? releases : releases.slice(-3);

    return (
        <div className="container-fluid px-0">
            <div className="max-w-4xl mx-auto px-4 py-8 bg-white bg-opacity-90 rounded-lg shadow-xl">
                <div className="flex justify-around items-center mb-8">
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-semibold text-gray-800">
                        MES производства Криптонит
                        {/* ТЕСТОВАЯ ВЕРСИЯ */}
                    </h1>
                    <img className="h-64 rounded-lg" src={Photo} alt="Фото"/>
                </div>
                <div className="space-y-4 max-w-xs mx-auto ">
                    {/* Кнопка "Пользователи системы" */}
                    <NavLink
                        to={USERS_ROUTE}
                        className="relative py-3 px-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 block w-full text-center"
                    >
                        Пользователи системы
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                            <div
                                className="w-6 h-6 bg-white rounded-full flex justify-center items-center text-blue-500 font-semibold shadow-sm">
                                <User className="w-4 h-4"/>
                            </div>
                        </div>
                    </NavLink>

                    {/* Кнопка "Проверка FC" */}
                    <NavLink
                        to={BETAFLIGHT_ROUTE}
                        className="relative py-3 px-6 bg-gradient-to-r from-yellow-500 to-purple-500 text-white font-semibold rounded-lg shadow-lg hover:from-yellow-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 block w-full text-center"
                    >
                        Проверить FC
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                            <div
                                className="w-6 h-6 bg-white rounded-full flex justify-center items-center text-blue-500 font-semibold shadow-sm">
                                <Plane className="w-4 h-4"/>
                            </div>
                        </div>
                    </NavLink>

                    {/* Блок "Version 1.03" */}
                    <div
                        className="relative py-3 px-6 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-lg shadow-lg transition-all duration-300 transform hover:scale-105 cursor-default">
                        Version 2.01
                        <div className="absolute top-1/2 right-4 transform -translate-y-1/2">
                            <div
                                className="w-6 h-6 bg-white rounded-full flex justify-center items-center text-green-500 font-semibold shadow-sm">
                                <Monitor className="w-4 h-4"/>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-10">
                    <h1 className="text-2xl font-bold text-gray-900 mb-6">
                        📜 История версий
                    </h1>

                    {visibleReleases.reverse().map((release, index) => (
                        <div
                            key={index}
                            className="p-5 mb-4 bg-gray-100 rounded-xl border-l-4 border-indigo-500 shadow-sm"
                        >
                            <h2 className="text-lg font-semibold text-gray-800">
                                🚀 Version {release.version} от {release.date}
                            </h2>
                            <p className="text-gray-600 mt-2">{release.description}</p>
                        </div>
                    ))}

                    {/* Кнопка "Показать больше" / "Скрыть" */}
                    {releases.length > 3 && (
                        <button
                            className="w-full mt-4 py-2 bg-indigo-500 text-white font-semibold rounded-md hover:bg-indigo-600 transition"
                            onClick={() => setShowAll(!showAll)}
                        >
                            {showAll ? "Скрыть" : "Показать больше"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};
