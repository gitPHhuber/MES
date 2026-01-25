/**
 * models/index.js - Главный файл моделей MES Kryptonit
 * 
 * ОБНОВЛЕНО: исправлены импорты YadroIntegration
 */

// ============================================
// БАЗОВЫЕ ИМПОРТЫ
// ============================================

const { User, PC, Session, AuditLog, Role, Ability, RoleAbility } = require("./definitions/General");
const { Section, Team } = require("./definitions/Structure");
const { 
    FC, CategoryDefect, 
    ELRS915, CategoryDefect915, 
    ELRS2_4, CategoryDefect2_4, 
    CoralB, CategoryDefect_CoralB, 
    AssemblyRoute, AssemblyRouteStep 
} = require("./definitions/Production");
const { 
    Supply, WarehouseBox, WarehouseMovement, 
    WarehouseDocument, InventoryLimit, ProductionTask, 
    PrintHistory 
} = require("./definitions/Warehouse");
const { Project } = require("./definitions/Project");
const { AssemblyRecipe, RecipeStep, AssemblyProcess } = require("./definitions/Assembly");
const { ProductionOutput, OperationType } = require("./ProductionOutput");

// Система дефектов
const { 
  DefectCategory, 
  BoardDefect, 
  RepairAction,
  setupDefectAssociations,
  BOARD_TYPES,
  DEFECT_STATUSES: BOARD_DEFECT_STATUSES,
  ACTION_TYPES
} = require("./definitions/Defect");

// Beryll (серверы)
const { 
    BeryllServer, 
    BeryllBatch, 
    BeryllHistory, 
    BeryllChecklistTemplate, 
    BeryllServerChecklist,
    BeryllDefectComment,
    BeryllDefectFile,
    BeryllServerComponent,
    DEFECT_CATEGORIES,
    DEFECT_PRIORITIES,
    DEFECT_STATUSES,
    COMPONENT_TYPES: BERYLL_COMPONENT_TYPES,
    COMPONENT_STATUSES,
    setupAssociations: setupBeryllAssociations 
} = require("./definitions/Beryll");

// Beryll Extended (стойки, кластеры, учёт брака)
const {
    BeryllRack,
    BeryllRackUnit,
    BeryllShipment,
    BeryllCluster,
    BeryllClusterServer,
    BeryllDefectRecord,
    BeryllDefectRecordFile,
    BeryllExtendedHistory,
    RACK_STATUSES,
    SHIPMENT_STATUSES,
    CLUSTER_STATUSES,
    SERVER_ROLES,
    DEFECT_RECORD_STATUSES,
    REPAIR_PART_TYPES,
    setupAssociations: setupExtendedAssociations
} = require("./definitions/BeryllExtended");

// ============================================
// НОВЫЕ МОДЕЛИ (исправление бизнес-логики)
// ============================================

const {
    ComponentCatalog,
    ComponentInventory,
    ComponentHistory,
    setupComponentAssociations,
    COMPONENT_TYPES,
    INVENTORY_STATUSES,
    COMPONENT_CONDITIONS,
    HISTORY_ACTIONS
} = require("./definitions/ComponentModels");

const {
    YadroTicketLog,
    SubstituteServerPool,
    SlaConfig,
    UserAlias,
    BeryllClusterRack,
    YADRO_REQUEST_TYPES,
    YADRO_LOG_STATUSES,
    SUBSTITUTE_STATUSES
} = require("./definitions/YadroIntegration");

// ============================================
// УСТАНОВКА СВЯЗЕЙ
// ============================================

// 1. Базовые связи структуры
User.hasMany(Session);
Session.belongsTo(User);

User.belongsTo(Team, { foreignKey: "teamId" });
Team.hasMany(User, { foreignKey: "teamId" });

User.belongsTo(Section, { foreignKey: "sectionId", as: "section" });
User.belongsTo(Section, { foreignKey: "sectionId", as: "production_section" });
Section.hasMany(User, { foreignKey: "sectionId", as: "users" });

