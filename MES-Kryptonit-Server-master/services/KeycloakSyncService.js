const axios = require("axios");
const { Op } = require("sequelize");
const { Role } = require("../models/index");
const logger = require("./logger");

const SYSTEM_ROLES = [
  "offline_access",
  "uma_authorization",
  "default-roles-mes-realm",
  "admin",
  "create-realm",
];

/**
 * Service for syncing roles between Keycloak and MES.
 */
class KeycloakSyncService {
  /**
   * Get Keycloak base URL without trailing slash.
   * @returns {string}
   */
  static getKeycloakBaseUrl() {
    const baseUrl = process.env.KEYCLOAK_URL || "";
    return baseUrl.replace(/\/$/, "");
  }

  /**
   * Get Keycloak realm name.
   * @returns {string}
   */
  static getRealm() {
    return process.env.KEYCLOAK_REALM || "";
  }

  /**
   * Get admin client credentials.
   * @returns {{clientId: string, clientSecret: string}}
   */
  static getAdminCredentials() {
    return {
      clientId: process.env.KEYCLOAK_ADMIN_CLIENT_ID || "",
      clientSecret: process.env.KEYCLOAK_ADMIN_CLIENT_SECRET || "",
    };
  }

  /**
   * Timeout for Keycloak API requests (ms).
   * @returns {number}
   */
  static getRequestTimeoutMs() {
    return Number(process.env.KEYCLOAK_TIMEOUT_MS) || 5000;
  }

  /**
   * Fetch admin token for Keycloak Admin API.
   * @returns {Promise<string|null>}
   */
  static async getAdminToken() {
    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();
    const { clientId, clientSecret } = KeycloakSyncService.getAdminCredentials();

    if (!baseUrl || !realm || !clientId || !clientSecret) {
      logger.warn("⚠️ [Keycloak] Missing admin credentials or realm settings.");
      return null;
    }

    try {
      const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
      const payload = new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      });

