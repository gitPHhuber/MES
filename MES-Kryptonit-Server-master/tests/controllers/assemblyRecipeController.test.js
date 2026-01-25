/**
 * @fileoverview Tests for AssemblyRecipeController methods.
 */

const ApiError = require('../../error/ApiError');
const sequelize = require('../../db');
const AssemblyRecipeController = require('../../controllers/assemblyRecipeController');
const {
  AssemblyRecipe,
  RecipeStep,
  AssemblyProcess,
  WarehouseBox,
  Project,
  User,
  Team,
  Section,
  WarehouseMovement,
} = require('../../models/index');

jest.mock('../../db');
jest.mock('../../models/index');
jest.mock('../../services/logger');

const createRes = () => ({
  json: jest.fn(),
  status: jest.fn().mockReturnThis(),
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

        await AssemblyRecipeController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('AssemblyRecipeController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sequelize.transaction.mockResolvedValue({
      commit: jest.fn(),
      rollback: jest.fn(),
    });
  });

  test('createOrUpdate success', async () => {
    const req = {
      body: { projectId: 1, title: 'Recipe', steps: [{ title: 'Step 1' }] },
    };
    const res = createRes();
    const next = jest.fn();

    AssemblyRecipe.findOne.mockResolvedValue(null);
    AssemblyRecipe.create.mockResolvedValue({ id: 5, projectId: 1 });
    RecipeStep.bulkCreate.mockResolvedValue([]);

    await AssemblyRecipeController.createOrUpdate(req, res, next);

    expect(AssemblyRecipe.create).toHaveBeenCalled();
    expect(RecipeStep.bulkCreate).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 5, projectId: 1 });
  });

  runErrorStatusTests({
    method: 'createOrUpdate',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {} }),
  });

  test('getByProject success', async () => {
    const req = { params: { projectId: 2 } };
    const res = createRes();
    const next = jest.fn();

    AssemblyRecipe.findOne.mockResolvedValue({ id: 7 });

    await AssemblyRecipeController.getByProject(req, res, next);

    expect(AssemblyRecipe.findOne).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 7 });
  });

  runErrorStatusTests({
    method: 'getByProject',
    apiMethod: 'badRequest',
    setup: async () => {
      AssemblyRecipe.findOne.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ params: { projectId: 2 } }),
  });

  test('startAssembly success', async () => {
    const req = {
      body: { qrCode: 'QR1', projectId: 1 },
      user: { id: 5 },
    };
    const res = createRes();
    const next = jest.fn();

    AssemblyRecipe.findOne.mockResolvedValue({ id: 2, steps: [] });
    WarehouseBox.findOne.mockResolvedValue(null);
    Project.findByPk.mockResolvedValue({ title: 'Project' });
    WarehouseBox.create.mockResolvedValue({ id: 10, status: 'ASSEMBLY' });
    AssemblyProcess.findOne.mockResolvedValue(null);
    AssemblyProcess.create.mockResolvedValue({ id: 3 });

    await AssemblyRecipeController.startAssembly(req, res, next);

    expect(WarehouseBox.create).toHaveBeenCalled();
    expect(AssemblyProcess.create).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({
      process: { id: 3 },
      recipe: { id: 2, steps: [] },
    });
  });

  runErrorStatusTests({
    method: 'startAssembly',
    apiMethod: 'badRequest',
    setup: async () => {},
    buildReq: () => ({ body: {}, user: { id: 1 } }),
  });

  test('updateProcessStep success', async () => {
    const req = {
      params: { id: 1 },
      body: { stepIndex: 0, isDone: true },
    };
    const res = createRes();
    const next = jest.fn();

    const process = { completedSteps: [], update: jest.fn() };
    AssemblyProcess.findByPk.mockResolvedValue(process);

    await AssemblyRecipeController.updateProcessStep(req, res, next);

    expect(process.update).toHaveBeenCalledWith({ completedSteps: [0] });
    expect(res.json).toHaveBeenCalledWith(process);
  });

  runErrorStatusTests({
    method: 'updateProcessStep',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyProcess.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 1 }, body: { stepIndex: 0 } }),
  });

  test('finishAssembly success', async () => {
    const req = { params: { id: 1 }, user: { id: 9 } };
    const res = createRes();
    const next = jest.fn();

    const process = { id: 1, boxId: 2, recipeId: 3, update: jest.fn() };
    const box = { id: 2, update: jest.fn() };

    AssemblyProcess.findByPk.mockResolvedValue(process);
    WarehouseBox.findByPk.mockResolvedValue(box);
    WarehouseMovement.create.mockResolvedValue({ id: 11 });

    await AssemblyRecipeController.finishAssembly(req, res, next);

    expect(process.update).toHaveBeenCalled();
    expect(box.update).toHaveBeenCalledWith({ status: 'ON_STOCK' }, expect.any(Object));
    expect(res.json).toHaveBeenCalledWith({ message: 'Сборка успешно завершена' });
  });

  runErrorStatusTests({
    method: 'finishAssembly',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyProcess.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 1 }, user: { id: 2 } }),
  });

  test('getAssembledList success', async () => {
    const req = { query: {} };
    const res = createRes();
    const next = jest.fn();

    AssemblyProcess.findAll.mockResolvedValue([
      {
        id: 1,
        box: { id: 2, qrCode: 'QR' },
        recipe: { project: { title: 'Project' }, steps: [{ id: 1 }] },
        completedSteps: [0],
        startTime: 'start',
        endTime: 'end',
      },
    ]);
    User.findByPk.mockResolvedValue({ name: 'A', surname: 'B' });

    await AssemblyRecipeController.getAssembledList(req, res, next);

    expect(AssemblyProcess.findAll).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith([
      expect.objectContaining({ qrCode: 'QR' }),
    ]);
  });

  runErrorStatusTests({
    method: 'getAssembledList',
    apiMethod: 'badRequest',
    setup: async () => {
      AssemblyProcess.findAll.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ query: {} }),
  });

  test('getAssemblyPassport success', async () => {
    const req = { params: { processId: 1 } };
    const res = createRes();
    const next = jest.fn();

    const process = {
      recipe: { steps: [{ order: 1 }], project: {} },
      box: { acceptedById: 5 },
    };

    AssemblyProcess.findByPk.mockResolvedValue(process);
    User.findByPk.mockResolvedValue({
      name: 'A',
      surname: 'B',
      login: 'login',
      team: { title: 'Team', section: { title: 'Section' } },
    });

    await AssemblyRecipeController.getAssemblyPassport(req, res, next);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ process })
    );
  });

  runErrorStatusTests({
    method: 'getAssemblyPassport',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyProcess.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { processId: 1 } }),
  });

  test('updatePassport success', async () => {
    const req = { params: { id: 1 }, body: { completedSteps: [1] } };
    const res = createRes();
    const next = jest.fn();

    const process = { update: jest.fn() };
    AssemblyProcess.findByPk.mockResolvedValue(process);

    await AssemblyRecipeController.updatePassport(req, res, next);

    expect(process.update).toHaveBeenCalledWith({ completedSteps: [1] });
    expect(res.json).toHaveBeenCalledWith({ message: 'Паспорт обновлен' });
  });

  runErrorStatusTests({
    method: 'updatePassport',
    apiMethod: 'notFound',
    setup: async () => {
      AssemblyProcess.findByPk.mockResolvedValue(null);
    },
    buildReq: () => ({ params: { id: 1 }, body: {} }),
  });
});
