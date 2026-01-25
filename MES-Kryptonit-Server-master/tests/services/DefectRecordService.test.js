/**
 * @fileoverview Unit tests for DefectRecordService.
 */

const modelMocks = {
  BeryllDefectRecord: {
    findByPk: jest.fn(),
  },
  DEFECT_RECORD_STATUSES: {
    NEW: "NEW",
    CLOSED: "CLOSED",
  },
  REPAIR_PART_TYPES: {
    CPU: "CPU",
    RAM: "RAM",
  },
};

jest.mock("../../models/index", () => modelMocks);
jest.mock("../../models", () => modelMocks);
jest.mock("../../services/beryll/DefectStateMachine", () => ({
  getAvailableActions: jest.fn(),
  assertTransition: jest.fn(),
}));
jest.mock("fs", () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
}));

const DefectStateMachine = require("../../services/beryll/DefectStateMachine");
const DefectRecordService = require("../../controllers/beryll/services/DefectRecordService");

describe("DefectRecordService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("getRepairPartTypes maps part types to labels", () => {
    const result = DefectRecordService.getRepairPartTypes();

    expect(result).toEqual(
      expect.arrayContaining([
        { value: "CPU", label: "Процессор" },
        { value: "RAM", label: "Оперативная память" },
      ])
    );
  });

  test("getStatuses maps statuses to labels", () => {
    const result = DefectRecordService.getStatuses();

    expect(result).toEqual(
      expect.arrayContaining([
        { value: "NEW", label: "Новый" },
        { value: "CLOSED", label: "Закрыт" },
      ])
    );
  });

  test("getAvailableActions throws for missing defect", async () => {
    modelMocks.BeryllDefectRecord.findByPk.mockResolvedValue(null);

    await expect(DefectRecordService.getAvailableActions(42)).rejects.toThrow(
      "Запись не найдена"
    );
  });

  test("getAvailableActions returns actions from state machine", async () => {
    modelMocks.BeryllDefectRecord.findByPk.mockResolvedValue({
      id: 7,
      status: "NEW",
    });
    DefectStateMachine.getAvailableActions.mockReturnValue(["START_DIAGNOSIS"]);

    const result = await DefectRecordService.getAvailableActions(7);

    expect(result).toEqual(["START_DIAGNOSIS"]);
    expect(DefectStateMachine.getAvailableActions).toHaveBeenCalledWith("NEW");
  });
});
