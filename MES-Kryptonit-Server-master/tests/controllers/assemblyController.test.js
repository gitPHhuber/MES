/**
 * @fileoverview Tests for AssemblyController methods.
 */

const ApiError = require('../../error/ApiError');
const AssemblyController = require('../../controllers/assemblyController');
const { AssemblyRoute, AssemblyRouteStep } = require('../../models/index');
jest.mock('../../models/index');
jest.mock('../../services/logger');

const createRes = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
});

const errorStatuses = [400, 403, 404, 500];

const runErrorStatusTests = ({
  method,
  apiMethod,
  setup,
  buildReq,
}) => {
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

        await AssemblyController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('AssemblyController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getRoutes success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    AssemblyRoute.findAll.mockResolvedValue([{ id: 1 }]);

    await AssemblyController.getRoutes(req, res, next);

    expect(AssemblyRoute.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getRoutes',
    apiMethod: 'internal',
    setup: async () => {
      AssemblyRoute.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });

  test('getRouteById success', async () => {
    const req = { params: { id: 1 } };
    const res = createRes();
    const next = jest.fn();

    AssemblyRoute.findByPk.mockResolvedValue({ id: 1 });

    await AssemblyController.getRouteById(req, res, next);

    expect(AssemblyRoute.findByPk).toHaveBeenCalledWith(1, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'getRouteById',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyRoute.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 1 } }),
  });

  test('createRoute success', async () => {
    const req = {
      body: {
        title: 'Route',
        productName: 'Product',
        description: 'desc',
        isActive: true,
        steps: [{ title: 'Step 1' }],
      },
      user: { id: 5 },
    };
    const res = createRes();
    const next = jest.fn();

    AssemblyRoute.create.mockResolvedValue({ id: 10 });
    AssemblyRoute.findByPk.mockResolvedValue({ id: 10 });
    AssemblyRouteStep.bulkCreate.mockResolvedValue([]);

    await AssemblyController.createRoute(req, res, next);

    expect(AssemblyRoute.create).toHaveBeenCalled();
    expect(AssemblyRouteStep.bulkCreate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 10 });
  });

  runErrorStatusTests({
    method: 'createRoute',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('updateRoute success', async () => {
    const req = {
      params: { id: 2 },
      body: {
        title: 'Updated',
        steps: [],
      },
    };
    const res = createRes();
    const next = jest.fn();

    const route = { id: 2, title: 'Old', update: jest.fn() };

    AssemblyRoute.findByPk
      .mockResolvedValueOnce(route)
      .mockResolvedValueOnce({ id: 2 });
    AssemblyRouteStep.destroy.mockResolvedValue();

    await AssemblyController.updateRoute(req, res, next);

    expect(route.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 2 });
  });

  runErrorStatusTests({
    method: 'updateRoute',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyRoute.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 2 }, body: {} }),
  });

  test('deleteRoute success', async () => {
    const req = { params: { id: 3 } };
    const res = createRes();
    const next = jest.fn();

    const route = { id: 3, destroy: jest.fn() };

    AssemblyRoute.findByPk.mockResolvedValue(route);
    AssemblyRouteStep.destroy.mockResolvedValue();

    await AssemblyController.deleteRoute(req, res, next);

    expect(route.destroy).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Маршрут удалён' });
  });

  runErrorStatusTests({
    method: 'deleteRoute',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyRoute.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 3 } }),
  });
});
