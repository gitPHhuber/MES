
const ClusterService = require("../services/ClusterService");
const ApiError = require("../../../error/ApiError");

class ClusterController {
  
  async getAllShipments(req, res, next) {
    try {
      const { status, search, city } = req.query;
      const shipments = await ClusterService.getAllShipments({ status, search, city });
      res.json(shipments);
    } catch (error) {
      console.error("[ClusterController] getAllShipments error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getShipmentById(req, res, next) {
    try {
      const { id } = req.params;
      const shipment = await ClusterService.getShipmentById(id);
      
      if (!shipment) {
        return next(ApiError.notFound("Комплект не найден"));
      }
      
      res.json(shipment);
    } catch (error) {
      console.error("[ClusterController] getShipmentById error:", error);
      next(ApiError.internal(error.message));
    }
  }

  async createShipment(req, res, next) {
    try {
      const userId = req.user?.id;
      const shipment = await ClusterService.createShipment(req.body, userId);
      res.status(201).json(shipment);
    } catch (error) {
      console.error("[ClusterController] createShipment error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  
 
  async updateShipment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const shipment = await ClusterService.updateShipment(id, req.body, userId);
      res.json(shipment);
    } catch (error) {
      console.error("[ClusterController] updateShipment error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async deleteShipment(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await ClusterService.deleteShipment(id, userId);
      res.json(result);
    } catch (error) {
      console.error("[ClusterController] deleteShipment error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async getShipmentHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const history = await ClusterService.getHistory("SHIPMENT", id, { limit, offset });
      res.json(history);
    } catch (error) {
      console.error("[ClusterController] getShipmentHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getAllClusters(req, res, next) {
    try {
      const { status, shipmentId, search } = req.query;
      const clusters = await ClusterService.getAllClusters({ status, shipmentId, search });
      res.json(clusters);
    } catch (error) {
      console.error("[ClusterController] getAllClusters error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getClusterById(req, res, next) {
    try {
      const { id } = req.params;
      const cluster = await ClusterService.getClusterById(id);
      
      if (!cluster) {
        return next(ApiError.notFound("Кластер не найден"));
      }
      
      res.json(cluster);
    } catch (error) {
      console.error("[ClusterController] getClusterById error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async createCluster(req, res, next) {
    try {
      const userId = req.user?.id;
      const cluster = await ClusterService.createCluster(req.body, userId);
      res.status(201).json(cluster);
    } catch (error) {
      console.error("[ClusterController] createCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }

  async updateCluster(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const cluster = await ClusterService.updateCluster(id, req.body, userId);
      res.json(cluster);
    } catch (error) {
      console.error("[ClusterController] updateCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async deleteCluster(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const result = await ClusterService.deleteCluster(id, userId);
      res.json(result);
    } catch (error) {
      console.error("[ClusterController] deleteCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async getClusterHistory(req, res, next) {
    try {
      const { id } = req.params;
      const { limit, offset } = req.query;
      const history = await ClusterService.getHistory("CLUSTER", id, { limit, offset });
      res.json(history);
    } catch (error) {
      console.error("[ClusterController] getClusterHistory error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

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
      console.error("[ClusterController] addServerToCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

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
      console.error("[ClusterController] addServersToCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async removeServerFromCluster(req, res, next) {
    try {
      const { clusterId, serverId } = req.params;
      const userId = req.user?.id;
      
      const result = await ClusterService.removeServerFromCluster(clusterId, serverId, userId);
      res.json(result);
    } catch (error) {
      console.error("[ClusterController] removeServerFromCluster error:", error);
      next(ApiError.badRequest(error.message));
    }
  }

  async updateClusterServer(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const clusterServer = await ClusterService.updateClusterServer(id, req.body, userId);
      res.json(clusterServer);
    } catch (error) {
      console.error("[ClusterController] updateClusterServer error:", error);
      next(ApiError.badRequest(error.message));
    }
  }
  

  async getUnassignedServers(req, res, next) {
    try {
      const { status, batchId, search, limit } = req.query;
      const servers = await ClusterService.getUnassignedServers({ status, batchId, search, limit });
      res.json(servers);
    } catch (error) {
      console.error("[ClusterController] getUnassignedServers error:", error);
      next(ApiError.internal(error.message));
    }
  }
  

  async getServerClusters(req, res, next) {
    try {
      const { serverId } = req.params;
      const clusters = await ClusterService.getServerClusters(serverId);
      res.json(clusters);
    } catch (error) {
      console.error("[ClusterController] getServerClusters error:", error);
      next(ApiError.internal(error.message));
    }
  }
}

module.exports = new ClusterController();
