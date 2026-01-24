import { useContext } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { observer } from "mobx-react-lite";
import { Context } from "src/main";
import { adminRoutes, authRoutes, publicRoutes } from "src/routes";
import { START_ROUTE } from "src/utils/consts";

export const AppRouter: React.FC = observer(() => {
  const context = useContext(Context);
  const location = useLocation(); // Получаем текущий путь для ключа анимации

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { user } = context;

  return (
    // Добавляем key={location.pathname} — это заставляет React перерисовывать
    // этот div при смене страницы, запуская CSS-анимацию "animate-slide-in-up"
    <div key={location.pathname} className="animate-slide-in-up w-full h-full">
      <Routes>
        {/* 1. АДМИНСКИЕ МАРШРУТЫ */}
        {/* Доступны только если есть право admin:access (или роль SUPER_ADMIN) */}
        {user.isAuth && user.can('admin.access') &&
          adminRoutes.map(({ path, Component }) => {
              // Дополнительная проверка для специфических админских страниц
              
              // Пример: Управление пользователями только для users.manage
              if (path.includes('/users') && !user.can('users.manage')) return null;
              
              // Пример: Склад в админке только для warehouse.manage
              if (path.includes('/warehouse') && !user.can('warehouse.manage')) return null;

              return <Route key={path} path={path} element={<Component />} />;
          })
        }

        {/* 2. АВТОРИЗОВАННЫЕ МАРШРУТЫ (Рабочие модули) */}
        {user.isAuth &&
          authRoutes.map(({ path, Component }) => {
              // --- RBAC Фильтры для модулей ---
              
              // Склад
              if (path.includes('/warehouse') && !user.can('warehouse.view')) return null;
              
              // Прошивка (Firmware)
              if (path.includes('/firmware') && !user.can('firmware.flash')) return null;
              
              // Сборка (Assembly)
              if (path.includes('/assembly') && !user.can('assembly.execute')) return null;

              // --- ДОБАВЛЕНО: АПК Берилл ---
              if (path.includes('/beryll') && !user.can('beryll.view')) return null;
              
              // Справочники (Таблицы БД)
              if ((path.includes('/flight-controller') || path.includes('/elrs') || path.includes('/coral')) 
                  && !user.can('devices.view')) return null;

              // Рейтинги/Аналитика
              if (path.includes('/rankings') && !user.can('analytics.view')) return null;

              return <Route key={path} path={path} element={<Component />} />;
          })
        }

        {/* 3. ПУБЛИЧНЫЕ МАРШРУТЫ */}
        {publicRoutes.map(({ path, Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}

        {/* Редирект по умолчанию */}
        <Route path="*" element={<Navigate to={START_ROUTE} />} />
      </Routes>
    </div>
  );
});