/**
 * @fileoverview Tests for requestLogger middleware logging output.
 */

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
}));

const requestLogger = require('../../middleware/requestLogger');
const logger = require('../../services/logger');

describe('requestLogger', () => {
  test('Должен логировать запрос после завершения ответа', () => {
    const handlers = {};
    const req = {
      method: 'GET',
      url: '/health',
      ip: '127.0.0.1',
      user: { id: 5 },
      get: jest.fn(() => 'agent'),
    };
    const res = {
      statusCode: 200,
      on: jest.fn((event, handler) => {
        handlers[event] = handler;
      }),
      get: jest.fn(() => '123'),
    };
    const next = jest.fn();

    requestLogger(req, res, next);

    handlers.finish();

    expect(logger.info).toHaveBeenCalledWith(
      'HTTP request',
      expect.objectContaining({
        method: 'GET',
        url: '/health',
        status: 200,
        durationMs: expect.any(Number),
        ip: '127.0.0.1',
        userAgent: 'agent',
        userId: 5,
        contentLength: '123',
      })
    );
    expect(next).toHaveBeenCalledWith();
  });
});
