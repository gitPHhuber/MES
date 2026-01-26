const ApiError = require('../../error/ApiError');
const DocumentController = require('../../controllers/warehouse/DocumentController');
const { WarehouseDocument } = require('../../models/index');

jest.mock('../../models/index', () => ({
  WarehouseDocument: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  User: {},
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

describe('DocumentController', () => {
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

  describe('createDocument', () => {
    test('успешно создает документ', async () => {
      req.body = { number: 'DOC-1' };
      WarehouseDocument.create.mockResolvedValue({ id: 1 });

      await DocumentController.createDocument(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    test('возвращает 400 при отсутствии номера', async () => {
      await DocumentController.createDocument(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { number: 'DOC-1' };
      WarehouseDocument.create.mockRejectedValue(ApiError.notFound('missing'));

      await DocumentController.createDocument(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { number: 'DOC-1' };
      WarehouseDocument.create.mockRejectedValue(ApiError.forbidden('forbidden'));

      await DocumentController.createDocument(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { number: 'DOC-1' };
      WarehouseDocument.create.mockRejectedValue(new Error('boom'));

      await DocumentController.createDocument(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getDocuments', () => {
    test('успешно возвращает список документов', async () => {
      WarehouseDocument.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await DocumentController.getDocuments(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ rows: [], count: 0, page: 1, limit: 50 });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseDocument.findAndCountAll.mockRejectedValue(ApiError.badRequest('bad'));

      await DocumentController.getDocuments(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseDocument.findAndCountAll.mockRejectedValue(ApiError.notFound('missing'));

      await DocumentController.getDocuments(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseDocument.findAndCountAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await DocumentController.getDocuments(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseDocument.findAndCountAll.mockRejectedValue(new Error('boom'));

      await DocumentController.getDocuments(req, res, next);

      expectStatus(next, 500);
    });
  });
});
