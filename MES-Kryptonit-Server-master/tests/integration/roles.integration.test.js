const request = require('supertest');
const { resetTestState } = require('../helpers/dbSetup');

jest.mock('../../models/index', () => ({
  Role: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
  },
  Ability: {},
}));

jest.mock('../../services/KeycloakSyncService', () => ({
  createRoleInKeycloak: jest.fn(),
}));

const { Role } = require('../../models/index');
const KeycloakSyncService = require('../../services/KeycloakSyncService');
const { app } = require('../helpers/testApp');

describe('Roles integration', () => {
  afterEach(() => {
    resetTestState();
  });

  test('GET /api/roles возвращает список ролей', async () => {
    const roles = [
      { id: 1, name: 'WAREHOUSE_MASTER', priority: 10 },
      { id: 2, name: 'QC_ENGINEER', priority: 20 },
    ];
    Role.findAll.mockResolvedValue(roles);

    const res = await request(app).get('/api/roles');

    expect(res.status).toBe(200);
    expect(res.body).toEqual(roles);
    expect(Role.findAll).toHaveBeenCalled();
  });

  test('POST /api/roles создает новую роль', async () => {
    const createdRole = {
      id: 3,
      name: 'TECHNOLOGIST',
      description: 'Технолог',
      priority: 30,
      keycloakId: 'kc-1',
      keycloakName: 'TECHNOLOGIST',
      isActive: true,
      setAbilities: jest.fn(),
    };

    Role.findOne.mockResolvedValue(null);
    KeycloakSyncService.createRoleInKeycloak.mockResolvedValue({
      id: 'kc-1',
      name: 'TECHNOLOGIST',
    });
    Role.create.mockResolvedValue(createdRole);

    const res = await request(app)
      .post('/api/roles')
      .send({
        name: 'TECHNOLOGIST',
        description: 'Технолог',
        priority: 30,
        abilityIds: [1, 2],
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: 3,
      name: 'TECHNOLOGIST',
      keycloakId: 'kc-1',
    });
    expect(Role.create).toHaveBeenCalled();
  });
});
