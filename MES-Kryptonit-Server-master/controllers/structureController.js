const { Section, Team, User } = require("../models/index");
const ApiError = require("../error/ApiError");
const { logAudit } = require("../utils/auditLogger");
const { Op } = require("sequelize");
const logger = require("../services/logger");
const { buildRequestLogContext } = require("../utils/logging");

class StructureController {
  // Получить всю структуру (Секции -> Бригады -> Люди)
  async getFullStructure(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      logger.info("Structure full db start", { ...logContext, step: "db_start" });
      const structure = await Section.findAll({
        include: [
          {
            model: User,
            as: "manager",
            attributes: ["id", "name", "surname", "img"],
          },
          {
            model: Team,
            include: [
              {
                model: User,
                as: "teamLead",
                attributes: ["id", "name", "surname", "img"],
              },
              {
                model: User,
                attributes: ["id", "name", "surname", "img"],
              },
            ],
          },
        ],
        order: [["id", "ASC"]],
      });
      logger.info("Structure full db ok", {
        ...logContext,
        step: "db_ok",
        sectionsCount: structure.length,
      });
      return res.json(structure);
    } catch (e) {
      logger.error("Structure full db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  // Получить сотрудников, не привязанных к бригадам
  async getUnassignedUsers(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      logger.info("Structure unassigned users db start", { ...logContext, step: "db_start" });
      const users = await User.findAll({
        where: {
          teamId: { [Op.is]: null }, 
          role: { [Op.notIn]: ["SUPER_ADMIN"] } 
        },
        attributes: ["id", "name", "surname", "login", "role", "img"],
        order: [["surname", "ASC"]]
      });
      logger.info("Structure unassigned users db ok", {
        ...logContext,
        step: "db_ok",
        usersCount: users.length,
      });
      return res.json(users);
    } catch (e) {
      logger.error("Structure unassigned users db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async createSection(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { title } = req.body;
      logger.info("Structure section create db start", {
        ...logContext,
        step: "db_start",
        title,
      });
      const section = await Section.create({ title });

      await logAudit({
        req,
        action: "SECTION_CREATE",
        entity: "Section",
        entityId: section.id,
        description: `Создан участок "${title}"`,
      });

      logger.info("Structure section create db ok", {
        ...logContext,
        step: "db_ok",
        sectionId: section.id,
      });
      return res.json(section);
    } catch (e) {
      logger.error("Structure section create db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async createTeam(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { title, sectionId } = req.body;

      logger.info("Structure team create db start", {
        ...logContext,
        step: "db_start",
        title,
        sectionId,
      });
      const team = await Team.create({ title, sectionId });

      await logAudit({
        req,
        action: "TEAM_CREATE",
        entity: "Team",
        entityId: team.id,
        description: `Создана бригада "${title}" в участке ${sectionId}`,
      });

      logger.info("Structure team create db ok", {
        ...logContext,
        step: "db_ok",
        teamId: team.id,
      });
      return res.json(team);
    } catch (e) {
      logger.error("Structure team create db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async assignSectionManager(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { sectionId, userId } = req.body;

      logger.info("Structure assign manager db start", {
        ...logContext,
        step: "db_start",
        sectionId,
        userId,
      });
      await Section.update({ managerId: userId }, { where: { id: sectionId } });

      await logAudit({
        req,
        action: "ASSIGN_MANAGER",
        entity: "Section",
        entityId: sectionId,
        description: `Назначен начальник участка: userId=${userId}`,
      });

      logger.info("Structure assign manager db ok", {
        ...logContext,
        step: "db_ok",
        sectionId,
        userId,
      });
      return res.json({ message: "Manager assigned" });
    } catch (e) {
      logger.error("Structure assign manager db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async assignTeamLead(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { teamId, userId } = req.body;

      logger.info("Structure assign team lead db start", {
        ...logContext,
        step: "db_start",
        teamId,
        userId,
      });
      await Team.update({ teamLeadId: userId }, { where: { id: teamId } });

      await logAudit({
        req,
        action: "ASSIGN_LEAD",
        entity: "Team",
        entityId: teamId,
        description: `Назначен старший бригады: userId=${userId}`,
      });

      logger.info("Structure assign team lead db ok", {
        ...logContext,
        step: "db_ok",
        teamId,
        userId,
      });
      return res.json({ message: "Team Lead assigned" });
    } catch (e) {
      logger.error("Structure assign team lead db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async addMemberToTeam(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { teamId, userId } = req.body;

      logger.info("Structure add member db start", {
        ...logContext,
        step: "db_start",
        teamId,
        userId,
      });
      await User.update({ teamId }, { where: { id: userId } });

      await logAudit({
        req,
        action: "ADD_MEMBER",
        entity: "User",
        entityId: userId,
        description: `Сотрудник добавлен в бригаду ${teamId}`,
      });

      logger.info("Structure add member db ok", {
        ...logContext,
        step: "db_ok",
        teamId,
        userId,
      });
      return res.json({ message: "User added to team" });
    } catch (e) {
      logger.error("Structure add member db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }

  async removeMemberFromTeam(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { userId } = req.body;

      logger.info("Structure remove member db start", {
        ...logContext,
        step: "db_start",
        userId,
      });
      await User.update({ teamId: null }, { where: { id: userId } });

      await logAudit({
        req,
        action: "REMOVE_MEMBER",
        entity: "User",
        entityId: userId,
        description: `Сотрудник исключён из бригады`,
      });

      logger.info("Structure remove member db ok", {
        ...logContext,
        step: "db_ok",
        userId,
      });
      return res.json({ message: "User removed from team" });
    } catch (e) {
      logger.error("Structure remove member db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: e.message,
      });
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new StructureController();
