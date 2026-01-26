const { Op } = require("sequelize");
const ApiError = require("../../error/ApiError");
const {
  WarehouseBox,
  WarehouseMovement,
  WarehouseDocument,
  Supply,
  Section,
  Team,
  User,
  PrintHistory
} = require("../../models/index");
const { logAudit } = require("../../utils/auditLogger");
const sequelize = require("../../db");
const PdfService = require("../../services/PdfService");
const ReservationService = require("../../services/warehouse/ReservationService");
const logger = require("../../services/logger");

const generateShortCode = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

class BoxController {
  
  // === Создание одной коробки (ручной режим) ===
  async createSingleBox(req, res, next) {
    try {
      const { supplyId, sectionId, itemName, quantity, unit, kitNumber, comment } = req.body;

      if (!itemName) {
        return next(ApiError.badRequest("Не указано наименование"));
      }
      if (!req.user || !req.user.id) {
        return next(ApiError.unauthorized("Нет информации о пользователе"));
      }

      const uniqueSuffix = Date.now().toString(36);
      const qrCode = `KRYPTO-${uniqueSuffix.toUpperCase()}`;
      const shortCode = generateShortCode();

      const box = await WarehouseBox.create({
        supplyId: supplyId || null,
        currentSectionId: sectionId || null,
        label: itemName,
        quantity: quantity || 1,
        unit: unit || "шт",
        kitNumber: kitNumber || null,
        qrCode,
        shortCode,
        notes: comment || null,
        status: "ON_STOCK",
        acceptedById: req.user.id,
        acceptedAt: new Date(),
      });

      await logAudit({
        req,
        action: "WAREHOUSE_BOX_CREATE",
        entity: "WarehouseBox",
        entityId: String(box.id),
        description: `Создана коробка ${itemName} (${shortCode})`,
        metadata: { supplyId, sectionId, itemName, quantity },
      });

      return res.json(box);
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Массовое создание коробок (приёмка партии) ===
  async createBoxesBatch(req, res, next) {
    try {
      const {
        label,
        projectName,
        batchName,
        originType,
        originId,
        quantity = 1,
        itemsPerBox = 1,
        unit = "шт",
        status = "ON_STOCK",
        currentSectionId = null,
        currentTeamId = null,
        notes,
      } = req.body;

      if (!label) {
        return next(ApiError.badRequest("Не задано название (label)"));
      }

      const qty = Number(quantity);
      if (qty <= 0 || qty > 1000) {
        return next(
          ApiError.badRequest(
            "Количество этикеток должно быть от 1 до 1000",
          ),
        );
      }

      if (!req.user || !req.user.id) {
        return next(ApiError.unauthorized("Нет пользователя"));
      }

      const acceptedById = req.user.id;
      const now = new Date();
      const boxesData = [];

      for (let i = 0; i < qty; i++) {
        const suffix = String(i + 1).padStart(3, "0");
        const qrCode = `BOX-${Date.now()}-${suffix}-${Math.random()
          .toString(36)
          .substr(2, 3)
          .toUpperCase()}`;
        const shortCode = generateShortCode();

        boxesData.push({
          qrCode,
          shortCode,
          label,
          originType: originType || "OTHER",
          originId: originId || null,
          projectName: projectName || null,
          batchName: batchName || null,
          quantity: itemsPerBox,
          unit,
          acceptedAt: now,
          acceptedById,
          status,
          currentSectionId,
          currentTeamId,
          notes: notes || null,
        });
      }

      const created = await WarehouseBox.bulkCreate(boxesData, {
        returning: true,
      });

      await logAudit({
        req,
        action: "WAREHOUSE_BATCH",
        entity: "WarehouseBox",
        description: `Создана партия: ${qty} мест по ${itemsPerBox} ${unit}`,
        metadata: { label, batchName },
      });

      return res.json({ boxes: created });
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Список коробок (с фильтрами и пагинацией) ===
  async getBoxes(req, res, next) {
    try {
      const {
        page = 1,
        limit = 50,
        search,
        ...filters
      } = req.query;

      const where = { ...filters };

      Object.keys(where).forEach((key) => {
        if (where[key] === undefined || where[key] === "") {
          delete where[key];
        }
      });

      if (search) {
        const s = String(search).trim();
        where[Op.or] = [
          { qrCode: { [Op.iLike]: `%${s}%` } },
          { shortCode: s },
          { label: { [Op.iLike]: `%${s}%` } },
          { batchName: { [Op.iLike]: `%${s}%` } },
        ];
      }

      const pageNum = Number(page) || 1;
      const limitNum = Number(limit) || 50;
      const offset = (pageNum - 1) * limitNum;

      const { rows, count } = await WarehouseBox.findAndCountAll({
        where,
        limit: limitNum,
        offset,
        order: [["id", "DESC"]],
        include: [
          {
            model: User,
            as: "acceptedBy",
            attributes: ["id", "login", "name", "surname"],
          },
          { model: Section, as: "currentSection", attributes: ["id", "title"] },
          { model: Team, as: "currentTeam", attributes: ["id", "title"] },
          { model: Supply, as: "supply" },
        ],
      });

      res.json({ rows, count, page: pageNum, limit: limitNum });
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  async getBoxById(req, res, next) {
    try {
      const { id } = req.params;

      const box = await WarehouseBox.findByPk(id, {
        include: [
          {
            model: User,
            as: "acceptedBy",
            attributes: ["id", "login", "name", "surname"],
          },
          { model: Section, as: "currentSection", attributes: ["id", "title"] },
          { model: Team, as: "currentTeam", attributes: ["id", "title"] },
          { model: Supply, as: "supply" },
        ],
      });

      if (!box) {
        return next(ApiError.notFound("Коробка не найдена"));
      }

      const movements = await WarehouseMovement.findAll({
        where: { boxId: box.id },
        order: [["performedAt", "DESC"]],
        include: [
          { model: Section, as: "fromSection", attributes: ["id", "title"] },
          { model: Section, as: "toSection", attributes: ["id", "title"] },
          { model: Team, as: "fromTeam", attributes: ["id", "title"] },
          { model: Team, as: "toTeam", attributes: ["id", "title"] },
          {
            model: User,
            as: "performedBy",
            attributes: ["id", "name", "surname"],
          },
        ],
      });

      const documents = await WarehouseDocument.findAll({
        where: { boxId: box.id },
        order: [["date", "DESC"]],
      });

      return res.json({ box, movements, documents });
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  async getBoxByQr(req, res, next) {
    try {
      const encoded = req.params.qr;
      const qrCode = decodeURIComponent(encoded);

      const box = await WarehouseBox.findOne({
        where: { qrCode },
        include: [
          {
            model: User,
            as: "acceptedBy",
            attributes: ["id", "login", "name", "surname"],
          },
          { model: Section, as: "currentSection", attributes: ["id", "title"] },
          { model: Team, as: "currentTeam", attributes: ["id", "title"] },
          { model: Supply, as: "supply" },
        ],
      });

      if (!box) {
        return next(ApiError.notFound("Коробка не найдена"));
      }

      const movements = await WarehouseMovement.findAll({
        where: { boxId: box.id },
        order: [["performedAt", "DESC"]],
      });

      const documents = await WarehouseDocument.findAll({
        where: { boxId: box.id },
        order: [["date", "DESC"]],
      });

      return res.json({ box, movements, documents });
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Экспорт в CSV ===
  async exportCsv(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(ApiError.badRequest("Не переданы ID коробок"));
      }

      const boxes = await WarehouseBox.findAll({
        where: { id: { [Op.in]: ids } },
        include: [{ model: Section, as: "currentSection" }],
        order: [["id", "ASC"]],
      });

      if (!boxes || boxes.length === 0) {
        return next(ApiError.badRequest("Коробки не найдены"));
      }

      let csv = "\uFEFF";
      csv += "ID;ShortCode;Label;Quantity;Unit;Section;QRCode\n";

      boxes.forEach((b) => {
        const section = b.currentSection ? b.currentSection.title : "";
        const row = [
          b.id,
          b.shortCode || "",
          b.label,
          b.quantity,
          b.unit,
          section,
          b.qrCode,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(";");

        csv += row + "\n";
      });

      res.header("Content-Type", "text/csv; charset=utf-8");
      res.attachment("labels.csv");
      return res.send(csv);
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Печать обычных этикеток (PDF A4/Лента) ===
  async printLabelsPdf(req, res, next) {
    try {
      const { ids } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(ApiError.badRequest("Не переданы ID коробок"));
      }

      const boxes = await WarehouseBox.findAll({
        where: { id: { [Op.in]: ids } },
        order: [["id", "ASC"]],
      });

      if (!boxes.length) {
        return next(ApiError.badRequest("Коробки не найдены"));
      }

      const pdfBuffer = await PdfService.generateLabels(boxes);

      res.set({
        "Content-Type": "application/pdf",
        "Content-Length": pdfBuffer.length,
        "Content-Disposition": `attachment; filename="labels_${Date.now()}.pdf"`,
      });

      return res.send(pdfBuffer);
    } catch (e) {
      logger.error("PDF Gen Error:", e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal("Ошибка генерации PDF: " + e.message));
    }
  }

  // === Массовое обновление коробок (редактирование этикеток/статусов) ===
  async updateBatch(req, res, next) {
    try {
      const { ids, updates } = req.body;

      if (!ids || !Array.isArray(ids) || ids.length === 0) {
        return next(ApiError.badRequest("Не выбраны коробки для обновления"));
      }

      const allowedFields = ['label', 'quantity', 'unit', 'status', 'batchName', 'projectName', 'notes'];
      const cleanUpdates = {};
      
      Object.keys(updates).forEach(key => {
        if (allowedFields.includes(key) && updates[key] !== undefined && updates[key] !== "") {
          cleanUpdates[key] = updates[key];
        }
      });

      if (Object.keys(cleanUpdates).length === 0) {
        return next(ApiError.badRequest("Нет данных для обновления"));
      }

      await WarehouseBox.update(cleanUpdates, {
        where: { id: { [Op.in]: ids } }
      });

      await logAudit({
        req,
        action: "WAREHOUSE_BOX_BATCH_UPDATE",
        entity: "WarehouseBox",
        description: `Массовое обновление ${ids.length} коробок`,
        metadata: { ids, updates: cleanUpdates }
      });

      return res.json({ message: "Успешно обновлено" });
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Печать спец-этикетки (Zebra) с серией ===
  // Поддерживает: VIDEO_KIT, SIMPLE, CUSTOM (из конструктора)
  async printSpecialLabel(req, res, next) {
    try {
      const { 
        template = "VIDEO_KIT",
        customLayout,
        printCount = 1,
        code,
        rotate,
        widthMm,
        heightMm,
        ...restData
      } = req.body;

      const labelsData = [];
      const count = Math.max(1, Number(printCount));
      
      let startCodeStr = String(code).trim();
      
      if (/^\d+$/.test(startCodeStr)) {
          const originalLength = startCodeStr.length;
          const startBigInt = BigInt(startCodeStr);

          for (let i = 0; i < count; i++) {
              const nextVal = startBigInt + BigInt(i);
              const nextCodeStr = nextVal.toString().padStart(originalLength, '0');
              const infoString = `${restData.productName} - ${restData.quantity} ${restData.unit} (ID: ${nextCodeStr})`;

              labelsData.push({
                  ...restData,
                  code: nextCodeStr,
                  qrCode: nextCodeStr,
                  bottomQr: infoString,
                  rotate: rotate,
                  currentIndex: i + 1,
                  totalCount: count
              });
          }
      } else {
          const infoString = `${restData.productName} - ${restData.quantity} ${restData.unit} (ID: ${startCodeStr})`;
          
          for (let i = 0; i < count; i++) {
              labelsData.push({
                  ...restData,
                  code: startCodeStr,
                  qrCode: startCodeStr,
                  bottomQr: infoString,
                  rotate: rotate,
                  currentIndex: i + 1,
                  totalCount: count
              });
          }
      }
      
      const options = {
          widthMm: Number(widthMm) || 105, 
          heightMm: Number(heightMm) || 60
      };

      let pdfBuffer;

      // Выбор шаблона
      if (template === "VIDEO_KIT") {
          pdfBuffer = await PdfService.generateVideoTransmitterLabelBatch(labelsData, options);
      } else if (template === "CUSTOM" && customLayout && customLayout.length > 0) {
          // КАСТОМНЫЙ шаблон из конструктора
          pdfBuffer = await PdfService.generateCustomLabelBatch(labelsData, customLayout, options);
      } else {
          pdfBuffer = await PdfService.generateSimpleZebraBatch(labelsData, options);
      }

      // Сохранение в историю печати
      const userId = req.user ? req.user.id : null;
      let endCodeStr = startCodeStr;
      
      if (labelsData.length > 0) {
          startCodeStr = labelsData[0].code;
          endCodeStr = labelsData[labelsData.length - 1].code;
      }

      await PrintHistory.create({
          template,
          labelName: restData.productName || "Этикетка",
          startCode: startCodeStr,
          endCode: endCodeStr,
          quantity: count,
          params: { 
            ...restData, 
            widthMm, 
            heightMm, 
            rotate,
            customLayout: template === "CUSTOM" ? customLayout : undefined
          },
          createdById: userId
      });

      res.set({
        "Content-Type": "application/pdf",
        "Content-Length": pdfBuffer.length,
        "Content-Disposition": `inline; filename="zebra_label_${template}.pdf"`,
      });

      return res.send(pdfBuffer);
    } catch (e) {
      logger.error("Print Special Error:", e);
      if (e.status) {
        return next(e);
      }
      next(ApiError.internal(e.message));
    }
  }

  // === Резервирование коробки ===
  async reserveBox(req, res, next) {
    try {
      const { id } = req.params;
      const { qty, expiresAt } = req.body;

      if (!req.user || !req.user.id) {
        return next(ApiError.unauthorized("Нет информации о пользователе"));
      }

      const box = await ReservationService.reserve({
        boxId: id,
        qty,
        userId: req.user.id,
        expiresAt,
      });

      return res.json(box);
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      if (e.message === "Коробка не найдена") {
        return next(ApiError.notFound(e.message));
      }
      next(e);
    }
  }

  // === Снятие резерва ===
  async releaseBox(req, res, next) {
    try {
      const { id } = req.params;

      const box = await ReservationService.release({ boxId: id });
      return res.json(box);
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      if (e.message === "Коробка не найдена") {
        return next(ApiError.notFound(e.message));
      }
      next(e);
    }
  }

  // === Подтверждение резерва ===
  async confirmBox(req, res, next) {
    try {
      const { id } = req.params;
      const { qty } = req.body;

      const box = await ReservationService.confirm({ boxId: id, qty });
      return res.json(box);
    } catch (e) {
      logger.error(e);
      if (e.status) {
        return next(e);
      }
      if (e.message === "Коробка не найдена") {
        return next(ApiError.notFound(e.message));
      }
      next(e);
    }
  }
}

module.exports = new BoxController();
