/**
 * @fileoverview Tests for SessionController methods.
 */

const ApiError = require('../../error/ApiError');
const SessionController = require('../../controllers/sessionController');
const { Session, PC } = require('../../models/index');
const { logAudit } = require('../../utils/auditLogger');

jest.mock('../../models/index');
jest.mock('../../utils/auditLogger');
jest.mock('../../services/logger');

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

        await SessionController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('SessionController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  test('getSessions success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Session.findAll.mockResolvedValue([{ id: 1 }]);

    await SessionController.getSessions(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getSessions',
    apiMethod: 'badRequest',
    setup: async () => {
      Session.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('postSession success', async () => {
    const req = { body: { online: true, userId: 1, pcId: 2 } };
    const res = createRes();
    const next = jest.fn();

    Session.create.mockResolvedValue({ id: 1 });

    await SessionController.postSession(req, res, next);

    expect(Session.create).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'postSession',
    apiMethod: 'badRequest',
    setup: async () => {
      Session.create.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { online: true, userId: 1 } }),
  });

  test('setOnlineSession success', async () => {
    const req = {
      body: { online: true, userId: 1, pcId: 2 },
      user: { id: 1 },
    };
    const res = createRes();
    const next = jest.fn();

    const session = { id: 1, update: jest.fn() };
    Session.findOne.mockResolvedValue(session);
    Session.update.mockResolvedValue([1]);
    PC.findByPk.mockResolvedValue({ pc_name: 'PC', ip: '1.1.1.1' });

    await SessionController.setOnlineSession(req, res, next);

    expect(session.update).toHaveBeenCalledWith({ online: true });
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(session);
  });

  runErrorStatusTests({
    method: 'setOnlineSession',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('deleteSession success', async () => {
    const req = { params: { id: 1 } };
    const res = createRes();
    const next = jest.fn();

    Session.findByPk.mockResolvedValue({ id: 1, userId: 2, pcId: 3 });
    Session.destroy.mockResolvedValue(1);

    await SessionController.deleteSession(req, res, next);

    expect(Session.destroy).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith('ok');
  });

  runErrorStatusTests({
    method: 'deleteSession',
    apiMethod: 'badRequest',
    setup: async () => {
      Session.destroy.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ params: { id: 1 } }),
  });

  test('setOfflineSession success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Session.update.mockResolvedValue([2]);

    await SessionController.setOfflineSession(req, res, next);

    expect(res.json).toHaveBeenCalled();
  });

  runErrorStatusTests({
    method: 'setOfflineSession',
    apiMethod: 'badRequest',
    setup: async () => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2023-01-01T23:59:00Z'));
      Session.update.mockRejectedValue(new Error('fail'));
    },
  });

  test('offlineSessionManual success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Session.update.mockResolvedValue([2]);

    await SessionController.offlineSessionManual(req, res, next);

    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith('Все активные сессии сброшены');
  });

  runErrorStatusTests({
    method: 'offlineSessionManual',
    apiMethod: 'badRequest',
    setup: async () => {
      Session.update.mockRejectedValue(new Error('fail'));
    },
  });
});
