/**
 * @fileoverview Tests for StructureController methods.
 */

const ApiError = require('../../error/ApiError');
const StructureController = require('../../controllers/structureController');
const { Section, Team, User } = require('../../models/index');
const { logAudit } = require('../../utils/auditLogger');

jest.mock('../../models/index');
jest.mock('../../utils/auditLogger');

const createRes = () => ({
  json: jest.fn(),
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

        await StructureController[method](req, res, next);

        expect(next).toHaveBeenCalledWith(
          expect.objectContaining({ status })
        );

        spy.mockRestore();
      });
    });
  });
};

describe('StructureController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('getFullStructure success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    Section.findAll.mockResolvedValue([{ id: 1 }]);

    await StructureController.getFullStructure(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getFullStructure',
    apiMethod: 'badRequest',
    setup: async () => {
      Section.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('getUnassignedUsers success', async () => {
    const req = {};
    const res = createRes();
    const next = jest.fn();

    User.findAll.mockResolvedValue([{ id: 1 }]);

    await StructureController.getUnassignedUsers(req, res, next);

    expect(res.json).toHaveBeenCalledWith([{ id: 1 }]);
  });

  runErrorStatusTests({
    method: 'getUnassignedUsers',
    apiMethod: 'badRequest',
    setup: async () => {
      User.findAll.mockRejectedValue(new Error('fail'));
    },
  });

  test('createSection success', async () => {
    const req = { body: { title: 'Section' } };
    const res = createRes();
    const next = jest.fn();

    Section.create.mockResolvedValue({ id: 1 });

    await StructureController.createSection(req, res, next);

    expect(Section.create).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 1 });
  });

  runErrorStatusTests({
    method: 'createSection',
    apiMethod: 'badRequest',
    setup: async () => {
      Section.create.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { title: 'Section' } }),
  });

  test('createTeam success', async () => {
    const req = { body: { title: 'Team', sectionId: 1 } };
    const res = createRes();
    const next = jest.fn();

    Team.create.mockResolvedValue({ id: 2 });

    await StructureController.createTeam(req, res, next);

    expect(Team.create).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ id: 2 });
  });

  runErrorStatusTests({
    method: 'createTeam',
    apiMethod: 'badRequest',
    setup: async () => {
      Team.create.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { title: 'Team', sectionId: 1 } }),
  });

  test('assignSectionManager success', async () => {
    const req = { body: { sectionId: 1, userId: 2 } };
    const res = createRes();
    const next = jest.fn();

    Section.update.mockResolvedValue([1]);

    await StructureController.assignSectionManager(req, res, next);

    expect(Section.update).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Manager assigned' });
  });

  runErrorStatusTests({
    method: 'assignSectionManager',
    apiMethod: 'badRequest',
    setup: async () => {
      Section.update.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { sectionId: 1, userId: 2 } }),
  });

  test('assignTeamLead success', async () => {
    const req = { body: { teamId: 1, userId: 2 } };
    const res = createRes();
    const next = jest.fn();

    Team.update.mockResolvedValue([1]);

    await StructureController.assignTeamLead(req, res, next);

    expect(Team.update).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'Team Lead assigned' });
  });

  runErrorStatusTests({
    method: 'assignTeamLead',
    apiMethod: 'badRequest',
    setup: async () => {
      Team.update.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { teamId: 1, userId: 2 } }),
  });

  test('addMemberToTeam success', async () => {
    const req = { body: { teamId: 1, userId: 2 } };
    const res = createRes();
    const next = jest.fn();

    User.update.mockResolvedValue([1]);

    await StructureController.addMemberToTeam(req, res, next);

    expect(User.update).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'User added to team' });
  });

  runErrorStatusTests({
    method: 'addMemberToTeam',
    apiMethod: 'badRequest',
    setup: async () => {
      User.update.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { teamId: 1, userId: 2 } }),
  });

  test('removeMemberFromTeam success', async () => {
    const req = { body: { userId: 2 } };
    const res = createRes();
    const next = jest.fn();

    User.update.mockResolvedValue([1]);

    await StructureController.removeMemberFromTeam(req, res, next);

    expect(User.update).toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith({ message: 'User removed from team' });
  });

  runErrorStatusTests({
    method: 'removeMemberFromTeam',
    apiMethod: 'badRequest',
    setup: async () => {
      User.update.mockRejectedValue(new Error('fail'));
    },
    buildReq: () => ({ body: { userId: 2 } }),
  });
});
