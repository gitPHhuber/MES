/**
 * @fileoverview Tests for RbacController methods.
 */

const ApiError = require('../../error/ApiError');
const RbacController = require('../../controllers/rbacController');
const { Role, Ability } = require('../../models/index');

jest.mock('../../models/index');

const createRes = () => ({
  json: jest.fn(),
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

        await RbacController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('RbacController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getRoles success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Role.findAll.mockResolvedValue([{ id: 1 }]);

    await RbacController.getRoles(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getRoles',
    apiMethod: 'internal',
    setup: async () => {
      Role.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('getAbilities success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Ability.findAll.mockResolvedValue([{ id: 1 }]);

    await RbacController.getAbilities(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getAbilities',
    apiMethod: 'internal',
    setup: async () => {
      Ability.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('updateRoleAbilities success', async () => {
    const req = { params: { roleId: 1 }, body: { abilityIds: [1] } };
    const res = createRes();
    const next = jest.fn();

    const role = { setAbilities: jest.fn() };
    Role.findByPk.mockResolvedValue(role);

    await RbacController.updateRoleAbilities(req, res, next);

    expect(role.setAbilities).toHaveBeenCalledWith([1]);
    expect(res.json).toHaveBeenCalledWith({ message: 'Права роли обновлены' });
  });

  runErrorStatusTests({
    method: 'updateRoleAbilities',
    apiMethod: 'badRequest',
    setup: async () => {
      Role.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { roleId: 1 }, body: { abilityIds: [] } }),
  });
});
