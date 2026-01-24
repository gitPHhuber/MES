const { Op } = require("sequelize");
const sequelize = require("../../db");
const { WarehouseBox } = require("../../models");

const ensureDate = (value, fallback) => {
  if (!value) return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
};

class ReservationService {
  async reserve({ boxId, qty, userId, expiresAt }) {
    const reservationQty = Number(qty);
    if (!reservationQty || reservationQty <= 0) {
      throw new Error("Некорректное количество для резерва");
    }

    const now = new Date();
    const reservationExpiresAt = ensureDate(
      expiresAt,
      new Date(now.getTime() + 15 * 60 * 1000)
    );

    return sequelize.transaction(async (transaction) => {
      const box = await WarehouseBox.findByPk(boxId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!box) {
        throw new Error("Коробка не найдена");
      }

      const isExpired =
        box.reservationExpiresAt && box.reservationExpiresAt <= now;

      if (box.reservedQty > 0 && !isExpired) {
        throw new Error("Коробка уже зарезервирована");
      }

      if (isExpired) {
        await box.update(
          {
            reservedQty: 0,
            reservedById: null,
            reservedAt: null,
            reservationExpiresAt: null,
          },
          { transaction }
        );
      }

      const availableQty = box.quantity - box.reservedQty;
      if (reservationQty > availableQty) {
        throw new Error("Недостаточно доступного количества");
      }

      await box.update(
        {
          reservedQty: reservationQty,
          reservedById: userId,
          reservedAt: now,
          reservationExpiresAt,
        },
        { transaction }
      );

      return box;
    });
  }

  async release({ boxId }) {
    return sequelize.transaction(async (transaction) => {
      const box = await WarehouseBox.findByPk(boxId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!box) {
        throw new Error("Коробка не найдена");
      }

      if (!box.reservedQty) {
        return box;
      }

      await box.update(
        {
          reservedQty: 0,
          reservedById: null,
          reservedAt: null,
          reservationExpiresAt: null,
        },
        { transaction }
      );

      return box;
    });
  }

  async confirm({ boxId, qty }) {
    const confirmQty = qty ? Number(qty) : null;

    return sequelize.transaction(async (transaction) => {
      const box = await WarehouseBox.findByPk(boxId, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!box) {
        throw new Error("Коробка не найдена");
      }

      if (!box.reservedQty) {
        throw new Error("Резерв отсутствует");
      }

      const quantityToConfirm = confirmQty || box.reservedQty;
      if (quantityToConfirm <= 0) {
        throw new Error("Некорректное количество для подтверждения");
      }

      if (quantityToConfirm > box.reservedQty) {
        throw new Error("Подтверждаемое количество превышает резерв");
      }

      const remainingReservedQty = box.reservedQty - quantityToConfirm;
      const newQuantity = box.quantity - quantityToConfirm;

      if (newQuantity < 0) {
        throw new Error("Недостаточно количества для подтверждения");
      }

      await box.update(
        {
          quantity: newQuantity,
          reservedQty: remainingReservedQty,
          reservedById: remainingReservedQty ? box.reservedById : null,
          reservedAt: remainingReservedQty ? box.reservedAt : null,
          reservationExpiresAt: remainingReservedQty
            ? box.reservationExpiresAt
            : null,
        },
        { transaction }
      );

      return box;
    });
  }

  async releaseExpired() {
    const now = new Date();
    await WarehouseBox.update(
      {
        reservedQty: 0,
        reservedById: null,
        reservedAt: null,
        reservationExpiresAt: null,
      },
      {
        where: {
          reservedQty: { [Op.gt]: 0 },
          reservationExpiresAt: { [Op.lte]: now },
        },
      }
    );
  }
}

module.exports = new ReservationService();
