/**
 * @fileoverview Tests for ErrorHandlingMiddleware response mapping.
 */

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const ApiError = require('../../error/ApiError');
const errorHandler = require('../../middleware/ErrorHandlingMiddleware');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
  set: jest.fn().mockReturnThis(),
});

describe('ErrorHandlingMiddleware', () => {
  const req = { method: 'GET', url: '/test' };

  test('Должен обрабатывать ApiError', () => {
    const res = createRes();
    const err = ApiError.badRequest('Ошибка');

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Ошибка',
      errors: undefined,
    });
  });

  test('Должен обрабатывать UnauthorizedError', () => {
    const res = createRes();
    const err = { name: 'UnauthorizedError', status: 401 };

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Пользователь не авторизован (Invalid Token)',
    });
  });

  test('Должен обрабатывать InvalidTokenError', () => {
    const res = createRes();
    const err = { name: 'InvalidTokenError' };

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Некорректный токен или срок действия истек',
    });
  });

  test('Должен обрабатывать ошибки Sequelize', () => {
    const resUnique = createRes();
    const uniqueErr = {
      name: 'SequelizeUniqueConstraintError',
      errors: [{ message: 'duplicate' }],
    };

    errorHandler(uniqueErr, req, resUnique, jest.fn());

    expect(resUnique.status).toHaveBeenCalledWith(409);
    expect(resUnique.json).toHaveBeenCalledWith({
      message: 'Запись с такими данными уже существует',
      details: ['duplicate'],
    });

    const resValidation = createRes();
    const validationErr = {
      name: 'SequelizeValidationError',
      errors: [{ message: 'invalid' }],
    };

    errorHandler(validationErr, req, resValidation, jest.fn());

    expect(resValidation.status).toHaveBeenCalledWith(400);
    expect(resValidation.json).toHaveBeenCalledWith({
      message: 'Ошибка валидации данных',
      details: ['invalid'],
    });

    const resConnection = createRes();
    const connectionErr = { name: 'SequelizeConnectionError' };

    errorHandler(connectionErr, req, resConnection, jest.fn());

    expect(resConnection.status).toHaveBeenCalledWith(503);
    expect(resConnection.json).toHaveBeenCalledWith({
      message: 'Нет подключения к базе данных',
    });
  });

  test('Должен возвращать 500 fallback', () => {
    const res = createRes();
    const err = new Error('Boom');
    const prevEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    errorHandler(err, req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Непредвиденная ошибка сервера',
      error: 'Boom',
    });

    process.env.NODE_ENV = prevEnv;
  });
});
