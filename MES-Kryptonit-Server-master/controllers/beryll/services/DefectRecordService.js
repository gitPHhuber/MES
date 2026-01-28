/**
 * DefectRecordService.js - Полный сервис управления записями о браке
 * 
 * ИСПРАВЛЕНО:
 * - findServerComponent: type → componentType
 * - performComponentReplacement: type → componentType, добавлено name
 * - ДОБАВЛЕНЫ методы для работы с файлами: getFiles, getFileById, addFile, deleteFile
 * - ДОБАВЛЕНО логирование аудита во все ключевые методы
 * 
 * Положить в: controllers/beryll/services/DefectRecordService.js
 */

const { Op } = require("sequelize");
const sequelize = require("../../../db");
const {
    BeryllDefectRecord,
    BeryllDefectRecordFile,
    BeryllServer,
    BeryllServerComponent,
    ComponentInventory,
    ComponentHistory,
    YadroTicket,
    SubstituteServerPool,
    SlaConfig,
    User,
    DEFECT_RECORD_STATUSES,
    REPAIR_PART_TYPES,
    INVENTORY_STATUSES,
    HISTORY_ACTIONS,
    TICKET_TYPES,
    TICKET_STATUSES
} = require("../../../models/index");

// ============ АУДИТ ============
const { logAudit, AUDIT_ACTIONS, AUDIT_ENTITIES } = require("../../../utils/auditLogger");

const fs = require("fs");
const path = require("path");

const UPLOADS_DIR = path.join(__dirname, "../../../../uploads/beryll/defect-records");

// Создаём директорию если не существует
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

class DefectRecordService {
    
    // =========================================
    // СОЗДАНИЕ ЗАПИСИ О БРАКЕ
    // =========================================
    
