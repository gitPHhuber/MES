const ApiError = require("../../error/ApiError");
const { Supply, WarehouseBox, Section } = require("../../models/index");
const { logAudit } = require("../../utils/auditLogger");
const logger = require("../../services/logger");

class SupplyController {
  async createSupply(req, res, next) {
    try {
      const { supplier, docNumber, expectedDate, comment } = req.body;

      const supply = await Supply.create({
        supplier: supplier || null,
        docNumber: docNumber || null,
        expectedDate: expectedDate || null,
        comment: comment || null,
        status: "NEW",
      });

      await logAudit({
        req,
        action: "SUPPLY_CREATE",
        entity: "Supply",
        entityId: String(supply.id),
        description: `Поставка ${docNumber || `#${supply.id}`}`,
      });

      return res.json(supply);
    } catch (e) {
      logger.error("SupplyController.createSupply error", { error: e });
      next(ApiError.internal(e.message));
    }
  }

  async getSupplies(req, res, next) {
    try {
      const supplies = await Supply.findAll({
        order: [["createdAt", "DESC"]],
      });
      return res.json(supplies);
    } catch (e) {
      logger.error("SupplyController.getSupplies error", { error: e });
      next(ApiError.internal(e.message));
    }
  }

  // Экспорт этикеток всех коробок из поставки в CSV
  async exportCsv(req, res, next) {
    try {
      const { id } = req.params;

      const boxes = await WarehouseBox.findAll({
        where: { supplyId: id },
        include: [{ model: Section, as: "currentSection" }],
        order: [["id", "ASC"]],
      });

      if (!boxes || boxes.length === 0) {
        return next(ApiError.badRequest("Нет коробок в этой поставке"));
      }

      let csvContent = "\uFEFF";
      csvContent += "ID;ShortCode;Label;Quantity;Unit;Section;QRCode\n";

      boxes.forEach((box) => {
        const section = box.currentSection ? box.currentSection.title : "";
        const row = [
          box.id,
          box.shortCode || "",
          box.label,
          box.quantity,
          box.unit,
          section,
          box.qrCode,
        ]
          .map((field) => `"${String(field).replace(/"/g, '""')}"`)
          .join(";");

        csvContent += row + "\n";
      });

      res.header("Content-Type", "text/csv; charset=utf-8");
      res.attachment(`supply_${id}_labels.csv`);
      return res.send(csvContent);
    } catch (e) {
      logger.error("SupplyController.exportCsv error", { error: e });
      next(ApiError.internal(e.message));
    }
  }
}

module.exports = new SupplyController();
