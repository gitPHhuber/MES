const fs = require("fs/promises");
const path = require("path");
const ApiError = require("../../error/ApiError");

const storePath = path.resolve(__dirname, "../../static/label-templates.json");

const readTemplates = async () => {
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error.code === "ENOENT") {
      return [];
    }
    throw error;
  }
};

const writeTemplates = async (templates) => {
  await fs.mkdir(path.dirname(storePath), { recursive: true });
  await fs.writeFile(storePath, JSON.stringify(templates, null, 2), "utf-8");
};

class LabelTemplatesController {
  async getAll(req, res, next) {
    try {
      const templates = await readTemplates();
      return res.json(templates);
    } catch (error) {
      console.error(error);
      return next(ApiError.internal("Не удалось загрузить шаблоны"));
    }
  }

  async create(req, res, next) {
    try {
      const { name, width, height, layout } = req.body;

      if (!name || !width || !height || !Array.isArray(layout)) {
        return next(ApiError.badRequest("Некорректные данные шаблона"));
      }

      const templates = await readTemplates();
      const newTemplate = {
        id: Date.now(),
        name,
        width,
        height,
        layout,
        createdAt: new Date().toISOString(),
      };

      templates.push(newTemplate);
      await writeTemplates(templates);

      return res.json(newTemplate);
    } catch (error) {
      console.error(error);
      return next(ApiError.internal("Не удалось сохранить шаблон"));
    }
  }

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      if (!id) {
        return next(ApiError.badRequest("Некорректный ID"));
      }

      const templates = await readTemplates();
      const filtered = templates.filter((template) => template.id !== id);

      if (filtered.length === templates.length) {
        return next(ApiError.notFound("Шаблон не найден"));
      }

      await writeTemplates(filtered);
      return res.json({ message: "Шаблон удалён" });
    } catch (error) {
      console.error(error);
      return next(ApiError.internal("Не удалось удалить шаблон"));
    }
  }
}

module.exports = new LabelTemplatesController();
