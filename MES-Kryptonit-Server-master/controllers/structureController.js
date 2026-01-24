const { Section, Team, User } = require("../models/index");
const ApiError = require("../error/ApiError");
const { logAudit } = require("../utils/auditLogger");
const { Op } = require("sequelize");

class StructureController {
  // Получить всю структуру (Секции -> Бригады -> Люди)
  async getFullStructure(req, res, next) {
    try {
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
      return res.json(structure);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  // Получить сотрудников, не привязанных к бригадам
  async getUnassignedUsers(req, res, next) {
    try {
      const users = await User.findAll({
        where: {
          teamId: { [Op.is]: null }, 
          role: { [Op.notIn]: ["SUPER_ADMIN"] } 
        },
        attributes: ["id", "name", "surname", "login", "role", "img"],
        order: [["surname", "ASC"]]
      });
      return res.json(users);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async createSection(req, res, next) {
    try {
      const { title } = req.body;
      const section = await Section.create({ title });

      await logAudit({
        req,
        action: "SECTION_CREATE",
        entity: "Section",
        entityId: section.id,
        description: `Создан участок "${title}"`,
      });

      return res.json(section);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async createTeam(req, res, next) {
    try {
      const { title, sectionId } = req.body;

      const team = await Team.create({ title, sectionId });

      await logAudit({
        req,
        action: "TEAM_CREATE",
        entity: "Team",
        entityId: team.id,
        description: `Создана бригада "${title}" в участке ${sectionId}`,
      });

      return res.json(team);
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async assignSectionManager(req, res, next) {
    try {
      const { sectionId, userId } = req.body;

      await Section.update({ managerId: userId }, { where: { id: sectionId } });

      await logAudit({
        req,
        action: "ASSIGN_MANAGER",
        entity: "Section",
        entityId: sectionId,
        description: `Назначен начальник участка: userId=${userId}`,
      });

      return res.json({ message: "Manager assigned" });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async assignTeamLead(req, res, next) {
    try {
      const { teamId, userId } = req.body;

      await Team.update({ teamLeadId: userId }, { where: { id: teamId } });

      await logAudit({
        req,
        action: "ASSIGN_LEAD",
        entity: "Team",
        entityId: teamId,
        description: `Назначен старший бригады: userId=${userId}`,
      });

      return res.json({ message: "Team Lead assigned" });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async addMemberToTeam(req, res, next) {
    try {
      const { teamId, userId } = req.body;

      await User.update({ teamId }, { where: { id: userId } });

      await logAudit({
        req,
        action: "ADD_MEMBER",
        entity: "User",
        entityId: userId,
        description: `Сотрудник добавлен в бригаду ${teamId}`,
      });

      return res.json({ message: "User added to team" });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }

  async removeMemberFromTeam(req, res, next) {
    try {
      const { userId } = req.body;

      await User.update({ teamId: null }, { where: { id: userId } });

      await logAudit({
        req,
        action: "REMOVE_MEMBER",
        entity: "User",
        entityId: userId,
        description: `Сотрудник исключён из бригады`,
      });

      return res.json({ message: "User removed from team" });
    } catch (e) {
      next(ApiError.badRequest(e.message));
    }
  }
}

module.exports = new StructureController();