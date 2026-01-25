const ApiError = require("../error/ApiError");
const { Role, Ability } = require("../models/index");
const KeycloakSyncService = require("../services/KeycloakSyncService");

/**
 * Controller for role management with Keycloak integration.
 */
class RolesController {
  /**
   * List all roles with abilities.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async listRoles(req, res, next) {
    try {
      const roles = await Role.findAll({
        include: [{ model: Ability, as: "abilities", through: { attributes: [] } }],
        order: [
          ["priority", "ASC"],
          ["name", "ASC"],
        ],
      });
      return res.json(roles);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }

  /**
   * Create a role in MES and Keycloak.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async createRole(req, res, next) {
    try {
      const { name, description, priority = 100, abilityIds = [], isActive = true } = req.body;

      if (!name) {
        return next(ApiError.badRequest("Role name is required"));
      }

      const existing = await Role.findOne({ where: { name } });
      if (existing) {
        return next(ApiError.badRequest("Role already exists"));
      }

      const keycloakRole = await KeycloakSyncService.createRoleInKeycloak({
        name,
        description,
        priority,
        isActive,
      });

      if (!keycloakRole) {
        return next(ApiError.internal("Failed to create role in Keycloak"));
      }

      const role = await Role.create({
        name,
        description,
        priority,
        keycloakId: keycloakRole.id || null,
        keycloakName: keycloakRole.name || name,
        isActive,
        isSystem: false,
        syncedAt: new Date(),
      });

      if (abilityIds.length) {
        await role.setAbilities(abilityIds);
      }

      return res.status(201).json(role);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }

  /**
   * Update role priority and abilities.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async updateRole(req, res, next) {
    try {
      const { id } = req.params;
      const { description, priority, abilityIds, isActive } = req.body;

      const role = await Role.findByPk(id);
      if (!role) {
        return next(ApiError.badRequest("Role not found"));
      }

      const updates = {};
      if (description !== undefined) updates.description = description;
      if (priority !== undefined) updates.priority = priority;
      if (isActive !== undefined) updates.isActive = isActive;
      if (Object.keys(updates).length) updates.syncedAt = new Date();

      await role.update(updates);

      if (Array.isArray(abilityIds)) {
        await role.setAbilities(abilityIds);
      }

      if (role.keycloakName) {
        await KeycloakSyncService.updateRoleInKeycloak(role.keycloakName, {
          description: role.description,
          priority: role.priority,
          isActive: role.isActive,
        });
      }

      return res.json(role);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }

  /**
   * Delete role in MES and Keycloak.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async deleteRole(req, res, next) {
    try {
      const { id } = req.params;
      const role = await Role.findByPk(id);
      if (!role) {
        return next(ApiError.badRequest("Role not found"));
      }

      if (role.keycloakName) {
        await KeycloakSyncService.deleteRoleFromKeycloak(role.keycloakName);
      }

      await role.destroy();
      return res.json({ message: "Role deleted" });
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }

  /**
   * Trigger manual sync from Keycloak.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async syncRoles(req, res, next) {
    try {
      const result = await KeycloakSyncService.syncRolesFromKeycloak();
      return res.json(result);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }

  /**
   * View Keycloak roles.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   */
  async listKeycloakRoles(req, res, next) {
    try {
      const roles = await KeycloakSyncService.getKeycloakRoles();
      return res.json(roles);
    } catch (error) {
      return next(ApiError.internal(error.message));
    }
  }
}

module.exports = new RolesController();
