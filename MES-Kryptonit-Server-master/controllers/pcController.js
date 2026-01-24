const { PC } = require("../models/index");
const ApiError = require("../error/ApiError");

class PCController {
  // Получить список ПК
  async getPCs(req, res, next) {
    try {
      // 1. Достаем все записи из БД без сложной сортировки (чтобы не вызвать ошибку SQL)
      const pcAll = await PC.findAll();

      // 2. Если данных нет
      if (!pcAll) {
        return res.json([]);
      }

      // 3. Сортируем массив средствами JavaScript
      // Это работает стабильно, даже если в имени компьютера нет цифр
      pcAll.sort((a, b) => {
        const nameA = (a.pc_name || "").toString();
        const nameB = (b.pc_name || "").toString();

        // Извлекаем цифры из названия (например, "PC-12" -> 12)
        const numA = parseInt(nameA.replace(/\D/g, ""), 10);
        const numB = parseInt(nameB.replace(/\D/g, ""), 10);

        const hasNumA = !isNaN(numA);
        const hasNumB = !isNaN(numB);

        // Логика сравнения:
        // Если у обоих есть цифры — сравниваем по числу
        if (hasNumA && hasNumB) {
          if (numA !== numB) return numA - numB;
        }

        // Если у одного есть цифры, а у другого нет — приоритет у того, где есть цифры
        if (hasNumA && !hasNumB) return -1;
        if (!hasNumA && hasNumB) return 1;

        // Иначе просто по алфавиту
        return nameA.localeCompare(nameB);
      });

      return res.json(pcAll);
    } catch (e) {
      console.error("🔥 Ошибка при получении списка ПК:", e);
      next(ApiError.internal("Ошибка сервера при загрузке ПК: " + e.message));
    }
  }

  async postPC(req, res, next) {
    try {
      const { ip, pc_name, cabinet } = req.body;
      const pc = await PC.create({ ip, pc_name, cabinet });
      return res.json(pc);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async updatePC(req, res, next) {
    try {
      const { id, ip, pc_name, cabinet } = req.body;
      await PC.update({ ip, pc_name, cabinet }, { where: { id } });
      const pc = await PC.findAll({ where: { id } });
      return res.json(pc[0]);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async deletePC(req, res, next) {
    try {
      const id = req.params.id;
      await PC.destroy({
        where: { id },
      });
      return res.json("ok");
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new PCController();