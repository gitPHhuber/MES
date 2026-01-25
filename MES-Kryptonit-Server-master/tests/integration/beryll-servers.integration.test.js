const request = require('supertest');
const { servers } = require('../fixtures/servers');
const { resetTestState } = require('../helpers/dbSetup');

jest.mock('../../controllers/beryll/services/ServerService', () => ({
  getServers: jest.fn(),
}));

jest.mock('../../models/index', () => ({}));

const ServerService = require('../../controllers/beryll/services/ServerService');
const { app } = require('../helpers/testApp');

describe('Beryll servers integration', () => {
  afterEach(() => {
    resetTestState();
  });

  test('GET /api/beryll/servers возвращает список серверов', async () => {
    ServerService.getServers.mockResolvedValue(servers);

    const res = await request(app).get('/api/beryll/servers');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(servers);
    expect(ServerService.getServers).toHaveBeenCalledWith({});
  });
});
