const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const SupplyController = require('../../controllers/warehouse/SupplyController');
const { Supply } = require('../../models/index');

// Мокаем модель Supply и auditLogger, чтобы не писать в реальную БД
jest.mock('../../models/index');
jest.mock('../../utils/auditLogger', () => ({
    logAudit: jest.fn() 
}));

const app = express();
app.use(bodyParser.json());
// Эмулируем авторизованного пользователя
app.use((req, res, next) => {
    req.user = { id: 1, role: 'WAREHOUSE_MASTER' };
    next();
});
app.post('/api/warehouse/supplies', SupplyController.createSupply);

describe('SupplyController Integration', () => {
    test('POST /supplies - Должен создать поставку', async () => {
        const mockSupply = { id: 1, docNumber: 'TEST-123', status: 'NEW' };
        
        // Говорим Sequelize: "когда вызовут Supply.create, верни mockSupply"
        Supply.create.mockResolvedValue(mockSupply);

        const res = await request(app)
            .post('/api/warehouse/supplies')
            .send({
                docNumber: 'TEST-123',
                supplier: 'OOO Test',
                comment: 'Test supply'
            });

        expect(res.status).toBe(200);
        expect(res.body.docNumber).toBe('TEST-123');
        expect(Supply.create).toHaveBeenCalled();
    });
});