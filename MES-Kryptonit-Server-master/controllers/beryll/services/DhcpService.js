const { BeryllServer, User } = require("../../../models/index");
const { SERVER_STATUSES, HISTORY_ACTIONS } = require("../../../models/definitions/Beryll");
const { NodeSSH } = require("node-ssh");
const { Op } = require("sequelize");
const { DHCP_CONFIG } = require("../config/beryll.config");
const { parseDhcpLeases } = require("../utils/dhcpParser");
const HistoryService = require("./HistoryService");

class DhcpService {
  /**
   * Синхронизация с DHCP сервером
   */
  async syncWithDhcp(userId) {
    const ssh = new NodeSSH();
    
    try {
      await ssh.connect({
        host: DHCP_CONFIG.host,
        username: DHCP_CONFIG.username,
        password: DHCP_CONFIG.password,
        readyTimeout: 10000
      });
      
      const result = await ssh.execCommand(`cat ${DHCP_CONFIG.leaseFile}`);
      
      if (result.stderr && !result.stdout) {
        throw new Error(`SSH Error: ${result.stderr}`);
      }
      
      const leases = parseDhcpLeases(result.stdout);
      const activeLeases = leases.filter(l => l.leaseActive);
      
      const syncTime = new Date();
      const results = { created: 0, updated: 0, total: activeLeases.length };
      
      for (const lease of activeLeases) {
        let server = await BeryllServer.findOne({
          where: {
            [Op.or]: [
              { ipAddress: lease.ipAddress },
              { macAddress: lease.macAddress }
            ]
          }
        });
        
        if (server) {
          await server.update({
            ipAddress: lease.ipAddress,
            macAddress: lease.macAddress,
            hostname: lease.hostname,
            serialNumber: lease.serialNumber,
            leaseStart: lease.leaseStart,
            leaseEnd: lease.leaseEnd,
            leaseActive: lease.leaseActive,
            lastSyncAt: syncTime
          });
          results.updated++;
        } else {
          server = await BeryllServer.create({
            ...lease,
            status: SERVER_STATUSES.NEW,
            lastSyncAt: syncTime
          });
          results.created++;
          
          // Логируем создание
          await HistoryService.logHistory(server.id, userId, HISTORY_ACTIONS.CREATED, {
            comment: "Добавлен из DHCP синхронизации"
          });
        }
      }
      
      await BeryllServer.update(
        { leaseActive: false },
        {
          where: {
            lastSyncAt: { [Op.lt]: syncTime },
            leaseActive: true
          }
        }
      );
      
      ssh.dispose();
      
      return { success: true, message: "Синхронизация завершена", results };
      
    } catch (e) {
      ssh.dispose();
      throw e;
    }
  }
}

module.exports = new DhcpService();
