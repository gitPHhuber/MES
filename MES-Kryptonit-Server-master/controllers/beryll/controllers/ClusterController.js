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
const { buildRequestLogContext } = require("../../../utils/logging");

class ClusterController {
  
  // =============================================
  // КОМПЛЕКТЫ/ОТГРУЗКИ
  // =============================================
  
  /**
   * GET /api/beryll/shipments
   */
  async getAllShipments(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { status, search, city } = req.query;
      logger.info("Beryll shipments db start", { ...logContext, step: "db_start" });
      const shipments = await ClusterService.getAllShipments({ status, search, city });
      logger.info("Beryll shipments db ok", {
        ...logContext,
        step: "db_ok",
        shipmentsCount: shipments.length,
      });
      res.json(shipments);
    } catch (error) {
      logger.error("Beryll shipments db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/shipments/:id
   */
  async getShipmentById(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      logger.info("Beryll shipment by id db start", {
        ...logContext,
        step: "db_start",
        shipmentId: id,
      });
      const shipment = await ClusterService.getShipmentById(id);
      logger.info("Beryll shipment by id db ok", {
        ...logContext,
        step: "db_ok",
        shipmentId: id,
        found: Boolean(shipment),
      });
      
      if (!shipment) {
        return next(ApiError.notFound("Комплект не найден"));
      }
      
      res.json(shipment);
    } catch (error) {
      logger.error("Beryll shipment by id db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/shipments
   */
  async createShipment(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const userId = req.user?.id;
      logger.info("Beryll shipment create db start", {
        ...logContext,
        step: "db_start",
        userId,
      });
      const shipment = await ClusterService.createShipment(req.body, userId);
      logger.info("Beryll shipment create db ok", {
        ...logContext,
        step: "db_ok",
        shipmentId: shipment?.id,
      });
      res.status(201).json(shipment);
    } catch (error) {
      logger.error("Beryll shipment create db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/shipments/:id
   */
  async updateShipment(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll shipment update db start", {
        ...logContext,
        step: "db_start",
        shipmentId: id,
        userId,
      });
      const shipment = await ClusterService.updateShipment(id, req.body, userId);
      logger.info("Beryll shipment update db ok", {
        ...logContext,
        step: "db_ok",
        shipmentId: id,
      });
      res.json(shipment);
    } catch (error) {
      logger.error("Beryll shipment update db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * DELETE /api/beryll/shipments/:id
   */
  async deleteShipment(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll shipment delete db start", {
        ...logContext,
        step: "db_start",
        shipmentId: id,
        userId,
      });
      const result = await ClusterService.deleteShipment(id, userId);
      logger.info("Beryll shipment delete db ok", {
        ...logContext,
        step: "db_ok",
        shipmentId: id,
      });
      res.json(result);
    } catch (error) {
      logger.error("Beryll shipment delete db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/shipments/:id/history
   */
  async getShipmentHistory(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { limit, offset } = req.query;
      logger.info("Beryll shipment history db start", {
        ...logContext,
        step: "db_start",
        shipmentId: id,
      });
      const history = await ClusterService.getHistory("SHIPMENT", id, { limit, offset });
      logger.info("Beryll shipment history db ok", {
        ...logContext,
        step: "db_ok",
        shipmentId: id,
      });
      res.json(history);
    } catch (error) {
      logger.error("Beryll shipment history db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
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
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { status, shipmentId, search } = req.query;
      logger.info("Beryll clusters db start", { ...logContext, step: "db_start" });
      const clusters = await ClusterService.getAllClusters({ status, shipmentId, search });
      logger.info("Beryll clusters db ok", {
        ...logContext,
        step: "db_ok",
        clustersCount: clusters.length,
      });
      res.json(clusters);
    } catch (error) {
      logger.error("Beryll clusters db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/clusters/:id
   */
  async getClusterById(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      logger.info("Beryll cluster by id db start", {
        ...logContext,
        step: "db_start",
        clusterId: id,
      });
      const cluster = await ClusterService.getClusterById(id);
      logger.info("Beryll cluster by id db ok", {
        ...logContext,
        step: "db_ok",
        clusterId: id,
        found: Boolean(cluster),
      });
      
      if (!cluster) {
        return next(ApiError.notFound("Кластер не найден"));
      }
      
      res.json(cluster);
    } catch (error) {
      logger.error("Beryll cluster by id db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * POST /api/beryll/clusters
   */
  async createCluster(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const userId = req.user?.id;
      logger.info("Beryll cluster create db start", {
        ...logContext,
        step: "db_start",
        userId,
      });
      const cluster = await ClusterService.createCluster(req.body, userId);
      logger.info("Beryll cluster create db ok", {
        ...logContext,
        step: "db_ok",
        clusterId: cluster?.id,
      });
      res.status(201).json(cluster);
    } catch (error) {
      logger.error("Beryll cluster create db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/clusters/:id
   */
  async updateCluster(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll cluster update db start", {
        ...logContext,
        step: "db_start",
        clusterId: id,
        userId,
      });
      const cluster = await ClusterService.updateCluster(id, req.body, userId);
      logger.info("Beryll cluster update db ok", {
        ...logContext,
        step: "db_ok",
        clusterId: id,
      });
      res.json(cluster);
    } catch (error) {
      logger.error("Beryll cluster update db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * DELETE /api/beryll/clusters/:id
   */
  async deleteCluster(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll cluster delete db start", {
        ...logContext,
        step: "db_start",
        clusterId: id,
        userId,
      });
      const result = await ClusterService.deleteCluster(id, userId);
      logger.info("Beryll cluster delete db ok", {
        ...logContext,
        step: "db_ok",
        clusterId: id,
      });
      res.json(result);
    } catch (error) {
      logger.error("Beryll cluster delete db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/clusters/:id/history
   */
  async getClusterHistory(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const { limit, offset } = req.query;
      logger.info("Beryll cluster history db start", {
        ...logContext,
        step: "db_start",
        clusterId: id,
      });
      const history = await ClusterService.getHistory("CLUSTER", id, { limit, offset });
      logger.info("Beryll cluster history db ok", {
        ...logContext,
        step: "db_ok",
        clusterId: id,
      });
      res.json(history);
    } catch (error) {
      logger.error("Beryll cluster history db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
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
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { clusterId } = req.params;
      const { serverId, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverId) {
        return next(ApiError.badRequest("serverId обязателен"));
      }
      
      logger.info("Beryll cluster add server db start", {
        ...logContext,
        step: "db_start",
        clusterId,
        serverId,
        userId,
      });
      const clusterServer = await ClusterService.addServerToCluster(clusterId, serverId, data, userId);
      logger.info("Beryll cluster add server db ok", {
        ...logContext,
        step: "db_ok",
        clusterId,
        serverId,
      });
      res.status(201).json(clusterServer);
    } catch (error) {
      logger.error("Beryll cluster add server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * POST /api/beryll/clusters/:clusterId/servers/bulk
   */
  async addServersToCluster(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { clusterId } = req.params;
      const { serverIds, ...data } = req.body;
      const userId = req.user?.id;
      
      if (!serverIds || !Array.isArray(serverIds) || serverIds.length === 0) {
        return next(ApiError.badRequest("serverIds должен быть непустым массивом"));
      }
      
      logger.info("Beryll cluster add servers db start", {
        ...logContext,
        step: "db_start",
        clusterId,
        serversCount: serverIds.length,
        userId,
      });
      const result = await ClusterService.addServersToCluster(clusterId, serverIds, data, userId);
      logger.info("Beryll cluster add servers db ok", {
        ...logContext,
        step: "db_ok",
        clusterId,
        serversCount: serverIds.length,
      });
      res.json(result);
    } catch (error) {
      logger.error("Beryll cluster add servers db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * DELETE /api/beryll/clusters/:clusterId/servers/:serverId
   */
  async removeServerFromCluster(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { clusterId, serverId } = req.params;
      const userId = req.user?.id;
      
      logger.info("Beryll cluster remove server db start", {
        ...logContext,
        step: "db_start",
        clusterId,
        serverId,
        userId,
      });
      const result = await ClusterService.removeServerFromCluster(clusterId, serverId, userId);
      logger.info("Beryll cluster remove server db ok", {
        ...logContext,
        step: "db_ok",
        clusterId,
        serverId,
      });
      res.json(result);
    } catch (error) {
      logger.error("Beryll cluster remove server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * PUT /api/beryll/cluster-servers/:id
   */
  async updateClusterServer(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { id } = req.params;
      const userId = req.user?.id;
      logger.info("Beryll cluster update server db start", {
        ...logContext,
        step: "db_start",
        clusterServerId: id,
        userId,
      });
      const clusterServer = await ClusterService.updateClusterServer(id, req.body, userId);
      logger.info("Beryll cluster update server db ok", {
        ...logContext,
        step: "db_ok",
        clusterServerId: id,
      });
      res.json(clusterServer);
    } catch (error) {
      logger.error("Beryll cluster update server db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.badRequest(error.message));
    }
  }
  
  /**
   * GET /api/beryll/servers/unassigned
   */
  async getUnassignedServers(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { status, batchId, search, limit } = req.query;
      logger.info("Beryll unassigned servers db start", { ...logContext, step: "db_start" });
      const servers = await ClusterService.getUnassignedServers({ status, batchId, search, limit });
      logger.info("Beryll unassigned servers db ok", {
        ...logContext,
        step: "db_ok",
        serversCount: servers.length,
      });
      res.json(servers);
    } catch (error) {
      logger.error("Beryll unassigned servers db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
  
  /**
   * GET /api/beryll/servers/:serverId/clusters
   */
  async getServerClusters(req, res, next) {
    try {
      const logContext = buildRequestLogContext(req, { includeInput: true });
      const { serverId } = req.params;
      logger.info("Beryll server clusters db start", {
        ...logContext,
        step: "db_start",
        serverId,
      });
      const clusters = await ClusterService.getServerClusters(serverId);
      logger.info("Beryll server clusters db ok", {
        ...logContext,
        step: "db_ok",
        serverId,
        clustersCount: clusters.length,
      });
      res.json(clusters);
    } catch (error) {
      logger.error("Beryll server clusters db error", {
        ...buildRequestLogContext(req, { includeInput: true }),
        step: "db_error",
        error: error.message,
      });
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ClusterController();
