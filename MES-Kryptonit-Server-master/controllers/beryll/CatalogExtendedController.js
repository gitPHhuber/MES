

const { Op } = require("sequelize");
const ApiError = require("../../error/ApiError");


/**
 * Получить модель ComponentCatalog.
 * Используем ленивый require, чтобы избежать циклических зависимостей.
 */
function getCatalogModel() {
  const { ComponentCatalog } = require("../../models/index");
  return ComponentCatalog;
}


class CatalogExtendedController {

  // ────────────────────────────────────────────
  // GET /catalog/grouped?includeInactive=true
  // Каталог, сгруппированный по типам
  // ────────────────────────────────────────────
  async getCatalogGrouped(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { includeInactive } = req.query;

      const where = {};
      if (includeInactive !== "true") {
        where.isActive = true;
      }

      const catalog = await ComponentCatalog.findAll({
        where,
        order: [
          ["type", "ASC"],
          ["manufacturer", "ASC"],
          ["model", "ASC"],
          ["revision", "ASC"]
        ]
      });

      // Группируем по type
      const grouped = {};
      for (const entry of catalog) {
        const type = entry.type;
        if (!grouped[type]) {
          grouped[type] = [];
        }
        grouped[type].push(entry);
      }

      return res.json(grouped);
    } catch (error) {
      console.error("[CatalogExtended] getCatalogGrouped error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // GET /catalog/stats
  // Статистика каталога
  // ────────────────────────────────────────────
  async getCatalogStats(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();

      const allEntries = await ComponentCatalog.findAll({
        attributes: ["id", "type", "manufacturer", "model", "revision", "isActive"]
      });

      const stats = {
        total: allEntries.length,
        active: allEntries.filter(e => e.isActive).length,
        inactive: allEntries.filter(e => !e.isActive).length,
        byType: {},
        manufacturers: new Set(),
        models: new Set()
      };

      for (const entry of allEntries) {
        // По типам
        if (!stats.byType[entry.type]) {
          stats.byType[entry.type] = { total: 0, active: 0, inactive: 0 };
        }
        stats.byType[entry.type].total++;
        if (entry.isActive) {
          stats.byType[entry.type].active++;
        } else {
          stats.byType[entry.type].inactive++;
        }

        // Уникальные производители и модели
        if (entry.manufacturer) stats.manufacturers.add(entry.manufacturer);
        if (entry.model) stats.models.add(entry.model);
      }

      return res.json({
        total: stats.total,
        active: stats.active,
        inactive: stats.inactive,
        typesCount: Object.keys(stats.byType).length,
        manufacturersCount: stats.manufacturers.size,
        modelsCount: stats.models.size,
        byType: stats.byType
      });
    } catch (error) {
      console.error("[CatalogExtended] getCatalogStats error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // GET /catalog/types
  // Список типов с количеством записей
  // ────────────────────────────────────────────
  async getCatalogTypes(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { sequelize } = require("../../models/index");

      const types = await ComponentCatalog.findAll({
        attributes: [
          "type",
          [sequelize.fn("COUNT", sequelize.col("id")), "count"]
        ],
        where: { isActive: true },
        group: ["type"],
        order: [["type", "ASC"]],
        raw: true
      });

      return res.json(types);
    } catch (error) {
      console.error("[CatalogExtended] getCatalogTypes error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // GET /catalog/search?q=mellanox&type=NIC
  // Поиск по каталогу
  // ────────────────────────────────────────────
  async searchCatalog(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { q, type, includeInactive } = req.query;

      if (!q && !type) {
        return next(ApiError.badRequest("Укажите параметр поиска: q (текст) или type"));
      }

      const where = {};

      // Фильтр по активности
      if (includeInactive !== "true") {
        where.isActive = true;
      }

      // Фильтр по типу
      if (type) {
        where.type = type;
      }

      // Текстовый поиск по нескольким полям
      if (q) {
        const searchTerm = `%${q}%`;
        where[Op.or] = [
          { manufacturer: { [Op.iLike]: searchTerm } },
          { model: { [Op.iLike]: searchTerm } },
          { revision: { [Op.iLike]: searchTerm } },
          { partNumber: { [Op.iLike]: searchTerm } },
          { notes: { [Op.iLike]: searchTerm } }
        ];
      }

      const results = await ComponentCatalog.findAll({
        where,
        order: [["type", "ASC"], ["manufacturer", "ASC"], ["model", "ASC"]],
        limit: 200
      });

      return res.json(results);
    } catch (error) {
      console.error("[CatalogExtended] searchCatalog error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // DELETE /catalog/:id
  // Мягкое удаление (деактивация записи)
  // ────────────────────────────────────────────
  async deleteCatalogEntry(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { id } = req.params;

      const catalog = await ComponentCatalog.findByPk(id);
      if (!catalog) {
        return next(ApiError.notFound("Запись каталога не найдена"));
      }

      if (!catalog.isActive) {
        return res.json({
          success: true,
          message: "Запись уже деактивирована",
          catalog
        });
      }

      // Проверяем, не используется ли запись в инвентаре
      try {
        const { ComponentInventory } = require("../../models/index");
        const usageCount = await ComponentInventory.count({
          where: {
            catalogId: id,
            status: { [Op.notIn]: ["SCRAPPED", "RETURNED"] }
          }
        });

        if (usageCount > 0) {
          // Не запрещаем деактивацию, но предупреждаем
          console.warn(
            `[CatalogExtended] Деактивация записи #${id} ` +
            `(${catalog.manufacturer || ""} ${catalog.model}): ` +
            `используется в ${usageCount} компонентах инвентаря`
          );
        }
      } catch (inventoryError) {
        // ComponentInventory может не существовать — не критично
        console.warn("[CatalogExtended] Не удалось проверить инвентарь:", inventoryError.message);
      }

      await catalog.update({ isActive: false });

      console.log(
        `[CatalogExtended] Запись #${id} деактивирована: ` +
        `${catalog.type} ${catalog.manufacturer || ""} ${catalog.model} rev.${catalog.revision || "-"}`
      );

      return res.json({
        success: true,
        message: `Запись "${catalog.manufacturer || ""} ${catalog.model}" деактивирована`,
        catalog
      });
    } catch (error) {
      console.error("[CatalogExtended] deleteCatalogEntry error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // POST /catalog/:id/restore
  // Восстановление деактивированной записи
  // ────────────────────────────────────────────
  async restoreCatalogEntry(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { id } = req.params;

      const catalog = await ComponentCatalog.findByPk(id);
      if (!catalog) {
        return next(ApiError.notFound("Запись каталога не найдена"));
      }

      if (catalog.isActive) {
        return res.json({
          success: true,
          message: "Запись уже активна",
          catalog
        });
      }

      await catalog.update({ isActive: true });

      console.log(
        `[CatalogExtended] Запись #${id} восстановлена: ` +
        `${catalog.type} ${catalog.manufacturer || ""} ${catalog.model}`
      );

      return res.json({
        success: true,
        message: `Запись "${catalog.manufacturer || ""} ${catalog.model}" восстановлена`,
        catalog
      });
    } catch (error) {
      console.error("[CatalogExtended] restoreCatalogEntry error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // POST /catalog/batch
  // Массовое создание записей каталога
  // Body: { entries: [{ type, manufacturer, model, revision, partNumber, specifications }] }
  // ────────────────────────────────────────────
  async batchCreateCatalog(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { entries } = req.body;

      if (!Array.isArray(entries) || entries.length === 0) {
        return next(ApiError.badRequest("Массив entries обязателен и не должен быть пустым"));
      }

      if (entries.length > 100) {
        return next(ApiError.badRequest("Максимум 100 записей за один запрос"));
      }

      const results = {
        created: [],
        updated: [],
        errors: []
      };

      for (const entry of entries) {
        try {
          const { type, manufacturer, model, revision, partNumber, specifications, notes } = entry;

          if (!type || !model) {
            results.errors.push({
              entry,
              error: "Поля type и model обязательны"
            });
            continue;
          }

          // Проверяем существование
          const existing = await ComponentCatalog.findOne({
            where: {
              type,
              manufacturer: manufacturer || null,
              model
            }
          });

          if (existing) {
            // Обновляем если переданы новые данные
            const updateData = {};
            if (revision !== undefined && revision !== existing.revision) updateData.revision = revision;
            if (partNumber !== undefined && partNumber !== existing.partNumber) updateData.partNumber = partNumber;
            if (specifications) updateData.specifications = { ...existing.specifications, ...specifications };
            if (notes !== undefined) updateData.notes = notes;
            if (!existing.isActive) updateData.isActive = true;

            if (Object.keys(updateData).length > 0) {
              await existing.update(updateData);
              results.updated.push(existing.toJSON());
            }
          } else {
            // Создаём новую запись
            const newEntry = await ComponentCatalog.create({
              type,
              manufacturer: manufacturer || null,
              model,
              revision: revision || null,
              partNumber: partNumber || null,
              specifications: specifications || {},
              notes: notes || null,
              isActive: true
            });
            results.created.push(newEntry.toJSON());
          }
        } catch (entryError) {
          results.errors.push({
            entry,
            error: entryError.message
          });
        }
      }

      console.log(
        `[CatalogExtended] batchCreate: ` +
        `${results.created.length} создано, ${results.updated.length} обновлено, ` +
        `${results.errors.length} ошибок`
      );

      return res.json({
        success: true,
        created: results.created.length,
        updated: results.updated.length,
        errors: results.errors.length,
        details: results
      });
    } catch (error) {
      console.error("[CatalogExtended] batchCreateCatalog error:", error);
      return next(ApiError.internal(error.message));
    }
  }


  // ────────────────────────────────────────────
  // GET /catalog/export?includeInactive=true
  // Экспорт каталога в JSON (для бэкапа / переноса)
  // ────────────────────────────────────────────
  async exportCatalog(req, res, next) {
    try {
      const ComponentCatalog = getCatalogModel();
      const { includeInactive, type } = req.query;

      const where = {};
      if (includeInactive !== "true") {
        where.isActive = true;
      }
      if (type) {
        where.type = type;
      }

      const catalog = await ComponentCatalog.findAll({
        where,
        order: [["type", "ASC"], ["manufacturer", "ASC"], ["model", "ASC"]],
        raw: true
      });

      const exportData = {
        exportedAt: new Date().toISOString(),
        count: catalog.length,
        entries: catalog.map(entry => ({
          type: entry.type,
          manufacturer: entry.manufacturer,
          model: entry.model,
          revision: entry.revision,
          partNumber: entry.partNumber,
          specifications: entry.specifications,
          notes: entry.notes,
          isActive: entry.isActive
        }))
      };

      // Устанавливаем заголовки для скачивания
      const filename = `catalog_export_${new Date().toISOString().slice(0, 10)}.json`;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      return res.json(exportData);
    } catch (error) {
      console.error("[CatalogExtended] exportCatalog error:", error);
      return next(ApiError.internal(error.message));
    }
  }
}


module.exports = new CatalogExtendedController();