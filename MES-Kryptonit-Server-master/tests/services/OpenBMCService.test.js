/**
 * @fileoverview Unit tests for OpenBMCService.
 */

const axios = require("axios");

jest.mock("axios", () => ({
  create: jest.fn(),
}));

jest.mock("../../services/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const OpenBMCService = require("../../controllers/beryll/services/OpenBMCService");

describe("OpenBMCService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("createClient configures axios client", () => {
    axios.create.mockReturnValue({});

    OpenBMCService.createClient("bmc.local", {
      username: "user",
      password: "pass",
      timeout: 5000,
      protocol: "http",
    });

    expect(axios.create).toHaveBeenCalledWith(
      expect.objectContaining({
        baseURL: "http://bmc.local",
        timeout: 5000,
        auth: { username: "user", password: "pass" },
      })
    );
  });

  test("requestWithRetry retries until success", async () => {
    const client = {
      get: jest
        .fn()
        .mockRejectedValueOnce({ response: { status: 500 } })
        .mockResolvedValueOnce({ data: { ok: true } }),
    };

    const sleepSpy = jest
      .spyOn(OpenBMCService, "sleep")
      .mockResolvedValue();

    const result = await OpenBMCService.requestWithRetry(client, "/path", {
      retries: 1,
      retryDelay: 1,
    });

    expect(result).toEqual({ data: { ok: true } });
    expect(client.get).toHaveBeenCalledTimes(2);
    expect(sleepSpy).toHaveBeenCalledWith(1);
  });

  test("checkConnection returns timeout message", async () => {
    const client = {
      get: jest.fn().mockRejectedValue({ code: "ECONNABORTED" }),
    };
    axios.create.mockReturnValue(client);

    const result = await OpenBMCService.checkConnection("bmc.local");

    expect(result).toEqual({
      success: false,
      error: "Таймаут подключения к BMC",
    });
  });
});
