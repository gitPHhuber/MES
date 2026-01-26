const ApiError = require('../../error/ApiError');
const BoxController = require('../../controllers/warehouse/BoxController');
const {
  WarehouseBox,
  WarehouseMovement,
  WarehouseDocument,
  PrintHistory,
} = require('../../models/index');
const { logAudit } = require('../../utils/auditLogger');
const PdfService = require('../../services/PdfService');
const ReservationService = require('../../services/warehouse/ReservationService');

jest.mock('../../models/index', () => ({
  WarehouseBox: {
    create: jest.fn(),
    bulkCreate: jest.fn(),
    findAndCountAll: jest.fn(),
    findByPk: jest.fn(),
    findOne: jest.fn(),
    findAll: jest.fn(),
    update: jest.fn(),
  },
  WarehouseMovement: {
    findAll: jest.fn(),
  },
  WarehouseDocument: {
    findAll: jest.fn(),
  },
  Supply: {},
  Section: {},
  Team: {},
  User: {},
  PrintHistory: {
    create: jest.fn(),
  },
}));

jest.mock('../../utils/auditLogger', () => ({
  logAudit: jest.fn(),
}));

jest.mock('../../services/PdfService', () => ({
  generateLabels: jest.fn(),
  generateVideoTransmitterLabelBatch: jest.fn(),
  generateCustomLabelBatch: jest.fn(),
  generateSimpleZebraBatch: jest.fn(),
}));

jest.mock('../../services/warehouse/ReservationService', () => ({
  reserve: jest.fn(),
  release: jest.fn(),
  confirm: jest.fn(),
}));

jest.mock('../../services/logger', () => ({
  error: jest.fn(),
}));

const makeRes = () => ({
  json: jest.fn(),
  send: jest.fn(),
  set: jest.fn(),
  header: jest.fn(),
  attachment: jest.fn(),
});

const expectStatus = (next, status) => {
  const error = next.mock.calls[0][0];
  expect(error.status).toBe(status);
};

