/**
 * @fileoverview Unit tests for HistoryService.
 */

const modelMocks = {
  BeryllHistory: {
    create: jest.fn(),
    findAndCountAll: jest.fn(),
  },
  BeryllServer: {
    findByPk: jest.fn(),
  },
  User: {},
};

jest.mock("../../models/index", () => modelMocks);

jest.mock("../../services/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const logger = require("../../services/logger");
const HistoryService = require("../../controllers/beryll/services/HistoryService");

describe("HistoryService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("logHistory creates entry with server metadata", async () => {
    modelMocks.BeryllServer.findByPk.mockResolvedValue({
      ipAddress: "10.0.0.1",
      hostname: "beryll-01",
    });

    await HistoryService.logHistory(11, 5, "CREATED", {
      comment: "Created",
    });

    expect(modelMocks.BeryllHistory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        serverId: 11,
        serverIp: "10.0.0.1",
        serverHostname: "beryll-01",
        userId: 5,
        action: "CREATED",
        comment: "Created",
      })
    );
  });

  test("logHistory swallows errors and logs them", async () => {
    modelMocks.BeryllServer.findByPk.mockRejectedValue(new Error("boom"));

    await expect(
      HistoryService.logHistory(1, 2, "UPDATED")
    ).resolves.toBeUndefined();

    expect(logger.error).toHaveBeenCalled();
  });

  test("getHistory returns paginated results", async () => {
    modelMocks.BeryllHistory.findAndCountAll.mockResolvedValue({
      count: 3,
      rows: [{ id: 1 }, { id: 2 }],
    });

    const result = await HistoryService.getHistory({
      serverId: 10,
      userId: 2,
      action: "STATUS_CHANGED",
      page: 2,
      limit: 2,
    });

    expect(modelMocks.BeryllHistory.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          serverId: 10,
          userId: 2,
          action: "STATUS_CHANGED",
        }),
        limit: 2,
        offset: 2,
      })
    );
    expect(result).toEqual({
      count: 3,
      rows: [{ id: 1 }, { id: 2 }],
      page: 2,
      totalPages: 2,
    });
  });
});
