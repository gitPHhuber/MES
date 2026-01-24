import { describe, it, expect } from 'vitest';
import { calculateBatch } from '../utils';

describe('Warehouse Utils - Batch Calculator', () => {
    
    it('должен правильно считать полные коробки (ровное деление)', () => {
        // 1000 шт по 100 в коробке = 10 коробок
        const res = calculateBatch(1000, 100);
        
        expect(res.fullUnits).toBe(10); // 10 полных
        expect(res.remainder).toBe(0);  // Остатка нет
        expect(res.totalUnits).toBe(10); // Всего 10 этикеток
    });

    it('должен правильно считать остаток (неровное деление)', () => {
        // 1050 шт по 100 в коробке = 10 полных + 1 неполная (50 шт)
        const res = calculateBatch(1050, 100);
        
        expect(res.fullUnits).toBe(10);
        expect(res.remainder).toBe(50);
        expect(res.totalUnits).toBe(11); // 10 + 1
    });

    it('должен возвращать нули при нулевом общем количестве', () => {
        const res = calculateBatch(0, 100);
        
        expect(res.totalUnits).toBe(0);
        expect(res.fullUnits).toBe(0);
        expect(res.remainder).toBe(0);
    });

    it('должен обрабатывать случай, когда общее количество меньше вместимости', () => {
        // 50 шт при вместимости 100 = 0 полных + 1 с остатком
        const res = calculateBatch(50, 100);
        
        expect(res.fullUnits).toBe(0);
        expect(res.remainder).toBe(50);
        expect(res.totalUnits).toBe(1);
    });

    it('должен защищать от деления на ноль (capacity = 0)', () => {
        // Если вместимость 0 или не указана, считаем как 1
        const res = calculateBatch(100, 0);
        
        expect(res.fullUnits).toBe(100);
        expect(res.totalUnits).toBe(100);
    });

    it('должен корректно обрабатывать отрицательные числа (считать как 0)', () => {
        const res = calculateBatch(-500, 100);
        
        expect(res.totalUnits).toBe(0);
    });
});