describe('BoxController', () => {
  let req;
  let res;
  let next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {},
      user: { id: 7 },
    };
    res = makeRes();
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('createSingleBox', () => {
    test('успешно создает коробку', async () => {
      req.body = { itemName: 'Item', quantity: 2, unit: 'шт' };
      WarehouseBox.create.mockResolvedValue({ id: 1 });
      logAudit.mockResolvedValue();

      await BoxController.createSingleBox(req, res, next);

      expect(WarehouseBox.create).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    test('возвращает 400 при отсутствии itemName', async () => {
      await BoxController.createSingleBox(req, res, next);

      expect(next).toHaveBeenCalled();
      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { itemName: 'Item' };
      WarehouseBox.create.mockRejectedValue(ApiError.notFound('not found'));

      await BoxController.createSingleBox(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { itemName: 'Item' };
      WarehouseBox.create.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.createSingleBox(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { itemName: 'Item' };
      WarehouseBox.create.mockRejectedValue(new Error('boom'));

      await BoxController.createSingleBox(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('createBoxesBatch', () => {
    test('успешно создает партию', async () => {
      req.body = { label: 'Test', quantity: 2, itemsPerBox: 1 };
      WarehouseBox.bulkCreate.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      await BoxController.createBoxesBatch(req, res, next);

      expect(WarehouseBox.bulkCreate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ boxes: [{ id: 1 }, { id: 2 }] });
    });

    test('возвращает 400 при отсутствии label', async () => {
      await BoxController.createBoxesBatch(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { label: 'Test', quantity: 1 };
      WarehouseBox.bulkCreate.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.createBoxesBatch(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { label: 'Test', quantity: 1 };
      WarehouseBox.bulkCreate.mockRejectedValue(ApiError.forbidden('nope'));

      await BoxController.createBoxesBatch(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { label: 'Test', quantity: 1 };
      WarehouseBox.bulkCreate.mockRejectedValue(new Error('boom'));

      await BoxController.createBoxesBatch(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getBoxes', () => {
    test('успешно возвращает список', async () => {
      WarehouseBox.findAndCountAll.mockResolvedValue({ rows: [], count: 0 });

      await BoxController.getBoxes(req, res, next);

      expect(res.json).toHaveBeenCalledWith({ rows: [], count: 0, page: 1, limit: 50 });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseBox.findAndCountAll.mockRejectedValue(ApiError.badRequest('bad'));

      await BoxController.getBoxes(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseBox.findAndCountAll.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.getBoxes(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseBox.findAndCountAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.getBoxes(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseBox.findAndCountAll.mockRejectedValue(new Error('boom'));

      await BoxController.getBoxes(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getBoxById', () => {
    test('успешно возвращает коробку', async () => {
      WarehouseBox.findByPk.mockResolvedValue({ id: 1 });
      WarehouseMovement.findAll.mockResolvedValue([]);
      WarehouseDocument.findAll.mockResolvedValue([]);

      await BoxController.getBoxById({ ...req, params: { id: 1 } }, res, next);

      expect(res.json).toHaveBeenCalledWith({ box: { id: 1 }, movements: [], documents: [] });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseBox.findByPk.mockRejectedValue(ApiError.badRequest('bad'));

      await BoxController.getBoxById({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseBox.findByPk.mockResolvedValue(null);

      await BoxController.getBoxById({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseBox.findByPk.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.getBoxById({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseBox.findByPk.mockRejectedValue(new Error('boom'));

      await BoxController.getBoxById({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 500);
    });
  });

  describe('getBoxByQr', () => {
    test('успешно возвращает коробку', async () => {
      WarehouseBox.findOne.mockResolvedValue({ id: 2, qrCode: 'QR' });
      WarehouseMovement.findAll.mockResolvedValue([]);
      WarehouseDocument.findAll.mockResolvedValue([]);

      await BoxController.getBoxByQr({ ...req, params: { qr: 'QR' } }, res, next);

      expect(res.json).toHaveBeenCalledWith({
        box: { id: 2, qrCode: 'QR' },
        movements: [],
        documents: [],
      });
    });

    test('возвращает 400 при плохих данных', async () => {
      WarehouseBox.findOne.mockRejectedValue(ApiError.badRequest('bad'));

      await BoxController.getBoxByQr({ ...req, params: { qr: 'QR' } }, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      WarehouseBox.findOne.mockResolvedValue(null);

      await BoxController.getBoxByQr({ ...req, params: { qr: 'QR' } }, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      WarehouseBox.findOne.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.getBoxByQr({ ...req, params: { qr: 'QR' } }, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      WarehouseBox.findOne.mockRejectedValue(new Error('boom'));

      await BoxController.getBoxByQr({ ...req, params: { qr: 'QR' } }, res, next);

      expectStatus(next, 500);
    });
  });

  describe('exportCsv', () => {
    test('успешно экспортирует CSV', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockResolvedValue([
        { id: 1, label: 'A', quantity: 1, unit: 'шт', qrCode: 'QR', currentSection: { title: 'S' } },
      ]);

      await BoxController.exportCsv(req, res, next);

      expect(res.header).toHaveBeenCalled();
      expect(res.attachment).toHaveBeenCalledWith('labels.csv');
      expect(res.send).toHaveBeenCalled();
    });

    test('возвращает 400 при отсутствии ids', async () => {
      await BoxController.exportCsv(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.exportCsv(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.exportCsv(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockRejectedValue(new Error('boom'));

      await BoxController.exportCsv(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('printLabelsPdf', () => {
    test('успешно печатает PDF', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockResolvedValue([{ id: 1 }]);
      PdfService.generateLabels.mockResolvedValue(Buffer.from('pdf'));

      await BoxController.printLabelsPdf(req, res, next);

      expect(res.set).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    test('возвращает 400 при отсутствии ids', async () => {
      await BoxController.printLabelsPdf(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.printLabelsPdf(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.printLabelsPdf(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { ids: [1] };
      WarehouseBox.findAll.mockResolvedValue([{ id: 1 }]);
      PdfService.generateLabels.mockRejectedValue(new Error('boom'));

      await BoxController.printLabelsPdf(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('updateBatch', () => {
    test('успешно обновляет коробки', async () => {
      req.body = { ids: [1], updates: { label: 'New' } };
      WarehouseBox.update.mockResolvedValue([1]);

      await BoxController.updateBatch(req, res, next);

      expect(WarehouseBox.update).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({ message: 'Успешно обновлено' });
    });

    test('возвращает 400 при отсутствии ids', async () => {
      req.body = { updates: { label: 'New' } };

      await BoxController.updateBatch(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { ids: [1], updates: { label: 'New' } };
      WarehouseBox.update.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.updateBatch(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { ids: [1], updates: { label: 'New' } };
      WarehouseBox.update.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.updateBatch(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { ids: [1], updates: { label: 'New' } };
      WarehouseBox.update.mockRejectedValue(new Error('boom'));

      await BoxController.updateBatch(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('printSpecialLabel', () => {
    test('успешно печатает спец-этикетку', async () => {
      req.body = { template: 'VIDEO_KIT', productName: 'Kit', quantity: 1, unit: 'шт' };
      PdfService.generateVideoTransmitterLabelBatch.mockResolvedValue(Buffer.from('pdf'));
      PrintHistory.create.mockResolvedValue({ id: 1 });

      await BoxController.printSpecialLabel(req, res, next);

      expect(PdfService.generateVideoTransmitterLabelBatch).toHaveBeenCalled();
      expect(PrintHistory.create).toHaveBeenCalled();
      expect(res.send).toHaveBeenCalled();
    });

    test('возвращает 400 при плохих данных', async () => {
      req.body = { template: 'VIDEO_KIT', productName: 'Kit' };
      PdfService.generateVideoTransmitterLabelBatch.mockRejectedValue(ApiError.badRequest('bad'));

      await BoxController.printSpecialLabel(req, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      req.body = { template: 'VIDEO_KIT', productName: 'Kit' };
      PdfService.generateVideoTransmitterLabelBatch.mockRejectedValue(ApiError.notFound('missing'));

      await BoxController.printSpecialLabel(req, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      req.body = { template: 'VIDEO_KIT', productName: 'Kit' };
      PdfService.generateVideoTransmitterLabelBatch.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.printSpecialLabel(req, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      req.body = { template: 'VIDEO_KIT', productName: 'Kit' };
      PdfService.generateVideoTransmitterLabelBatch.mockRejectedValue(new Error('boom'));

      await BoxController.printSpecialLabel(req, res, next);

      expectStatus(next, 500);
    });
  });

  describe('reserveBox', () => {
    test('успешно резервирует коробку', async () => {
      ReservationService.reserve.mockResolvedValue({ id: 1 });

      await BoxController.reserveBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    test('возвращает 400 при плохих данных', async () => {
      ReservationService.reserve.mockRejectedValue(new Error('bad'));

      await BoxController.reserveBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      ReservationService.reserve.mockRejectedValue(new Error('Коробка не найдена'));

      await BoxController.reserveBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      ReservationService.reserve.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.reserveBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      ReservationService.reserve.mockRejectedValue(ApiError.internal('boom'));

      await BoxController.reserveBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 500);
    });
  });

  describe('releaseBox', () => {
    test('успешно снимает резерв', async () => {
      ReservationService.release.mockResolvedValue({ id: 1 });

      await BoxController.releaseBox({ ...req, params: { id: 1 } }, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    test('возвращает 400 при плохих данных', async () => {
      ReservationService.release.mockRejectedValue(new Error('bad'));

      await BoxController.releaseBox({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      ReservationService.release.mockRejectedValue(new Error('Коробка не найдена'));

      await BoxController.releaseBox({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      ReservationService.release.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.releaseBox({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      ReservationService.release.mockRejectedValue(ApiError.internal('boom'));

      await BoxController.releaseBox({ ...req, params: { id: 1 } }, res, next);

      expectStatus(next, 500);
    });
  });

  describe('confirmBox', () => {
    test('успешно подтверждает резерв', async () => {
      ReservationService.confirm.mockResolvedValue({ id: 1 });

      await BoxController.confirmBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expect(res.json).toHaveBeenCalledWith({ id: 1 });
    });

    test('возвращает 400 при плохих данных', async () => {
      ReservationService.confirm.mockRejectedValue(new Error('bad'));

      await BoxController.confirmBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 400);
    });

    test('возвращает 404 при отсутствии сущности', async () => {
      ReservationService.confirm.mockRejectedValue(new Error('Коробка не найдена'));

      await BoxController.confirmBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 404);
    });

    test('возвращает 403 при отсутствии доступа', async () => {
      ReservationService.confirm.mockRejectedValue(ApiError.forbidden('forbidden'));

      await BoxController.confirmBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 403);
    });

    test('возвращает 500 при необработанной ошибке', async () => {
      ReservationService.confirm.mockRejectedValue(ApiError.internal('boom'));

      await BoxController.confirmBox({ ...req, params: { id: 1 }, body: { qty: 1 } }, res, next);

      expectStatus(next, 500);
    });
  });
});
