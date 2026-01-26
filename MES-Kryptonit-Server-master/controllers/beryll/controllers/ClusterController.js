/**
 * ClusterController.js
 * 
 * Контроллер для работы с кластерами и комплектами/отгрузками
 * 
 * Положить в: controllers/beryll/controllers/ClusterController.js
 */

const ClusterService = require("../services/ClusterService");
const ApiError = require("../../../error/ApiError");
const logger = require("../../../services/logger");

class ClusterController {
  
  // =============================================
  // КОМПЛЕКТЫ/ОТГРУЗКИ
  // =============================================
  
  /**
   * GET /api/beryll/shipments
   */
  async getAllShipments(req, res, next) {
    try {
      const { status, search, city } = req.query;
      const shipments = await ClusterService.getAllShipments({ status, search, city });
      res.json(shipments);
    } catch (error) {
      logger.error("[ClusterController] getAllShipments error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/shipments/:id
   */
  async getShipmentById(req, res, next) {
    try {
      const { id } = req.params;
      const shipment = await ClusterService.getShipmentById(id);
      
      if (!shipment) {
        return next(ApiError.notFound("Комплект не найден"));
      }
      
      res.json(shipment);
    } catch (error) {
      logger.error("[ClusterController] getShipmentById error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/shipments
   */
  async createShipment(req, res, next) {
    try {
      const userId = req.user?.id;
      const shipment = await ClusterService.createShipment(req.body, userId);
      res.status(201).json(shipment);
    } catch (error) {
      logger.error("[ClusterController] createShipment error:", error);
      next(error);
    }
  }
  
  /**
   * PUT /api/beryll/shipments/:id
   */
  async updateShipment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const shipment = await ClusterService.updateShipment(id, req.body, userId);
      res.json(shipment);
    } catch (error) {
      logger.error("[ClusterController] updateShipment error:", error);
      next(error);
    }
  }
  
  /**
   * DELETE /api/beryll/shipments/:id
   */
  async deleteShipment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await ClusterService.deleteShipment(id, userId);
      res.json(result);
    } catch (error) {
      logger.error("[ClusterController] deleteShipment error:", error);
      next(error);
    }
  }
  
  /**
   * GET /api/beryll/shipments/:id/history
   */
  async getShipmentHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const history = await ClusterService.getHistory("SHIPMENT", id, { limit, offset });
      res.json(history);
    } catch (error) {
      logger.error("[ClusterController] getShipmentHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  // =============================================
  // КЛАСТЕРЫ
  // =============================================
  
  /**
   * GET /api/beryll/clusters
   */
  async getAllClusters(req, res, next) {
    try {
      const { status, shipmentId, search } = req.query;
      const clusters = await ClusterService.getAllClusters({ status, shipmentId, search });
      res.json(clusters);
    } catch (error) {
      logger.error("[ClusterController] getAllClusters error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/clusters/:id
   */
  async getClusterById(req, res, next) {
    try {
      const { id } = req.params;
      const cluster = await ClusterService.getClusterById(id);
      
      if (!cluster) {
        return next(ApiError.notFound("Кластер не найден"));
      }
      
      res.json(cluster);
    } catch (error) {
      logger.error("[ClusterController] getClusterById error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/clusters
   */
  async createCluster(req, res, next) {
    try {
      const userId = req.user?.id;
      const cluster = await ClusterService.createCluster(req.body, userId);
      res.status(201).json(cluster);
    } catch (error) {
      logger.error("[ClusterController] createCluster error:", error);
      next(error);
    }
  }
  
  /**
   * PUT /api/beryll/clusters/:id
   */
  async updateCluster(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const cluster = await ClusterService.updateCluster(id, req.body, userId);
      res.json(cluster);
    } catch (error) {
      logger.error("[ClusterController] updateCluster error:", error);
      next(error);
    }
  }
  
  /**
   * DELETE /api/beryll/clusters/:id
   */
  async deleteCluster(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await ClusterService.deleteCluster(id, userId);
      res.json(result);
    } catch (error) {
      logger.error("[ClusterController] deleteCluster error:", error);
      next(error);
    }
  }
  
  /**
   * GET /api/beryll/clusters/:id/history
   */
  async getClusterHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const history = await ClusterService.getHistory("CLUSTER", id, { limit, offset });
      res.json(history);
    } catch (error) {
      logger.error("[ClusterController] getClusterHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  // =============================================
  // СЕРВЕРЫ В КЛАСТЕРЕ
  // =============================================
  
  /**
   * POST /api/beryll/clusters/:clusterId/servers
   */
  async addServerToCluster(req, res, next) {
    try {
      const { clusterId } = req.params;
      const { serverId, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("serverId обязателен"));
      }
      
      const clusterServer = await ClusterService.addServerToCluster(clusterId, serverId, data, userId);
      res.status(201).json(clusterServer);
    } catch (error) {
      logger.error("[ClusterController] addServerToCluster error:", error);
      next(error);
    }
  }
  
  /**
   * POST /api/beryll/clusters/:clusterId/servers/bulk
   */
  async addServersToCluster(req, res, next) {
    try {
      const { clusterId } = req.params;
      const { serverIds, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
        return next(ApiError.badRequest("serverIds должен быть непустым массивом"));
      }
      
      const result = await ClusterService.addServersToCluster(clusterId, serverIds, data, userId);
      res.json(result);
    } catch (error) {
      logger.error("[ClusterController] addServersToCluster error:", error);
      next(error);
    }
  }
  
  /**
   * DELETE /api/beryll/clusters/:clusterId/servers/:serverId
   */
  async removeServerFromCluster(req, res, next) {
    try {
      const { clusterId, serverId } = req.params;
      const userId = req.user?.id;
      
      const result = await ClusterService.removeServerFromCluster(clusterId, serverId, userId);
      res.json(result);
    } catch (error) {
      logger.error("[ClusterController] removeServerFromCluster error:", error);
      next(error);
    }
  }
  
  /**
   * PUT /api/beryll/cluster-servers/:id
   */
  async updateClusterServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const clusterServer = await ClusterService.updateClusterServer(id, req.body, userId);
      res.json(clusterServer);
    } catch (error) {
      logger.error("[ClusterController] updateClusterServer error:", error);
      next(error);
    }
  }
  
  /**
   * GET /api/beryll/servers/unassigned
   */
  async getUnassignedServers(req, res, next) {
    try {
      const { status, batchId, search, limit } = req.query;
      const servers = await ClusterService.getUnassignedServers({ status, batchId, search, limit });
      res.json(servers);
    } catch (error) {
      logger.error("[ClusterController] getUnassignedServers error:", error);
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/servers/:serverId/clusters
   */
  async getServerClusters(req, res, next) {
    try {
      const { serverId } = req.params;
      const clusters = await ClusterService.getServerClusters(serverId);
      res.json(clusters);
    } catch (error) {
      logger.error("[ClusterController] getServerClusters error:", error);
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ClusterController();
