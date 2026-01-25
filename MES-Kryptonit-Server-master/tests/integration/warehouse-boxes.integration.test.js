const request = require('supertest');
const { boxes } = require('../fixtures/boxes');
const { resetTestState } = require('../helpers/dbSetup');

jest.mock('../../models/index', () => ({
  WarehouseBox: {
    findAndCountAll: jest.fn(),
    bulkCreate: jest.fn(),
  },
  User: {},
  Section: {},
  Team: {},
  Supply: {},
  WarehouseMovement: {},
  WarehouseDocument: {},
  PrintHistory: {},
}));

jest.mock('../../utils/auditLogger', () => ({
  logAudit: jest.fn(),
}));

const { WarehouseBox } = require('../../models/index');
const { logAudit } = require('../../utils/auditLogger');
const { app } = require('../helpers/testApp');

describe('Warehouse boxes integration', () => {
  afterEach(() => {
    resetTestState();
  });

  test('GET /api/warehouse/boxes возвращает список коробок', async () => {
    WarehouseBox.findAndCountAll.mockResolvedValue({
      rows: boxes,
      count: boxes.length,
    });

    const res = await request(app).get('/api/warehouse/boxes');

    expect(res.status).toBe(200);
    expect(res.body.rows).toEqual(boxes);
    expect(res.body.count).toBe(boxes.length);
  });

  test('POST /api/warehouse/boxes/batch создает партию коробок', async () => {
    WarehouseBox.bulkCreate.mockResolvedValue(boxes);

    const res = await request(app)
      .post('/api/warehouse/boxes/batch')
      .send({
        label: 'Кабель',
        quantity: 2,
        itemsPerBox: 1,
        unit: 'шт',
      });

    expect(res.status).toBe(200);
    expect(res.body.boxes).toEqual(boxes);
    expect(WarehouseBox.bulkCreate).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
  });
});
