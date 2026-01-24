const checkAbility = require('../../middleware/checkAbilityMiddleware');
const ApiError = require('../../error/ApiError');

describe('checkAbilityMiddleware', () => {
    let mockReq, mockRes, mockNext;

    beforeEach(() => {
        mockReq = { method: 'GET', user: {} };
        mockRes = {};
        mockNext = jest.fn(); // Мок функции next()
    });

    test('Должен пропустить SUPER_ADMIN без проверки прав', () => {
        mockReq.user = { role: 'SUPER_ADMIN', abilities: [] };
        const middleware = checkAbility('warehouse.view');
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith(); // Вызван без аргументов (без ошибки)
    });

    test('Должен пропустить пользователя с нужным правом', () => {
        mockReq.user = { role: 'USER', abilities: ['warehouse.view', 'other.ability'] };
        const middleware = checkAbility('warehouse.view');
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledWith();
    });

    test('Должен вернуть ошибку 403 (Forbidden), если права нет', () => {
        mockReq.user = { role: 'USER', abilities: ['other.ability'] };
        const middleware = checkAbility('warehouse.view');
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledTimes(1);
        const errorArg = mockNext.mock.calls[0][0];
        expect(errorArg).toBeInstanceOf(ApiError);
        expect(errorArg.status).toBe(403);
    });

    test('Должен вернуть ошибку 401, если пользователя нет (не залогинен)', () => {
        mockReq.user = null;
        const middleware = checkAbility('any.right');
        
        middleware(mockReq, mockRes, mockNext);
        
        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext.mock.calls[0][0].status).toBe(401); // Unauthorized
    });
});