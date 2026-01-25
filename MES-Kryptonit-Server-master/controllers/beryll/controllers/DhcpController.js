const ApiError = require("../../../error/ApiError");
const DhcpService = require("../services/DhcpService");
const logger = require("../../../services/logger");

class DhcpController {
  async syncWithDhcp(req, res, next) {
    try {
      const userId = req.user?.id;
      const result = await DhcpService.syncWithDhcp(userId);
      return res.json(result);
    } catch (e) {
      logger.error("DHCP Sync Error:", e);
      return next(ApiError.internal(`Ошибка синхронизации с DHCP: ${e.message}`));
    }
  }
}

module.exports = new DhcpController();
