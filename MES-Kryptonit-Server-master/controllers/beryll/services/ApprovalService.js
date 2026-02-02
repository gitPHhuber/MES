
const { Op } = require("sequelize");
const sequelize = require("../../../db");

const {
  BeryllServer,
  BeryllServerChecklist,
  BeryllChecklistTemplate,
  BeryllChecklistFile,
  BeryllHistory,
  HISTORY_ACTIONS,
  CHECKLIST_GROUPS
} = require("../../../models/definitions/BeryllExtended");

const {
  BeryllServerApproval,
  CHECKLIST_STAGES,
  APPROVAL_STATUSES
} = require("../../../models/BeryllServerApproval");

const User = require("../../../models/User");

class ApprovalService {
  

  
  /**
   * Отправить сервер на верификацию (завершить этап сборки)
   * @param {number} serverId - ID сервера
   * @param {number} userId - ID пользователя-отправителя
   * @param {string} stageCode - Код стадии (ASSEMBLY)
   * @returns {Promise<Object>} Созданная запись апрува
   */
  async submitForVerification(serverId, userId, stageCode = CHECKLIST_STAGES.ASSEMBLY) {
    const transaction = await sequelize.transaction();
    
    try {

      const server = await BeryllServer.findByPk(serverId);
      if (!server) {
        throw new Error("Сервер не найден");
      }


      const existingPending = await BeryllServerApproval.findOne({
        where: {
          serverId,
          stageCode,
          status: APPROVAL_STATUSES.PENDING
        },
        transaction
      });

      if (existingPending) {
        throw new Error("Сервер уже ожидает проверки на этой стадии");
      }

      const completionCheck = await this.checkStageCompletion(serverId, stageCode, transaction);
      if (!completionCheck.isComplete) {
        throw new Error(`Не все обязательные пункты чеклиста выполнены. Осталось: ${completionCheck.remaining.join(", ")}`);
      }


      const checklistSnapshot = await this.getChecklistSnapshot(serverId, stageCode, transaction);

      const approval = await BeryllServerApproval.create({
        serverId,
        stageCode,
        status: APPROVAL_STATUSES.PENDING,
        submittedById: userId,
        submittedAt: new Date(),
        metadata: {
          checklistSnapshot,
          serverData: {
            serialNumber: server.serialNumber,
            apkSerialNumber: server.apkSerialNumber,
            hostname: server.hostname,
            ipAddress: server.ipAddress,
            status: server.status
          }
        }
      }, { transaction });

      await BeryllHistory.create({
        serverId,
        userId,
        action: HISTORY_ACTIONS.STATUS_CHANGE,
        fromStatus: server.status,
        toStatus: server.status,
        comment: `Сервер отправлен на верификацию (стадия: ${stageCode})`,
        metadata: { approvalId: approval.id, stageCode }
      }, { transaction });

      await transaction.commit();


      return await this.getApprovalById(approval.id);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async checkStageCompletion(serverId, stageCode, transaction = null) {

    const templates = await BeryllChecklistTemplate.findAll({
      where: {
        stageCode,
        isActive: true,
        isRequired: true
      },
      transaction
    });

    if (templates.length === 0) {
      return { isComplete: true, remaining: [], total: 0, completed: 0 };
    }

    const serverChecklists = await BeryllServerChecklist.findAll({
      where: {
        serverId,
        checklistTemplateId: { [Op.in]: templates.map(t => t.id) }
      },
      include: [{
        model: BeryllChecklistTemplate,
        as: "template"
      }],
      transaction
    });

    const completedIds = new Set(
      serverChecklists
        .filter(sc => sc.completed)
        .map(sc => sc.checklistTemplateId)
    );

    const remaining = templates
      .filter(t => !completedIds.has(t.id))
      .map(t => t.title);

    return {
      isComplete: remaining.length === 0,
      remaining,
      total: templates.length,
      completed: completedIds.size
    };
  }


  async getChecklistSnapshot(serverId, stageCode, transaction = null) {
    const checklists = await BeryllServerChecklist.findAll({
      where: { serverId },
      include: [
        {
          model: BeryllChecklistTemplate,
          as: "template",
          where: { stageCode },
          required: true
        },
        {
          model: BeryllChecklistFile,
          as: "files"
        },
        {
          model: User,
          as: "completedBy",
          attributes: ["id", "login", "name", "surname"]
        }
      ],
      transaction
    });

    return checklists.map(cl => ({
      templateId: cl.checklistTemplateId,
      title: cl.template?.title,
      groupCode: cl.template?.groupCode,
      completed: cl.completed,
      completedAt: cl.completedAt,
      completedBy: cl.completedBy ? {
        id: cl.completedBy.id,
        name: `${cl.completedBy.name || ''} ${cl.completedBy.surname || ''}`.trim() || cl.completedBy.login
      } : null,
      notes: cl.notes,
      filesCount: cl.files?.length || 0
    }));
  }


  async approveServer(approvalId, reviewerId, comment = null) {
    const transaction = await sequelize.transaction();
    
    try {
      const approval = await BeryllServerApproval.findByPk(approvalId, { transaction });
      
      if (!approval) {
        throw new Error("Запись верификации не найдена");
      }

      if (approval.status !== APPROVAL_STATUSES.PENDING) {
        throw new Error("Эта запись уже обработана");
      }


      approval.status = APPROVAL_STATUSES.APPROVED;
      approval.reviewedById = reviewerId;
      approval.reviewedAt = new Date();
      approval.comment = comment;
      await approval.save({ transaction });


      await BeryllHistory.create({
        serverId: approval.serverId,
        userId: reviewerId,
        action: HISTORY_ACTIONS.STATUS_CHANGE,
        comment: `Верификация одобрена${comment ? `: ${comment}` : ''}`,
        metadata: { approvalId, stageCode: approval.stageCode }
      }, { transaction });

      await transaction.commit();

      return await this.getApprovalById(approvalId);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async rejectServer(approvalId, reviewerId, comment) {
    if (!comment?.trim()) {
      throw new Error("Укажите причину отклонения");
    }

    const transaction = await sequelize.transaction();
    
    try {
      const approval = await BeryllServerApproval.findByPk(approvalId, { transaction });
      
      if (!approval) {
        throw new Error("Запись верификации не найдена");
      }

      if (approval.status !== APPROVAL_STATUSES.PENDING) {
        throw new Error("Эта запись уже обработана");
      }


      approval.status = APPROVAL_STATUSES.REJECTED;
      approval.reviewedById = reviewerId;
      approval.reviewedAt = new Date();
      approval.comment = comment;
      await approval.save({ transaction });


      await BeryllHistory.create({
        serverId: approval.serverId,
        userId: reviewerId,
        action: HISTORY_ACTIONS.STATUS_CHANGE,
        comment: `Верификация отклонена: ${comment}`,
        metadata: { approvalId, stageCode: approval.stageCode }
      }, { transaction });

      await transaction.commit();

      return await this.getApprovalById(approvalId);
      
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }


  async getApprovalById(approvalId) {
    return await BeryllServerApproval.findByPk(approvalId, {
      include: [
        {
          model: BeryllServer,
          as: "server",
          attributes: ["id", "serialNumber", "apkSerialNumber", "hostname", "ipAddress", "status"]
        },
        {
          model: User,
          as: "submittedBy",
          attributes: ["id", "login", "name", "surname"]
        },
        {
          model: User,
          as: "reviewedBy",
          attributes: ["id", "login", "name", "surname"]
        }
      ]
    });
  }


  async getVerificationQueue(options = {}) {
    const {
      stageCode = null,
      page = 1,
      limit = 20,
      sortBy = "submittedAt",
      sortOrder = "ASC"
    } = options;

    const where = {
      status: APPROVAL_STATUSES.PENDING
    };

    if (stageCode) {
      where.stageCode = stageCode;
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await BeryllServerApproval.findAndCountAll({
      where,
      include: [
        {
          model: BeryllServer,
          as: "server",
          attributes: ["id", "serialNumber", "apkSerialNumber", "hostname", "ipAddress", "status", "batchId"],
          include: [
            {
              model: BeryllServerChecklist,
              as: "checklists",
              include: [
                { model: BeryllChecklistFile, as: "files" }
              ]
            }
          ]
        },
        {
          model: User,
          as: "submittedBy",
          attributes: ["id", "login", "name", "surname"]
        }
      ],
      order: [[sortBy, sortOrder]],
      limit,
      offset
    });

    return {
      items: rows,
      total: count,
      page,
      limit,
      totalPages: Math.ceil(count / limit)
    };
  }


  async getServerApprovalHistory(serverId) {
    return await BeryllServerApproval.findAll({
      where: { serverId },
      include: [
        {
          model: User,
          as: "submittedBy",
          attributes: ["id", "login", "name", "surname"]
        },
        {
          model: User,
          as: "reviewedBy",
          attributes: ["id", "login", "name", "surname"]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
  }


  async getServerVerificationStatus(serverId) {

    const stages = Object.values(CHECKLIST_STAGES);
    const result = {};

    for (const stage of stages) {
      const latestApproval = await BeryllServerApproval.findOne({
        where: { serverId, stageCode: stage },
        order: [["createdAt", "DESC"]],
        include: [
          { model: User, as: "submittedBy", attributes: ["id", "login", "name", "surname"] },
          { model: User, as: "reviewedBy", attributes: ["id", "login", "name", "surname"] }
        ]
      });

      const completion = await this.checkStageCompletion(serverId, stage);

      result[stage] = {
        stageCode: stage,
        latestApproval: latestApproval ? {
          id: latestApproval.id,
          status: latestApproval.status,
          submittedBy: latestApproval.submittedBy,
          submittedAt: latestApproval.submittedAt,
          reviewedBy: latestApproval.reviewedBy,
          reviewedAt: latestApproval.reviewedAt,
          comment: latestApproval.comment
        } : null,
        completion,
        canSubmit: completion.isComplete && (!latestApproval || latestApproval.status !== APPROVAL_STATUSES.PENDING)
      };
    }

    return result;
  }


  async getVerificationDetails(approvalId) {
    const approval = await this.getApprovalById(approvalId);
    
    if (!approval) {
      throw new Error("Запись верификации не найдена");
    }

    const checklists = await BeryllServerChecklist.findAll({
      where: { serverId: approval.serverId },
      include: [
        {
          model: BeryllChecklistTemplate,
          as: "template",
          where: { stageCode: approval.stageCode },
          required: true
        },
        {
          model: BeryllChecklistFile,
          as: "files",
          include: [
            { model: User, as: "uploadedBy", attributes: ["id", "login", "name", "surname"] }
          ]
        },
        {
          model: User,
          as: "completedBy",
          attributes: ["id", "login", "name", "surname"]
        }
      ],
      order: [[{ model: BeryllChecklistTemplate, as: "template" }, "sortOrder", "ASC"]]
    });

    const groupedChecklists = {};
    for (const cl of checklists) {
      const groupCode = cl.template?.groupCode || "OTHER";
      if (!groupedChecklists[groupCode]) {
        groupedChecklists[groupCode] = [];
      }
      groupedChecklists[groupCode].push(cl);
    }

    return {
      approval,
      checklists: groupedChecklists,
      server: approval.server,
      metadata: approval.metadata
    };
  }


  async getVerificationStats() {
    const pendingCount = await BeryllServerApproval.count({
      where: { status: APPROVAL_STATUSES.PENDING }
    });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const approvedToday = await BeryllServerApproval.count({
      where: {
        status: APPROVAL_STATUSES.APPROVED,
        reviewedAt: { [Op.gte]: todayStart }
      }
    });

    const rejectedToday = await BeryllServerApproval.count({
      where: {
        status: APPROVAL_STATUSES.REJECTED,
        reviewedAt: { [Op.gte]: todayStart }
      }
    });

    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const recentApprovals = await BeryllServerApproval.findAll({
      where: {
        status: { [Op.in]: [APPROVAL_STATUSES.APPROVED, APPROVAL_STATUSES.REJECTED] },
        reviewedAt: { [Op.gte]: weekAgo }
      },
      attributes: ["submittedAt", "reviewedAt"]
    });

    let avgMinutes = 0;
    if (recentApprovals.length > 0) {
      const totalMinutes = recentApprovals.reduce((sum, a) => {
        const diff = new Date(a.reviewedAt) - new Date(a.submittedAt);
        return sum + diff / 1000 / 60;
      }, 0);
      avgMinutes = Math.round(totalMinutes / recentApprovals.length);
    }

    return {
      pending: pendingCount,
      approvedToday,
      rejectedToday,
      avgVerificationMinutes: avgMinutes
    };
  }
}

module.exports = new ApprovalService();