
const { Op } = require("sequelize");
const sequelize = require("../../../db");
const {
    ComponentCatalog,
    ComponentInventory,
    ComponentHistory,
    BeryllServer,
    BeryllServerComponent,
    User,
    COMPONENT_TYPES,
    INVENTORY_STATUSES,
    COMPONENT_CONDITIONS,
    HISTORY_ACTIONS
} = require("../../../models/index");

class ComponentInventoryService {
    

    async getOrCreateCatalogEntry(data) {
        const { type, manufacturer, model, revision, partNumber, specifications } = data;
        
        const [catalog, created] = await ComponentCatalog.findOrCreate({
            where: { type, manufacturer: manufacturer || null, model },
            defaults: {
                revision,
                partNumber,
                specifications: specifications || {},
                isActive: true
            }
        });
        
        return { catalog, created };
    }
    

    async getCatalogByType(type) {
        return ComponentCatalog.findAll({
            where: { type, isActive: true },
            order: [["manufacturer", "ASC"], ["model", "ASC"]]
        });
    }
    

    async updateCatalogEntry(id, data) {
        const catalog = await ComponentCatalog.findByPk(id);
        if (!catalog) throw new Error("Запись справочника не найдена");
        
        await catalog.update(data);
        return catalog;
    }
    
    async addToInventory(data, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const {
                type,
                serialNumber,
                serialNumberYadro,
                manufacturer,
                model,
                condition = COMPONENT_CONDITIONS.NEW,
                location,
                purchaseDate,
                warrantyExpires,
                notes
            } = data;
            
            const existing = await ComponentInventory.findOne({
                where: {
                    [Op.or]: [
                        { serialNumber },
                        serialNumberYadro ? { serialNumberYadro } : {}
                    ]
                }
            });
            
            if (existing) {
                throw new Error(`Компонент с серийным номером ${serialNumber} уже существует`);
            }
            
            let catalogId = null;
            if (manufacturer && model) {
                const { catalog } = await this.getOrCreateCatalogEntry({ type, manufacturer, model });
                catalogId = catalog.id;
            }
            
            const component = await ComponentInventory.create({
                catalogId,
                type,
                serialNumber,
                serialNumberYadro,
                manufacturer,
                model,
                status: INVENTORY_STATUSES.AVAILABLE,
                condition,
                location,
                purchaseDate,
                warrantyExpires,
                notes,
                createdById: userId
            }, { transaction });
            
            await ComponentHistory.create({
                inventoryComponentId: component.id,
                action: HISTORY_ACTIONS.RECEIVED,
                toLocation: location,
                performedById: userId,
                notes: `Добавлен в инвентарь. Состояние: ${condition}`
            }, { transaction });
            
            await transaction.commit();
            return component;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    async bulkAddToInventory(items, userId) {
        const results = {
            success: [],
            errors: []
        };
        
        for (const item of items) {
            try {
                const component = await this.addToInventory(item, userId);
                results.success.push({
                    serialNumber: item.serialNumber,
                    id: component.id
                });
            } catch (error) {
                results.errors.push({
                    serialNumber: item.serialNumber,
                    error: error.message
                });
            }
        }
        
        return results;
    }
    
    async getById(id) {
        return ComponentInventory.findByPk(id, {
            include: [
                { model: ComponentCatalog, as: "catalog" },
                { model: BeryllServer, as: "currentServer" },
                { model: User, as: "createdBy", attributes: ["id", "name", "surname"] }
            ]
        });
    }
    

    async getBySerial(serial) {
        return ComponentInventory.findOne({
            where: {
                [Op.or]: [
                    { serialNumber: { [Op.iLike]: serial } },
                    { serialNumberYadro: { [Op.iLike]: serial } }
                ]
            },
            include: [
                { model: ComponentCatalog, as: "catalog" },
                { model: BeryllServer, as: "currentServer" }
            ]
        });
    }
    

    async getAll(filters = {}) {
        const {
            type,
            status,
            condition,
            manufacturer,
            model,
            search,
            serverId,
            location,
            warrantyExpired,
            limit = 50,
            offset = 0
        } = filters;
        
        const where = {};
        
        if (type) where.type = type;
        if (status) where.status = status;
        if (condition) where.condition = condition;
        if (manufacturer) where.manufacturer = { [Op.iLike]: `%${manufacturer}%` };
        if (model) where.model = { [Op.iLike]: `%${model}%` };
        if (serverId) where.currentServerId = serverId;
        if (location) where.location = { [Op.iLike]: `%${location}%` };
        
        if (warrantyExpired === true) {
            where.warrantyExpires = { [Op.lt]: new Date() };
        } else if (warrantyExpired === false) {
            where.warrantyExpires = { [Op.gte]: new Date() };
        }
        
        if (search) {
            where[Op.or] = [
                { serialNumber: { [Op.iLike]: `%${search}%` } },
                { serialNumberYadro: { [Op.iLike]: `%${search}%` } },
                { model: { [Op.iLike]: `%${search}%` } }
            ];
        }
        
        return ComponentInventory.findAndCountAll({
            where,
            include: [
                { model: ComponentCatalog, as: "catalog" },
                { model: BeryllServer, as: "currentServer", attributes: ["id", "apkSerialNumber", "hostname"] }
            ],
            order: [["createdAt", "DESC"]],
            limit,
            offset
        });
    }
    

    async getAvailableByType(type, count = 10) {
        return ComponentInventory.findAll({
            where: {
                type,
                status: INVENTORY_STATUSES.AVAILABLE
            },
            include: [{ model: ComponentCatalog, as: "catalog" }],
            order: [
                ["condition", "ASC"],
                ["createdAt", "ASC"]
            ],
            limit: count
        });
    }
    

    async reserve(id, defectId, userId) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        return component.reserve(defectId, userId);
    }
    
