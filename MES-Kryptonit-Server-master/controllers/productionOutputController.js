/**
 * productionOutputController.js - Учёт выработки v2
 * 
 * ИСПРАВЛЕНЫ АЛИАСЫ под существующую структуру models/index.js:
 * - User -> Team: без алиаса
 * - ProductionOutput -> Team: as "production_team"
 * - ProductionOutput -> Section: as "production_section"
 */

const { Op } = require("sequelize");
const sequelize = require("../db");
const ApiError = require("../error/ApiError");

const { 
    ProductionOutput, 
    OperationType, 
    OUTPUT_STATUSES 
} = require("../models/ProductionOutput");

const { 
    User, Team, Section, Project, ProductionTask 
} = require("../models/index");

// =========================================================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================================================

function _isAdmin(user) {
    return user?.role === 'SUPER_ADMIN' || user?.role === 'Admin';
}

function _isManager(user) {
    return user?.role === 'Manager' || user?.role === 'SectionManager';
}

function _isTeamLead(user) {
    return user?.role === 'TeamLead' || user?.role === 'Brigadir';
}

async function _getUserWithTeam(userId) {
    return await User.findByPk(userId, {
        include: [{
            model: Team,
            include: [{ model: Section, foreignKey: "sectionId" }]
        }]
    });
}

async function _getUserSection(user) {
    if (!user?.id) return null;
    
    const fullUser = await User.findByPk(user.id, {
        include: [{
            model: Team,
            include: [{ model: Section, foreignKey: "sectionId" }]
        }]
    });
    
    return fullUser?.Team?.Section || null;
}

async function _canSubmitFor(currentUser, targetUser) {
    if (_isAdmin(currentUser)) return true;
    if (currentUser?.id === targetUser?.id) return true;
    if (_isTeamLead(currentUser) && currentUser?.teamId === targetUser?.teamId) return true;
    
    if (_isManager(currentUser)) {
        const currentSection = await _getUserSection(currentUser);
        const targetSection = await _getUserSection(targetUser);
        if (currentSection && targetSection && currentSection.id === targetSection.id) {
            return true;
        }
    }
    
    return false;
}

async function _shouldAutoApprove(currentUser, targetUser) {
    if (_isAdmin(currentUser)) return true;
    if (_isManager(currentUser)) return true;
    if (_isTeamLead(currentUser) && currentUser?.teamId === targetUser?.teamId) return true;
    return false;
}

async function _canApproveFor(currentUser, output) {
    if (_isAdmin(currentUser)) return true;
    
    if (_isManager(currentUser)) {
        const currentSection = await _getUserSection(currentUser);
        if (currentSection && output.sectionId === currentSection.id) {
            return true;
        }
    }
    
    if (_isTeamLead(currentUser) && output.teamId === currentUser?.teamId) {
        return true;
    }
    
    return false;
}

async function _canEditOutput(currentUser, output) {
    if (_isAdmin(currentUser)) return true;
    if (output.createdById === currentUser?.id) return true;
    if (output.userId === currentUser?.id) return true;
    if (_isTeamLead(currentUser) && output.teamId === currentUser?.teamId) return true;
    return false;
}

// =========================================================================
// КОНТРОЛЛЕР
// =========================================================================

class ProductionOutputController {

    // =========================================================================
    // СПРАВОЧНИК ОПЕРАЦИЙ
    // =========================================================================

