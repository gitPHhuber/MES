import React, { useState, useContext } from "react";
import { observer } from "mobx-react-lite";
import { useNavigate } from "react-router-dom"; // Импорт хука
import clsx from "clsx";

import { Context } from "src/main";

// Иконки
import {
  Shield,
  Users,
  Network,
  Package,
  Box,
  Layers,
  Cpu,
  Radio,
  Activity,
  Database,
  History,
  Plus,
  ArrowUpRight,
  AlertTriangle,
  Settings,
} from "lucide-react";

// API
import { createCategoryDefect } from "src/api/fcApi";
import { createCategoryDefect24, createCategoryDefect915 } from "src/api/elrsApi";
import { createCategoryDefectCoral_B } from "src/api/coralBApi";

// Модалки
import { CreateDefect } from "./CreateModals/CreateDefect";
import { CreatePC } from "./CreateModals/CreatePC";
import { CreateFC } from "./CreateModals/CreateFC";
import { CreateBoard } from "./CreateModals/CreateELRS";
import { CreateProdStatus } from "./CreateModals/CreateProdStatus";
import { CreateProduct } from "./CreateModals/CreateProduct";
import { CreateProdComp } from "./CreateModals/CreateProdComponents";
import { CreateCoralB } from "./CreateModals/CreateCoralB";
import { Modal } from "src/components/Modal/Modal";

// Маршруты
import {
  ADMIN_RBAC_ROUTE,
  ADMIN_USERS_ROUTE,
  STRUCTURE_ROUTE,
  AUDIT_LOG_ROUTE,
  ADMIN_WAREHOUSE_ROUTE,
  ADMIN_PRODUCTS_ROUTE,
  ADMIN_COMPONENTS_ROUTE,
  FC_ROUTE,
  ELRS_915_ROUTE,
  ELRS_2_4_ROUTE,
  CORAL_B_ROUTE,
  ADMIN_DEFECTS_FC_CATEGORIES_ROUTE,
  // --- ДОБАВЛЕНО: Категории дефектов (Учёт брака) ---
  ADMIN_DEFECT_CATEGORIES_ROUTE,
} from "src/utils/consts";

// Типы модалок
import {
  CREATE_BOARD_24,
  CREATE_BOARD_915,
  CREATE_BOARD_CORAL_B,
  CREATE_BOARD_FC,
  CREATE_COMPONENT,
  CREATE_COMPUTER,
  CREATE_DEFECT_24,
  CREATE_DEFECT_915,
  CREATE_DEFECT_CORAL_B,
  CREATE_DEFECT_FC,
  CREATE_PRODUCT,
  CREATE_PRODUCT_STATUSES,
} from "src/utils/constsModalType";

// ---------- КАРТОЧКА BENTO ----------

interface BentoItemProps {
  title: string;
  subtitle?: string;
  icon: React.ElementType;
  link: string;
  className?: string;
  colorClass?: string;
  iconColorClass?: string;
  onAdd?: () => void;
}

const BentoItem: React.FC<BentoItemProps> = ({
  title,
  subtitle,
  icon: Icon,
  link,
  className,
  colorClass = "bg-white hover:border-indigo-300",
  iconColorClass = "text-indigo-600 bg-indigo-50",
  onAdd,
}) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(link)}
      className={clsx(
        "relative p-6 rounded-3xl border border-transparent shadow-sm transition-all duration-300 cursor-pointer group overflow-hidden flex flex-col justify-between hover:shadow-xl hover:-translate-y-1",
        colorClass,
        className
      )}
    >
      {/* Фоновый декор */}
      <div className="absolute -right-6 -top-6 w-24 h-24 bg-current opacity-5 rounded-full pointer-events-none group-hover:scale-150 transition-transform duration-500" />

      <div className="flex justify-between items-start z-10">
        <div className={clsx("p-3 rounded-2xl", iconColorClass)}>
          <Icon size={28} strokeWidth={1.5} />
        </div>

        {/* Стрелка перехода */}
        <div className="p-2 rounded-full text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity">
          <ArrowUpRight size={20} />
        </div>
      </div>

      <div className="mt-4 z-10">
        <h3 className="text-xl font-bold tracking-tight mb-1">{title}</h3>
        {subtitle && (
          <p className="text-sm opacity-70 font-medium leading-tight">
            {subtitle}
          </p>
        )}
      </div>

      {/* Быстрое добавление */}
      {onAdd && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
          className="absolute bottom-4 right-4 p-2 bg-white/90 backdrop-blur-sm border border-slate-200 rounded-xl text-slate-600 shadow-sm hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all z-20"
          title="Быстрое создание"
        >
          <Plus size={20} />
        </button>
      )}
    </div>
  );
};