      const response = await axios.post(tokenUrl, payload.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: KeycloakSyncService.getRequestTimeoutMs(),
      });

      return response.data?.access_token || null;
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to fetch admin token:", error.message);
      return null;
    }
  }

  /**
   * Fetch all Keycloak realm roles excluding system roles.
   * @returns {Promise<Array>}
   */
  static async getKeycloakRoles() {
    const token = await KeycloakSyncService.getAdminToken();
    if (!token) return [];

    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();

    try {
      const response = await axios.get(`${baseUrl}/admin/realms/${realm}/roles`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: KeycloakSyncService.getRequestTimeoutMs(),
      });

      const roles = response.data || [];
      return roles.filter((role) => !SYSTEM_ROLES.includes(role.name));
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to fetch roles:", error.message);
      return [];
    }
  }

  /**
   * Sync roles from Keycloak to MES.
   * @returns {Promise<{created:number, updated:number, deactivated:number}>}
   */
  static async syncRolesFromKeycloak() {
    const roles = await KeycloakSyncService.getKeycloakRoles();
    const now = new Date();

    if (!roles.length) {
      logger.warn("⚠️ [Keycloak] No roles received for sync.");
      return { created: 0, updated: 0, deactivated: 0 };
    }

    let created = 0;
    let updated = 0;

    for (const role of roles) {
      const attributes = KeycloakSyncService.parseRoleAttributes(role);

      let dbRole = null;
      if (role.id) {
        dbRole = await Role.findOne({ where: { keycloakId: role.id } });
      }
      if (!dbRole) {
        dbRole = await Role.findOne({ where: { name: role.name } });
      }

      const rolePayload = {
        name: role.name,
        description: attributes.description || role.description || null,
        priority: attributes.priority ?? 100,
        keycloakId: role.id || null,
        keycloakName: role.name,
        isActive: attributes.isActive ?? true,
        isSystem: false,
        syncedAt: now,
      };

      if (!dbRole) {
        await Role.create(rolePayload);
        created += 1;
      } else {
        await dbRole.update(rolePayload);
        updated += 1;
      }
    }

    const keycloakIds = roles
      .map((role) => role.id)
      .filter((id) => Boolean(id));

    let deactivated = 0;
    if (keycloakIds.length) {
      const [deactivateCount] = await Role.update(
        { isActive: false, syncedAt: now },
        {
          where: {
            keycloakId: { [Op.notIn]: keycloakIds },
            isSystem: false,
          },
        }
      );
      deactivated = deactivateCount;
    }

    return { created, updated, deactivated };
  }

  /**
   * Create a role in Keycloak.
   * @param {{name:string, description?:string, priority?:number, isActive?:boolean}} roleData
   * @returns {Promise<Object|null>}
   */
  static async createRoleInKeycloak(roleData) {
    const token = await KeycloakSyncService.getAdminToken();
    if (!token) return null;

    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();
    const payload = {
      name: roleData.name,
      description: roleData.description || "",
      attributes: {
        priority: [String(roleData.priority ?? 100)],
        isActive: [String(roleData.isActive ?? true)],
        description: [roleData.description || ""],
      },
    };

    try {
      await axios.post(`${baseUrl}/admin/realms/${realm}/roles`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: KeycloakSyncService.getRequestTimeoutMs(),
      });

      const roleResponse = await axios.get(
        `${baseUrl}/admin/realms/${realm}/roles/${roleData.name}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: KeycloakSyncService.getRequestTimeoutMs(),
        }
      );

      return roleResponse.data || null;
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to create role:", error.message);
      return null;
    }
  }

  /**
   * Update role attributes in Keycloak.
   * @param {string} roleName
   * @param {{description?:string, priority?:number, isActive?:boolean}} roleData
   * @returns {Promise<boolean>}
   */
  static async updateRoleInKeycloak(roleName, roleData) {
    const token = await KeycloakSyncService.getAdminToken();
    if (!token) return false;

    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();
    const payload = {
      name: roleName,
      description: roleData.description || "",
      attributes: {
        priority: [String(roleData.priority ?? 100)],
        isActive: [String(roleData.isActive ?? true)],
        description: [roleData.description || ""],
      },
    };

    try {
      await axios.put(`${baseUrl}/admin/realms/${realm}/roles/${roleName}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: KeycloakSyncService.getRequestTimeoutMs(),
      });
      return true;
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to update role:", error.message);
      return false;
    }
  }

  /**
   * Delete role from Keycloak.
   * @param {string} roleName
   * @returns {Promise<boolean>}
   */
  static async deleteRoleFromKeycloak(roleName) {
    const token = await KeycloakSyncService.getAdminToken();
    if (!token) return false;

    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();

    try {
      await axios.delete(`${baseUrl}/admin/realms/${realm}/roles/${roleName}`, {
        headers: { Authorization: `Bearer ${token}` },
        timeout: KeycloakSyncService.getRequestTimeoutMs(),
      });
      return true;
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to delete role:", error.message);
      return false;
    }
  }

  /**
   * Assign role to a user in Keycloak.
   * @param {string} userId
   * @param {string} roleName
   * @returns {Promise<boolean>}
   */
  static async assignRoleToUser(userId, roleName) {
    const token = await KeycloakSyncService.getAdminToken();
    if (!token) return false;

    const baseUrl = KeycloakSyncService.getKeycloakBaseUrl();
    const realm = KeycloakSyncService.getRealm();

    try {
      const roleResponse = await axios.get(
        `${baseUrl}/admin/realms/${realm}/roles/${roleName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: KeycloakSyncService.getRequestTimeoutMs(),
        }
      );

      const roleRepresentation = roleResponse.data;
      if (!roleRepresentation) return false;

      await axios.post(
        `${baseUrl}/admin/realms/${realm}/users/${userId}/role-mappings/realm`,
        [roleRepresentation],
        {
          headers: { Authorization: `Bearer ${token}` },
          timeout: KeycloakSyncService.getRequestTimeoutMs(),
        }
      );

      return true;
    } catch (error) {
      logger.error("❌ [Keycloak] Failed to assign role:", error.message);
      return false;
    }
  }

  /**
   * Get roles ordered by priority from DB.
   * @returns {Promise<string[]>}
   */
  static async getPriorityRoles() {
    const roles = await Role.findAll({
      where: { isActive: true, isSystem: false },
      order: [
        ["priority", "ASC"],
        ["name", "ASC"],
      ],
    });

    return roles.map((role) => role.name);
  }

  /**
   * Determine user's main role from Keycloak role list.
   * @param {string[]} kcRoles
   * @returns {Promise<string>}
   */
  static async getMainRole(kcRoles) {
    const priorityRoles = await KeycloakSyncService.getPriorityRoles();
    const mainRole =
      priorityRoles.find((role) => kcRoles.includes(role)) || "ASSEMBLER";

    return mainRole;
  }

  /**
   * Parse Keycloak role attributes into MES fields.
   * @param {{attributes?: object, description?: string}} role
   * @returns {{priority: number|null, isActive: boolean|null, description: string|null}}
   */
  static parseRoleAttributes(role) {
    const attributes = role.attributes || {};
    const rawPriority = attributes.priority?.[0];
    const rawIsActive = attributes.isActive?.[0];
    const rawDescription = attributes.description?.[0];

    return {
      priority: rawPriority ? Number(rawPriority) : null,
      isActive:
        rawIsActive === undefined ? null : rawIsActive === "true" || rawIsActive === true,
      description: rawDescription || null,
    };
  }
}

module.exports = KeycloakSyncService;