Section.belongsTo(User, { foreignKey: "managerId", as: "manager" });
User.hasMany(Section, { foreignKey: "managerId", as: "managedSections" });

Team.belongsTo(Section, { foreignKey: "sectionId", as: "section" });
Team.belongsTo(Section, { foreignKey: "sectionId", as: "production_section" });
Section.hasMany(Team, { foreignKey: "sectionId", as: "teams" });

Team.belongsTo(User, { foreignKey: "teamLeadId", as: "teamLead" });

// RBAC
Role.belongsToMany(Ability, { through: RoleAbility, foreignKey: "roleId", as: "abilities" });
Ability.belongsToMany(Role, { through: RoleAbility, foreignKey: "abilityId", as: "roles" });
User.belongsTo(Role, { foreignKey: "roleId", as: "userRole" });

// 2. Производство и прошивки (legacy)
Session.hasMany(FC); FC.belongsTo(Session);
CategoryDefect.hasMany(FC); FC.belongsTo(CategoryDefect);

Session.hasMany(ELRS915); ELRS915.belongsTo(Session);
CategoryDefect915.hasMany(ELRS915); ELRS915.belongsTo(CategoryDefect915);

Session.hasMany(ELRS2_4); ELRS2_4.belongsTo(Session);
CategoryDefect2_4.hasMany(ELRS2_4); ELRS2_4.belongsTo(CategoryDefect2_4);

Session.hasMany(CoralB); CoralB.belongsTo(Session);
CategoryDefect_CoralB.hasMany(CoralB); CoralB.belongsTo(CategoryDefect_CoralB);

// 3. Маршрутные карты
AssemblyRoute.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });
User.hasMany(AssemblyRoute, { foreignKey: "createdById", as: "assemblyRoutes" });

AssemblyRoute.hasMany(AssemblyRouteStep, { foreignKey: "routeId", as: "steps", onDelete: "CASCADE" });
AssemblyRouteStep.belongsTo(AssemblyRoute, { foreignKey: "routeId", as: "route" });

AssemblyRouteStep.belongsTo(Section, { foreignKey: "sectionId", as: "section" });
AssemblyRouteStep.belongsTo(Team, { foreignKey: "teamId", as: "team" });

// 4. Склад
Supply.hasMany(WarehouseBox, { foreignKey: "supplyId", as: "boxes" });
WarehouseBox.belongsTo(Supply, { foreignKey: "supplyId", as: "supply" });

User.hasMany(WarehouseBox, { foreignKey: "acceptedById", as: "acceptedBoxes" });
WarehouseBox.belongsTo(User, { foreignKey: "acceptedById", as: "acceptedBy" });

WarehouseBox.belongsTo(Section, { foreignKey: "currentSectionId", as: "currentSection" });
Section.hasMany(WarehouseBox, { foreignKey: "currentSectionId", as: "boxes" });

Team.hasMany(WarehouseBox, { foreignKey: "currentTeamId", as: "boxes" });
WarehouseBox.belongsTo(Team, { foreignKey: "currentTeamId", as: "currentTeam" });
WarehouseBox.belongsTo(Team, { foreignKey: "currentTeamId", as: "production_team" });

WarehouseBox.hasMany(WarehouseMovement, { foreignKey: "boxId", as: "movements" });
WarehouseMovement.belongsTo(WarehouseBox, { foreignKey: "boxId", as: "box" });

WarehouseMovement.belongsTo(User, { foreignKey: "performedById", as: "performedBy" });
WarehouseMovement.belongsTo(Section, { foreignKey: "fromSectionId", as: "fromSection" });
WarehouseMovement.belongsTo(Section, { foreignKey: "toSectionId", as: "toSection" });

// 5. Задачи производства
ProductionTask.belongsTo(User, { foreignKey: "responsibleId", as: "responsible" });
ProductionTask.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });
ProductionTask.belongsTo(Section, { foreignKey: "targetSectionId", as: "targetSection" });
ProductionTask.belongsTo(Project, { foreignKey: "projectId", as: "project" });

