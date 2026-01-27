import { AdminDefect_915_Categories } from "./pages/Admin/AdminDefectCategory/AdminDefect_915_Categories";
import { AdminDefect_2_4_Categories } from "./pages/Admin/AdminDefectCategory/AdminDefect_2_4_Categories";
import { AdminDefectCategories } from "./pages/Admin/AdminDefectCategory/AdminDefectCategories";
import { AdminPanel } from "./pages/Admin/AdminPanel";
import { AdminPCs } from "./pages/Admin/AdminPCs/AdminPCs";
import { AdminUsers } from "./pages/Admin/AdminUsers/AdminUsers";
import { StructurePage } from "./pages/Admin/Structure/StructurePage";
import { AuditLogPage } from "./pages/Admin/Audit/AuditLogPage";
import { Firmware2_4 } from "./pages/Firmware/Firmware2_4";
import { Firmware915_019 } from "./pages/Firmware/Firmware915_019";
import { Firmware915_002 } from "./pages/Firmware/Firmware915_002";
import { FirmwareFC } from "./pages/Firmware/FrimwareFC/FirmwareFC";
import { FirmwareOld } from "./pages/FirmwareOld/FirmwareOld";
import { FCs } from "./pages/Tables/FlightController/FCs";
import { InputDefect } from "./pages/InputDefect/InputDefect";
import { KnowledgeBase } from "./pages/KnowledgeBase/KnowledgeBase";
import { SelectPC } from "./pages/PCs/SelectPC";
import { Profile } from "./pages/Profile/Profile";
import { StartPage } from "./pages/StartPage/StartPage";
import { Users } from "./pages/Users/Users";
import { ELRS915s } from "./pages/Tables/ELRS915s/ELRS915s";
import { ELRS24s } from "./pages/Tables/ELRS24s/ELRS24s";
import { Betaflight } from "./pages/BetaFlight/Betaflight";
import { MqttCheckFC } from "./pages/MqttCheck/MqttCheckFC";
import { MqttCheckESC } from "./pages/MqttCheck/MqttCheckESC";
import { AdminProducts } from "./pages/Admin/AdminProducts/AdminProducts";
import { AdmProdStatuses } from "./pages/Admin/AdminProducts/AdmProdStatuses/AdmProdStatuses";
import { AdmProdComponents } from "./pages/Admin/AdminProd_Components/AdmProdComponents";
import { FirmwareCoralB } from "./pages/Firmware/FirmwareCoralB/FIrmwareCoralB";
import { CoralBs } from "./pages/Tables/CoralBs/CoralBs";
import { AdminDefect_Coral_B_categories } from "./pages/Admin/AdminDefectCategory/AdminDefect_Coral_B_categories";
import RankingsPage from "./pages/Rankings/RankingsPage";
import { RankingsChartsPage } from "./pages/Rankings/RankingsChartsPage";
import { Login } from "./pages/Login/Login";
import { Registration } from "./pages/Login/Registration";

import { WarehousePage as AdminWarehousePage } from "./pages/Admin/Warehouse/WarehousePage";
import { WarehousePage as UserWarehousePage } from "./pages/Warehouse/WarehousePage";
import { AnalyticsPage } from "./pages/Warehouse/AnalyticsPage";
import { InventoryPage } from "./pages/Warehouse/InventoryPage";

import { AssemblyRoutesPage } from "./pages/Assembly/AssemblyRoutesPage";
import { AssemblyWorkPage } from "./pages/Assembly/AssemblyWorkPage";

import { RecipeConstructorPage } from "./pages/AssemblyRecipes/RecipeConstructorPage";
import { RecipeExecutionPage } from "./pages/AssemblyRecipes/RecipeExecutionPage";
import { AssembledProductsPage } from "./pages/AssemblyRecipes/AssembledProductsPage";

import TasksPage from "./pages/Tasks/TasksPage";

import { AdminRightsPage } from "./pages/Admin/RBAC/AdminRightsPage";

import { ProductionDashboard } from "./pages/Analytics/ProductionDashboard";

