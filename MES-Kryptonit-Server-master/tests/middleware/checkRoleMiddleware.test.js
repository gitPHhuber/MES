/**
 * @fileoverview Tests for checkRoleMiddleware role-based checks.
 */

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const checkRoleMiddleware = require('../../middleware/checkRoleMiddleware');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('checkRoleMiddleware', () => {
  test('Должен пропустить OPTIONS запрос', () => {
    const req = { method: 'OPTIONS' };
    const res = createRes();
    const next = jest.fn();

    checkRoleMiddleware('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });

  test('Должен вернуть 401 если пользователь не задан', () => {
    const req = { method: 'GET', user: null };
    const res = createRes();
    const next = jest.fn();

    checkRoleMiddleware('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Пользователь не идентифицирован (Backend Error)',
    });
  });

  test('Должен вернуть 403 если роль не совпадает', () => {
    const req = { method: 'GET', user: { role: 'USER' } };
    const res = createRes();
    const next = jest.fn();

    checkRoleMiddleware('ADMIN')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Нет доступа. Требуется роль ADMIN, у вас USER',
    });
  });

  test('Должен вызвать next при совпадении роли', () => {
    const req = { method: 'GET', user: { role: 'ADMIN' } };
    const res = createRes();
    const next = jest.fn();

    checkRoleMiddleware('ADMIN')(req, res, next);

    expect(next).toHaveBeenCalledWith();
  });
});