Project.belongsTo(User, { foreignKey: "createdById", as: "author" });
User.hasMany(Project, { foreignKey: "createdById", as: "projects" });

// 6. Рецепты сборки
AssemblyRecipe.hasMany(RecipeStep, { foreignKey: "recipeId", as: "steps" });
RecipeStep.belongsTo(AssemblyRecipe, { foreignKey: "recipeId", as: "recipe" });

AssemblyProcess.belongsTo(AssemblyRecipe, { foreignKey: "recipeId", as: "recipe" });
AssemblyProcess.belongsTo(User, { foreignKey: "userId", as: "operator" });

// 6.1 Учёт выработки
User.hasMany(ProductionOutput, { foreignKey: "userId", as: "outputs" });
ProductionOutput.belongsTo(User, { foreignKey: "userId", as: "user" });

User.hasMany(ProductionOutput, { foreignKey: "approvedById", as: "approvedOutputs" });
ProductionOutput.belongsTo(User, { foreignKey: "approvedById", as: "approvedBy" });

User.hasMany(ProductionOutput, { foreignKey: "createdById", as: "createdOutputs" });
ProductionOutput.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

ProductionOutput.belongsTo(Team, { foreignKey: "teamId", as: "production_team" });
Team.hasMany(ProductionOutput, { foreignKey: "teamId", as: "outputs" });

ProductionOutput.belongsTo(Section, { foreignKey: "sectionId", as: "production_section" });
Section.hasMany(ProductionOutput, { foreignKey: "sectionId", as: "outputs" });

ProductionOutput.belongsTo(Project, { foreignKey: "projectId", as: "project" });
Project.hasMany(ProductionOutput, { foreignKey: "projectId", as: "outputs" });

ProductionOutput.belongsTo(ProductionTask, { foreignKey: "taskId", as: "task" });
ProductionTask.hasMany(ProductionOutput, { foreignKey: "taskId", as: "outputs" });

OperationType.hasMany(ProductionOutput, { foreignKey: "operationTypeId", as: "outputs" });
ProductionOutput.belongsTo(OperationType, { foreignKey: "operationTypeId", as: "operationType" });

// 7. АПК Берилл (базовые)
setupBeryllAssociations(User);

// 8. Система отслеживания дефектов
setupDefectAssociations({ User });

// ============================================
// НОВЫЕ СВЯЗИ (исправление бизнес-логики)
// ============================================

// 9. Компоненты
setupComponentAssociations({
    User,
    BeryllServer,
    BeryllDefectRecord,
    BeryllServerComponent
});

// 10. Ядро (журнал учёта заявок)
YadroTicketLog.belongsTo(BeryllServer, { foreignKey: "serverId", as: "server" });
YadroTicketLog.belongsTo(BeryllDefectRecord, { foreignKey: "defectRecordId", as: "defectRecord" });
YadroTicketLog.belongsTo(User, { foreignKey: "createdById", as: "createdBy" });

BeryllServer.hasMany(YadroTicketLog, { foreignKey: "serverId", as: "yadroLogs" });
BeryllDefectRecord.hasMany(YadroTicketLog, { foreignKey: "defectRecordId", as: "yadroLogs" });

// 11. Подменные серверы
SubstituteServerPool.belongsTo(BeryllServer, { foreignKey: "serverId", as: "server" });
SubstituteServerPool.belongsTo(BeryllDefectRecord, { foreignKey: "currentDefectId", as: "currentDefect" });
SubstituteServerPool.belongsTo(User, { foreignKey: "issuedToUserId", as: "issuedTo" });

BeryllServer.hasOne(SubstituteServerPool, { foreignKey: "serverId", as: "substitutePoolEntry" });

// 12. SLA конфигурация (без связей, справочник)

// 13. Алиасы пользователей
UserAlias.belongsTo(User, { foreignKey: "userId", as: "user" });
User.hasMany(UserAlias, { foreignKey: "userId", as: "aliases" });

