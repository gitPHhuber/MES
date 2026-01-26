const ApiError = require('../../error/ApiError');
const MovementController = require('../../controllers/warehouse/MovementController');
const { WarehouseBox, WarehouseMovement, WarehouseDocument } = require('../../models/index');

jest.mock('../../db', () => ({
  transaction: jest.fn(async () => ({
    commit: jest.fn(),
    rollback: jest.fn(),
  })),
  define: jest.fn(() => ({
    belongsTo: jest.fn(),
    hasMany: jest.fn(),
    hasOne: jest.fn(),
    belongsToMany: jest.fn(),
  })),
  fn: jest.fn(),
  col: jest.fn(),
  authenticate: jest.fn(),
  sync: jest.fn(),
}));

jest.mock('../../models/index', () => ({
  WarehouseBox: {
    findByPk: jest.fn(),
    findAll: jest.fn(),
  },
  WarehouseMovement: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  WarehouseDocument: {
    create: jest.fn(),
  },
  Section: {},
  Team: {},
  User: {},
  Supply: {},
}));

jest.mock('../../utils/auditLogger', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const makeRes = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

const expectStatus = (next, status) => {
  const error = next.mock.calls[0][0];
  expect(error.status).toBe(status);
};

describe('MovementController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      query: {},
      user: { id: 1 },
    };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('moveSingle', () => {
    test('успешно перемещает коробку', async () => {
      const mockBox = {
        id: 1,
        currentSectionId: 1,
        currentTeamId: 2,
        quantity: 10,
        status: 'ON_STOCK',
        save: jest.fn(),
      };
      WarehouseBox.findByPk
        .mockResolvedValueOnce(mockBox)
        .mockResolvedValueOnce({ id: 1 });
      WarehouseMovement.create.mockResolvedValue({ id: 10 });

      req.body = { boxId: 1, operation: 'MOVE', toSectionId: 5 };

      await MovementController.moveSingle(req, res, next);

      expect(WarehouseMovement.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ box: { id: 1 }, movement: { id: 10 } });
    });

    test('возвращает 400 при отсутствии boxId', async () => {
      req.body = { operation: 'MOVE' };

      await MovementController.moveSingle(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { boxId: 1, operation: 'MOVE' };
      WarehouseBox.findByPk.mockResolvedValue(null);

      await MovementController.moveSingle(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { boxId: 1, operation: 'MOVE' };
      WarehouseBox.findByPk.mockRejectedValue(ApiError.forbidden('forbidden'));

      await MovementController.moveSingle(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { boxId: 1, operation: 'MOVE' };
      WarehouseBox.findByPk.mockRejectedValue(new Error('boom'));

      await MovementController.moveSingle(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('moveBatch', () => {
    test('успешно выполняет пакетное перемещение', async () => {
      const mockBox = {
        id: 1,
        currentSectionId: 1,
        currentTeamId: 2,
        quantity: 10,
        status: 'ON_STOCK',
        save: jest.fn(),
      };

      req.body = {
        docNumber: 'DOC-1',
        items: [
          { boxId: 1, operation: 'MOVE', toSectionId: 3 },
        ],
      };

      WarehouseDocument.create.mockResolvedValue({ id: 99 });
      WarehouseBox.findByPk.mockResolvedValue(mockBox);
      WarehouseMovement.create.mockResolvedValue({ id: 100 });

      await MovementController.moveBatch(req, res, next);

      expect(res.json).toHaveBeenCalledWith({
        message: 'Операции успешно выполнены',
        count: 1,
        document: { id: 99 },
      });
    });

    test('возвращает 400 при пустом списке', async () => {
      req.body = { items: [] };

      await MovementController.moveBatch(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { items: [{ boxId: 1, operation: 'MOVE' }] };
      WarehouseBox.findByPk.mockResolvedValue(null);

      await MovementController.moveBatch(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { items: [{ boxId: 1, operation: 'MOVE' }] };
      WarehouseBox.findByPk.mockRejectedValue(ApiError.forbidden('forbidden'));

      await MovementController.moveBatch(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { items: [{ boxId: 1, operation: 'MOVE' }] };
      WarehouseBox.findByPk.mockRejectedValue(new Error('boom'));

      await MovementController.moveBatch(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getMovements', () => {
    test('успешно возвращает движения', async () => {
      WarehouseMovement.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await MovementController.getMovements(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ rows: [], count: 0, page: 1, limit: 50 });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseMovement.findAndCountAll.mockRejectedValue(ApiError.badRequest('bad'));

      await MovementController.getMovements(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseMovement.findAndCountAll.mockRejectedValue(ApiError.notFound('missing'));

      await MovementController.getMovements(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseMovement.findAndCountAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await MovementController.getMovements(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseMovement.findAndCountAll.mockRejectedValue(new Error('boom'));

      await MovementController.getMovements(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getBalance', () => {
    test('успешно возвращает остатки', async () => {
      WarehouseBox.findAll.mockResolvedValue([{ label: 'Item' }]);

      await MovementController.getBalance(req, res, next);

      expect(res.json).toHaveBeenCalledWith([{ label: 'Item' }]);
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseBox.findAll.mockRejectedValue(ApiError.badRequest('bad'));

      await MovementController.getBalance(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseBox.findAll.mockRejectedValue(ApiError.notFound('missing'));

      await MovementController.getBalance(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseBox.findAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await MovementController.getBalance(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseBox.findAll.mockRejectedValue(new Error('boom'));

      await MovementController.getBalance(req, res, next);

      expectStatus(next, 500);
    });
  });
});
