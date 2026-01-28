/**
 * Централизованный логгер аудита для MES Kryptonit
 * 
 * Поддерживаемые сущности и действия:
 * 
 * СЕССИИ (SESSION):
 *   - SESSION_START, SESSION_END, SESSION_DELETE, SESSION_AUTO_OFF, SESSION_FORCE_OFF
 * 
 * СЕРВЕРЫ (BeryllServer, BeryllBatch, BeryllRack, BeryllCluster):
 *   - SERVER_CREATE, SERVER_UPDATE, SERVER_DELETE, SERVER_STATUS_CHANGE
 *   - BATCH_CREATE, BATCH_UPDATE, BATCH_DELETE
 *   - RACK_CREATE, RACK_UPDATE, RACK_DELETE
 *   - CLUSTER_CREATE, CLUSTER_UPDATE, CLUSTER_SHIP
 *   - SERVER_DHCP_SYNC, SERVER_BMC_SYNC
 * 
 * ДЕФЕКТЫ (BeryllDefectRecord, BoardDefect):
 *   - DEFECT_CREATE, DEFECT_UPDATE, DEFECT_RESOLVE, DEFECT_CLOSE
 *   - DEFECT_FILE_UPLOAD, DEFECT_FILE_DELETE
 *   - REPAIR_ACTION_ADD, REPAIR_ACTION_UPDATE
 *   - YADRO_TICKET_CREATE, YADRO_TICKET_UPDATE, YADRO_TICKET_RECEIVE
 * 
 * СКЛАД (WarehouseMovement, InventoryBox, Supply):
 *   - WAREHOUSE_MOVE, WAREHOUSE_MOVE_BATCH
 *   - BOX_CREATE, BOX_UPDATE, BOX_DELETE, BOX_SPLIT, BOX_MERGE
 *   - SUPPLY_CREATE, SUPPLY_UPDATE, SUPPLY_RECEIVE
 * 
 * КОМПОНЕНТЫ (ComponentInventory, ComponentHistory):
 *   - COMPONENT_CREATE, COMPONENT_UPDATE, COMPONENT_DELETE
 *   - COMPONENT_SYNC, COMPONENT_REPLACE, COMPONENT_TRANSFER
 * 
 * ПРОИЗВОДСТВО (ProductionEntry, AssembledProduct):
 *   - PRODUCTION_ENTRY_CREATE, PRODUCTION_ENTRY_APPROVE, PRODUCTION_ENTRY_REJECT
 *   - PRODUCT_ASSEMBLE, PRODUCT_QC_PASS, PRODUCT_QC_FAIL
 * 
 * СТРУКТУРА (Section, Team):
 *   - SECTION_CREATE, SECTION_UPDATE, SECTION_DELETE
 *   - TEAM_CREATE, TEAM_UPDATE, TEAM_DELETE
 * 
 * ПРАВА (Role, Ability, RoleAbility):
 *   - ROLE_CREATE, ROLE_UPDATE, ROLE_DELETE
 *   - ABILITY_CREATE, ABILITY_DELETE
 *   - ROLE_ABILITY_GRANT, ROLE_ABILITY_REVOKE
 * 
 * ПОЛЬЗОВАТЕЛИ (User):
 *   - USER_CREATE, USER_UPDATE, USER_DELETE, USER_ROLE_CHANGE
 */

const { AuditLog } = require("../models/index");

