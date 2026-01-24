/**
 * ProductionOutput.js - Учёт выработки v2
 * 
 * Интеграция с существующей системой:
 * - Project (проект)
 * - ProductionTask (задача)
 * - Team (бригада)
 * - Section (участок)
 * - OperationType (тип операции)
 */

const { DataTypes } = require("sequelize");
const sequelize = require("../db");

// Статусы записи
const OUTPUT_STATUSES = {
    PENDING: 'pending',      // Ожидает подтверждения
    APPROVED: 'approved',    // Подтверждено
    REJECTED: 'rejected',    // Отклонено
    ADJUSTED: 'adjusted'     // Скорректировано (было другое кол-во)
};

// =====================================
// СПРАВОЧНИК ТИПОВ ОПЕРАЦИЙ
// =====================================
const OperationType = sequelize.define("operation_type", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    name: { 
        type: DataTypes.STRING(100), 
        allowNull: false
    },
    
    code: { 
        type: DataTypes.STRING(50), 
        allowNull: true
    },
    
    description: { 
        type: DataTypes.TEXT, 
        allowNull: true
    },
    
    unit: {
        type: DataTypes.STRING(20),
        allowNull: false,
        defaultValue: 'шт'
    },
    
    // Норматив времени на единицу (опционально)
    normMinutes: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    
    // Привязка к участку (опционально)
    sectionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    isActive: { 
        type: DataTypes.BOOLEAN, 
        defaultValue: true
    },
    
    sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    tableName: "operation_types",
    timestamps: true,
    indexes: [
        { unique: true, fields: ["code"], where: { code: { [require("sequelize").Op.ne]: null } } }
    ]
});

// =====================================
// ЗАПИСИ ВЫРАБОТКИ
// =====================================
const ProductionOutput = sequelize.define("production_output", {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    
    // === КОГДА ===
    date: { 
        type: DataTypes.DATEONLY, 
        allowNull: false
    },
    
    // === КТО ===
    userId: { 
        type: DataTypes.INTEGER, 
        allowNull: false
    },
    
    // === ГДЕ (структура) ===
    teamId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    sectionId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    // === ЧТО (контекст работы) ===
    projectId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    taskId: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    operationTypeId: { 
        type: DataTypes.INTEGER, 
        allowNull: true
    },
    
    // === СКОЛЬКО ===
    claimedQty: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        defaultValue: 0
    },
    
    approvedQty: { 
        type: DataTypes.INTEGER, 
        allowNull: false, 
        defaultValue: 0
    },
    
    rejectedQty: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    
    // === СТАТУС ===
    status: { 
        type: DataTypes.STRING(20), 
        allowNull: false, 
        defaultValue: OUTPUT_STATUSES.PENDING
    },
    
    // === КТО ПОДТВЕРДИЛ ===
    approvedById: { 
        type: DataTypes.INTEGER, 
        allowNull: true
    },
    
    approvedAt: { 
        type: DataTypes.DATE, 
        allowNull: true
    },
    
    // === КТО ВНЁС ===
    createdById: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    
    // === ДОПОЛНИТЕЛЬНО ===
    comment: { 
        type: DataTypes.TEXT, 
        allowNull: true
    },
    
    rejectReason: {
        type: DataTypes.TEXT,
        allowNull: true
    }
    
}, {
    tableName: "production_outputs",
    timestamps: true,
    indexes: [
        { fields: ["userId", "date"] },
        { fields: ["date"] },
        { fields: ["status"] },
        { fields: ["projectId"] },
        { fields: ["taskId"] },
        { fields: ["teamId"] },
        { fields: ["sectionId"] },
        { fields: ["operationTypeId"] }
    ]
});

module.exports = { 
    ProductionOutput, 
    OperationType, 
    OUTPUT_STATUSES 
};