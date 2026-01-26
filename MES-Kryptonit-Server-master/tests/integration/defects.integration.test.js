const request = require('supertest');
const { defects, defectStats } = require('../fixtures/defects');
const { resetTestState } = require('../helpers/dbSetup');

jest.mock('../../db', () => ({
  fn: jest.fn((...args) => args),
  col: jest.fn((column) => column),
}));

jest.mock('../../models/index', () => ({
  DefectCategory: {},
  BoardDefect: {
    findAndCountAll: jest.fn(),
    findAll: jest.fn(),
  },
  RepairAction: {},
  User: {},
  FC: {},
  ELRS915: {},
  ELRS2_4: {},
  CoralB: {},
}));

const { BoardDefect } = require('../../models/index');
const { app } = require('../helpers/testApp');

describe('Defects integration', () => {
  afterEach(() => {
    resetTestState();
  });

  test('GET /api/defects возвращает список дефектов и статистику', async () => {
    BoardDefect.findAndCountAll.mockResolvedValue({
      rows: defects,
      count: defects.length,
    });
    BoardDefect.findAll.mockResolvedValue(defectStats);

    const res = await request(app).get('/api/defects?status=ACTIVE');

    expect(res.status).toBe(200);
    expect(res.body.defects).toEqual(
      defects.map((defect) => ({
        ...defect,
        detectedAt: defect.detectedAt.toISOString(),
      })),
    );
    expect(res.body.total).toBe(defects.length);
    expect(res.body.stats).toEqual({
      OPEN: 1,
      REPAIRED: 1,
    });
  });
});