// ---------- ГЛАВНЫЙ КОМПОНЕНТ ----------

export const AdminPanel: React.FC = observer(() => {
  const { user } = useContext(Context)!;
  const navigate = useNavigate(); // 1. Инициализируем navigate
  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  // Создание категорий брака
  const createDefectFC = async (title: string, description: string) => {
    await createCategoryDefect(title, description);
  };

  const createDefect915 = async (title: string, description: string) => {
    await createCategoryDefect915(title, description);
  };

  const createDefect24 = async (title: string, description: string) => {
    await createCategoryDefect24(title, description);
  };

  const createDefectCoralB = async (title: string, description: string) => {
    await createCategoryDefectCoral_B(title, description);
  };

  const canManageUsers =
    user.can("users.manage") || user.can("admin.users_manage");

  return (
    <div className="p-6 max-w-[1600px] mx-auto min-h-screen">
      <div className="mb-8">
        <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
          Центр управления
        </h1>
        <p className="text-slate-500 mt-2 text-lg">
          Администрирование производства, склада и доступа
        </p>
      </div>

      {/* Основная сетка */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 auto-rows-[180px]">
        {/* 1. Безопасность и люди */}
        {(canManageUsers || user.can("rbac.manage")) && (
          <div className="md:col-span-2 row-span-2 bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[100px] opacity-20 -mr-20 -mt-20 pointer-events-none" />

            <div className="relative z-10 flex flex-col h-full justify-between">
              <div className="flex justify-between items-start">
                <div className="p-4 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10">
                  <Shield size={40} className="text-emerald-400" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openModal(CREATE_COMPUTER)}
                    className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl text-sm font-bold transition backdrop-blur-sm border border-white/5"
                  >
                    + ПК
                  </button>
                </div>
              </div>

              <div>
                <h2 className="text-3xl font-bold mb-2">Безопасность</h2>
                <p className="text-slate-400 mb-6 max-w-md">
                  Управление ролевой моделью (RBAC), пользователями и рабочими
                  станциями.
                </p>

                <div className="flex gap-3 flex-wrap">
                  {/* 2. Заменили window.location.href на navigate() */}
                  <button
                    onClick={() => navigate(ADMIN_RBAC_ROUTE)}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl font-bold transition shadow-lg shadow-indigo-900/50"
                  >
                    <Settings size={18} /> Доступ (RBAC)
                  </button>
                  <button
                    onClick={() => navigate(ADMIN_USERS_ROUTE)}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-700 hover:bg-slate-600 rounded-xl font-bold transition"
                  >
                    <Users size={18} /> Пользователи
                  </button>
                  <button
                    onClick={() => navigate(AUDIT_LOG_ROUTE)}
                    className="flex items-center gap-2 px-5 py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl font-bold transition"
                  >
                    <History size={18} /> Аудит
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 2. Структура */}
        {user.can("admin.structure_manage") && (
          <BentoItem
            title="Структура"
            subtitle="Цеха, участки и бригады"
            icon={Network}
            link={STRUCTURE_ROUTE}
            className="md:col-span-2"
            colorClass="bg-gradient-to-br from-indigo-50 to-blue-50 border border-blue-100 hover:shadow-lg"
            iconColorClass="bg-blue-100 text-blue-600"
          />
        )}

        {/* 3. Склад */}
        {user.can("warehouse.manage") && (
          <BentoItem
            title="WMS Склад"
            subtitle="Поставки и хранение"
            icon={Package}
            link={ADMIN_WAREHOUSE_ROUTE}
            colorClass="bg-white border-slate-200 hover:border-emerald-400"
            iconColorClass="bg-emerald-50 text-emerald-600"
          />
        )}

        {/* 4. Изделия */}
        {user.can("recipe.manage") && (
          <BentoItem
            title="Продукция"
            subtitle="Изделия и компоненты"
            icon={Box}
            link={ADMIN_PRODUCTS_ROUTE}
            onAdd={() => openModal(CREATE_PRODUCT)}
            colorClass="bg-white border-slate-200 hover:border-purple-400"
            iconColorClass="bg-purple-50 text-purple-600"
          />
        )}

        {/* 5. Компоненты */}
        {user.can("recipe.manage") && (
          <BentoItem
            title="Комплектующие"
            subtitle="Справочник деталей"
            icon={Layers}
            link={ADMIN_COMPONENTS_ROUTE}
            onAdd={() => openModal(CREATE_COMPONENT)}
          />
        )}

        {/* Блок устройств и прошивки */}
        {(user.can("devices.view") || user.can("firmware.flash")) && (
          <>
            <div className="md:col-span-4 mt-4 mb-2">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider ml-1">
                Устройства и брак
              </h3>
            </div>

            <BentoItem
              title="Flight Controller"
              subtitle="Справочник FC"
              icon={Cpu}
              link={FC_ROUTE}
              onAdd={() => openModal(CREATE_BOARD_FC)}
              iconColorClass="bg-orange-50 text-orange-600"
            />

            <BentoItem
              title="ELRS 915"
              subtitle="Приемники 915 MHz"
              icon={Radio}
              link={ELRS_915_ROUTE}
              onAdd={() => openModal(CREATE_BOARD_915)}
              iconColorClass="bg-sky-50 text-sky-600"
            />

            <BentoItem
              title="ELRS 2.4"
              subtitle="Приемники 2.4 GHz"
              icon={Activity}
              link={ELRS_2_4_ROUTE}
              onAdd={() => openModal(CREATE_BOARD_24)}
              iconColorClass="bg-blue-50 text-blue-600"
            />

            <BentoItem
              title="Coral B"
              subtitle="Платы видео"
              icon={Database}
              link={CORAL_B_ROUTE}
              onAdd={() => openModal(CREATE_BOARD_CORAL_B)}
              iconColorClass="bg-rose-50 text-rose-600"
            />
          </>
        )}

        {/* Справочники брака */}
        {user.can("defect.manage") && (
          <div className="md:col-span-4 grid grid-cols-1 md:grid-cols-4 gap-4 mt-2">
            <div
              // 3. Заменили window.location.href на navigate()
              onClick={() => navigate(ADMIN_DEFECTS_FC_CATEGORIES_ROUTE)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-300 hover:border-red-400 hover:bg-red-50 transition cursor-pointer text-slate-600 hover:text-red-700"
            >
              <AlertTriangle size={20} />
              <span className="font-bold text-sm">Брак FC</span>
            </div>

            {/* --- ДОБАВЛЕНО: Категории дефектов (Учёт брака) --- */}
            <div
              onClick={() => navigate(ADMIN_DEFECT_CATEGORIES_ROUTE)}
              className="flex items-center gap-3 p-4 rounded-2xl border border-dashed border-slate-300 hover:border-amber-400 hover:bg-amber-50 transition cursor-pointer text-slate-600 hover:text-amber-700"
            >
              <Settings size={20} />
              <span className="font-bold text-sm">Категории дефектов</span>
            </div>
            {/* Остальные справочники брака можно добавить по аналогии */}
          </div>
        )}
      </div>

      {/* Модальные окна */}
      <Modal isOpen={modalType === CREATE_DEFECT_FC} onClose={closeModal}>
        <CreateDefect createDefect={createDefectFC} />
      </Modal>

      <Modal isOpen={modalType === CREATE_DEFECT_915} onClose={closeModal}>
        <CreateDefect createDefect={createDefect915} />
      </Modal>

      <Modal isOpen={modalType === CREATE_DEFECT_24} onClose={closeModal}>
        <CreateDefect createDefect={createDefect24} />
      </Modal>

      <Modal isOpen={modalType === CREATE_DEFECT_CORAL_B} onClose={closeModal}>
        <CreateDefect createDefect={createDefectCoralB} />
      </Modal>

      <Modal isOpen={modalType === CREATE_BOARD_FC} onClose={closeModal}>
        <CreateFC />
      </Modal>

      <Modal isOpen={modalType === CREATE_BOARD_915} onClose={closeModal}>
        <CreateBoard BoardName="приемник915" />
      </Modal>

      <Modal isOpen={modalType === CREATE_BOARD_24} onClose={closeModal}>
        <CreateBoard BoardName="приемник2.4" />
      </Modal>

      <Modal isOpen={modalType === CREATE_BOARD_CORAL_B} onClose={closeModal}>
        <CreateCoralB />
      </Modal>

      <Modal isOpen={modalType === CREATE_COMPUTER} onClose={closeModal}>
        <CreatePC />
      </Modal>

      <Modal
        isOpen={modalType === CREATE_PRODUCT_STATUSES}
        onClose={closeModal}
      >
        <CreateProdStatus />
      </Modal>

      <Modal isOpen={modalType === CREATE_PRODUCT} onClose={closeModal}>
        <CreateProduct />
      </Modal>

      <Modal isOpen={modalType === CREATE_COMPONENT} onClose={closeModal}>
        <CreateProdComp />
      </Modal>
    </div>
  );
});
