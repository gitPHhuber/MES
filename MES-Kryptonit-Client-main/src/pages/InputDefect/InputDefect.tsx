import { observer } from "mobx-react-lite";
import { useContext, useEffect, useState } from "react";
import {
  createManyDefects2_4boards,
  createManyDefects915boards,
  deleteManyDefects2_4boards,
  deleteManyDefects915boards,
  fetchCategoryDefect24,
  fetchCategoryDefect915,
} from "src/api/elrsApi";
import {
  createManyDefectsFC,
  deleteManyDefectsFC,
  fetchCategoryDefect,
} from "src/api/fcApi";
import { ConfirmModal } from "src/components/Modal/ConfirmModal";
import { Modal } from "src/components/Modal/Modal";
import { Context } from "src/main";

export const InputDefect: React.FC = observer(() => {
  const context = useContext(Context);

  if (!context) {
    throw new Error("Context must be used within a Provider");
  }

  const { flightController, elrsStore } = context;

  useEffect(() => {
    fetchCategoryDefect().then((data) =>
      flightController.setDefectCategories(data)
    );
    flightController.resetSelectedDefect();
  }, []);

  const [count, setCount] = useState(0);

  const [modalType, setModalType] = useState<string | null>(null);

  const openModal = (type: string) => setModalType(type);
  const closeModal = () => setModalType(null);

  const [isBoardSelected, setIsBoardSelected] = useState(false); // Состояние для отслеживания выбора платы
  const typeOfBoards = ["FC", "ELRS 915", "ELRS 2,4"];
  const [currentBoard, setCurrentBoard] = useState("");

  useEffect(() => {
    if (currentBoard) {
      switch (currentBoard) {
        case "FC":
          fetchCategoryDefect()
            .then((data) => {
              flightController.setDefectCategories(data); // Устанавливаем категории для FC
              flightController.resetSelectedDefect(); // Сбрасываем выбранный дефект
            })
            .catch((error) => {
              console.error("Ошибка при загрузке категорий для FC:", error);
            });
          break; // break, чтобы не проваливаться в следующий case

        case "ELRS 915":
          fetchCategoryDefect915()
            .then((data) => {
              elrsStore.setDefect_915_Categories(data);
              elrsStore.resetSelectedDefect();
            })
            .catch((error) => {
              console.error(
                "Ошибка при загрузке категорий для ELRS 915:",
                error
              );
            });
          break;

        case "ELRS 2,4":
          fetchCategoryDefect24()
            .then((data) => {
              elrsStore.setDefect_2_4_Categories(data);
              elrsStore.resetSelectedDefect();
            })
            .catch((error) => {
              console.error(
                "Ошибка при загрузке категорий для ELRS 2,4:",
                error
              );
            });
          break;

        default:
          console.warn("Неизвестный тип платы:", currentBoard);
          break;
      }
    }
  }, [currentBoard]);

  const addToBaseManyFC = async () => {
    try {
      let defectCat;
      let defectCatName;
      let request;

      switch (currentBoard) {
        case "FC":
          defectCat = flightController.selectedDefect?.id || -1;
          defectCatName = flightController.selectedDefect?.title || "";
          request = createManyDefectsFC;
          break;
        case "ELRS 915":
          defectCat = elrsStore.selectedDefect?.id || -1;
          defectCatName = elrsStore.selectedDefect?.title || "";
          request = createManyDefects915boards;
          break;
        case "ELRS 2,4":
          defectCat = elrsStore.selectedDefect?.id || -1;
          defectCatName = elrsStore.selectedDefect?.title || "";
          request = createManyDefects2_4boards;
          break;
        default:
          throw new Error("Неизвестный тип платы");
      }

      if (defectCat < 0) {
        return alert("Не выбрана категория брака");
      }

      await request(
        count,
        Number(localStorage.getItem("sessionID")),
        defectCat
      );
      alert(
        `В базу внесено ${count} плат  ${currentBoard} с браком ${defectCatName}`
      );
      closeModal();
    } catch (error: any) {
      console.error("Ошибка при внесении в базу:", error);
    }
    flightController.resetSelectedDefect();
    elrsStore.resetSelectedDefect();
  };

  const deleteFromBaseManyFC = async () => {
    try {
      let defectCat;
      let defectCatName;
      let request;

      switch (currentBoard) {
        case "FC":
          defectCat = flightController.selectedDefect?.id || -1;
          defectCatName = flightController.selectedDefect?.title || "";
          request = deleteManyDefectsFC;
          break;
        case "ELRS 915":
          defectCat = elrsStore.selectedDefect?.id || -1;
          defectCatName = elrsStore.selectedDefect?.title || "";
          request = deleteManyDefects915boards;
          break;
        case "ELRS 2,4":
          defectCat = elrsStore.selectedDefect?.id || -1;
          defectCatName = elrsStore.selectedDefect?.title || "";
          request = deleteManyDefects2_4boards;
          break;
        default:
          throw new Error("Неизвестный тип платы");
      }

      if (defectCat < 0) {
        return alert("Не выбрана категория брака");
      }

      await request(count, defectCat);
      alert(
        `Из базы удалено ${count} плат  ${currentBoard} с браком ${defectCatName} `
      );
      closeModal();
    } catch (error: any) {
      console.error("Ошибка при удалении многих плат:", error);
    }
    flightController.resetSelectedDefect();
    elrsStore.resetSelectedDefect();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-800 mb-4 text-center">
        Ввод и удаление большого количества брака из базы
      </h1>

      {/* Селект выбора вида платы */}
      <select
        className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 transition"
        onChange={(e) => {
          const selectedBoard = typeOfBoards.find(
            (el) => el === e.target.value
          );
          if (selectedBoard) {
            setCurrentBoard(selectedBoard);
            setIsBoardSelected(true);
          }
          flightController.resetSelectedDefect();
          elrsStore.resetSelectedDefect();
        }}
      >
        <option value="" disabled selected>
          Выберите вид платы
        </option>
        {typeOfBoards.map((el, index) => (
          <option key={index} value={el}>
            {el}
          </option>
        ))}
      </select>

      <p>{currentBoard}</p>

      {/* Остальные поля и кнопки отображаются только после выбора платы */}

      {isBoardSelected && (
        <>
          {/* Селект выбора категории брака */}
          <select
            className="w-full p-3 border border-gray-300 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 transition"
            onChange={(e) => {
              let selectedDefect;
              switch (currentBoard) {
                case "FC":
                  selectedDefect = flightController.defectCategories.find(
                    (defect) => defect.id === Number(e.target.value)
                  );
                  if (selectedDefect)
                    flightController.setSelectedDefect(selectedDefect);
                  break;
                case "ELRS 915":
                  selectedDefect = elrsStore.defect_915_Categories.find(
                    (defect) => defect.id === Number(e.target.value)
                  );
                  if (selectedDefect)
                    elrsStore.setSelectedDefect(selectedDefect);
                  break;
                case "ELRS 2,4":
                  selectedDefect = elrsStore.defect_2_4_Categories.find(
                    (defect) => defect.id === Number(e.target.value)
                  );
                  if (selectedDefect)
                    elrsStore.setSelectedDefect(selectedDefect);
                  break;
                default:
                  console.warn("Неизвестный тип платы:", currentBoard);
              }
            }}
          >
            <option value="" disabled selected>
              Выберите категорию брака
            </option>

            {currentBoard === "FC" &&
              flightController.defectCategories.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            {currentBoard === "ELRS 915" &&
              elrsStore.defect_915_Categories.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
            {currentBoard === "ELRS 2,4" &&
              elrsStore.defect_2_4_Categories.map((el) => (
                <option key={el.id} value={el.id}>
                  {el.title}
                </option>
              ))}
          </select>

          {/* Поле ввода количества */}
          <input
            value={count}
            type="number"
            onChange={(e) => setCount(Number(e.target.value))}
            placeholder="Введите количество"
            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-2 focus:ring-blue-500 transition"
          />
          <p className="mb-4">
            Не рекомендуется вводить более 100 000 за один раз{" "}
          </p>

          {/* Кнопки действий */}
          <div className="flex gap-4">
            <button
              type="button"
              className="w-1/2 bg-green-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-green-700 transition"
              onClick={() => openModal("addManyDefects")}
            >
              ✅ Внести в базу
            </button>

            <button
              type="button"
              className="w-1/2 bg-red-600 text-white py-3 rounded-lg font-semibold shadow-md hover:bg-red-700 transition"
              onClick={() => openModal("deleteManyDefects")}
            >
              ❌ Удалить из базы
            </button>
          </div>
        </>
      )}

      <Modal isOpen={modalType === "addManyDefects"} onClose={closeModal}>
        <ConfirmModal
          title1={`Добавить в базу ${count} шт. ${currentBoard} с браком ${
            flightController.selectedDefect?.title ||
            elrsStore.selectedDefect?.title
          }?`}
          actionConfirm={addToBaseManyFC}
          onClose={closeModal}
        />
      </Modal>

      <Modal isOpen={modalType === "deleteManyDefects"} onClose={closeModal}>
        <ConfirmModal
          title1={`Удалить из базы ${count} шт. ${currentBoard} с браком ${
            flightController.selectedDefect?.title ||
            elrsStore.selectedDefect?.title
          }?`}
          actionConfirm={deleteFromBaseManyFC}
          onClose={closeModal}
        />
      </Modal>
    </div>
  );
});