// ===== КОНСТАНТЫ ДЕЙСТВИЙ =====
const AUDIT_ACTIONS = {
  // Сессии
  SESSION_START: "SESSION_START",
  SESSION_END: "SESSION_END",
  SESSION_DELETE: "SESSION_DELETE",
  SESSION_AUTO_OFF: "SESSION_AUTO_OFF",
  SESSION_FORCE_OFF: "SESSION_FORCE_OFF",

  // Серверы Beryll
  SERVER_CREATE: "SERVER_CREATE",
  SERVER_UPDATE: "SERVER_UPDATE",
  SERVER_DELETE: "SERVER_DELETE",
  SERVER_STATUS_CHANGE: "SERVER_STATUS_CHANGE",
  SERVER_DHCP_SYNC: "SERVER_DHCP_SYNC",
  SERVER_BMC_SYNC: "SERVER_BMC_SYNC",
  SERVER_ARCHIVE: "SERVER_ARCHIVE",
  SERVER_RESTORE: "SERVER_RESTORE",

  // Партии
  BATCH_CREATE: "BATCH_CREATE",
  BATCH_UPDATE: "BATCH_UPDATE",
  BATCH_DELETE: "BATCH_DELETE",
  BATCH_CLOSE: "BATCH_CLOSE",

  // Стойки
  RACK_CREATE: "RACK_CREATE",
  RACK_UPDATE: "RACK_UPDATE",
  RACK_DELETE: "RACK_DELETE",
  RACK_SERVER_ADD: "RACK_SERVER_ADD",
  RACK_SERVER_REMOVE: "RACK_SERVER_REMOVE",

  // Кластеры
  CLUSTER_CREATE: "CLUSTER_CREATE",
  CLUSTER_UPDATE: "CLUSTER_UPDATE",
  CLUSTER_DELETE: "CLUSTER_DELETE",
  CLUSTER_SHIP: "CLUSTER_SHIP",

  // Дефекты серверов
  DEFECT_CREATE: "DEFECT_CREATE",
  DEFECT_UPDATE: "DEFECT_UPDATE",
  DEFECT_RESOLVE: "DEFECT_RESOLVE",
  DEFECT_CLOSE: "DEFECT_CLOSE",
  DEFECT_REOPEN: "DEFECT_REOPEN",
  DEFECT_FILE_UPLOAD: "DEFECT_FILE_UPLOAD",
  DEFECT_FILE_DELETE: "DEFECT_FILE_DELETE",

  // Ремонт
  REPAIR_ACTION_ADD: "REPAIR_ACTION_ADD",
  REPAIR_ACTION_UPDATE: "REPAIR_ACTION_UPDATE",
  REPAIR_ACTION_DELETE: "REPAIR_ACTION_DELETE",

  // Заявки Yadro
  YADRO_TICKET_CREATE: "YADRO_TICKET_CREATE",
  YADRO_TICKET_UPDATE: "YADRO_TICKET_UPDATE",
  YADRO_TICKET_RECEIVE: "YADRO_TICKET_RECEIVE",
  YADRO_TICKET_CLOSE: "YADRO_TICKET_CLOSE",

  // Склад
  WAREHOUSE_MOVE: "WAREHOUSE_MOVE",
  WAREHOUSE_MOVE_BATCH: "WAREHOUSE_MOVE_BATCH",
  BOX_CREATE: "BOX_CREATE",
  BOX_UPDATE: "BOX_UPDATE",
  BOX_DELETE: "BOX_DELETE",
  BOX_SPLIT: "BOX_SPLIT",
  BOX_MERGE: "BOX_MERGE",
  SUPPLY_CREATE: "SUPPLY_CREATE",
  SUPPLY_UPDATE: "SUPPLY_UPDATE",
  SUPPLY_RECEIVE: "SUPPLY_RECEIVE",

  // Компоненты
  COMPONENT_CREATE: "COMPONENT_CREATE",
  COMPONENT_UPDATE: "COMPONENT_UPDATE",
  COMPONENT_DELETE: "COMPONENT_DELETE",
  COMPONENT_SYNC: "COMPONENT_SYNC",
  COMPONENT_REPLACE: "COMPONENT_REPLACE",
  COMPONENT_TRANSFER: "COMPONENT_TRANSFER",
  COMPONENT_BATCH_ADD: "COMPONENT_BATCH_ADD",

  // Производство
  PRODUCTION_ENTRY_CREATE: "PRODUCTION_ENTRY_CREATE",
  PRODUCTION_ENTRY_UPDATE: "PRODUCTION_ENTRY_UPDATE",
  PRODUCTION_ENTRY_APPROVE: "PRODUCTION_ENTRY_APPROVE",
  PRODUCTION_ENTRY_REJECT: "PRODUCTION_ENTRY_REJECT",
  PRODUCTION_ENTRY_DELETE: "PRODUCTION_ENTRY_DELETE",
  PRODUCT_ASSEMBLE: "PRODUCT_ASSEMBLE",
  PRODUCT_QC_PASS: "PRODUCT_QC_PASS",
  PRODUCT_QC_FAIL: "PRODUCT_QC_FAIL",

  // Структура
  SECTION_CREATE: "SECTION_CREATE",
  SECTION_UPDATE: "SECTION_UPDATE",
  SECTION_DELETE: "SECTION_DELETE",
  TEAM_CREATE: "TEAM_CREATE",
  TEAM_UPDATE: "TEAM_UPDATE",
  TEAM_DELETE: "TEAM_DELETE",

  // Права
  ROLE_CREATE: "ROLE_CREATE",
  ROLE_UPDATE: "ROLE_UPDATE",
  ROLE_DELETE: "ROLE_DELETE",
  ABILITY_CREATE: "ABILITY_CREATE",
  ABILITY_DELETE: "ABILITY_DELETE",
  ROLE_ABILITY_GRANT: "ROLE_ABILITY_GRANT",
  ROLE_ABILITY_REVOKE: "ROLE_ABILITY_REVOKE",

  // Пользователи
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  USER_DELETE: "USER_DELETE",
  USER_ROLE_CHANGE: "USER_ROLE_CHANGE",

  // Экспорт/Отчёты
  EXPORT_PASSPORT: "EXPORT_PASSPORT",
  EXPORT_DEFECTS: "EXPORT_DEFECTS",
  EXPORT_REPORT: "EXPORT_REPORT",

  // Прочее
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
  SYSTEM_EVENT: "SYSTEM_EVENT",
};