import BeryllPage from "./pages/Beryll/BeryllPage";
import { ServerDetailPage } from "./pages/Beryll/pages/ServerDetailPage";
import { BatchDetailPage } from "./pages/Beryll/pages/BatchDetailPage";
import BeryllMonitoringPage from "./pages/Beryll/BeryllMonitoringPage";

import { DefectsPage } from "./pages/Defects/DefectsPage";
import { DefectDetailPage } from "./pages/Defects/DefectDetailPage";
import { AdminDefectCategoriesPage } from "./pages/Admin/AdminDefectCategoriesPage";

import ProductionPage from "./pages/Production/ProductionPage";

import {
  ADMIN_COMPONENTS_ROUTE,
  ADMIN_DEFECTS_2_4_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_915_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_CORAL_B_CATEGORIES_ROUTE,
  ADMIN_DEFECTS_FC_CATEGORIES_ROUTE,
  ADMIN_PCs_ROUTE,
  ADMIN_PRODUCTS_ROUTE,
  ADMIN_PRODUCTS_STATUSES_ROUTE,
  ADMIN_ROUTE,
  ADMIN_USERS_ROUTE,
  BETAFLIGHT_ROUTE,
  CORAL_B_ROUTE,
  ELRS_2_4_ROUTE,
  ELRS_915_ROUTE,
  FC_ROUTE,
  FIRMWARE_2_4_ROUTE,
  FIRMWARE_915_002_ROUTE,
  FIRMWARE_915_019_ROUTE,
  FIRMWARE_Coral_B_ROUTE,
  FIRMWARE_FC_ROUTE,
  FIRMWARE_OLD_ROUTE,
  INPUT_DEFECT_ROUTE,
  KNOWLEDGE_BASE_ROUTE,
  MQTT_CHECK_ESC_ROUTE,
  MQTT_CHECK_FC_ROUTE,
  PROFILE_ROUTE,
  SELECT_PC_ROUTE,
  START_ROUTE,
  USERS_ROUTE,
  RANKINGS_ROUTE,
  RANKINGS_CHARTS_ROUTE,
  STRUCTURE_ROUTE,
  AUDIT_LOG_ROUTE,
  ADMIN_WAREHOUSE_ROUTE,
  WAREHOUSE_ROUTE,
  WAREHOUSE_ANALYTICS_ROUTE,
  WAREHOUSE_INVENTORY_ROUTE,
  ASSEMBLY_ROUTE,
  ADMIN_ASSEMBLY_ROUTES_ROUTE,
  TASKS_ROUTE,
  RECIPE_CONSTRUCTOR_ROUTE,
  RECIPE_EXECUTION_ROUTE,
  ASSEMBLED_PRODUCTS_ROUTE,
  ADMIN_RBAC_ROUTE,
  ANALYTICS_DASHBOARD_ROUTE,
  BERYLL_ROUTE,
  BERYLL_SERVER_ROUTE,
  BERYLL_BATCH_ROUTE,
  BERYLL_MONITORING_ROUTE,
  DEFECTS_ROUTE,
  DEFECT_DETAIL_ROUTE,
  ADMIN_DEFECT_CATEGORIES_ROUTE,
  PRODUCTION_ROUTE,
  LOGIN_ROUTE,
  REGISTRATION_ROUTE,
} from "./utils/consts";

