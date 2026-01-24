const syncUserMiddleware = require('../../middleware/syncUserMiddleware');
const { User, Role } = require('../../models/index');

// Мокаем модели
jest.mock('../../models/index', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
        update: jest.fn()
    },
    Role: {
        findOne: jest.fn()
    },
    Ability: {}
}));

describe('syncUserMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
        req = {
            auth: {
                payload: {
                    sub: 'keycloak-uuid-123',
                    preferred_username: 'testuser',
                    given_name: 'Ivan',
                    family_name: 'Ivanov',
                    realm_access: { roles: ['WAREHOUSE_MASTER'] }
                }
            }
        };
        res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
        next = jest.fn();
        jest.clearAllMocks();
    });

    test('Должен создать нового пользователя, если его нет', async () => {
        // 1. User.findOne вернет null (пользователя нет)
        User.findOne.mockResolvedValue(null);
        
        // 2. User.create вернет созданного юзера
        const createdUser = { 
            id: 10, 
            login: 'testuser', 
            role: 'WAREHOUSE_MASTER',
            save: jest.fn() // На всякий случай добавим save
        };
        User.create.mockResolvedValue(createdUser);

        // 3. Role.findOne вернет права
        Role.findOne.mockResolvedValue({ abilities: [{ code: 'warehouse.view' }] });

        await syncUserMiddleware(req, res, next);

        // Проверки
        expect(User.create).toHaveBeenCalledWith(expect.objectContaining({
            login: 'testuser',
            role: 'WAREHOUSE_MASTER'
        }));
        expect(req.user).toBeDefined();
        expect(req.user.id).toBe(10);
        expect(req.user.abilities).toContain('warehouse.view');
        expect(next).toHaveBeenCalled();
    });

    test('Должен обновить роль существующего пользователя', async () => {
        // Мокаем пользователя с методом save
        const mockSave = jest.fn();
        const existingUser = { 
            id: 20, 
            login: 'testuser', 
            role: 'ASSEMBLER',
            save: mockSave 
        };
        
        // Важно: findOne должен возвращать именно этот объект, чтобы мы могли проверить его изменение по ссылке
        User.findOne.mockResolvedValue(existingUser);
        Role.findOne.mockResolvedValue({ abilities: [] });

        await syncUserMiddleware(req, res, next);

        // Проверяем, что роль обновилась в объекте
        expect(existingUser.role).toBe('WAREHOUSE_MASTER');
        // Проверяем, что был вызван метод save
        expect(mockSave).toHaveBeenCalled();
        expect(next).toHaveBeenCalled();
    });

    test('Должен вернуть 500 при ошибке БД', async () => {
        User.findOne.mockRejectedValue(new Error('DB Connection failed'));

        await syncUserMiddleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(500);
        expect(next).not.toHaveBeenCalled();
    });
});