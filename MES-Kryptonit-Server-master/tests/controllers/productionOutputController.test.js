/**
 * @fileoverview Tests for ProductionOutputController methods.
 */

const ApiError = require('../../error/ApiError');
const sequelize = require('../../db');
const ProductionOutputController = require('../../controllers/productionOutputController');
const {
  ProductionOutput,
  OperationType,
  OUTPUT_STATUSES,
} = require('../../models/ProductionOutput');
const {
  User,
  Team,
  Section,
  Project,
  ProductionTask,
} = require('../../models/index');

jest.mock('../../db');
jest.mock('../../services/logger');
jest.mock('../../models/ProductionOutput', () => ({
  ProductionOutput: {
    findAll: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  OperationType: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByPk: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    destroy: jest.fn(),
  },
  OUTPUT_STATUSES: {
    APPROVED: 'APPROVED',
    PENDING: 'PENDING',
    ADJUSTED: 'ADJUSTED',
    REJECTED: 'REJECTED',
  },
}));
jest.mock('../../models/index');

const createRes = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

const errorStatuses = [400, 403, 404, 500];

const runErrorStatusTests = ({ method, apiMethod, setup, buildReq }) => {
  describe(`${method} error statuses`, () => {
    errorStatuses.forEach((status) => {
      test(`returns status ${status}`, async () => {
        const req = buildReq ? buildReq() : {};
        const res = createRes();
        const next = jest.fn();
        const spy = jest
          .spyOn(ApiError, apiMethod)
          .mockImplementation((message) => new ApiError(status, message));

        if (setup) {
          await setup({ req, res, next });
        }

        await ProductionOutputController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('ProductionOutputController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    });
    sequelize.fn.mockImplementation((...args) => args);
    sequelize.col.mockImplementation((value) => value);
  });

  test('getOperationTypes success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    OperationType.findAll.mockResolvedValue([{ id: 1 }]);

    await ProductionOutputController.getOperationTypes(req, res, next);

    expect(OperationType.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getOperationTypes',
    apiMethod: 'internal',
    setup: async () => {
      OperationType.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });

  test('createOperationType success', async () => {
    const req = {
      body: { name: 'Op', code: 'CODE' },
    };
    const res = createRes();
    const next = jest.fn();

    OperationType.findOne.mockResolvedValue(null);
    OperationType.create.mockResolvedValue({ id: 1 });

    await ProductionOutputController.createOperationType(req, res, next);

    expect(OperationType.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'createOperationType',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {} }),
  });

  test('updateOperationType success', async () => {
    const req = {
      params: { id: 2 },
      body: { name: 'New' },
    };
    const res = createRes();
    const next = jest.fn();

    const opType = { id: 2, code: 'OLD', update: jest.fn() };
    OperationType.findByPk.mockResolvedValue(opType);
    OperationType.findOne.mockResolvedValue(null);

    await ProductionOutputController.updateOperationType(req, res, next);

    expect(opType.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(opType);
  });

  runErrorStatusTests({
    method: 'updateOperationType',
    apiMethod: 'notFound',
    setup: async () => {
      OperationType.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 2 }, body: {} }),
  });

  test('deleteOperationType success (delete path)', async () => {
    const req = { params: { id: 3 } };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.count.mockResolvedValue(0);
    OperationType.destroy.mockResolvedValue(1);

    await ProductionOutputController.deleteOperationType(req, res, next);

    expect(OperationType.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      message: 'Тип операции удалён',
      deleted: true,
    });
  });

  runErrorStatusTests({
    method: 'deleteOperationType',
    apiMethod: 'internal',
    setup: async () => {
      ProductionOutput.count.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ params: { id: 3 } }),
  });

  test('getOutputs success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await ProductionOutputController.getOutputs(req, res, next);

    expect(ProductionOutput.findAndCountAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ rows: [], count: 0 })
    );
  });

  runErrorStatusTests({
    method: 'getOutputs',
    apiMethod: 'internal',
    setup: async () => {
      ProductionOutput.findAndCountAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });

  test('getOutputById success', async () => {
    const req = { params: { id: 4 } };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.findByPk.mockResolvedValue({ id: 4 });

    await ProductionOutputController.getOutputById(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ id: 4 });
  });

  runErrorStatusTests({
    method: 'getOutputById',
    apiMethod: 'notFound',
    setup: async () => {
      ProductionOutput.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 4 } }),
  });

  test('createOutput success', async () => {
    const req = {
      body: {
        date: '2023-01-01',
        userId: 5,
        claimedQty: 3,
      },
      user: { id: 1, role: 'SUPER_ADMIN' },
    };
    const res = createRes();
    const next = jest.fn();

    User.findByPk.mockResolvedValue({ id: 5, teamId: 2, Team: { Section: { id: 7 } } });
    ProductionOutput.create.mockResolvedValue({ id: 11 });
    ProductionOutput.findByPk.mockResolvedValue({ id: 11 });

    await ProductionOutputController.createOutput(req, res, next);

    expect(ProductionOutput.create).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({ id: 11 });
  });

  runErrorStatusTests({
    method: 'createOutput',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('updateOutput success', async () => {
    const req = {
      params: { id: 6 },
      body: { comment: 'Updated' },
      user: { id: 1, role: 'SUPER_ADMIN' },
    };
    const res = createRes();
    const next = jest.fn();

    const output = { id: 6, status: OUTPUT_STATUSES.PENDING, update: jest.fn() };
    ProductionOutput.findByPk.mockResolvedValue(output);

    await ProductionOutputController.updateOutput(req, res, next);

    expect(output.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(output);
  });

  runErrorStatusTests({
    method: 'updateOutput',
    apiMethod: 'notFound',
    setup: async () => {
      ProductionOutput.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 6 }, body: {}, user: { id: 1 } }),
  });

  test('deleteOutput success', async () => {
    const req = { params: { id: 7 }, user: { id: 1, role: 'SUPER_ADMIN' } };
    const res = createRes();
    const next = jest.fn();

    const output = { id: 7, status: OUTPUT_STATUSES.PENDING, destroy: jest.fn() };
    ProductionOutput.findByPk.mockResolvedValue(output);

    await ProductionOutputController.deleteOutput(req, res, next);

    expect(output.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Запись удалена' });
  });

  runErrorStatusTests({
    method: 'deleteOutput',
    apiMethod: 'notFound',
    setup: async () => {
      ProductionOutput.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 7 }, user: { id: 1 } }),
  });

  test('getPendingOutputs success', async () => {
    const req = { query: {}, user: { id: 1, role: 'SUPER_ADMIN' } };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.findAll.mockResolvedValue([]);

    await ProductionOutputController.getPendingOutputs(req, res, next);

    expect(ProductionOutput.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([]);
  });

  runErrorStatusTests({
    method: 'getPendingOutputs',
    apiMethod: 'internal',
    setup: async () => {
      ProductionOutput.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {}, user: { id: 1 } }),
  });

  test('approveOutputs success', async () => {
    const req = {
      body: { ids: [1], adjustments: {} },
      user: { id: 1, role: 'SUPER_ADMIN' },
    };
    const res = createRes();
    const next = jest.fn();

    const output = {
      id: 1,
      claimedQty: 2,
      update: jest.fn(),
    };

    ProductionOutput.findAll.mockResolvedValue([output]);

    await ProductionOutputController.approveOutputs(req, res, next);

    expect(output.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      results: [{ id: 1, status: OUTPUT_STATUSES.APPROVED, approvedQty: 2 }],
    });
  });

  runErrorStatusTests({
    method: 'approveOutputs',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('rejectOutputs success', async () => {
    const req = {
      body: { ids: [1], reason: 'bad' },
      user: { id: 1, role: 'SUPER_ADMIN' },
    };
    const res = createRes();
    const next = jest.fn();

    const output = {
      id: 1,
      claimedQty: 2,
      update: jest.fn(),
    };

    ProductionOutput.findAll.mockResolvedValue([output]);

    await ProductionOutputController.rejectOutputs(req, res, next);

    expect(output.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      results: [{ id: 1, status: OUTPUT_STATUSES.REJECTED }],
    });
  });

  runErrorStatusTests({
    method: 'rejectOutputs',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('getUserSummary success', async () => {
    const req = { params: { userId: 1 }, query: {} };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.findAll
      .mockResolvedValueOnce([{ status: OUTPUT_STATUSES.APPROVED }])
      .mockResolvedValueOnce([{ date: '2023-01-01', total: 2 }]);

    await ProductionOutputController.getUserSummary(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 1 })
    );
  });

  runErrorStatusTests({
    method: 'getUserSummary',
    apiMethod: 'internal',
    setup: async () => {
      ProductionOutput.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ params: { userId: 1 }, query: {} }),
  });

  test('getMatrix success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    ProductionOutput.findAll.mockResolvedValue([
      { userId: 1, date: '2023-01-01', approvedQty: 2, user: { name: 'A', surname: 'B' } },
    ]);

    await ProductionOutputController.getMatrix(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ dates: ['2023-01-01'] })
    );
  });

  runErrorStatusTests({
    method: 'getMatrix',
    apiMethod: 'internal',
    setup: async () => {
      ProductionOutput.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });

  test('getMyTeamMembers success', async () => {
    const req = { user: { id: 1, role: 'SUPER_ADMIN' } };
    const res = createRes();
    const next = jest.fn();

    User.findAll.mockResolvedValue([{ id: 1 }]);

    await ProductionOutputController.getMyTeamMembers(req, res, next);

    expect(User.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getMyTeamMembers',
    apiMethod: 'internal',
    setup: async () => {
      User.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ user: { id: 1 } }),
  });
});
