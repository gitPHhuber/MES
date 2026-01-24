const MovementController = require('../../controllers/warehouse/MovementController');
const { WarehouseBox, WarehouseMovement } = require('../../models/index');

// 1. Мокаем базу данных ДО импорта контроллера (чтобы не падал define)
jest.mock('../../db', () => {
    return {
        transaction: jest.fn(async () => ({
            commit: jest.fn(),
            rollback: jest.fn()
        })),
        define: jest.fn(() => ({
            belongsTo: jest.fn(),
            hasMany: jest.fn(),
            hasOne: jest.fn(),
            belongsToMany: jest.fn()
        })),
        fn: jest.fn(),
        col: jest.fn(),
        authenticate: jest.fn(),
        sync: jest.fn()
    };
});

// 2. Мокаем модели и аудит
jest.mock('../../models/index', () => ({
    WarehouseBox: {
        findByPk: jest.fn()
    },
    WarehouseMovement: {
        create: jest.fn()
    },
    WarehouseDocument: {
        create: jest.fn()
    },
    Section: {},
    Team: {},
    User: {},
    Supply: {}
}));

jest.mock('../../utils/auditLogger', () => ({
    logAudit: jest.fn()
}));

describe('MovementController - moveSingle', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            body: {
                boxId: 1,
                operation: 'MOVE',
                toSectionId: 5,
                deltaQty: 0
            },
            user: { id: 1 }
        };
        res = { 
            json: jest.fn(),
            status: jest.fn().mockReturnThis() 
        };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('Должен успешно переместить коробку на другой участок', async () => {
        // Создаем имитацию коробки с методом save
        const mockBox = {
            id: 1,
            currentSectionId: 1,
            quantity: 10,
            status: 'ON_STOCK',
            save: jest.fn().mockResolvedValue(true)
        };

        // Настраиваем мок findByPk: 
        // 1-й вызов в начале метода, 2-й в конце для возврата результата
        WarehouseBox.findByPk.mockResolvedValue(mockBox);
        
        WarehouseMovement.create.mockResolvedValue({ id: 100 });

        await MovementController.moveSingle(req, res, next);

        // Проверяем, что ID участка в объекте изменился
        expect(mockBox.currentSectionId).toBe(5);
        // Проверяем, что метод save был вызван
        expect(mockBox.save).toHaveBeenCalled();
        // Проверяем создание записи в истории
        expect(WarehouseMovement.create).toHaveBeenCalledWith(
            expect.objectContaining({
                boxId: 1,
                toSectionId: 5,
                operation: 'MOVE'
            }),
            expect.any(Object) // объект транзакции
        );
        expect(res.json).toHaveBeenCalled();
    });

    test('Должен выдать ошибку, если итоговое количество становится отрицательным', async () => {
        req.body.operation = 'CONSUME';
        req.body.deltaQty = -50; // Пытаемся забрать 50 при наличии 10

        const mockBox = {
            id: 1,
            quantity: 10,
            save: jest.fn()
        };
        WarehouseBox.findByPk.mockResolvedValue(mockBox);

        await MovementController.moveSingle(req, res, next);

        // Сохранение не должно быть вызвано
        expect(mockBox.save).not.toHaveBeenCalled();
        // Должна быть вызвана middleware ошибок
        expect(next).toHaveBeenCalled();
        
        const error = next.mock.calls[0][0];
        expect(error.message).toContain('отрицательным');
    });

    test('Должен вернуть 404, если коробка не найдена', async () => {
        WarehouseBox.findByPk.mockResolvedValue(null);

        await MovementController.moveSingle(req, res, next);

        expect(next).toHaveBeenCalled();
        const error = next.mock.calls[0][0];
        expect(error.status).toBe(404);
        expect(error.message).toBe('Коробка не найдена');
    });
});