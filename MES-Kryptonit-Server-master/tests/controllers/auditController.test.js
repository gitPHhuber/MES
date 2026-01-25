/**
 * @fileoverview Tests for AuditController methods.
 */

const ApiError = require('../../error/ApiError');
const AuditController = require('../../controllers/auditController');
const { AuditLog } = require('../../models/index');

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

        await AuditController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('AuditController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getLogs success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    AuditLog.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

    await AuditController.getLogs(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ rows: [], count: 0 });
  });

  runErrorStatusTests({
    method: 'getLogs',
    apiMethod: 'badRequest',
    setup: async () => {
      AuditLog.findAndCountAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });
});
