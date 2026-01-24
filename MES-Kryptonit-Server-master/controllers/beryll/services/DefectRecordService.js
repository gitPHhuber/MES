/**
 * DefectRecordService.js - Полный сервис управления записями о браке
 * 
 * Включает:
 * - Полный workflow от создания до закрытия
 * - Автоматическое связывание с компонентами
 * - Проверка повторного брака
 * - SLA расчёты
 * - Интеграция с Ядро
 * - Управление подменными серверами
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

const fs = require("fs");
const path = require("path");
const DefectStateMachine = require("../../../services/beryll/DefectStateMachine");

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
            const slaDeadline = await SlaConfig.calculateDeadline(repairPartType, priority);
            
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
        const defect = await BeryllDefectRecord.findByPk(id);
        if (!defect) throw new Error("Запись не найдена");

        DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.DIAGNOSING);
        
        await defect.update({
            status: DEFECT_RECORD_STATUSES.DIAGNOSING,
            diagnosticianId,
            diagnosisStartedAt: new Date()
        });
        
        await this.logHistory(id, "STATUS_CHANGED", diagnosticianId, 
            `Начата диагностика`
        );
        
        return this.getById(id);
    }
    
    /**
     * Завершить диагностику
     */
    async completeDiagnosis(id, userId, data) {
        const defect = await BeryllDefectRecord.findByPk(id);
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
        
        return this.getById(id);
    }
    
    // =========================================
    // WORKFLOW: ОЖИДАНИЕ ЗАПЧАСТЕЙ
    // =========================================
    
    /**
     * Перевести в ожидание запчастей
     */
    async setWaitingParts(id, userId, notes = null) {
        const defect = await BeryllDefectRecord.findByPk(id);
        if (!defect) throw new Error("Запись не найдена");

        DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.WAITING_PARTS);

        await defect.update({
            status: DEFECT_RECORD_STATUSES.WAITING_PARTS,
            notes: notes ? `${defect.notes || ""}\n\n[Ожидание запчастей]: ${notes}` : defect.notes
        });
        
        await this.logHistory(id, "STATUS_CHANGED", userId, 
            `Переведено в ожидание запчастей. ${notes || ""}`
        );
        
        return this.getById(id);
    }
    
    /**
     * Зарезервировать компонент из инвентаря
     */
    async reserveReplacementComponent(id, inventoryId, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const defect = await BeryllDefectRecord.findByPk(id);
            if (!defect) throw new Error("Запись не найдена");
            
            const component = await ComponentInventory.findByPk(inventoryId);
            if (!component) throw new Error("Компонент не найден в инвентаре");
            
            // Резервируем
            await component.reserve(id, userId);
            
            await defect.update({
                replacementInventoryId: inventoryId
            }, { transaction });
            
            await this.logHistory(id, "COMPONENT_RESERVED", userId, 
                `Зарезервирован компонент ${component.serialNumber} для замены`,
                transaction
            );
            
            await transaction.commit();
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
        const defect = await BeryllDefectRecord.findByPk(id);
        if (!defect) throw new Error("Запись не найдена");

        DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.REPAIRING);

        await defect.update({
            status: DEFECT_RECORD_STATUSES.REPAIRING,
            repairStartedAt: new Date()
        });
        
        await this.logHistory(id, "STATUS_CHANGED", userId, `Начат ремонт`);
        
        return this.getById(id);
    }
    
    /**
     * Выполнить замену компонента
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
                await newComponent.installToServer(defect.serverId, userId, id);
                
                // Создаём запись в компонентах сервера
                const serverComponent = await BeryllServerComponent.create({
                    serverId: defect.serverId,
                    type: defect.repairPartType,
                    serialNumber: newComponent.serialNumber,
                    serialNumberYadro: newComponent.serialNumberYadro,
                    manufacturer: newComponent.manufacturer,
                    model: newComponent.model,
                    status: "ACTIVE",
                    installedAt: new Date(),
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

            DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.SENT_TO_YADRO);

            const { ticketNumber, subject, description, trackingNumber } = data;
            
            // 1. Создаём заявку в Ядро
            const ticket = await YadroTicket.create({
                ticketNumber: ticketNumber || await YadroTicket.generateTicketNumber(),
                defectRecordId: id,
                serverId: defect.serverId,
                type: TICKET_TYPES.COMPONENT_REPAIR,
                status: TICKET_STATUSES.SUBMITTED,
                subject: subject || `Ремонт ${defect.repairPartType} - сервер ${defect.server?.apkSerialNumber}`,
                description: description || defect.problemDescription,
                componentType: defect.repairPartType,
                componentSerialYadro: defect.defectPartSerialYadro,
                componentSerialManuf: defect.defectPartSerialManuf,
                sentAt: new Date(),
                trackingNumber,
                createdById: userId
            }, { transaction });
            
            // 2. Обновляем запись о дефекте
            await defect.update({
                status: DEFECT_RECORD_STATUSES.SENT_TO_YADRO,
                yadroTicketNumber: ticket.ticketNumber,
                sentToYadroRepair: true,
                sentToYadroAt: new Date()
            }, { transaction });
            
            // 3. Если есть дефектный компонент в инвентаре - отмечаем отправку
            if (defect.defectInventoryId) {
                const component = await ComponentInventory.findByPk(defect.defectInventoryId);
                if (component) {
                    await component.sendToYadro(ticket.ticketNumber, userId);
                }
            }
            
            await this.logHistory(id, "SENT_TO_YADRO", userId, 
                `Отправлено на ремонт в Ядро. Заявка: ${ticket.ticketNumber}`,
                transaction
            );
            
            await transaction.commit();
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
            const defect = await BeryllDefectRecord.findByPk(id);
            if (!defect) throw new Error("Запись не найдена");

            DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.RETURNED);

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
                    status: TICKET_STATUSES.RECEIVED,
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
                if (component) {
                    await component.returnFromYadro(userId, condition || "REFURBISHED");
                }
            }
            
            await this.logHistory(id, "RETURNED_FROM_YADRO", userId, 
                `Возвращено из Ядро. Резолюция: ${resolution || "Не указана"}`,
                transaction
            );
            
            await transaction.commit();
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
            const defect = await BeryllDefectRecord.findByPk(id);
            if (!defect) throw new Error("Запись не найдена");
            
            let substitute;
            
            if (substituteServerId) {
                substitute = await SubstituteServerPool.findOne({
                    where: { serverId: substituteServerId }
                });
            } else {
                // Берём любой доступный
                substitute = await SubstituteServerPool.findAvailableOne();
            }
            
            if (!substitute) {
                throw new Error("Нет доступных подменных серверов");
            }
            
            // Выдаём подменный сервер
            await substitute.issue(id, userId);
            
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
            const defect = await BeryllDefectRecord.findByPk(id);
            if (!defect) throw new Error("Запись не найдена");
            
            if (!defect.substituteServerId) {
                throw new Error("Подменный сервер не был выдан");
            }
            
            const substitute = await SubstituteServerPool.findOne({
                where: { serverId: defect.substituteServerId }
            });
            
            if (substitute) {
                await substitute.return();
            }
            
            await this.logHistory(id, "SUBSTITUTE_RETURNED", userId, 
                `Подменный сервер возвращён`,
                transaction
            );
            
            await transaction.commit();
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

            DefectStateMachine.assertTransition(defect.status, DEFECT_RECORD_STATUSES.RESOLVED);

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
                    status: TICKET_STATUSES.CLOSED,
                    closedAt: new Date()
                }, {
                    where: { ticketNumber: defect.yadroTicketNumber },
                    transaction
                });
            }
            
            // Возвращаем подменный сервер если был выдан
            if (defect.substituteServerId) {
                await this.returnSubstituteServer(id, userId);
            }
            
            await this.logHistory(id, "RESOLVED", userId, 
                `Запись закрыта. Резолюция: ${resolution}. Время простоя: ${totalDowntimeMinutes} мин.`,
                transaction
            );
            
            await transaction.commit();
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
     */
    async findServerComponent(serverId, type, serialYadro, serialManuf) {
        const where = { serverId };
        
        if (type) where.type = type;
        
        if (serialYadro || serialManuf) {
            where[Op.or] = [];
            if (serialYadro) where[Op.or].push({ serialNumberYadro: serialYadro });
            if (serialManuf) where[Op.or].push({ serialNumber: serialManuf });
        }
        
        return BeryllServerComponent.findOne({ where });
    }
    
    /**
     * Логирование истории
     */
    async logHistory(defectRecordId, action, userId, description, transaction = null) {
        const { BeryllExtendedHistory } = require("../../../models/index");
        
        return BeryllExtendedHistory.create({
            entityType: "DEFECT_RECORD",
            entityId: defectRecordId,
            action,
            userId,
            description,
            metadata: {}
        }, { transaction });
    }
    
    // =========================================
    // ПОЛУЧЕНИЕ ДАННЫХ
    // =========================================
    
    /**
     * Получить запись по ID
     */
    async getById(id) {
        return BeryllDefectRecord.findByPk(id, {
            include: [
                { 
                    model: BeryllServer, 
                    as: "server",
                    attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"]
                },
                { model: User, as: "detectedBy", attributes: ["id", "name", "surname", "login"] },
                { model: User, as: "diagnostician", attributes: ["id", "name", "surname", "login"] },
                { model: User, as: "resolvedBy", attributes: ["id", "name", "surname", "login"] },
                { model: BeryllDefectRecordFile, as: "files" },
                { model: BeryllServerComponent, as: "defectComponent" },
                { model: BeryllServerComponent, as: "replacementComponent" },
                { model: ComponentInventory, as: "defectInventoryItem" },
                { model: ComponentInventory, as: "replacementInventoryItem" },
                { model: BeryllDefectRecord, as: "previousDefect" },
                { 
                    model: BeryllServer, 
                    as: "substituteServer",
                    attributes: ["id", "ipAddress", "apkSerialNumber", "hostname"]
                },
                { model: YadroTicket, as: "yadroTickets" }
            ]
        });
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
        
        return BeryllDefectRecord.findAndCountAll({
            where,
            include: [
                { 
                    model: BeryllServer, 
                    as: "server",
                    attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"]
                },
                { model: User, as: "diagnostician", attributes: ["id", "name", "surname"] }
            ],
            order: [["detectedAt", "DESC"]],
            limit,
            offset
        });
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
        return Object.entries(REPAIR_PART_TYPES).map(([key, value]) => ({
            value,
            label: this.getPartTypeLabel(value)
        }));
    }
    
    getStatuses() {
        return Object.entries(DEFECT_RECORD_STATUSES).map(([key, value]) => ({
            value,
            label: this.getStatusLabel(value)
        }));
    }

    async getAvailableActions(id) {
        const defect = await BeryllDefectRecord.findByPk(id);
        if (!defect) throw new Error("Запись не найдена");

        return DefectStateMachine.getAvailableActions(defect.status);
    }

    async updateStatus(id, userId, status, comment = null) {
        const defect = await BeryllDefectRecord.findByPk(id);
        if (!defect) throw new Error("Запись не найдена");

        const previousStatus = defect.status;

        if (status !== defect.status) {
            DefectStateMachine.assertTransition(defect.status, status);
        }

        await defect.update({ status });

        await this.logHistory(id, "STATUS_CHANGED", userId,
            `Статус изменён: ${previousStatus} → ${status}${comment ? `. ${comment}` : ""}`
        );

        return this.getById(id);
    }
    
    getPartTypeLabel(type) {
        const labels = {
            RAM: "Оперативная память",
            RAM_ECC: "ECC память",
            MOTHERBOARD: "Материнская плата",
            CPU: "Процессор",
            CPU_SOCKET: "Сокет процессора",
            HDD: "Жёсткий диск",
            SSD: "SSD накопитель",
            PSU: "Блок питания",
            FAN: "Вентилятор",
            THERMAL: "Термомодуль",
            RAID: "RAID контроллер",
            NIC: "Сетевая карта",
            BACKPLANE: "Backplane",
            BMC: "BMC модуль",
            CABLE: "Кабель",
            PCIE_SLOT: "PCIe слот",
            RAM_SOCKET: "Слот оперативной памяти",
            CHASSIS: "Шасси",
            OTHER: "Другое"
        };
        return labels[type] || type;
    }
    
    getStatusLabel(status) {
        const labels = {
            PENDING_DIAGNOSIS: "Ожидает диагностики",
            DIAGNOSED: "Диагностирован",
            WAITING_APPROVAL: "Ожидание согласования",
            PARTS_RESERVED: "Запчасти зарезервированы",
            REPAIRED_LOCALLY: "Отремонтирован локально",
            IN_YADRO_REPAIR: "В ремонте у Ядро",
            SUBSTITUTE_ISSUED: "Выдан подменный сервер",
            SCRAPPED: "Списан",
            CANCELLED: "Отменён",
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
}

module.exports = new DefectRecordService();
