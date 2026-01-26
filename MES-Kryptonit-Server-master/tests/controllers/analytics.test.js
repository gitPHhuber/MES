const ApiError = require('../../error/ApiError');
const AnalyticsController = require('../../controllers/warehouse/AnalyticsController');
const { WarehouseBox, WarehouseMovement } = require('../../models/index');

jest.mock('../../db', () => ({
  fn: jest.fn(),
  col: jest.fn(),
}));

jest.mock('../../models/index', () => ({
  WarehouseBox: {
    findOne: jest.fn(),
  },
  WarehouseMovement: {
    findAll: jest.fn(),
  },
}));

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const makeRes = () => ({
  json: jest.fn(),
});

const expectStatus = (next, status) => {
  const error = next.mock.calls[0][0];
  expect(error.status).toBe(status);
};

describe('AnalyticsController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {};
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getDashboardStats', () => {
    test('успешно возвращает статистику', async () => {
      WarehouseBox.findOne.mockResolvedValue({ totalItems: 10, totalBoxes: 2 });
      WarehouseMovement.findAll
        .mockResolvedValueOnce([{ operation: 'MOVE', count: 1 }])
        .mockResolvedValueOnce([{ date: '2024-01-01', count: 1 }]);

      await AnalyticsController.getDashboardStats(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        stock: { totalItems: 10, totalBoxes: 2 },
        today: [{ operation: 'MOVE', count: 1 }],
        chart: [{ date: '2024-01-01', count: 1 }],
      });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseBox.findOne.mockRejectedValue(ApiError.badRequest('bad'));

      await AnalyticsController.getDashboardStats(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseBox.findOne.mockRejectedValue(ApiError.notFound('missing'));

      await AnalyticsController.getDashboardStats(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseBox.findOne.mockRejectedValue(ApiError.forbidden('forbidden'));

      await AnalyticsController.getDashboardStats(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseBox.findOne.mockRejectedValue(new Error('boom'));

      await AnalyticsController.getDashboardStats(req, res, next);

      expectStatus(next, 500);
    });
  });
});
