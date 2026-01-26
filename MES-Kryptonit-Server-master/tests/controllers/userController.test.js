/**
 * @fileoverview Tests for UserController methods.
 */

const ApiError = require('../../error/ApiError');
const UserController = require('../../controllers/userController');
const { User, Session } = require('../../models/index');
const jwt = require('jsonwebtoken');
const uuid = require('uuid');

jest.mock('../../models/index');
jest.mock('jsonwebtoken');
jest.mock('uuid');

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

        await UserController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('UserController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getUsers success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    User.findAll.mockResolvedValue([{ id: 1 }]);

    await UserController.getUsers(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getUsers',
    apiMethod: 'badRequest',
    setup: async () => {
      User.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('getCurrentUser success', async () => {
    const req = {
      params: { id: 1 },
      user: { id: 1, role: 'USER', abilities: [] },
    };
    const res = createRes();
    const next = jest.fn();

    User.findOne.mockResolvedValue({ id: 1 });

    await UserController.getCurrentUser(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'getCurrentUser',
    apiMethod: 'forbidden',
    setup: async () => {},
    buildReq: () => ({
      params: { id: 2 },
      user: { id: 1, role: 'USER', abilities: [] },
    }),
  });

  test('updateUser success', async () => {
    const req = {
      body: { id: 1, name: 'A', surname: 'B' },
      user: { id: 1, role: 'USER', abilities: [] },
    };
    const res = createRes();
    const next = jest.fn();

    User.update.mockResolvedValue([1]);
    User.findAll.mockResolvedValue([{ id: 1 }]);

    await UserController.updateUser(req, res, next);

    expect(User.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'updateUser',
    apiMethod: 'forbidden',
    setup: async () => {},
    buildReq: () => ({
      body: { id: 2 },
      user: { id: 1, role: 'USER', abilities: [] },
    }),
  });

  test('updateUserImg success', async () => {
    const req = {
      body: { id: 1 },
      user: { id: 1, role: 'USER', abilities: [] },
      files: { img: { mv: jest.fn() } },
    };
    const res = createRes();
    const next = jest.fn();

    uuid.v4.mockReturnValue('uuid');
    User.update.mockResolvedValue([1]);
    User.findAll.mockResolvedValue([{ id: 1 }]);

    await UserController.updateUserImg(req, res, next);

    expect(User.update).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'updateUserImg',
    apiMethod: 'forbidden',
    setup: async () => {},
    buildReq: () => ({
      body: { id: 2 },
      user: { id: 1, role: 'USER', abilities: [] },
      files: { img: { mv: jest.fn() } },
    }),
  });

  test('registration success', async () => {
    const req = { body: { login: 'a', password: 'b', role: 'USER' } };
    const res = createRes();
    const next = jest.fn();

    User.findOne.mockResolvedValue(null);
    User.create.mockResolvedValue({ id: 1, login: 'a', role: 'USER' });
    jwt.sign.mockReturnValue('token');

    await UserController.registration(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ token: 'token' });
  });

  runErrorStatusTests({
    method: 'registration',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {} }),
  });

  test('login success', async () => {
    const req = { body: { login: 'a', password: 'b' } };
    const res = createRes();
    const next = jest.fn();

    User.findOne.mockResolvedValue({
      id: 1,
      login: 'a',
      password: 'b',
      role: 'USER',
      name: 'A',
      surname: 'B',
    });
    Session.findAll.mockResolvedValue([]);
    jwt.sign.mockReturnValue('token');

    await UserController.login(req, res, next);

    expect(res.json).toHaveBeenCalledWith({ token: 'token' });
  });

  runErrorStatusTests({
    method: 'login',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {} }),
  });

  describe('check error statuses', () => {
    errorStatuses.forEach((status) => {
      test(`throws status ${status}`, () => {
        const req = {
          user: { id: 1, login: 'a', role: 'USER', name: 'A', surname: 'B' },
        };
        const res = createRes();
        const next = jest.fn();

        jwt.sign.mockImplementation(() => {
          throw new ApiError(status, 'fail');
        });

        expect(() => UserController.check(req, res, next)).toThrow(
          expect.objectContaining({ status })
        );
      });
    });
  });

  test('check success', () => {
    const req = {
      user: { id: 1, login: 'a', role: 'USER', name: 'A', surname: 'B' },
    };
    const res = createRes();

    jwt.sign.mockReturnValue('token');

    UserController.check(req, res);

    expect(res.json).toHaveBeenCalledWith({ token: 'token' });
  });

  test('deleteUser success', async () => {
    const req = { params: { id: 1 } };
    const res = createRes();
    const next = jest.fn();

    User.destroy.mockResolvedValue(1);

    await UserController.deleteUser(req, res, next);

    expect(res.json).toHaveBeenCalledWith('ok');
  });

  runErrorStatusTests({
    method: 'deleteUser',
    apiMethod: 'badRequest',
    setup: async () => {
      User.destroy.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ params: { id: 1 } }),
  });
});
