/**
 * Главный контроллер Beryll (для обратной совместимости)
 * Объединяет все подконтроллеры в один интерфейс
 */

const DhcpController = require("./controllers/DhcpController");
const ServerController = require("./controllers/ServerController");
const BatchController = require("./controllers/BatchController");
const ChecklistController = require("./controllers/ChecklistController");
const HistoryController = require("./controllers/HistoryController");
const ArchiveController = require("./controllers/ArchiveController");
const FileController = require("./controllers/FileController");
const PassportController = require("./controllers/PassportController");
const StatsController = require("./controllers/StatsController");
const DefectMonitoringController = require("./controllers/DefectMonitoringController"); // <--- Добавлен импорт

const { initChecklistTemplates } = require("./services/ChecklistService");

class BeryllController {
  // DHCP
  syncWithDhcp = DhcpController.syncWithDhcp.bind(DhcpController);
  
  // Серверы
  getServers = ServerController.getServers.bind(ServerController);
  getServerById = ServerController.getServerById.bind(ServerController);
  takeServer = ServerController.takeServer.bind(ServerController);
  releaseServer = ServerController.releaseServer.bind(ServerController);
  updateStatus = ServerController.updateStatus.bind(ServerController);
  updateNotes = ServerController.updateNotes.bind(ServerController);
  deleteServer = ServerController.deleteServer.bind(ServerController);
  
  // Партии
  getBatches = BatchController.getBatches.bind(BatchController);
  getBatchById = BatchController.getBatchById.bind(BatchController);
  createBatch = BatchController.createBatch.bind(BatchController);
  updateBatch = BatchController.updateBatch.bind(BatchController);
  deleteBatch = BatchController.deleteBatch.bind(BatchController);
  assignServersToBatch = BatchController.assignServersToBatch.bind(BatchController);
  removeServersFromBatch = BatchController.removeServersFromBatch.bind(BatchController);
  
  // Чек-листы
  getChecklistTemplates = ChecklistController.getChecklistTemplates.bind(ChecklistController);
  createChecklistTemplate = ChecklistController.createChecklistTemplate.bind(ChecklistController);
  updateChecklistTemplate = ChecklistController.updateChecklistTemplate.bind(ChecklistController);
  deleteChecklistTemplate = ChecklistController.deleteChecklistTemplate.bind(ChecklistController);
  toggleChecklistItem = ChecklistController.toggleChecklistItem.bind(ChecklistController);
  
  // История
  getHistory = HistoryController.getHistory.bind(HistoryController);
  
  // Архив
  getArchivedServers = ArchiveController.getArchivedServers.bind(ArchiveController);
  archiveServer = ArchiveController.archiveServer.bind(ArchiveController);
  unarchiveServer = ArchiveController.unarchiveServer.bind(ArchiveController);
  updateApkSerialNumber = ArchiveController.updateApkSerialNumber.bind(ArchiveController);
  
  // Файлы
  uploadChecklistFile = FileController.uploadChecklistFile.bind(FileController);
  getServerFiles = FileController.getServerFiles.bind(FileController);
  downloadFile = FileController.downloadFile.bind(FileController);
  
  // Паспорта
  generatePassport = PassportController.generatePassport.bind(PassportController);
  
  // Статистика
  getStats = StatsController.getStats.bind(StatsController);
  getAnalytics = StatsController.getAnalytics.bind(StatsController);

  // =============================================
  // КОММЕНТАРИИ К ДЕФЕКТАМ
  // =============================================
  
  getServerDefects = DefectMonitoringController.getServerDefects.bind(DefectMonitoringController);
  getDefectById = DefectMonitoringController.getDefectById.bind(DefectMonitoringController);
  createDefect = DefectMonitoringController.createDefect.bind(DefectMonitoringController);
  updateDefect = DefectMonitoringController.updateDefect.bind(DefectMonitoringController);
  deleteDefect = DefectMonitoringController.deleteDefect.bind(DefectMonitoringController);
  resolveDefect = DefectMonitoringController.resolveDefect.bind(DefectMonitoringController);
  uploadDefectFile = DefectMonitoringController.uploadDefectFile.bind(DefectMonitoringController);
  downloadDefectFile = DefectMonitoringController.downloadDefectFile.bind(DefectMonitoringController);
  deleteDefectFile = DefectMonitoringController.deleteDefectFile.bind(DefectMonitoringController);
  getDefectStats = DefectMonitoringController.getDefectStats.bind(DefectMonitoringController);
  
  // =============================================
  // МОНИТОРИНГ (PING)
  // =============================================
  
  pingServer = DefectMonitoringController.pingServer.bind(DefectMonitoringController);
  pingAllServers = DefectMonitoringController.pingAllServers.bind(DefectMonitoringController);
  getCachedStatus = DefectMonitoringController.getCachedStatus.bind(DefectMonitoringController);
  getMonitoringStats = DefectMonitoringController.getMonitoringStats.bind(DefectMonitoringController);
  getOnlineServers = DefectMonitoringController.getOnlineServers.bind(DefectMonitoringController);
  getOfflineServers = DefectMonitoringController.getOfflineServers.bind(DefectMonitoringController);
  clearMonitoringCache = DefectMonitoringController.clearCache.bind(DefectMonitoringController);
}

module.exports = new BeryllController();
module.exports.initChecklistTemplates = initChecklistTemplates;