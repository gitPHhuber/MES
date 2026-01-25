const ApiError = require('../../error/ApiError');
const HistoryController = require('../../controllers/warehouse/HistoryController');
const { PrintHistory } = require('../../models/index');

jest.mock('../../models/index', () => ({
  PrintHistory: {
    findAndCountAll: jest.fn(),
  },
  User: {},
}));

const makeRes = () => ({
  json: jest.fn(),
});

const expectStatus = (next, status) => {
  const error = next.mock.calls[0][0];
  expect(error.status).toBe(status);
};

describe('HistoryController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = { query: {} };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('getPrintHistory', () => {
    test('успешно возвращает историю печати', async () => {
      PrintHistory.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await HistoryController.getPrintHistory(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ rows: [], count: 0, page: 1, limit: 50 });
    });

    test('возвращает 400 при плохих данных', async () => {
      PrintHistory.findAndCountAll.mockRejectedValue(ApiError.badRequest('bad'));

      await HistoryController.getPrintHistory(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      PrintHistory.findAndCountAll.mockRejectedValue(ApiError.notFound('missing'));

      await HistoryController.getPrintHistory(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      PrintHistory.findAndCountAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await HistoryController.getPrintHistory(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      PrintHistory.findAndCountAll.mockRejectedValue(new Error('boom'));

      await HistoryController.getPrintHistory(req, res, next);

      expectStatus(next, 500);
    });
  });
});
