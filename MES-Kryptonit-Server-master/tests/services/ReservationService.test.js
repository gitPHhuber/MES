/**
 * @fileoverview Unit tests for ReservationService.
 */

const { Op } = require("sequelize");

const modelMocks = {
  WarehouseBox: {
    findByPk: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock("../../models/index", () => modelMocks);
jest.mock("../../models", () => modelMocks);

jest.mock("../../db", () => ({
  transaction: jest.fn(),
}));

const sequelize = require("../../db");
const ReservationService = require("../../services/warehouse/ReservationService");

describe("ReservationService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockImplementation(async (callback) =>
      callback({ LOCK: { UPDATE: "UPDATE" } })
    );
  });

  test("reserve throws when qty is invalid", async () => {
    await expect(
      ReservationService.reserve({ boxId: 1, qty: 0, userId: 2 })
    ).rejects.toThrow("Некорректное количество для резерва");
  });

  test("reserve updates box when available", async () => {
    const box = {
      quantity: 10,
      reservedQty: 0,
      reservationExpiresAt: null,
      update: jest.fn().mockResolvedValue(),
    };
    modelMocks.WarehouseBox.findByPk.mockResolvedValue(box);

    const result = await ReservationService.reserve({
      boxId: 3,
      qty: 4,
      userId: 8,
    });

    expect(result).toBe(box);
    expect(box.update).toHaveBeenCalledWith(
      expect.objectContaining({
        reservedQty: 4,
        reservedById: 8,
        reservedAt: expect.any(Date),
        reservationExpiresAt: expect.any(Date),
      }),
      expect.objectContaining({
        transaction: expect.any(Object),
      })
    );
  });

  test("releaseExpired clears expired reservations", async () => {
    await ReservationService.releaseExpired();

    expect(modelMocks.WarehouseBox.update).toHaveBeenCalledWith(
      {
        reservedQty: 0,
        reservedById: null,
        reservedAt: null,
        reservationExpiresAt: null,
      },
      {
        where: {
          reservedQty: { [Op.gt]: 0 },
          reservationExpiresAt: { [Op.lte]: expect.any(Date) },
        },
      }
    );
  });
});
