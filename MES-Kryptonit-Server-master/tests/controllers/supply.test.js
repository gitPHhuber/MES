const ApiError = require('../../error/ApiError');
const SupplyController = require('../../controllers/warehouse/SupplyController');
const { Supply, WarehouseBox } = require('../../models/index');

jest.mock('../../models/index', () => ({
  Supply: {
    create: jest.fn(),
    findAll: jest.fn(),
  },
  WarehouseBox: {
    findAll: jest.fn(),
  },
  Section: {},
}));

jest.mock('../../utils/auditLogger', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const makeRes = () => ({
  json: jest.fn(),
  send: jest.fn(),
  header: jest.fn(),
  attachment: jest.fn(),
});

const expectStatus = (next, status) => {
  const error = next.mock.calls[0][0];
  expect(error.status).toBe(status);
};

describe('SupplyController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      user: { id: 1 },
    };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createSupply', () => {
    test('успешно создает поставку', async () => {
      Supply.create.mockResolvedValue({ id: 1, status: 'NEW' });

      await SupplyController.createSupply(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1, status: 'NEW' });
    });

    test('возвращает 400 при плохих данных', async () => {
      Supply.create.mockRejectedValue(ApiError.badRequest('bad'));

      await SupplyController.createSupply(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      Supply.create.mockRejectedValue(ApiError.notFound('missing'));

      await SupplyController.createSupply(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      Supply.create.mockRejectedValue(ApiError.forbidden('forbidden'));

      await SupplyController.createSupply(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      Supply.create.mockRejectedValue(new Error('boom'));

      await SupplyController.createSupply(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getSupplies', () => {
    test('успешно возвращает список поставок', async () => {
      Supply.findAll.mockResolvedValue([{ id: 1 }]);

      await SupplyController.getSupplies(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
    });

    test('возвращает 400 при плохих данных', async () => {
      Supply.findAll.mockRejectedValue(ApiError.badRequest('bad'));

      await SupplyController.getSupplies(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      Supply.findAll.mockRejectedValue(ApiError.notFound('missing'));

      await SupplyController.getSupplies(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      Supply.findAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await SupplyController.getSupplies(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      Supply.findAll.mockRejectedValue(new Error('boom'));

      await SupplyController.getSupplies(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('exportCsv', () => {
    test('успешно экспортирует CSV', async () => {
      req.params = { id: 1 };
      WarehouseBox.findAll.mockResolvedValue([
        { id: 1, label: 'A', quantity: 1, unit: 'шт', qrCode: 'QR', currentSection: { title: 'S' } },
      ]);

      await SupplyController.exportCsv(req, res, next);

      expect(res.header).toHaveBeenCalled();
      expect(res.attachment).toHaveBeenCalledWith('supply_1_labels.csv');
      expect(res.send).toHaveBeenCalled();
    });

    test('возвращает 400 при отсутствии коробок', async () => {
      req.params = { id: 1 };
      WarehouseBox.findAll.mockResolvedValue([]);

      await SupplyController.exportCsv(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.params = { id: 1 };
      WarehouseBox.findAll.mockRejectedValue(ApiError.notFound('missing'));

      await SupplyController.exportCsv(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.params = { id: 1 };
      WarehouseBox.findAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await SupplyController.exportCsv(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.params = { id: 1 };
      WarehouseBox.findAll.mockRejectedValue(new Error('boom'));

      await SupplyController.exportCsv(req, res, next);

      expectStatus(next, 500);
    });
  });
});
