const BoxController = require('../../controllers/warehouse/BoxController');
const { WarehouseBox } = require('../../models/index');
const { logAudit } = require('../../utils/auditLogger');

jest.mock('../../models/index');
jest.mock('../../utils/auditLogger');

describe('BoxController - createBoxesBatch', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                label: 'Test Item',
                quantity: 10,
                itemsPerBox: 5,
                unit: 'шт'
            },
            user: { id: 1 }
        };
        res = { json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('Должен создать партию коробок (Bulk Create)', async () => {
        WarehouseBox.bulkCreate.mockResolvedValue([
            { id: 1, label: 'Test Item' }, 
            { id: 2, label: 'Test Item' }
        ]);

        await BoxController.createBoxesBatch(req, res, next);

        expect(WarehouseBox.bulkCreate).toHaveBeenCalled();
        
        const callArgs = WarehouseBox.bulkCreate.mock.calls[0][0];
        expect(callArgs).toHaveLength(10);
        expect(callArgs[0]).toMatchObject({
            label: 'Test Item',
            quantity: 5,
            acceptedById: 1
        });

        expect(logAudit).toHaveBeenCalledWith(expect.objectContaining({
            action: 'WAREHOUSE_BATCH'
        }));

        expect(res.json).toHaveBeenCalled();
    });

    test('Должен вернуть ошибку, если количество > 1000', async () => {
        req.body.quantity = 1001;
        
        await BoxController.createBoxesBatch(req, res, next);

        expect(next).toHaveBeenCalled();
        
        // Получаем объект ошибки, переданный в next()
        const error = next.mock.calls[0][0];
        
        // Ожидаем статус 400 (Bad Request)
        expect(error.status).toBe(400); 
        expect(error.message).toContain('от 1 до 1000');
    });
});