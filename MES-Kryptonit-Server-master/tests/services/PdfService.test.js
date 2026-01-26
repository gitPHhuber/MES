/**
 * @fileoverview Unit tests for PdfService.
 */

const mockPdfDoc = {
  on: jest.fn(),
  end: jest.fn(),
};

const createPdfKitDocument = jest.fn(() => mockPdfDoc);
const PdfPrinter = jest.fn().mockImplementation(() => ({
  createPdfKitDocument,
}));

jest.mock("pdfmake", () => PdfPrinter);

jest.mock("fs", () => ({
  existsSync: jest.fn(() => false),
}));

jest.mock("../../services/logger", () => ({
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const PdfService = require("../../services/PdfService");

describe("PdfService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("generateLabels returns a buffer from pdfmake", async () => {
    const handlers = {};
    mockPdfDoc.on.mockImplementation((event, callback) => {
      handlers[event] = callback;
    });
    mockPdfDoc.end.mockImplementation(() => {
      handlers.data(Buffer.from("chunk"));
      handlers.end();
    });

    const result = await PdfService.generateLabels([]);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("chunk");
    expect(createPdfKitDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.any(Array),
      })
    );
  });

  test("generateSimpleZebraBatch builds a document per label", async () => {
    const handlers = {};
    mockPdfDoc.on.mockImplementation((event, callback) => {
      handlers[event] = callback;
    });
    mockPdfDoc.end.mockImplementation(() => {
      handlers.data(Buffer.from("batch"));
      handlers.end();
    });

    const labels = [
      {
        productName: "Item A",
        bottomQr: "QR-A",
        code: "CODE-A",
        quantity: 2,
        unit: "pcs",
        date: "2024-01-01",
      },
      {
        productName: "Item B",
        bottomQr: "QR-B",
        code: "CODE-B",
        quantity: 1,
        unit: "pcs",
        date: "2024-01-02",
      },
    ];

    const result = await PdfService.generateSimpleZebraBatch(labels);

    expect(Buffer.isBuffer(result)).toBe(true);
    expect(result.toString()).toBe("batch");
    expect(createPdfKitDocument).toHaveBeenCalledWith(
      expect.objectContaining({
        content: expect.arrayContaining([
          expect.any(Array),
          { text: "", pageBreak: "after" },
          expect.any(Array),
        ]),
      })
    );
  });
});