// ===== СУЩНОСТИ =====
const AUDIT_ENTITIES = {
  SESSION: "SESSION",
  
  // Beryll
  BERYLL_SERVER: "BeryllServer",
  BERYLL_BATCH: "BeryllBatch",
  BERYLL_RACK: "BeryllRack",
  BERYLL_CLUSTER: "BeryllCluster",
  BERYLL_SHIPMENT: "BeryllShipment",
  
  // Дефекты
  BERYLL_DEFECT: "BeryllDefectRecord",
  BOARD_DEFECT: "BoardDefect",
  REPAIR_ACTION: "RepairAction",
  REPAIR_HISTORY: "RepairHistory",
  DEFECT_CATEGORY: "DefectCategory",
  YADRO_TICKET: "YadroTicketLog",
  
  // Склад
  WAREHOUSE_MOVEMENT: "WarehouseMovement",
  INVENTORY_BOX: "InventoryBox",
  SUPPLY: "Supply",
  WAREHOUSE_DOCUMENT: "WarehouseDocument",
  
  // Компоненты
  COMPONENT_INVENTORY: "ComponentInventory",
  COMPONENT_HISTORY: "ComponentHistory",
  COMPONENT_CATALOG: "ComponentCatalog",
  
  // Производство
  PRODUCTION_ENTRY: "ProductionEntry",
  PRODUCTION_OUTPUT: "ProductionOutput",
  ASSEMBLED_PRODUCT: "AssembledProduct",
  
  // Структура
  SECTION: "Section",
  TEAM: "Team",
  
  // Права
  ROLE: "Role",
  ABILITY: "Ability",
  ROLE_ABILITY: "RoleAbility",
  
  // Пользователи
  USER: "User",
};

/**
 * Основная функция логирования аудита
 * 
 * @param {Object} params
 * @param {Object} [params.req] - Express request (для извлечения userId и IP)
 * @param {number} [params.userId] - ID пользователя (если req не передан)
 * @param {string} params.action - Действие (из AUDIT_ACTIONS)
 * @param {string} [params.entity] - Сущность (из AUDIT_ENTITIES)
 * @param {number|string} [params.entityId] - ID сущности
 * @param {string} [params.description] - Описание действия
 * @param {Object} [params.metadata] - Дополнительные данные
 */
async function logAudit({
  req,
  userId,
  action,
  entity,
  entityId,
  description,
  metadata,
}) {
  if (!action) {
    console.warn("[AuditLogger] Попытка логирования без указания action");
    return;
  }

  try {
    // Определяем userId
    let finalUserId = null;
    if (req && req.user && req.user.id) {
      finalUserId = req.user.id;
    } else if (userId) {
      finalUserId = userId;
    }

    // Собираем metadata с информацией о запросе
    let meta = metadata || {};
    if (req) {
      const ipHeader = req.headers["x-forwarded-for"];
      const ip =
        (typeof ipHeader === "string" ? ipHeader.split(",")[0] : null) ||
        req.connection?.remoteAddress ||
        req.ip ||
        null;

      meta = {
        ...meta,
        ip,
        userAgent: req.headers["user-agent"] || null,
      };
    }

    // Создаём запись
    await AuditLog.create({
      userId: finalUserId,
      action,
      entity: entity || null,
      entityId: entityId === undefined || entityId === null ? null : String(entityId),
      description: description || null,
      metadata: Object.keys(meta).length > 0 ? meta : null,
    });
  } catch (error) {
    console.error("[AuditLogger] Ошибка записи в журнал аудита:", error);
    // Не бросаем ошибку, чтобы не ломать основной функционал
  }
}

// ===== ХЕЛПЕРЫ ДЛЯ ЧАСТЫХ ОПЕРАЦИЙ =====

/**
 * Логирование создания сервера
 */
