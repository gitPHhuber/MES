/**
 * @fileoverview Tests for validateRequest middleware using Zod schemas.
 */

const { z } = require('zod');
const validateRequest = require('../../middleware/validateRequest');

const createRes = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn(),
});

describe('validateRequest middleware', () => {
  test('Должен валидировать body, query и params и вызывать next', () => {
    const schema = {
      body: z.object({ name: z.string() }),
      query: z.object({ page: z.string().transform(Number) }),
      params: z.object({ id: z.string() }),
    };
    const middleware = validateRequest(schema);

    const req = {
      body: { name: 'Test' },
      query: { page: '2' },
      params: { id: '123' },
    };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(req.body).toEqual({ name: 'Test' });
    expect(req.query).toEqual({ page: 2 });
    expect(req.params).toEqual({ id: '123' });
    expect(next).toHaveBeenCalledWith();
  });

  test('Должен возвращать 400 и ошибки Zod при невалидных данных', () => {
    const schema = {
      body: z.object({ name: z.string().min(2) }),
    };
    const middleware = validateRequest(schema);

    const req = { body: { name: 'A' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: 'Validation error',
      errors: [
        {
          path: 'name',
          message: 'String must contain at least 2 character(s)',
        },
      ],
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('Должен передавать неизвестные ошибки в next', () => {
    const schema = {
      body: {
        parse: jest.fn(() => {
          throw new Error('Unexpected');
        }),
      },
    };
    const middleware = validateRequest(schema);

    const req = { body: { name: 'Test' } };
    const res = createRes();
    const next = jest.fn();

    middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect(res.status).not.toHaveBeenCalled();
  });
});
