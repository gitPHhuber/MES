/**
 * @fileoverview Tests for authMiddleware authentication behavior.
 */

const buildReq = (token) => ({
  headers: token ? { authorization: `Bearer ${token}` } : {},
});

describe('authMiddleware', () => {
  const res = {};
  let next;

  beforeEach(() => {
    next = jest.fn();
  });

  const runWithToken = async (token) => {
    jest.resetModules();
    jest.clearAllMocks();

    jest.doMock('express-oauth2-jwt-bearer', () => ({
      auth: jest.fn(() => (req, _res, nextFn) => {
        const authHeader = req.headers?.authorization;
        if (!authHeader) {
          return nextFn({ name: 'UnauthorizedError', status: 401 });
        }
        if (authHeader === 'Bearer expired-token') {
          return nextFn({ name: 'InvalidTokenError', status: 401 });
        }
        return nextFn();
      }),
    }));

    const authMiddleware = require('../../middleware/authMiddleware');
    const req = buildReq(token);

    await authMiddleware(req, res, next);

    return { authMiddleware, req };
  };

  test('Должен пропустить запрос с валидным токеном', async () => {
    await runWithToken('valid-token');

    expect(next).toHaveBeenCalledWith();
  });

  test('Должен вернуть ошибку при отсутствии заголовка авторизации', async () => {
    await runWithToken(null);

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      name: 'UnauthorizedError',
      status: 401,
    }));
  });

  test('Должен вернуть ошибку при невалидном или просроченном токене', async () => {
    await runWithToken('expired-token');

    expect(next).toHaveBeenCalledWith(expect.objectContaining({
      name: 'InvalidTokenError',
      status: 401,
    }));
  });

  test('Должен конфигурировать auth с ожидаемыми параметрами', async () => {
    jest.resetModules();
    const authMock = jest.fn(() => (req, _res, nextFn) => nextFn());

    jest.doMock('express-oauth2-jwt-bearer', () => ({ auth: authMock }));

    const authMiddleware = require('../../middleware/authMiddleware');

    await authMiddleware(buildReq('valid-token'), res, next);

    expect(authMock).toHaveBeenCalledWith({
      audience: 'account',
      issuerBaseURL: 'http://keycloak.local/realms/MES-Realm',
      tokenSigningAlg: 'RS256',
    });
  });
});