async function logServerCreate(req, server, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.SERVER_CREATE,
    entity: AUDIT_ENTITIES.BERYLL_SERVER,
    entityId: server.id,
    description: `Создан сервер ${server.apkSerialNumber || server.hostname || 'N/A'}`,
    metadata: {
      serverSerial: server.apkSerialNumber,
      hostname: server.hostname,
      batchId: server.batchId,
      ...metadata,
    },
  });
}

/**
 * Логирование изменения статуса сервера
 */
async function logServerStatusChange(req, server, oldStatus, newStatus, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.SERVER_STATUS_CHANGE,
    entity: AUDIT_ENTITIES.BERYLL_SERVER,
    entityId: server.id,
    description: `Статус сервера ${server.apkSerialNumber || 'N/A'}: ${oldStatus} → ${newStatus}`,
    metadata: {
      serverSerial: server.apkSerialNumber,
      oldStatus,
      newStatus,
      ...metadata,
    },
  });
}

/**
 * Логирование создания дефекта
 */
async function logDefectCreate(req, defect, server, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.DEFECT_CREATE,
    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
    entityId: defect.id,
    description: `Создана запись о браке для сервера ${server?.apkSerialNumber || 'N/A'}`,
    metadata: {
      serverSerial: server?.apkSerialNumber,
      serverId: server?.id,
      problemDescription: defect.problemDescription?.substring(0, 100),
      ...metadata,
    },
  });
}

/**
 * Логирование закрытия дефекта
 */
async function logDefectResolve(req, defect, resolution, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.DEFECT_RESOLVE,
    entity: AUDIT_ENTITIES.BERYLL_DEFECT,
    entityId: defect.id,
    description: `Дефект #${defect.id} закрыт: ${resolution}`,
    metadata: {
      resolution,
      ...metadata,
    },
  });
}

/**
 * Логирование складского перемещения
 */
async function logWarehouseMove(req, movement, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.WAREHOUSE_MOVE,
    entity: AUDIT_ENTITIES.WAREHOUSE_MOVEMENT,
    entityId: movement.id,
    description: `Перемещение: ${movement.operation}, кол-во: ${movement.deltaQty || 0}`,
    metadata: {
      boxId: movement.boxId,
      operation: movement.operation,
      fromSectionId: movement.fromSectionId,
      toSectionId: movement.toSectionId,
      deltaQty: movement.deltaQty,
      ...metadata,
    },
  });
}

/**
 * Логирование синхронизации компонентов
 */
async function logComponentSync(req, serverId, result, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.COMPONENT_SYNC,
    entity: AUDIT_ENTITIES.COMPONENT_INVENTORY,
    entityId: serverId,
    description: `Синхронизация компонентов сервера #${serverId}`,
    metadata: {
      serverId,
      mode: result.mode,
      added: result.actions?.added?.length || 0,
      updated: result.actions?.updated?.length || 0,
      preserved: result.actions?.preserved?.length || 0,
      ...metadata,
    },
  });
}

/**
 * Логирование производственной записи
 */
async function logProductionEntry(req, entry, action, metadata = {}) {
  const actionMap = {
    create: AUDIT_ACTIONS.PRODUCTION_ENTRY_CREATE,
    approve: AUDIT_ACTIONS.PRODUCTION_ENTRY_APPROVE,
    reject: AUDIT_ACTIONS.PRODUCTION_ENTRY_REJECT,
    update: AUDIT_ACTIONS.PRODUCTION_ENTRY_UPDATE,
    delete: AUDIT_ACTIONS.PRODUCTION_ENTRY_DELETE,
  };

  await logAudit({
    req,
    action: actionMap[action] || AUDIT_ACTIONS.PRODUCTION_ENTRY_UPDATE,
    entity: AUDIT_ENTITIES.PRODUCTION_ENTRY,
    entityId: entry.id,
    description: `Производственная запись #${entry.id}: ${action}`,
    metadata: {
      entryId: entry.id,
      quantity: entry.quantity,
      productId: entry.productId,
      ...metadata,
    },
  });
}

/**
 * Логирование экспорта
 */
async function logExport(req, exportType, description, metadata = {}) {
  await logAudit({
    req,
    action: AUDIT_ACTIONS.EXPORT_REPORT,
    entity: null,
    entityId: null,
    description: description || `Экспорт: ${exportType}`,
    metadata: {
      exportType,
      ...metadata,
    },
  });
}

module.exports = {
  logAudit,
  AUDIT_ACTIONS,
  AUDIT_ENTITIES,
  // Хелперы
  logServerCreate,
  logServerStatusChange,
  logDefectCreate,
  logDefectResolve,
  logWarehouseMove,
  logComponentSync,
  logProductionEntry,
  logExport,
};