export const authRoutes = [
  { path: FC_ROUTE, Component: FCs },
  { path: ELRS_915_ROUTE, Component: ELRS915s },
  { path: ELRS_2_4_ROUTE, Component: ELRS24s },
  { path: CORAL_B_ROUTE, Component: CoralBs },
  { path: FIRMWARE_OLD_ROUTE, Component: FirmwareOld },
  { path: FIRMWARE_FC_ROUTE, Component: FirmwareFC },
  { path: FIRMWARE_915_019_ROUTE, Component: Firmware915_019 },
  { path: FIRMWARE_915_002_ROUTE, Component: Firmware915_002 },
  { path: FIRMWARE_2_4_ROUTE, Component: Firmware2_4 },
  { path: FIRMWARE_Coral_B_ROUTE, Component: FirmwareCoralB },
  { path: MQTT_CHECK_FC_ROUTE, Component: MqttCheckFC },
  { path: MQTT_CHECK_ESC_ROUTE, Component: MqttCheckESC },
  { path: SELECT_PC_ROUTE, Component: SelectPC },
  { path: KNOWLEDGE_BASE_ROUTE, Component: KnowledgeBase },
  { path: PROFILE_ROUTE, Component: Profile },
  { path: RANKINGS_ROUTE, Component: RankingsPage },
  { path: RANKINGS_CHARTS_ROUTE, Component: RankingsChartsPage },
  { path: WAREHOUSE_ROUTE, Component: UserWarehousePage },
  { path: WAREHOUSE_ANALYTICS_ROUTE, Component: AnalyticsPage },
  { path: WAREHOUSE_INVENTORY_ROUTE, Component: InventoryPage },
  { path: ASSEMBLY_ROUTE, Component: AssemblyWorkPage },
  { path: RECIPE_EXECUTION_ROUTE, Component: RecipeExecutionPage },
  { path: RECIPE_CONSTRUCTOR_ROUTE, Component: RecipeConstructorPage },
  { path: ASSEMBLED_PRODUCTS_ROUTE, Component: AssembledProductsPage },
  { path: ANALYTICS_DASHBOARD_ROUTE, Component: ProductionDashboard },
  { path: TASKS_ROUTE, Component: TasksPage },
  { path: BERYLL_ROUTE, Component: BeryllPage },
  { path: BERYLL_SERVER_ROUTE, Component: ServerDetailPage },
  { path: BERYLL_BATCH_ROUTE, Component: BatchDetailPage },
  // --- ДОБАВЛЕНО: Маршрут мониторинга ---
  { path: BERYLL_MONITORING_ROUTE, Component: BeryllMonitoringPage },
  { path: DEFECTS_ROUTE, Component: DefectsPage },
  { path: DEFECT_DETAIL_ROUTE, Component: DefectDetailPage },
  { path: PRODUCTION_ROUTE, Component: ProductionPage },
];

export const adminRoutes = [
  { path: ADMIN_ROUTE, Component: AdminPanel },
  { path: STRUCTURE_ROUTE, Component: StructurePage },
  { path: AUDIT_LOG_ROUTE, Component: AuditLogPage },
  { path: INPUT_DEFECT_ROUTE, Component: InputDefect },
  { path: ADMIN_PCs_ROUTE, Component: AdminPCs },
  { path: ADMIN_DEFECTS_FC_CATEGORIES_ROUTE, Component: AdminDefectCategories },
  { path: ADMIN_DEFECTS_915_CATEGORIES_ROUTE, Component: AdminDefect_915_Categories },
  { path: ADMIN_DEFECTS_2_4_CATEGORIES_ROUTE, Component: AdminDefect_2_4_Categories },
  { path: ADMIN_DEFECTS_CORAL_B_CATEGORIES_ROUTE, Component: AdminDefect_Coral_B_categories },
  { path: ADMIN_USERS_ROUTE, Component: AdminUsers },
  { path: ADMIN_PRODUCTS_ROUTE, Component: AdminProducts },
  { path: ADMIN_PRODUCTS_STATUSES_ROUTE, Component: AdmProdStatuses },
  { path: ADMIN_WAREHOUSE_ROUTE, Component: AdminWarehousePage },
  { path: ADMIN_COMPONENTS_ROUTE, Component: AdmProdComponents },
  { path: ADMIN_ASSEMBLY_ROUTES_ROUTE, Component: AssemblyRoutesPage },
  { path: ADMIN_RBAC_ROUTE, Component: AdminRightsPage },
  { path: ADMIN_DEFECT_CATEGORIES_ROUTE, Component: AdminDefectCategoriesPage },
];

export const publicRoutes = [
  { path: START_ROUTE, Component: StartPage },
  { path: USERS_ROUTE, Component: Users },
  { path: BETAFLIGHT_ROUTE, Component: Betaflight },
  { path: LOGIN_ROUTE, Component: Login },
  { path: REGISTRATION_ROUTE, Component: Registration },
];