// 14. Связь кластеров со стойками
BeryllClusterRack.belongsTo(BeryllCluster, { foreignKey: "clusterId", as: "cluster" });
BeryllClusterRack.belongsTo(BeryllRack, { foreignKey: "rackId", as: "rack" });
BeryllCluster.hasMany(BeryllClusterRack, { foreignKey: "clusterId", as: "rackAssignments" });
BeryllRack.hasMany(BeryllClusterRack, { foreignKey: "rackId", as: "clusterAssignments" });

// 15. Дополнительные связи для дефектов
BeryllDefectRecord.belongsTo(BeryllServerComponent, { 
    foreignKey: "defectComponentId", 
    as: "defectComponent" 
});
BeryllDefectRecord.belongsTo(BeryllServerComponent, { 
    foreignKey: "replacementComponentId", 
    as: "replacementComponent" 
});

BeryllDefectRecord.belongsTo(ComponentInventory, { 
    foreignKey: "defectInventoryId", 
    as: "defectInventoryItem" 
});
BeryllDefectRecord.belongsTo(ComponentInventory, { 
    foreignKey: "replacementInventoryId", 
    as: "replacementInventoryItem" 
});

// 16. Beryll Extended (Стойки, Кластеры, Учёт брака)
setupExtendedAssociations({ User, BeryllServer });

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
    // --- General ---
    User, PC, Session, AuditLog, Role, Ability, RoleAbility,
    
    // --- Structure ---
    Section, Team,
    
    // --- Production (Legacy) ---
    FC, CategoryDefect, 
    ELRS915, CategoryDefect915, 
    ELRS2_4, CategoryDefect2_4, 
    CoralB, CategoryDefect_CoralB,
    
    // --- Warehouse ---
    Supply, WarehouseBox, WarehouseMovement, 
    WarehouseDocument, InventoryLimit,
    ProductionTask, Project, PrintHistory,
    
    // --- Assembly ---
    AssemblyRoute, AssemblyRouteStep,
    AssemblyRecipe, RecipeStep, AssemblyProcess,
    
    // --- Beryll ---
    BeryllServer,
    BeryllBatch,
    BeryllHistory,
    BeryllChecklistTemplate,
    BeryllServerChecklist,
    BeryllDefectComment,
    BeryllDefectFile,
    BeryllServerComponent,
    
    // Beryll Consts
    DEFECT_CATEGORIES,
    DEFECT_PRIORITIES,
    DEFECT_STATUSES,
    BERYLL_COMPONENT_TYPES,
    COMPONENT_STATUSES,

    // --- Defect System ---
    DefectCategory,
    BoardDefect,
    RepairAction,
    BOARD_TYPES,
    BOARD_DEFECT_STATUSES,
    ACTION_TYPES,

    // --- Beryll Extended ---
    BeryllRack,
    BeryllRackUnit,
    BeryllShipment,
    BeryllCluster,
    BeryllClusterServer,
    BeryllDefectRecord,
    BeryllDefectRecordFile,
    BeryllExtendedHistory,
    
    // Beryll Extended Consts
    RACK_STATUSES,
    SHIPMENT_STATUSES,
    CLUSTER_STATUSES,
    SERVER_ROLES,
    DEFECT_RECORD_STATUSES,
    REPAIR_PART_TYPES,

    // =========================================
    // НОВЫЕ МОДЕЛИ (исправление бизнес-логики)
    // =========================================
    
    // --- Component Management ---
    ComponentCatalog,
    ComponentInventory,
    ComponentHistory,
    COMPONENT_TYPES,
    INVENTORY_STATUSES,
    COMPONENT_CONDITIONS,
    HISTORY_ACTIONS,
    
    // --- Yadro Integration (журнал учёта) ---
    YadroTicketLog,
    SubstituteServerPool,
    SlaConfig,
    UserAlias,
    BeryllClusterRack,
    YADRO_REQUEST_TYPES,
    YADRO_LOG_STATUSES,
    SUBSTITUTE_STATUSES
};