    /**
     * Создать запись о браке с полной бизнес-логикой
     */
    async create(data, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const {
                serverId,
                yadroTicketNumber,
                hasSPISI,
                clusterCode,
                problemDescription,
                repairPartType,
                defectPartSerialYadro,
                defectPartSerialManuf,
                notes,
                priority = "MEDIUM"
            } = data;
            
            // 1. Проверяем сервер
            const server = await BeryllServer.findByPk(serverId);
            if (!server) {
                throw new Error(`Сервер с ID ${serverId} не найден`);
            }
            
            // 2. Проверяем повторный брак (за последние 30 дней)
            const previousDefect = await this.checkRepeatedDefect(serverId, repairPartType);
            
            // 3. Находим компонент сервера (если указан серийный номер)
            let defectComponentId = null;
            let defectInventoryId = null;
            
            if (defectPartSerialYadro || defectPartSerialManuf) {
                const component = await this.findServerComponent(
                    serverId, 
                    repairPartType, 
                    defectPartSerialYadro, 
                    defectPartSerialManuf
                );
                if (component) {
                    defectComponentId = component.id;
                    defectInventoryId = component.inventoryId;
                }
            }
            
            // 4. Рассчитываем SLA дедлайн
            let slaDeadline = null;
            try {
                slaDeadline = await SlaConfig.calculateDeadline(repairPartType, priority);
            } catch (e) {
                console.warn("SlaConfig.calculateDeadline не доступен:", e.message);
            }
            
            // 5. Создаём запись
            const defectRecord = await BeryllDefectRecord.create({
                serverId,
                yadroTicketNumber,
                hasSPISI: hasSPISI || false,
                clusterCode,
                problemDescription,
                detectedAt: new Date(),
                detectedById: userId,
                repairPartType,
                defectPartSerialYadro,
                defectPartSerialManuf,
                defectComponentId,
                defectInventoryId,
                status: DEFECT_RECORD_STATUSES.NEW,
                isRepeatedDefect: !!previousDefect,
                previousDefectId: previousDefect?.id || null,
                repeatedDefectReason: previousDefect ? `Повторный брак после записи #${previousDefect.id}` : null,
                repeatedDefectDate: previousDefect ? new Date() : null,
                slaDeadline,
                notes,
                metadata: { priority }
            }, { transaction });
            
            // 6. Обновляем статус сервера
            await server.update({ 
                status: "DEFECT",
                metadata: {
                    ...server.metadata,
                    lastDefectId: defectRecord.id,
                    defectAt: new Date().toISOString()
                }
            }, { transaction });
            
            // 7. Обновляем статус компонента (если найден)
            if (defectInventoryId) {
                await ComponentInventory.update(
                    { status: INVENTORY_STATUSES.DEFECTIVE },
                    { where: { id: defectInventoryId }, transaction }
                );
                
                // Логируем в историю
                await ComponentHistory.create({
                    inventoryComponentId: defectInventoryId,
                    action: HISTORY_ACTIONS.REMOVED,
                    fromServerId: serverId,
                    relatedDefectId: defectRecord.id,
                    performedById: userId,
                    notes: `Выявлен дефект: ${problemDescription}`
                }, { transaction });
            }
            
            // 8. Логируем в историю Beryll
            await this.logHistory(defectRecord.id, "CREATED", userId, 
                `Создана запись о браке. Тип: ${repairPartType || "Не указан"}`, 
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Создание дефекта ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.DEFECT_CREATE,
                    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                    entityId: defectRecord.id,
                    description: `Создана запись о браке #${defectRecord.id} для сервера ${server.apkSerialNumber || server.hostname || 'N/A'}`,
                    metadata: {
                        serverId,
                        serverSerial: server.apkSerialNumber,
                        hostname: server.hostname,
                        problemDescription: problemDescription?.substring(0, 100),
                        repairPartType,
                        defectPartSerialYadro,
                        defectPartSerialManuf,
                        isRepeatedDefect: !!previousDefect,
                        priority
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования создания дефекта:", auditErr.message);
            }
            
            return this.getById(defectRecord.id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // WORKFLOW: ДИАГНОСТИКА
    // =========================================
    
    /**
     * Начать диагностику
     */
    async startDiagnosis(id, diagnosticianId) {
        const defect = await BeryllDefectRecord.findByPk(id, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        if (!defect) throw new Error("Запись не найдена");
        
        if (defect.status !== DEFECT_RECORD_STATUSES.NEW) {
            throw new Error(`Невозможно начать диагностику из статуса ${defect.status}`);
        }
        
        await defect.update({
            status: DEFECT_RECORD_STATUSES.DIAGNOSING,
            diagnosticianId,
            diagnosisStartedAt: new Date()
        });
        
        await this.logHistory(id, "STATUS_CHANGED", diagnosticianId, 
            `Начата диагностика`
        );
        
        // ============ АУДИТ: Начало диагностики ============
        try {
            await logAudit({
                userId: diagnosticianId,
                action: AUDIT_ACTIONS.DEFECT_UPDATE,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: id,
                description: `Начата диагностика дефекта #${id}`,
                metadata: {
                    serverId: defect.serverId,
                    serverSerial: defect.server?.apkSerialNumber,
                    newStatus: DEFECT_RECORD_STATUSES.DIAGNOSING,
                    diagnosticianId
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования начала диагностики:", auditErr.message);
        }
        
        return this.getById(id);
    }
    
    /**
     * Завершить диагностику
     */
    async completeDiagnosis(id, userId, data) {
        const defect = await BeryllDefectRecord.findByPk(id, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        if (!defect) throw new Error("Запись не найдена");
        
        const {
            repairPartType,
            defectPartSerialYadro,
            defectPartSerialManuf,
            problemDescription,
            notes
        } = data;
        
        await defect.update({
            repairPartType: repairPartType || defect.repairPartType,
            defectPartSerialYadro: defectPartSerialYadro || defect.defectPartSerialYadro,
            defectPartSerialManuf: defectPartSerialManuf || defect.defectPartSerialManuf,
            problemDescription: problemDescription || defect.problemDescription,
            diagnosisCompletedAt: new Date(),
            notes: notes ? `${defect.notes || ""}\n\n[Диагностика]: ${notes}` : defect.notes
        });
        
        await this.logHistory(id, "DIAGNOSIS_COMPLETED", userId, 
            `Диагностика завершена. Определён тип: ${repairPartType || defect.repairPartType}`
        );
        
        // ============ АУДИТ: Завершение диагностики ============
        try {
            await logAudit({
                userId,
                action: AUDIT_ACTIONS.DEFECT_UPDATE,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: id,
                description: `Завершена диагностика дефекта #${id}. Тип: ${repairPartType || defect.repairPartType}`,
                metadata: {
                    serverId: defect.serverId,
                    serverSerial: defect.server?.apkSerialNumber,
                    repairPartType: repairPartType || defect.repairPartType,
                    defectPartSerialYadro,
                    defectPartSerialManuf
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования завершения диагностики:", auditErr.message);
        }
        
        return this.getById(id);
    }
    
    // =========================================
    // WORKFLOW: ОЖИДАНИЕ ЗАПЧАСТЕЙ
    // =========================================
    
    /**
     * Перевести в ожидание запчастей
     */
    async setWaitingParts(id, userId, notes = null) {
        const defect = await BeryllDefectRecord.findByPk(id, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        if (!defect) throw new Error("Запись не найдена");
        
        const oldStatus = defect.status;
        
        await defect.update({
            status: DEFECT_RECORD_STATUSES.WAITING_PARTS,
            notes: notes ? `${defect.notes || ""}\n\n[Ожидание запчастей]: ${notes}` : defect.notes
        });
        
        await this.logHistory(id, "STATUS_CHANGED", userId, 
            `Переведено в ожидание запчастей. ${notes || ""}`
        );
        
        // ============ АУДИТ: Ожидание запчастей ============
        try {
            await logAudit({
                userId,
                action: AUDIT_ACTIONS.DEFECT_UPDATE,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: id,
                description: `Дефект #${id} переведён в ожидание запчастей`,
                metadata: {
                    serverId: defect.serverId,
                    serverSerial: defect.server?.apkSerialNumber,
                    oldStatus,
                    newStatus: DEFECT_RECORD_STATUSES.WAITING_PARTS
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования:", auditErr.message);
        }
        
        return this.getById(id);
    }
    
    /**
     * Зарезервировать компонент из инвентаря
     */
    async reserveReplacementComponent(id, inventoryId, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            const component = await ComponentInventory.findByPk(inventoryId);
            if (!component) throw new Error("Компонент не найден в инвентаре");
            
            // Резервируем
            if (typeof component.reserve === 'function') {
                await component.reserve(id, userId);
            }
            
            await defect.update({
                replacementInventoryId: inventoryId
            }, { transaction });
            
            await this.logHistory(id, "COMPONENT_RESERVED", userId, 
                `Зарезервирован компонент ${component.serialNumber} для замены`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Резервирование компонента ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.COMPONENT_UPDATE,
                    entity: AUDIT_ENTITIES.COMPONENT_INVENTORY,
                    entityId: inventoryId,
                    description: `Компонент ${component.serialNumber} зарезервирован для дефекта #${id}`,
                    metadata: {
                        defectRecordId: id,
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        componentSerial: component.serialNumber
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // WORKFLOW: РЕМОНТ
    // =========================================
    
    /**
     * Начать ремонт
     */
    async startRepair(id, userId) {
        const defect = await BeryllDefectRecord.findByPk(id, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        if (!defect) throw new Error("Запись не найдена");
        
        const oldStatus = defect.status;
        
        await defect.update({
            status: DEFECT_RECORD_STATUSES.REPAIRING,
            repairStartedAt: new Date()
        });
        
        await this.logHistory(id, "STATUS_CHANGED", userId, `Начат ремонт`);
        
        // ============ АУДИТ: Начало ремонта ============
        try {
            await logAudit({
                userId,
                action: AUDIT_ACTIONS.DEFECT_UPDATE,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: id,
                description: `Начат ремонт по дефекту #${id}`,
                metadata: {
                    serverId: defect.serverId,
                    serverSerial: defect.server?.apkSerialNumber,
                    oldStatus,
                    newStatus: DEFECT_RECORD_STATUSES.REPAIRING
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования:", auditErr.message);
        }
        
        return this.getById(id);
    }
    
    /**
     * Выполнить замену компонента
     * ИСПРАВЛЕНО: type → componentType, добавлено name
     */
    async performComponentReplacement(id, userId, data) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            const {
                replacementPartSerialYadro,
                replacementPartSerialManuf,
                replacementInventoryId,
                repairDetails
            } = data;
            
            // 1. Если указан компонент из инвентаря - устанавливаем его
            if (replacementInventoryId) {
                const newComponent = await ComponentInventory.findByPk(replacementInventoryId);
                if (!newComponent) throw new Error("Компонент для замены не найден");
                
                // Устанавливаем в сервер
                if (typeof newComponent.installToServer === 'function') {
                    await newComponent.installToServer(defect.serverId, userId, id);
                }
                
                // Создаём запись в компонентах сервера
                // ИСПРАВЛЕНО: componentType вместо type, добавлено name
                const serverComponent = await BeryllServerComponent.create({
                    serverId: defect.serverId,
                    componentType: defect.repairPartType,  // ИСПРАВЛЕНО
                    name: newComponent.name || `${newComponent.manufacturer || ''} ${newComponent.model || defect.repairPartType}`.trim(),  // ДОБАВЛЕНО
                    serialNumber: newComponent.serialNumber,
                    serialNumberYadro: newComponent.serialNumberYadro,  // Требует миграции!
                    manufacturer: newComponent.manufacturer,
                    model: newComponent.model,
                    status: "OK",  // ИСПРАВЛЕНО: использовать значение из ENUM
                    installedById: userId,
                    inventoryId: newComponent.id,
                    metadata: { installedDuringDefect: id }
                }, { transaction });
                
                await defect.update({
                    replacementComponentId: serverComponent.id,
                    replacementInventoryId: newComponent.id,
                    replacementPartSerialYadro: newComponent.serialNumberYadro || replacementPartSerialYadro,
                    replacementPartSerialManuf: newComponent.serialNumber || replacementPartSerialManuf,
                    repairDetails
                }, { transaction });
            } else {
                // Просто обновляем серийные номера
                await defect.update({
                    replacementPartSerialYadro,
                    replacementPartSerialManuf,
                    repairDetails
                }, { transaction });
            }
            
            // 2. Обрабатываем дефектный компонент
            if (defect.defectInventoryId) {
                const defectComponent = await ComponentInventory.findByPk(defect.defectInventoryId);
                if (defectComponent) {
                    await defectComponent.update({
                        status: INVENTORY_STATUSES.DEFECTIVE,
                        currentServerId: null
                    }, { transaction });
                }
            }
            
            await this.logHistory(id, "COMPONENT_REPLACED", userId, 
                `Выполнена замена компонента. Новый S/N: ${replacementPartSerialYadro || replacementPartSerialManuf}`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Замена компонента ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.COMPONENT_REPLACE,
                    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                    entityId: id,
                    description: `Выполнена замена компонента по дефекту #${id}`,
                    metadata: {
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        repairPartType: defect.repairPartType,
                        oldSerial: defect.defectPartSerialYadro || defect.defectPartSerialManuf,
                        newSerial: replacementPartSerialYadro || replacementPartSerialManuf,
                        replacementInventoryId
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // WORKFLOW: ОТПРАВКА В ЯДРО
    // =========================================
    
    /**
     * Отправить на ремонт в Ядро
     */
    async sendToYadro(id, userId, data) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            const { ticketNumber, subject, description, trackingNumber } = data;
            
            // 1. Создаём заявку в Ядро
            let ticket = null;
            try {
                const generateTicketNumber = typeof YadroTicket.generateTicketNumber === 'function' 
                    ? await YadroTicket.generateTicketNumber() 
                    : `YADRO-${Date.now()}`;
                    
                ticket = await YadroTicket.create({
                    ticketNumber: ticketNumber || generateTicketNumber,
                    defectRecordId: id,
                    serverId: defect.serverId,
                    type: TICKET_TYPES?.COMPONENT_REPAIR || "COMPONENT_REPAIR",
                    status: TICKET_STATUSES?.SUBMITTED || "SUBMITTED",
                    subject: subject || `Ремонт ${defect.repairPartType} - сервер ${defect.server?.apkSerialNumber}`,
                    description: description || defect.problemDescription,
                    componentType: defect.repairPartType,
                    componentSerialYadro: defect.defectPartSerialYadro,
                    componentSerialManuf: defect.defectPartSerialManuf,
                    sentAt: new Date(),
                    trackingNumber,
                    createdById: userId
                }, { transaction });
            } catch (e) {
                console.warn("YadroTicket создание не удалось:", e.message);
            }
            
            // 2. Обновляем запись о дефекте
            await defect.update({
                status: DEFECT_RECORD_STATUSES.SENT_TO_YADRO,
                yadroTicketNumber: ticket?.ticketNumber || ticketNumber,
                sentToYadroRepair: true,
                sentToYadroAt: new Date()
            }, { transaction });
            
            // 3. Если есть дефектный компонент в инвентаре - отмечаем отправку
            if (defect.defectInventoryId) {
                const component = await ComponentInventory.findByPk(defect.defectInventoryId);
                if (component && typeof component.sendToYadro === 'function') {
                    await component.sendToYadro(ticket?.ticketNumber || ticketNumber, userId);
                }
            }
            
            await this.logHistory(id, "SENT_TO_YADRO", userId, 
                `Отправлено на ремонт в Ядро. Заявка: ${ticket?.ticketNumber || ticketNumber}`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Отправка в Ядро ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.YADRO_TICKET_CREATE,
                    entity: AUDIT_ENTITIES.YADRO_TICKET,
                    entityId: ticket?.id || id,
                    description: `Дефект #${id} отправлен в Ядро. Заявка: ${ticket?.ticketNumber || ticketNumber}`,
                    metadata: {
                        defectRecordId: id,
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        ticketNumber: ticket?.ticketNumber || ticketNumber,
                        repairPartType: defect.repairPartType,
                        componentSerial: defect.defectPartSerialYadro || defect.defectPartSerialManuf,
                        trackingNumber
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Отметить возврат из Ядро
     */
    async returnFromYadro(id, userId, data) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            const { resolution, replacementSerialYadro, replacementSerialManuf, condition } = data;
            
            await defect.update({
                status: DEFECT_RECORD_STATUSES.RETURNED,
                returnedFromYadro: true,
                returnedFromYadroAt: new Date(),
                resolution,
                replacementPartSerialYadro: replacementSerialYadro || defect.replacementPartSerialYadro,
                replacementPartSerialManuf: replacementSerialManuf || defect.replacementPartSerialManuf
            }, { transaction });
            
            // Обновляем заявку в Ядро
            if (defect.yadroTicketNumber) {
                await YadroTicket.update({
                    status: TICKET_STATUSES?.RECEIVED || "RECEIVED",
                    receivedAt: new Date(),
                    resolution,
                    replacementSerialYadro,
                    replacementSerialManuf
                }, { 
                    where: { ticketNumber: defect.yadroTicketNumber },
                    transaction 
                });
            }
            
            // Обновляем компонент в инвентаре
            if (defect.defectInventoryId) {
                const component = await ComponentInventory.findByPk(defect.defectInventoryId);
                if (component && typeof component.returnFromYadro === 'function') {
                    await component.returnFromYadro(userId, condition || "REFURBISHED");
                }
            }
            
            await this.logHistory(id, "RETURNED_FROM_YADRO", userId, 
                `Возвращено из Ядро. Резолюция: ${resolution || "Не указана"}`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Возврат из Ядро ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.YADRO_TICKET_RECEIVE,
                    entity: AUDIT_ENTITIES.YADRO_TICKET,
                    entityId: id,
                    description: `Получен возврат из Ядро по дефекту #${id}`,
                    metadata: {
                        defectRecordId: id,
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        ticketNumber: defect.yadroTicketNumber,
                        resolution,
                        replacementSerialYadro,
                        replacementSerialManuf,
                        condition
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // WORKFLOW: ПОДМЕННЫЕ СЕРВЕРЫ
    // =========================================
    
    /**
     * Выдать подменный сервер
     */
    async issueSubstituteServer(id, userId, substituteServerId = null) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            let substitute;
            
            if (substituteServerId) {
                substitute = await SubstituteServerPool.findOne({
                    where: { serverId: substituteServerId }
                });
            } else {
                // Берём любой доступный
                if (typeof SubstituteServerPool.findAvailableOne === 'function') {
                    substitute = await SubstituteServerPool.findAvailableOne();
                }
            }
            
            if (!substitute) {
                throw new Error("Нет доступных подменных серверов");
            }
            
            // Выдаём подменный сервер
            if (typeof substitute.issue === 'function') {
                await substitute.issue(id, userId);
            }
            
            // Обновляем запись о дефекте
            await defect.update({
                substituteServerId: substitute.serverId
            }, { transaction });
            
            // Получаем данные сервера для серийного номера
            const server = await BeryllServer.findByPk(substitute.serverId);
            
            await defect.update({
                substituteServerSerial: server?.apkSerialNumber
            }, { transaction });
            
            await this.logHistory(id, "SUBSTITUTE_ISSUED", userId, 
                `Выдан подменный сервер: ${server?.apkSerialNumber}`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Выдача подменного сервера ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.DEFECT_UPDATE,
                    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                    entityId: id,
                    description: `Выдан подменный сервер ${server?.apkSerialNumber} для дефекта #${id}`,
                    metadata: {
                        defectRecordId: id,
                        originalServerId: defect.serverId,
                        originalServerSerial: defect.server?.apkSerialNumber,
                        substituteServerId: substitute.serverId,
                        substituteServerSerial: server?.apkSerialNumber
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    /**
     * Вернуть подменный сервер
     */
    async returnSubstituteServer(id, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            if (!defect.substituteServerId) {
                throw new Error("Подменный сервер не был выдан");
            }
            
            const substituteServerId = defect.substituteServerId;
            const substituteServerSerial = defect.substituteServerSerial;
            
            const substitute = await SubstituteServerPool.findOne({
                where: { serverId: defect.substituteServerId }
            });
            
            if (substitute && typeof substitute.return === 'function') {
                await substitute.return();
            }
            
            await this.logHistory(id, "SUBSTITUTE_RETURNED", userId, 
                `Подменный сервер возвращён`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Возврат подменного сервера ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.DEFECT_UPDATE,
                    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                    entityId: id,
                    description: `Возвращён подменный сервер ${substituteServerSerial} по дефекту #${id}`,
                    metadata: {
                        defectRecordId: id,
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        substituteServerId,
                        substituteServerSerial
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // WORKFLOW: ЗАКРЫТИЕ
    // =========================================
    
    /**
     * Закрыть запись о браке
     */
    async resolve(id, userId, data) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id, {
                include: [{ model: BeryllServer, as: "server" }]
            });
            if (!defect) throw new Error("Запись не найдена");
            
            const { resolution, notes } = data;
            
            // Рассчитываем общее время простоя
            const totalDowntimeMinutes = defect.detectedAt 
                ? Math.round((new Date() - defect.detectedAt) / (1000 * 60))
                : null;
            
            await defect.update({
                status: DEFECT_RECORD_STATUSES.RESOLVED,
                resolvedAt: new Date(),
                resolvedById: userId,
                resolution,
                repairCompletedAt: new Date(),
                totalDowntimeMinutes,
                notes: notes ? `${defect.notes || ""}\n\n[Закрытие]: ${notes}` : defect.notes
            }, { transaction });
            
            // Возвращаем сервер в работу
            if (defect.server) {
                await defect.server.update({
                    status: "DONE",
                    metadata: {
                        ...defect.server.metadata,
                        lastDefectResolvedAt: new Date().toISOString()
                    }
                }, { transaction });
            }
            
            // Закрываем заявку в Ядро
            if (defect.yadroTicketNumber) {
                await YadroTicket.update({
                    status: TICKET_STATUSES?.CLOSED || "CLOSED",
                    closedAt: new Date()
                }, {
                    where: { ticketNumber: defect.yadroTicketNumber },
                    transaction
                });
            }
            
            // Возвращаем подменный сервер если был выдан
            if (defect.substituteServerId) {
                try {
                    await this.returnSubstituteServer(id, userId);
                } catch (e) {
                    console.warn("Ошибка возврата подменного сервера:", e.message);
                }
            }
            
            await this.logHistory(id, "RESOLVED", userId, 
                `Запись закрыта. Резолюция: ${resolution}. Время простоя: ${totalDowntimeMinutes} мин.`,
                transaction
            );
            
            await transaction.commit();
            
            // ============ АУДИТ: Закрытие дефекта ============
            try {
                await logAudit({
                    userId,
                    action: AUDIT_ACTIONS.DEFECT_RESOLVE,
                    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                    entityId: id,
                    description: `Дефект #${id} закрыт. Резолюция: ${resolution || 'Не указана'}`,
                    metadata: {
                        serverId: defect.serverId,
                        serverSerial: defect.server?.apkSerialNumber,
                        resolution,
                        totalDowntimeMinutes,
                        totalDowntimeHours: Math.round(totalDowntimeMinutes / 60),
                        repairPartType: defect.repairPartType,
                        hadYadroTicket: !!defect.yadroTicketNumber,
                        yadroTicketNumber: defect.yadroTicketNumber
                    }
                });
            } catch (auditErr) {
                console.error("[Audit] Ошибка логирования:", auditErr.message);
            }
            
            return this.getById(id);
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    // =========================================
    // ВСПОМОГАТЕЛЬНЫЕ МЕТОДЫ
    // =========================================
    
    /**
     * Проверить повторный брак
     */
    async checkRepeatedDefect(serverId, repairPartType, days = 30) {
        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - days);
        
        return BeryllDefectRecord.findOne({
            where: {
                serverId,
                repairPartType,
                detectedAt: { [Op.gte]: dateThreshold },
                status: { [Op.in]: [DEFECT_RECORD_STATUSES.RESOLVED, DEFECT_RECORD_STATUSES.CLOSED] }
            },
            order: [["detectedAt", "DESC"]]
        });
    }
    
    /**
     * Найти компонент сервера по серийному номеру
     * ИСПРАВЛЕНО: type → componentType
     */
    async findServerComponent(serverId, type, serialYadro, serialManuf) {
        const where = { serverId };
        
        // ИСПРАВЛЕНО: componentType вместо type
        if (type) where.componentType = type;
        
        if (serialYadro || serialManuf) {
            where[Op.or] = [];
            // serialNumberYadro требует миграции для добавления колонки!
            if (serialYadro) where[Op.or].push({ serialNumberYadro: serialYadro });
            if (serialManuf) where[Op.or].push({ serialNumber: serialManuf });
        }
        
        return BeryllServerComponent.findOne({ where });
    }
    
    /**
     * Логирование истории
     */
    async logHistory(defectRecordId, action, userId, description, transaction = null) {
        try {
            const { BeryllExtendedHistory } = require("../../../models/index");
            
            return BeryllExtendedHistory.create({
                entityType: "DEFECT_RECORD",
                entityId: defectRecordId,
                action,
                userId,
                description,
                metadata: {}
            }, { transaction });
        } catch (e) {
            console.warn("logHistory ошибка:", e.message);
        }
    }
    
    // =========================================
    // ПОЛУЧЕНИЕ ДАННЫХ
    // =========================================
    
    /**
     * Получить запись по ID
     * Упрощённая версия с минимальными include
     */
    async getById(id) {
        try {
            return await BeryllDefectRecord.findByPk(id, {
                include: [
                    { 
                        model: BeryllServer, 
                        as: "server",
                        attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"],
                        required: false
                    },
                    { 
                        model: User, 
                        as: "detectedBy", 
                        attributes: ["id", "name", "surname", "login"],
                        required: false
                    },
                    { 
                        model: User, 
                        as: "diagnostician", 
                        attributes: ["id", "name", "surname", "login"],
                        required: false
                    },
                    { 
                        model: User, 
                        as: "resolvedBy", 
                        attributes: ["id", "name", "surname", "login"],
                        required: false
                    },
                    {
                        model: BeryllDefectRecordFile,
                        as: "files",
                        include: [
                            {
                                model: User,
                                as: "uploadedBy",
                                attributes: ["id", "name", "surname", "login"],
                                required: false
                            }
                        ],
                        required: false
                    }
                ]
            });
        } catch (e) {
            console.error("getById include error, trying without includes:", e.message);
            // Fallback без include
            return BeryllDefectRecord.findByPk(id);
        }
    }
    
    /**
     * Получить все записи с фильтрами
     */
    async getAll(filters = {}) {
        const {
            serverId,
            status,
            repairPartType,
            diagnosticianId,
            isRepeatedDefect,
            dateFrom,
            dateTo,
            search,
            slaBreached,
            limit = 50,
            offset = 0
        } = filters;
        
        const where = {};
        
        if (serverId) where.serverId = serverId;
        if (status) where.status = status;
        if (repairPartType) where.repairPartType = repairPartType;
        if (diagnosticianId) where.diagnosticianId = diagnosticianId;
        if (isRepeatedDefect !== undefined) where.isRepeatedDefect = isRepeatedDefect;
        
        if (dateFrom || dateTo) {
            where.detectedAt = {};
            if (dateFrom) where.detectedAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.detectedAt[Op.lte] = new Date(dateTo);
        }
        
        if (slaBreached === true) {
            where.slaDeadline = { [Op.lt]: new Date() };
            where.status = { [Op.notIn]: [DEFECT_RECORD_STATUSES.RESOLVED, DEFECT_RECORD_STATUSES.CLOSED] };
        }
        
        if (search) {
            where[Op.or] = [
                { yadroTicketNumber: { [Op.iLike]: `%${search}%` } },
                { problemDescription: { [Op.iLike]: `%${search}%` } },
                { defectPartSerialYadro: { [Op.iLike]: `%${search}%` } },
                { defectPartSerialManuf: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        try {
            return await BeryllDefectRecord.findAndCountAll({
                where,
                include: [
                    { 
                        model: BeryllServer, 
                        as: "server",
                        attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"],
                        required: false
                    },
                    { 
                        model: User, 
                        as: "diagnostician", 
                        attributes: ["id", "name", "surname"],
                        required: false
                    }
                ],
                order: [["detectedAt", "DESC"]],
                limit,
                offset
            });
        } catch (e) {
            console.error("getAll include error:", e.message);
            // Fallback без include
            return BeryllDefectRecord.findAndCountAll({
                where,
                order: [["detectedAt", "DESC"]],
                limit,
                offset
            });
        }
    }
    
    /**
     * Получить статистику
     */
    async getStats(filters = {}) {
        const { dateFrom, dateTo, serverId } = filters;
        
        const where = {};
        if (serverId) where.serverId = serverId;
        if (dateFrom || dateTo) {
            where.detectedAt = {};
            if (dateFrom) where.detectedAt[Op.gte] = new Date(dateFrom);
            if (dateTo) where.detectedAt[Op.lte] = new Date(dateTo);
        }
        
        // По статусам
        const byStatus = await BeryllDefectRecord.findAll({
            attributes: [
                "status",
                [sequelize.fn("COUNT", sequelize.col("id")), "count"]
            ],
            where,
            group: ["status"],
            raw: true
        });
        
        // По типам дефектов
        const byType = await BeryllDefectRecord.findAll({
            attributes: [
                "repairPartType",
                [sequelize.fn("COUNT", sequelize.col("id")), "count"]
            ],
            where,
            group: ["repairPartType"],
            raw: true
        });
        
        // Повторные дефекты
        const repeatedCount = await BeryllDefectRecord.count({
            where: { ...where, isRepeatedDefect: true }
        });
        
        // Просроченные SLA
        const slaBreachedCount = await BeryllDefectRecord.count({
            where: {
                ...where,
                slaDeadline: { [Op.lt]: new Date() },
                status: { [Op.notIn]: [DEFECT_RECORD_STATUSES.RESOLVED, DEFECT_RECORD_STATUSES.CLOSED] }
            }
        });
        
        // Среднее время ремонта
        const avgRepairTime = await BeryllDefectRecord.findOne({
            attributes: [
                [sequelize.fn("AVG", sequelize.col("totalDowntimeMinutes")), "avgMinutes"]
            ],
            where: {
                ...where,
                totalDowntimeMinutes: { [Op.ne]: null }
            },
            raw: true
        });
        
        return {
            byStatus,
            byType,
            repeatedCount,
            slaBreachedCount,
            avgRepairTimeMinutes: Math.round(avgRepairTime?.avgMinutes || 0),
            avgRepairTimeHours: Math.round((avgRepairTime?.avgMinutes || 0) / 60)
        };
    }
    
    /**
     * Справочники
     */
    getRepairPartTypes() {
        return Object.entries(REPAIR_PART_TYPES || {}).map(([key, value]) => ({
            value,
            label: this.getPartTypeLabel(value)
        }));
    }
    
    getStatuses() {
        return Object.entries(DEFECT_RECORD_STATUSES || {}).map(([key, value]) => ({
            value,
            label: this.getStatusLabel(value)
        }));
    }
    
    getPartTypeLabel(type) {
        const labels = {
            RAM: "Оперативная память",
            MOTHERBOARD: "Материнская плата",
            CPU: "Процессор",
            HDD: "Жёсткий диск",
            SSD: "SSD накопитель",
            PSU: "Блок питания",
            FAN: "Вентилятор",
            RAID: "RAID контроллер",
            NIC: "Сетевая карта",
            BACKPLANE: "Backplane",
            BMC: "BMC модуль",
            CABLE: "Кабель",
            OTHER: "Другое"
        };
        return labels[type] || type;
    }
    
    getStatusLabel(status) {
        const labels = {
            NEW: "Новый",
            DIAGNOSING: "Диагностика",
            WAITING_PARTS: "Ожидание запчастей",
            REPAIRING: "Ремонт",
            SENT_TO_YADRO: "Отправлен в Ядро",
            RETURNED: "Возвращён из Ядро",
            RESOLVED: "Решён",
            REPEATED: "Повторный брак",
            CLOSED: "Закрыт"
        };
        return labels[status] || status;
    }
    
    // =========================================
    // МЕТОДЫ ДЛЯ РАБОТЫ С ФАЙЛАМИ
    // =========================================
    
    /**
     * Получить список файлов записи о браке
     * @param {number} defectRecordId - ID записи
     * @returns {Promise<Array>}
     */
    async getFiles(defectRecordId) {
        const files = await BeryllDefectRecordFile.findAll({
            where: { defectRecordId },
            include: [
                {
                    model: User,
                    as: "uploadedBy",
                    attributes: ["id", "name", "surname", "login"],
                    required: false
                }
            ],
            order: [["createdAt", "DESC"]]
        });
        
        return files;
    }
    
    /**
     * Получить файл по ID
     * @param {number} fileId - ID файла
     * @returns {Promise<Object|null>}
     */
    async getFileById(fileId) {
        const file = await BeryllDefectRecordFile.findByPk(fileId, {
            include: [
                {
                    model: User,
                    as: "uploadedBy",
                    attributes: ["id", "name", "surname", "login"],
                    required: false
                }
            ]
        });
        
        return file;
    }
    
    /**
     * Добавить файл к записи о браке
     * @param {number} defectRecordId - ID записи
     * @param {Object} fileData - Данные файла
     * @returns {Promise<Object>}
     */
    async addFile(defectRecordId, fileData) {
        // Проверяем существование записи о браке
        const defect = await BeryllDefectRecord.findByPk(defectRecordId, {
            include: [{ model: BeryllServer, as: "server" }]
        });
        
        if (!defect) {
            throw new Error("Запись о браке не найдена");
        }
        
        // Создаём запись о файле
        const file = await BeryllDefectRecordFile.create({
            defectRecordId,
            fileName: fileData.fileName,
            originalName: fileData.originalName,
            filePath: fileData.filePath,
            mimeType: fileData.mimeType,
            fileSize: fileData.fileSize,
            uploadedById: fileData.uploadedById
        });
        
        // Записываем в историю
        try {
            const { BeryllHistory } = require("../../../models");
            await BeryllHistory.create({
                serverId: defect.serverId,
                serverIp: defect.server?.ipAddress,
                serverHostname: defect.server?.hostname,
                userId: fileData.uploadedById,
                action: "DEFECT_RECORD_FILE_UPLOADED",
                comment: `Загружен файл: ${fileData.originalName}`,
                metadata: {
                    defectRecordId,
                    fileId: file.id,
                    fileName: fileData.originalName,
                    fileSize: fileData.fileSize,
                    mimeType: fileData.mimeType
                }
            });
        } catch (historyError) {
            console.error("[DefectRecordService] Ошибка записи в историю:", historyError.message);
        }
        
        // ============ АУДИТ: Загрузка файла ============
        try {
            await logAudit({
                userId: fileData.uploadedById,
                action: AUDIT_ACTIONS.DEFECT_FILE_UPLOAD,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: defectRecordId,
                description: `Загружен файл "${fileData.originalName}" к дефекту #${defectRecordId}`,
                metadata: {
                    defectRecordId,
                    fileId: file.id,
                    fileName: fileData.originalName,
                    fileSize: fileData.fileSize,
                    mimeType: fileData.mimeType,
                    serverId: defect.serverId,
                    serverSerial: defect.server?.apkSerialNumber
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования загрузки файла:", auditErr.message);
        }
        
        return file;
    }
    
    /**
     * Удалить файл
     * @param {number} fileId - ID файла
     * @param {number} userId - ID пользователя
     * @returns {Promise<Object>}
     */
    async deleteFile(fileId, userId) {
        const file = await BeryllDefectRecordFile.findByPk(fileId, {
            include: [{
                model: BeryllDefectRecord,
                as: "defectRecord",
                include: [{ model: BeryllServer, as: "server" }]
            }]
        });
        
        if (!file) {
            throw new Error("Файл не найден");
        }
        
        const defectRecordId = file.defectRecordId;
        const fileName = file.originalName;
        const serverId = file.defectRecord?.serverId;
        const serverSerial = file.defectRecord?.server?.apkSerialNumber;
        
        // Удаляем файл с диска
        const fullPath = path.join(UPLOADS_DIR, file.filePath);
        if (fs.existsSync(fullPath)) {
            try {
                fs.unlinkSync(fullPath);
            } catch (e) {
                console.warn("[DefectRecordService] Ошибка удаления файла с диска:", e.message);
            }
        }
        
        // Записываем в историю
        try {
            const { BeryllHistory } = require("../../../models");
            if (file.defectRecord) {
                await BeryllHistory.create({
                    serverId: file.defectRecord.serverId,
                    serverIp: file.defectRecord.server?.ipAddress,
                    serverHostname: file.defectRecord.server?.hostname,
                    userId,
                    action: "DEFECT_RECORD_FILE_DELETED",
                    comment: `Удалён файл: ${file.originalName}`,
                    metadata: {
                        defectRecordId: file.defectRecordId,
                        fileId: file.id,
                        fileName: file.originalName
                    }
                });
            }
        } catch (historyError) {
            console.error("[DefectRecordService] Ошибка записи в историю:", historyError.message);
        }
        
        // Удаляем запись из БД
        await file.destroy();
        
        // ============ АУДИТ: Удаление файла ============
        try {
            await logAudit({
                userId,
                action: AUDIT_ACTIONS.DEFECT_FILE_DELETE,
                entity: AUDIT_ENTITIES.BERYLL_DEFECT,
                entityId: defectRecordId,
                description: `Удалён файл "${fileName}" из дефекта #${defectRecordId}`,
                metadata: {
                    defectRecordId,
                    fileId,
                    fileName,
                    serverId,
                    serverSerial
                }
            });
        } catch (auditErr) {
            console.error("[Audit] Ошибка логирования удаления файла:", auditErr.message);
        }
        
        return { success: true, message: "Файл удалён" };
    }
}

module.exports = new DefectRecordService();