    async getOperationTypes(req, res, next) {
        try {
            const { includeInactive, sectionId } = req.query;
            
            const where = {};
            if (!includeInactive) {
                where.isActive = true;
            }
            if (sectionId) {
                where[Op.or] = [
                    { sectionId: Number(sectionId) },
                    { sectionId: null }
                ];
            }
            
            const types = await OperationType.findAll({
                where,
                order: [["sortOrder", "ASC"], ["name", "ASC"]]
            });
            
            return res.json(types);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async createOperationType(req, res, next) {
        try {
            const { name, code, description, unit, normMinutes, sectionId, sortOrder } = req.body;
            
            if (!name) {
                return next(ApiError.badRequest("Укажите название операции"));
            }
            
            if (code) {
                const existing = await OperationType.findOne({ where: { code } });
                if (existing) {
                    return next(ApiError.badRequest(`Код "${code}" уже используется`));
                }
            }
            
            const opType = await OperationType.create({
                name,
                code: code || null,
                description: description || null,
                unit: unit || 'шт',
                normMinutes: normMinutes || null,
                sectionId: sectionId || null,
                sortOrder: sortOrder || 0
            });
            
            return res.json(opType);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async updateOperationType(req, res, next) {
        try {
            const { id } = req.params;
            const { name, code, description, unit, normMinutes, sectionId, isActive, sortOrder } = req.body;
            
            const opType = await OperationType.findByPk(id);
            if (!opType) {
                return next(ApiError.notFound("Тип операции не найден"));
            }
            
            if (code && code !== opType.code) {
                const existing = await OperationType.findOne({ where: { code } });
                if (existing) {
                    return next(ApiError.badRequest(`Код "${code}" уже используется`));
                }
            }
            
            await opType.update({
                name: name !== undefined ? name : opType.name,
                code: code !== undefined ? code : opType.code,
                description: description !== undefined ? description : opType.description,
                unit: unit !== undefined ? unit : opType.unit,
                normMinutes: normMinutes !== undefined ? normMinutes : opType.normMinutes,
                sectionId: sectionId !== undefined ? sectionId : opType.sectionId,
                isActive: isActive !== undefined ? isActive : opType.isActive,
                sortOrder: sortOrder !== undefined ? sortOrder : opType.sortOrder
            });
            
            return res.json(opType);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async deleteOperationType(req, res, next) {
        try {
            const { id } = req.params;
            
            const usageCount = await ProductionOutput.count({ 
                where: { operationTypeId: id } 
            });
            
            if (usageCount > 0) {
                await OperationType.update(
                    { isActive: false }, 
                    { where: { id } }
                );
                return res.json({ 
                    message: "Тип операции деактивирован (есть связанные записи)",
                    deactivated: true
                });
            }
            
            await OperationType.destroy({ where: { id } });
            return res.json({ message: "Тип операции удалён", deleted: true });
            
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    // =========================================================================
    // ЗАПИСИ ВЫРАБОТКИ - CRUD
    // =========================================================================

    async getOutputs(req, res, next) {
        try {
            let { 
                page = 1, limit = 50, 
                userId, teamId, sectionId, projectId, taskId,
                operationTypeId, status, 
                dateFrom, dateTo
            } = req.query;
            
            page = Number(page) || 1;
            limit = Math.min(Number(limit) || 50, 200);
            const offset = (page - 1) * limit;

            const where = {};
            
            if (userId) where.userId = Number(userId);
            if (teamId) where.teamId = Number(teamId);
            if (sectionId) where.sectionId = Number(sectionId);
            if (projectId) where.projectId = Number(projectId);
            if (taskId) where.taskId = Number(taskId);
            if (operationTypeId) where.operationTypeId = Number(operationTypeId);
            if (status) where.status = status;
            
            if (dateFrom || dateTo) {
                where.date = {};
                if (dateFrom) where.date[Op.gte] = dateFrom;
                if (dateTo) where.date[Op.lte] = dateTo;
            }

            const { rows, count } = await ProductionOutput.findAndCountAll({
                where,
                limit,
                offset,
                order: [["date", "DESC"], ["createdAt", "DESC"]],
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "surname", "img"] },
                    { model: User, as: "approvedBy", attributes: ["id", "name", "surname"], required: false },
                    { model: User, as: "createdBy", attributes: ["id", "name", "surname"], required: false },
                    { model: OperationType, as: "operationType", attributes: ["id", "name", "code", "unit"], required: false },
                    { model: Team, as: "production_team", attributes: ["id", "title"], required: false },
                    { model: Section, as: "production_section", attributes: ["id", "title"], required: false },
                    { model: Project, as: "project", attributes: ["id", "title"], required: false },
                    { model: ProductionTask, as: "task", attributes: ["id", "title"], required: false }
                ]
            });

            return res.json({ 
                rows, 
                count, 
                page, 
                limit,
                totalPages: Math.ceil(count / limit)
            });
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async getOutputById(req, res, next) {
        try {
            const { id } = req.params;
            
            const output = await ProductionOutput.findByPk(id, {
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "surname", "img"] },
                    { model: User, as: "approvedBy", attributes: ["id", "name", "surname"], required: false },
                    { model: User, as: "createdBy", attributes: ["id", "name", "surname"], required: false },
                    { model: OperationType, as: "operationType", required: false },
                    { model: Team, as: "production_team", attributes: ["id", "title"], required: false },
                    { model: Section, as: "production_section", attributes: ["id", "title"], required: false },
                    { model: Project, as: "project", attributes: ["id", "title"], required: false },
                    { model: ProductionTask, as: "task", attributes: ["id", "title"], required: false }
                ]
            });
            
            if (!output) {
                return next(ApiError.notFound("Запись не найдена"));
            }
            
            return res.json(output);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async createOutput(req, res, next) {
        try {
            const { 
                date, userId, 
                projectId, taskId, operationTypeId,
                claimedQty, comment 
            } = req.body;
            
            const currentUser = req.user;
            
            if (!date) return next(ApiError.badRequest("Укажите дату"));
            if (!userId) return next(ApiError.badRequest("Укажите сотрудника"));
            if (!claimedQty || claimedQty <= 0) {
                return next(ApiError.badRequest("Укажите количество > 0"));
            }
            
            // Получаем целевого пользователя с его бригадой и участком
            const targetUser = await User.findByPk(userId, {
                include: [{
                    model: Team,
                    include: [{ model: Section, foreignKey: "sectionId" }]
                }]
            });
            
            if (!targetUser) {
                return next(ApiError.notFound("Сотрудник не найден"));
            }
            
            const canSubmit = await _canSubmitFor(currentUser, targetUser);
            if (!canSubmit) {
                return next(ApiError.forbidden("Нет прав вносить выработку за этого сотрудника"));
            }
            
            // Берём teamId и sectionId из профиля целевого сотрудника
            const teamId = targetUser.teamId || null;
            const sectionId = targetUser.Team?.Section?.id || null;
            
            const shouldAutoApprove = await _shouldAutoApprove(currentUser, targetUser);
            const status = shouldAutoApprove ? OUTPUT_STATUSES.APPROVED : OUTPUT_STATUSES.PENDING;
            
            const output = await ProductionOutput.create({
                date,
                userId,
                teamId,
                sectionId,
                projectId: projectId || null,
                taskId: taskId || null,
                operationTypeId: operationTypeId || null,
                claimedQty,
                approvedQty: shouldAutoApprove ? claimedQty : 0,
                status,
                approvedById: shouldAutoApprove ? currentUser?.id : null,
                approvedAt: shouldAutoApprove ? new Date() : null,
                createdById: currentUser?.id,
                comment: comment || null
            });
            
            const result = await ProductionOutput.findByPk(output.id, {
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "surname"] },
                    { model: OperationType, as: "operationType", attributes: ["id", "name", "code"], required: false },
                    { model: Project, as: "project", attributes: ["id", "title"], required: false },
                    { model: ProductionTask, as: "task", attributes: ["id", "title"], required: false }
                ]
            });
            
            return res.status(201).json(result);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async updateOutput(req, res, next) {
        try {
            const { id } = req.params;
            const currentUser = req.user;
            const { 
                date, projectId, taskId, operationTypeId, 
                claimedQty, comment 
            } = req.body;
            
            const output = await ProductionOutput.findByPk(id, {
                include: [{ model: User, as: "user" }]
            });
            
            if (!output) {
                return next(ApiError.notFound("Запись не найдена"));
            }
            
            const canEdit = await _canEditOutput(currentUser, output);
            if (!canEdit) {
                return next(ApiError.forbidden("Нет прав на редактирование"));
            }
            
            if (output.status === OUTPUT_STATUSES.APPROVED && !_isAdmin(currentUser)) {
                return next(ApiError.forbidden("Нельзя редактировать подтверждённую запись"));
            }
            
            await output.update({
                date: date !== undefined ? date : output.date,
                projectId: projectId !== undefined ? projectId : output.projectId,
                taskId: taskId !== undefined ? taskId : output.taskId,
                operationTypeId: operationTypeId !== undefined ? operationTypeId : output.operationTypeId,
                claimedQty: claimedQty !== undefined ? claimedQty : output.claimedQty,
                comment: comment !== undefined ? comment : output.comment
            });
            
            return res.json(output);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async deleteOutput(req, res, next) {
        try {
            const { id } = req.params;
            const currentUser = req.user;
            
            const output = await ProductionOutput.findByPk(id);
            if (!output) {
                return next(ApiError.notFound("Запись не найдена"));
            }
            
            const canEdit = await _canEditOutput(currentUser, output);
            if (!canEdit) {
                return next(ApiError.forbidden("Нет прав на удаление"));
            }
            
            if (output.status === OUTPUT_STATUSES.APPROVED && !_isAdmin(currentUser)) {
                return next(ApiError.forbidden("Нельзя удалить подтверждённую запись"));
            }
            
            await output.destroy();
            return res.json({ message: "Запись удалена" });
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    // =========================================================================
    // ПОДТВЕРЖДЕНИЕ / ОТКЛОНЕНИЕ
    // =========================================================================

    async getPendingOutputs(req, res, next) {
        try {
            const currentUser = req.user;
            let { teamId, sectionId, dateFrom, dateTo } = req.query;
            
            const where = { status: OUTPUT_STATUSES.PENDING };
            
            if (_isAdmin(currentUser)) {
                if (teamId) where.teamId = Number(teamId);
                if (sectionId) where.sectionId = Number(sectionId);
            } else if (_isManager(currentUser)) {
                const userSection = await _getUserSection(currentUser);
                where.sectionId = userSection?.id || -1;
            } else if (_isTeamLead(currentUser)) {
                where.teamId = currentUser?.teamId || -1;
            } else {
                where.userId = currentUser?.id;
            }
            
            if (dateFrom) where.date = { ...where.date, [Op.gte]: dateFrom };
            if (dateTo) where.date = { ...where.date, [Op.lte]: dateTo };
            
            const outputs = await ProductionOutput.findAll({
                where,
                order: [["date", "DESC"], ["createdAt", "DESC"]],
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "surname", "img"] },
                    { model: OperationType, as: "operationType", attributes: ["id", "name", "code", "unit"], required: false },
                    { model: Team, as: "production_team", attributes: ["id", "title"], required: false },
                    { model: Project, as: "project", attributes: ["id", "title"], required: false },
                    { model: ProductionTask, as: "task", attributes: ["id", "title"], required: false }
                ]
            });
            
            return res.json(outputs);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async approveOutputs(req, res, next) {
        const t = await sequelize.transaction();
        try {
            const currentUser = req.user;
            const { ids, adjustments } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                await t.rollback();
                return next(ApiError.badRequest("Укажите ID записей"));
            }
            
            const outputs = await ProductionOutput.findAll({
                where: { id: ids, status: OUTPUT_STATUSES.PENDING },
                include: [{ model: User, as: "user" }],
                transaction: t
            });
            
            if (outputs.length === 0) {
                await t.rollback();
                return next(ApiError.notFound("Записи не найдены или уже обработаны"));
            }
            
            const results = [];
            
            for (const output of outputs) {
                const canApprove = await _canApproveFor(currentUser, output);
                if (!canApprove) {
                    results.push({ id: output.id, error: "Нет прав на подтверждение" });
                    continue;
                }
                
                let approvedQty = output.claimedQty;
                let newStatus = OUTPUT_STATUSES.APPROVED;
                
                if (adjustments && adjustments[output.id] !== undefined) {
                    approvedQty = Number(adjustments[output.id]);
                    if (approvedQty !== output.claimedQty) {
                        newStatus = OUTPUT_STATUSES.ADJUSTED;
                    }
                }
                
                await output.update({
                    approvedQty,
                    status: newStatus,
                    approvedById: currentUser?.id,
                    approvedAt: new Date()
                }, { transaction: t });
                
                results.push({ id: output.id, status: newStatus, approvedQty });
            }
            
            await t.commit();
            return res.json({ results });
        } catch (e) {
            await t.rollback();
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async rejectOutputs(req, res, next) {
        const t = await sequelize.transaction();
        try {
            const currentUser = req.user;
            const { ids, reason } = req.body;
            
            if (!ids || !Array.isArray(ids) || ids.length === 0) {
                await t.rollback();
                return next(ApiError.badRequest("Укажите ID записей"));
            }
            
            const outputs = await ProductionOutput.findAll({
                where: { id: ids, status: OUTPUT_STATUSES.PENDING },
                include: [{ model: User, as: "user" }],
                transaction: t
            });
            
            const results = [];
            
            for (const output of outputs) {
                const canApprove = await _canApproveFor(currentUser, output);
                if (!canApprove) {
                    results.push({ id: output.id, error: "Нет прав" });
                    continue;
                }
                
                await output.update({
                    status: OUTPUT_STATUSES.REJECTED,
                    rejectedQty: output.claimedQty,
                    approvedById: currentUser?.id,
                    approvedAt: new Date(),
                    rejectReason: reason || null
                }, { transaction: t });
                
                results.push({ id: output.id, status: OUTPUT_STATUSES.REJECTED });
            }
            
            await t.commit();
            return res.json({ results });
        } catch (e) {
            await t.rollback();
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    // =========================================================================
    // СТАТИСТИКА
    // =========================================================================

    async getUserSummary(req, res, next) {
        try {
            const { userId } = req.params;
            let { dateFrom, dateTo } = req.query;
            
            if (!dateFrom) {
                const now = new Date();
                dateFrom = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
            }
            if (!dateTo) {
                dateTo = new Date().toISOString().split('T')[0];
            }
            
            const where = {
                userId: Number(userId),
                date: { [Op.between]: [dateFrom, dateTo] }
            };
            
            const stats = await ProductionOutput.findAll({
                where,
                attributes: [
                    'status',
                    [sequelize.fn('SUM', sequelize.col('claimedQty')), 'totalClaimed'],
                    [sequelize.fn('SUM', sequelize.col('approvedQty')), 'totalApproved'],
                    [sequelize.fn('COUNT', sequelize.col('id')), 'recordCount']
                ],
                group: ['status'],
                raw: true
            });
            
            const byDay = await ProductionOutput.findAll({
                where: { ...where, status: { [Op.in]: [OUTPUT_STATUSES.APPROVED, OUTPUT_STATUSES.ADJUSTED] } },
                attributes: [
                    'date',
                    [sequelize.fn('SUM', sequelize.col('approvedQty')), 'total']
                ],
                group: ['date'],
                order: [['date', 'ASC']],
                raw: true
            });
            
            return res.json({
                userId: Number(userId),
                period: { dateFrom, dateTo },
                stats,
                byDay
            });
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async getMatrix(req, res, next) {
        try {
            let { 
                teamId, sectionId, projectId, operationTypeId,
                dateFrom, dateTo 
            } = req.query;
            
            if (!dateFrom || !dateTo) {
                const now = new Date();
                const dayOfWeek = now.getDay();
                const monday = new Date(now);
                monday.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1));
                const sunday = new Date(monday);
                sunday.setDate(monday.getDate() + 6);
                
                dateFrom = monday.toISOString().split('T')[0];
                dateTo = sunday.toISOString().split('T')[0];
            }
            
            const where = {
                date: { [Op.between]: [dateFrom, dateTo] },
                status: { [Op.in]: [OUTPUT_STATUSES.APPROVED, OUTPUT_STATUSES.ADJUSTED] }
            };
            
            if (teamId) where.teamId = Number(teamId);
            if (sectionId) where.sectionId = Number(sectionId);
            if (projectId) where.projectId = Number(projectId);
            if (operationTypeId) where.operationTypeId = Number(operationTypeId);
            
            const outputs = await ProductionOutput.findAll({
                where,
                attributes: ['userId', 'date', 'approvedQty'],
                include: [
                    { model: User, as: "user", attributes: ["id", "name", "surname"] }
                ],
                raw: true,
                nest: true
            });
            
            const usersMap = new Map();
            const dates = new Set();
            
            for (const row of outputs) {
                const uid = row.userId;
                const dateStr = row.date;
                const qty = Number(row.approvedQty) || 0;
                
                dates.add(dateStr);
                
                if (!usersMap.has(uid)) {
                    usersMap.set(uid, {
                        userId: uid,
                        name: row.user?.name || '',
                        surname: row.user?.surname || '',
                        days: {},
                        total: 0
                    });
                }
                
                const u = usersMap.get(uid);
                u.days[dateStr] = (u.days[dateStr] || 0) + qty;
                u.total += qty;
            }
            
            const sortedDates = [...dates].sort();
            const matrix = [...usersMap.values()].sort((a, b) => b.total - a.total);
            
            return res.json({
                period: { dateFrom, dateTo },
                dates: sortedDates,
                matrix
            });
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }

    async getMyTeamMembers(req, res, next) {
        try {
            const currentUser = req.user;
            
            let users = [];
            
            if (_isAdmin(currentUser)) {
                // Админ видит всех
                users = await User.findAll({
                    attributes: ["id", "name", "surname", "img", "teamId"],
                    include: [{ model: Team, attributes: ["id", "title"] }],
                    order: [["surname", "ASC"], ["name", "ASC"]]
                });
            } else if (_isManager(currentUser)) {
                // Менеджер видит весь участок
                const section = await _getUserSection(currentUser);
                if (section) {
                    const teams = await Team.findAll({ 
                        where: { sectionId: section.id },
                        attributes: ["id"]
                    });
                    const teamIds = teams.map(t => t.id);
                    
                    if (teamIds.length > 0) {
                        users = await User.findAll({
                            where: { teamId: { [Op.in]: teamIds } },
                            attributes: ["id", "name", "surname", "img", "teamId"],
                            include: [{ model: Team, attributes: ["id", "title"] }],
                            order: [["surname", "ASC"]]
                        });
                    }
                }
            } else if (_isTeamLead(currentUser)) {
                // Бригадир видит свою бригаду
                if (currentUser?.teamId) {
                    users = await User.findAll({
                        where: { teamId: currentUser.teamId },
                        attributes: ["id", "name", "surname", "img", "teamId"],
                        order: [["surname", "ASC"]]
                    });
                }
            } else {
                // Обычный сотрудник видит только себя
                if (currentUser?.id) {
                    users = await User.findAll({
                        where: { id: currentUser.id },
                        attributes: ["id", "name", "surname", "img", "teamId"]
                    });
                }
            }
            
            // Добавляем себя первым
            if (currentUser?.id) {
                const selfIndex = users.findIndex(u => u.id === currentUser.id);
                if (selfIndex > 0) {
                    const [self] = users.splice(selfIndex, 1);
                    users.unshift(self);
                }
            }
            
            return res.json(users);
        } catch (e) {
            console.error(e);
            next(ApiError.internal(e.message));
        }
    }
}

module.exports = new ProductionOutputController();