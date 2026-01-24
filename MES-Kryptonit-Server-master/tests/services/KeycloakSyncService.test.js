const axios = require("axios");
const { Role } = require("../../models/index");
const KeycloakSyncService = require("../../services/KeycloakSyncService");

jest.mock("axios");
jest.mock("../../models/index", () => ({
  Role: {
    findAll: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

describe("KeycloakSyncService", () => {
  beforeEach(() => {
    process.env.KEYCLOAK_URL = "http://keycloak.local";
    process.env.KEYCLOAK_REALM = "MES-Realm";
    process.env.KEYCLOAK_ADMIN_CLIENT_ID = "admin-cli";
    process.env.KEYCLOAK_ADMIN_CLIENT_SECRET = "secret";
    jest.clearAllMocks();
  });

  test("getMainRole returns highest priority role", async () => {
    Role.findAll.mockResolvedValue([
      { name: "SUPER_ADMIN", priority: 1 },
      { name: "WAREHOUSE_MASTER", priority: 30 },
      { name: "QC_ENGINEER", priority: 40 },
    ]);

    const mainRole = await KeycloakSyncService.getMainRole([
      "QC_ENGINEER",
      "WAREHOUSE_MASTER",
    ]);

    expect(mainRole).toBe("WAREHOUSE_MASTER");
  });

  test("getMainRole falls back to ASSEMBLER when no roles", async () => {
    Role.findAll.mockResolvedValue([]);

    const mainRole = await KeycloakSyncService.getMainRole(["UNKNOWN"]);

    expect(mainRole).toBe("ASSEMBLER");
  });

  test("syncRolesFromKeycloak creates roles and deactivates missing ones", async () => {
    axios.post.mockResolvedValue({ data: { access_token: "token" } });
    axios.get.mockResolvedValue({
      data: [
        { id: "role-1", name: "SUPER_ADMIN", description: "Admin" },
        { id: "role-2", name: "ASSEMBLER", description: "Assembler" },
      ],
    });

    Role.findOne.mockResolvedValue(null);
    Role.create.mockResolvedValue({});
    Role.update.mockResolvedValue([1]);

    const result = await KeycloakSyncService.syncRolesFromKeycloak();

    expect(Role.create).toHaveBeenCalledTimes(2);
    expect(Role.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ created: 2, updated: 0, deactivated: 1 });
  });
});
