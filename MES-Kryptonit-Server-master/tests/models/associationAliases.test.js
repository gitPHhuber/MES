const models = require("../../models");
const { ProductionOutput } = require("../../models/ProductionOutput");

const {
  AuditLog,
  BeryllDefectRecord,
  BeryllServer,
  Section,
  Team,
  User,
  WarehouseDocument,
  WarehouseMovement,
} = models;

describe("Model association aliases", () => {
  it("supports Section -> Team -> User include chains", () => {
    expect(Section.associations).toHaveProperty("teams");
    expect(Team.associations).toHaveProperty("section");
    expect(Team.associations).toHaveProperty("production_section");
    expect(Team.associations).toHaveProperty("teamLead");
    expect(User.associations).toHaveProperty("section");
    expect(User.associations).toHaveProperty("production_section");
  });

  it("supports ProductionOutput include aliases", () => {
    expect(ProductionOutput.associations).toHaveProperty("user");
    expect(ProductionOutput.associations).toHaveProperty("approvedBy");
    expect(ProductionOutput.associations).toHaveProperty("createdBy");
    expect(ProductionOutput.associations).toHaveProperty("production_team");
    expect(ProductionOutput.associations).toHaveProperty("production_section");
    expect(ProductionOutput.associations).toHaveProperty("project");
    expect(ProductionOutput.associations).toHaveProperty("task");
    expect(ProductionOutput.associations).toHaveProperty("operationType");
  });

  it("supports Beryll include aliases", () => {
    expect(BeryllServer.associations).toHaveProperty("batch");
    expect(BeryllServer.associations).toHaveProperty("assignedTo");
    expect(BeryllServer.associations).toHaveProperty("history");
    expect(BeryllDefectRecord.associations).toHaveProperty("defectComponent");
    expect(BeryllDefectRecord.associations).toHaveProperty("replacementComponent");
    expect(BeryllDefectRecord.associations).toHaveProperty("defectInventoryItem");
    expect(BeryllDefectRecord.associations).toHaveProperty("replacementInventoryItem");
  });

  it("supports warehouse/audit include aliases", () => {
    expect(WarehouseMovement.associations).toHaveProperty("fromTeam");
    expect(WarehouseMovement.associations).toHaveProperty("toTeam");
    expect(WarehouseDocument.associations).toHaveProperty("createdBy");
    expect(AuditLog.associations).toHaveProperty("User");
  });
});