    async release(id, userId, notes = null) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        return component.release(userId, notes);
    }
    

    async installToServer(id, serverId, userId, defectId = null) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        const server = await BeryllServer.findByPk(serverId);
        if (!server) throw new Error("Сервер не найден");
        
        return component.installToServer(serverId, userId, defectId);
    }
    

    async removeFromServer(id, userId, reason = null, defectId = null) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        return component.removeFromServer(userId, reason, defectId);
    }
    

    async sendToYadro(id, ticketNumber, userId) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        return component.sendToYadro(ticketNumber, userId);
    }
    

    async returnFromYadro(id, userId, condition = COMPONENT_CONDITIONS.REFURBISHED) {
        const component = await ComponentInventory.findByPk(id);
        if (!component) throw new Error("Компонент не найден");
        
        return component.returnFromYadro(userId, condition);
    }
    
    async scrap(id, userId, reason) {
        const transaction = await sequelize.transaction();
        
        try {
            const component = await ComponentInventory.findByPk(id);
            if (!component) throw new Error("Компонент не найден");
            
            await component.update({
                status: INVENTORY_STATUSES.SCRAPPED,
                currentServerId: null,
                reservedForDefectId: null
            }, { transaction });
            
            await ComponentHistory.create({
                inventoryComponentId: id,
                action: HISTORY_ACTIONS.SCRAPPED,
                performedById: userId,
                notes: reason || "Списан"
            }, { transaction });
            
            await transaction.commit();
            return component;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    

    async updateLocation(id, location, userId) {
        const transaction = await sequelize.transaction();
        
        try {
            const component = await ComponentInventory.findByPk(id);
            if (!component) throw new Error("Компонент не найден");
            
            const fromLocation = component.location;
            
            await component.update({ location }, { transaction });
            
            await ComponentHistory.create({
                inventoryComponentId: id,
                action: HISTORY_ACTIONS.TRANSFERRED,
                fromLocation,
                toLocation: location,
                performedById: userId,
                notes: `Перемещён из "${fromLocation || "N/A"}" в "${location}"`
            }, { transaction });
            
            await transaction.commit();
            return component;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    
    async markTested(id, userId, passed, notes = null) {
        const transaction = await sequelize.transaction();
        
        try {
            const component = await ComponentInventory.findByPk(id);
            if (!component) throw new Error("Компонент не найден");
            
            await component.update({
                lastTestedAt: new Date(),
                status: passed ? INVENTORY_STATUSES.AVAILABLE : INVENTORY_STATUSES.DEFECTIVE
            }, { transaction });
            
            await ComponentHistory.create({
                inventoryComponentId: id,
                action: HISTORY_ACTIONS.TESTED,
                performedById: userId,
                metadata: { passed },
                notes: notes || (passed ? "Тест пройден" : "Тест не пройден")
            }, { transaction });
            
            await transaction.commit();
            return component;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
    

    async getHistory(id) {
        return ComponentHistory.findAll({
            where: { inventoryComponentId: id },
            include: [
                { model: User, as: "performedBy", attributes: ["id", "name", "surname"] },
                { model: BeryllServer, as: "fromServer", attributes: ["id", "apkSerialNumber"] },
                { model: BeryllServer, as: "toServer", attributes: ["id", "apkSerialNumber"] }
            ],
            order: [["performedAt", "DESC"]]
        });
    }
    
    async getStats() {

        const byTypeStatus = await ComponentInventory.findAll({
            attributes: [
                "type",
                "status",
                [sequelize.fn("COUNT", sequelize.col("id")), "count"]
            ],
            group: ["type", "status"],
            raw: true
        });
        

        const stats = {};
        for (const row of byTypeStatus) {
            if (!stats[row.type]) {
                stats[row.type] = { total: 0 };
            }
            stats[row.type][row.status] = parseInt(row.count);
            stats[row.type].total += parseInt(row.count);
        }
        
        const totals = await ComponentInventory.findOne({
            attributes: [
                [sequelize.fn("COUNT", sequelize.col("id")), "total"],
                [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'AVAILABLE' THEN 1 END`)), "available"],
                [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'IN_USE' THEN 1 END`)), "inUse"],
                [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'DEFECTIVE' THEN 1 END`)), "defective"],
                [sequelize.fn("COUNT", sequelize.literal(`CASE WHEN status = 'IN_REPAIR' THEN 1 END`)), "inRepair"]
            ],
            raw: true
        });
        
        const warrantyExpiringSoon = await ComponentInventory.count({
            where: {
                warrantyExpires: {
                    [Op.between]: [new Date(), new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)]
                }
            }
        });
        
        return {
            byType: stats,
            totals: {
                total: parseInt(totals.total) || 0,
                available: parseInt(totals.available) || 0,
                inUse: parseInt(totals.inUse) || 0,
                defective: parseInt(totals.defective) || 0,
                inRepair: parseInt(totals.inRepair) || 0
            },
            warrantyExpiringSoon
        };
    }
    

    async getWarrantyExpiring(days = 30) {
        return ComponentInventory.findAll({
            where: {
                warrantyExpires: {
                    [Op.between]: [new Date(), new Date(Date.now() + days * 24 * 60 * 60 * 1000)]
                }
            },
            include: [{ model: ComponentCatalog, as: "catalog" }],
            order: [["warrantyExpires", "ASC"]]
        });
    }
    

    parseExcelRow(row, columnMapping) {
        const components = [];
        

        for (let i = 0; i < 12; i++) {
            const snYadro = row[columnMapping.hdd[i]?.yadro];
            const snManuf = row[columnMapping.hdd[i]?.manuf];
            
            if (snYadro || snManuf) {
                components.push({
                    type: COMPONENT_TYPES.HDD,
                    serialNumberYadro: snYadro,
                    serialNumber: snManuf,
                    manufacturer: "Seagate",
                    model: "STL015"
                });
            }
        }
        

        for (let i = 0; i < 12; i++) {
            const snYadro = row[columnMapping.ram[i]?.yadro];
            const snManuf = row[columnMapping.ram[i]?.manuf];
            
            if (snYadro || snManuf) {
                components.push({
                    type: COMPONENT_TYPES.RAM,
                    serialNumberYadro: snYadro,
                    serialNumber: snManuf,
                    manufacturer: "Samsung",
                    model: "KR M393A8G40AB2-CWEC0"
                });
            }
        }
        
        for (let i = 0; i < 4; i++) {
            const snYadro = row[columnMapping.ssd[i]?.yadro];
            const snManuf = row[columnMapping.ssd[i]?.manuf];
            
            if (snYadro || snManuf) {
                components.push({
                    type: COMPONENT_TYPES.SSD,
                    serialNumberYadro: snYadro,
                    serialNumber: snManuf
                });
            }
        }
        
        for (let i = 0; i < 2; i++) {
            const snYadro = row[columnMapping.psu[i]?.yadro];
            const snManuf = row[columnMapping.psu[i]?.manuf];
            
            if (snYadro || snManuf) {
                components.push({
                    type: COMPONENT_TYPES.PSU,
                    serialNumberYadro: snYadro,
                    serialNumber: snManuf,
                    manufacturer: "Aspower",
                    model: "U1A-D11200-DRB"
                });
            }
        }
        
        return components;
    }
    

    async importServerComponents(serverId, componentsData, userId) {
        const transaction = await sequelize.transaction();
        const results = { created: 0, errors: [] };
        
        try {
            for (const data of componentsData) {
                try {
                    const existing = await ComponentInventory.findOne({
                        where: {
                            [Op.or]: [
                                data.serialNumber ? { serialNumber: data.serialNumber } : {},
                                data.serialNumberYadro ? { serialNumberYadro: data.serialNumberYadro } : {}
                            ].filter(o => Object.keys(o).length > 0)
                        }
                    });
                    
                    if (existing) {
                        await existing.update({
                            currentServerId: serverId,
                            status: INVENTORY_STATUSES.IN_USE
                        }, { transaction });
                    } else {
                        await ComponentInventory.create({
                            ...data,
                            currentServerId: serverId,
                            status: INVENTORY_STATUSES.IN_USE,
                            createdById: userId
                        }, { transaction });
                        results.created++;
                    }
                } catch (err) {
                    results.errors.push({
                        serialNumber: data.serialNumber || data.serialNumberYadro,
                        error: err.message
                    });
                }
            }
            
            await transaction.commit();
            return results;
            
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }
}

module.exports = new ComponentInventoryService();
