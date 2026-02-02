
const { Op } = require("sequelize");

const {
  BeryllShipment,
  BeryllCluster,
  BeryllClusterServer,
  BeryllExtendedHistory,
  SHIPMENT_STATUSES,
  CLUSTER_STATUSES,
  SERVER_ROLES,
  BeryllServer,
  User
} = require("../../../models/index");

class ClusterService {
  

  async getAllShipments(options = {}) {
    const { status, search, city } = options;
    
    const where = {};
    if (status) where.status = status;
    if (city) where.destinationCity = { [Op.iLike]: `%${city}%` };
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { destinationCity: { [Op.iLike]: `%${search}%` } },
        { waybillNumber: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const shipments = await BeryllShipment.findAll({
      where,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
        {
          model: BeryllCluster,
          as: "clusters",
          include: [
            {
              model: BeryllClusterServer,
              as: "clusterServers",
              attributes: ["id"]
            }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    

    return shipments.map(shipment => {
      const data = shipment.toJSON();
      const totalServers = data.clusters?.reduce((sum, c) => sum + (c.clusterServers?.length || 0), 0) || 0;
      const clustersCount = data.clusters?.length || 0;
      
      return {
        ...data,
        clustersCount,
        totalServers,
        completionPercent: data.expectedCount > 0 
          ? Math.round((totalServers / data.expectedCount) * 100) 
          : 0
      };
    });
  }
  

  async getShipmentById(id) {
    const shipment = await BeryllShipment.findByPk(id, {
      include: [
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
        {
          model: BeryllCluster,
          as: "clusters",
          include: [
            { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
            {
              model: BeryllClusterServer,
              as: "clusterServers",
              include: [
                { 
                  model: BeryllServer, 
                  as: "server", 
                  attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status"] 
                },
                { model: User, as: "addedBy", attributes: ["id", "login", "name", "surname"] }
              ]
            }
          ]
        }
      ]
    });
    
    if (!shipment) return null;
    
    const data = shipment.toJSON();
    const totalServers = data.clusters?.reduce((sum, c) => sum + (c.clusterServers?.length || 0), 0) || 0;
    
    return {
      ...data,
      totalServers,
      completionPercent: data.expectedCount > 0 
        ? Math.round((totalServers / data.expectedCount) * 100) 
        : 0
    };
  }
  

  async createShipment(data, userId) {
    const shipment = await BeryllShipment.create({
      name: data.name,
      destinationCity: data.destinationCity,
      destinationAddress: data.destinationAddress,
      contactPerson: data.contactPerson,
      contactPhone: data.contactPhone,
      expectedCount: data.expectedCount || 80,
      status: SHIPMENT_STATUSES.FORMING,
      plannedShipDate: data.plannedShipDate,
      waybillNumber: data.waybillNumber,
      carrier: data.carrier,
      notes: data.notes,
      createdById: userId,
      metadata: data.metadata || {}
    });
    
    await this.logHistory("SHIPMENT", shipment.id, "CREATED", userId, `Создан комплект "${shipment.name}"`);
    
    return this.getShipmentById(shipment.id);
  }
  

  async updateShipment(id, data, userId) {
    const shipment = await BeryllShipment.findByPk(id);
    if (!shipment) throw new Error("Комплект не найден");
    
    const oldData = shipment.toJSON();
    
    await shipment.update(data);
    

    if (data.status && data.status !== oldData.status) {
      if (data.status === SHIPMENT_STATUSES.SHIPPED && !shipment.actualShipDate) {
        await shipment.update({ actualShipDate: new Date() });
      }
      if (data.status === SHIPMENT_STATUSES.DELIVERED && !shipment.deliveredAt) {
        await shipment.update({ deliveredAt: new Date() });
      }
      if (data.status === SHIPMENT_STATUSES.ACCEPTED && !shipment.acceptedAt) {
        await shipment.update({ acceptedAt: new Date() });
      }
    }
    
    const changes = {};
    Object.keys(data).forEach(key => {
      if (oldData[key] !== data[key]) {
        changes[key] = { from: oldData[key], to: data[key] };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      await this.logHistory("SHIPMENT", id, "UPDATED", userId, `Обновлён комплект "${shipment.name}"`, changes);
    }
    
    return this.getShipmentById(id);
  }
  

  async deleteShipment(id, userId) {
    const shipment = await BeryllShipment.findByPk(id, {
      include: [{ model: BeryllCluster, as: "clusters" }]
    });
    
    if (!shipment) throw new Error("Комплект не найден");
    
    if (shipment.clusters && shipment.clusters.length > 0) {
      throw new Error(`Комплект содержит ${shipment.clusters.length} кластеров. Сначала удалите их.`);
    }
    
    await this.logHistory("SHIPMENT", id, "DELETED", userId, `Удалён комплект "${shipment.name}"`);
    
    await shipment.destroy();
    
    return { success: true, message: "Комплект удалён" };
  }
  
  async getAllClusters(options = {}) {
    const { status, shipmentId, search } = options;
    
    const where = {};
    if (status) where.status = status;
    if (shipmentId !== undefined) {
      where.shipmentId = shipmentId === "null" ? null : shipmentId;
    }
    if (search) {
      where[Op.or] = [
        { name: { [Op.iLike]: `%${search}%` } },
        { description: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const clusters = await BeryllCluster.findAll({
      where,
      include: [
        { model: BeryllShipment, as: "shipment", attributes: ["id", "name", "destinationCity"] },
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
        {
          model: BeryllClusterServer,
          as: "clusterServers",
          include: [
            { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "status"] }
          ]
        }
      ],
      order: [["createdAt", "DESC"]]
    });
    
    return clusters.map(cluster => {
      const data = cluster.toJSON();
      const serversCount = data.clusterServers?.length || 0;
      const masterCount = data.clusterServers?.filter(cs => cs.role === SERVER_ROLES.MASTER).length || 0;
      const workerCount = data.clusterServers?.filter(cs => cs.role === SERVER_ROLES.WORKER).length || 0;
      
      return {
        ...data,
        serversCount,
        masterCount,
        workerCount,
        completionPercent: data.expectedCount > 0 
          ? Math.round((serversCount / data.expectedCount) * 100) 
          : 0
      };
    });
  }
  

  async getClusterById(id) {
    const cluster = await BeryllCluster.findByPk(id, {
      include: [
        { model: BeryllShipment, as: "shipment" },
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
        {
          model: BeryllClusterServer,
          as: "clusterServers",
          include: [
            { 
              model: BeryllServer, 
              as: "server", 
              attributes: ["id", "ipAddress", "apkSerialNumber", "hostname", "status", "macAddress"] 
            },
            { model: User, as: "addedBy", attributes: ["id", "login", "name", "surname"] }
          ],
          order: [["orderNumber", "ASC"]]
        }
      ]
    });
    
    if (!cluster) return null;
    
    const data = cluster.toJSON();
    const serversCount = data.clusterServers?.length || 0;
    
    return {
      ...data,
      serversCount,
      completionPercent: data.expectedCount > 0 
        ? Math.round((serversCount / data.expectedCount) * 100) 
        : 0
    };
  }
  

  async createCluster(data, userId) {
    const cluster = await BeryllCluster.create({
      name: data.name,
      description: data.description,
      shipmentId: data.shipmentId || null,
      expectedCount: data.expectedCount || 10,
      status: CLUSTER_STATUSES.FORMING,
      configVersion: data.configVersion,
      notes: data.notes,
      createdById: userId,
      metadata: data.metadata || {}
    });
    
    await this.logHistory("CLUSTER", cluster.id, "CREATED", userId, `Создан кластер "${cluster.name}"`);
    
    return this.getClusterById(cluster.id);
  }
  

  async updateCluster(id, data, userId) {
    const cluster = await BeryllCluster.findByPk(id);
    if (!cluster) throw new Error("Кластер не найден");
    
    const oldData = cluster.toJSON();
    
    await cluster.update(data);
    
    const changes = {};
    Object.keys(data).forEach(key => {
      if (oldData[key] !== data[key]) {
        changes[key] = { from: oldData[key], to: data[key] };
      }
    });
    
    if (Object.keys(changes).length > 0) {
      await this.logHistory("CLUSTER", id, "UPDATED", userId, `Обновлён кластер "${cluster.name}"`, changes);
    }
    
    return this.getClusterById(id);
  }

  async deleteCluster(id, userId) {
    const cluster = await BeryllCluster.findByPk(id);
    if (!cluster) throw new Error("Кластер не найден");
    
    await this.logHistory("CLUSTER", id, "DELETED", userId, `Удалён кластер "${cluster.name}"`);
    
    await cluster.destroy(); 
    
    return { success: true, message: "Кластер удалён" };
  }
  

  async addServerToCluster(clusterId, serverId, data, userId) {

    const cluster = await BeryllCluster.findByPk(clusterId);
    if (!cluster) throw new Error("Кластер не найден");
    
    const server = await BeryllServer.findByPk(serverId);
    if (!server) throw new Error("Сервер не найден");
    
    const existing = await BeryllClusterServer.findOne({
      where: { clusterId, serverId }
    });
    
    if (existing) {
      throw new Error("Сервер уже добавлен в этот кластер");
    }

    const lastOrder = await BeryllClusterServer.max("orderNumber", {
      where: { clusterId }
    });
    
    const clusterServer = await BeryllClusterServer.create({
      clusterId,
      serverId,
      role: data.role || SERVER_ROLES.WORKER,
      orderNumber: data.orderNumber || (lastOrder || 0) + 1,
      clusterHostname: data.clusterHostname,
      clusterIpAddress: data.clusterIpAddress,
      notes: data.notes,
      addedAt: new Date(),
      addedById: userId
    });
    
    await this.logHistory("CLUSTER", clusterId, "SERVER_ADDED", userId, 
      `Сервер ${server.apkSerialNumber || serverId} добавлен в кластер`,
      { serverId, role: data.role }
    );
    
    return this.getClusterServerById(clusterServer.id);
  }
  

  async addServersToCluster(clusterId, serverIds, data, userId) {
    const cluster = await BeryllCluster.findByPk(clusterId);
    if (!cluster) throw new Error("Кластер не найден");
    
    const results = [];
    let orderNumber = await BeryllClusterServer.max("orderNumber", { where: { clusterId } }) || 0;
    
    for (const serverId of serverIds) {
      try {

        const existing = await BeryllClusterServer.findOne({ where: { clusterId, serverId } });
        if (existing) continue;
        
        orderNumber++;
        
        const clusterServer = await BeryllClusterServer.create({
          clusterId,
          serverId,
          role: data.role || SERVER_ROLES.WORKER,
          orderNumber,
          addedAt: new Date(),
          addedById: userId
        });
        
        results.push({ serverId, success: true, id: clusterServer.id });
      } catch (error) {
        results.push({ serverId, success: false, error: error.message });
      }
    }
    
    const successCount = results.filter(r => r.success).length;
    await this.logHistory("CLUSTER", clusterId, "SERVERS_ADDED", userId, 
      `Добавлено ${successCount} серверов в кластер`
    );
    
    return { added: successCount, results };
  }
  
  async removeServerFromCluster(clusterId, serverId, userId) {
    const clusterServer = await BeryllClusterServer.findOne({
      where: { clusterId, serverId },
      include: [{ model: BeryllServer, as: "server" }]
    });
    
    if (!clusterServer) {
      throw new Error("Сервер не найден в кластере");
    }
    
    const serverSerial = clusterServer.server?.apkSerialNumber || serverId;
    
    await clusterServer.destroy();
    
    await this.logHistory("CLUSTER", clusterId, "SERVER_REMOVED", userId, 
      `Сервер ${serverSerial} удалён из кластера`,
      { serverId }
    );
    
    return { success: true, message: "Сервер удалён из кластера" };
  }
  
  async updateClusterServer(clusterServerId, data, userId) {
    const clusterServer = await BeryllClusterServer.findByPk(clusterServerId);
    if (!clusterServer) throw new Error("Запись не найдена");
    
    await clusterServer.update({
      role: data.role !== undefined ? data.role : clusterServer.role,
      orderNumber: data.orderNumber !== undefined ? data.orderNumber : clusterServer.orderNumber,
      clusterHostname: data.clusterHostname !== undefined ? data.clusterHostname : clusterServer.clusterHostname,
      clusterIpAddress: data.clusterIpAddress !== undefined ? data.clusterIpAddress : clusterServer.clusterIpAddress,
      notes: data.notes !== undefined ? data.notes : clusterServer.notes
    });
    
    await this.logHistory("CLUSTER", clusterServer.clusterId, "SERVER_UPDATED", userId, 
      `Обновлены данные сервера в кластере`
    );
    
    return this.getClusterServerById(clusterServerId);
  }
  
  async getClusterServerById(id) {
    return BeryllClusterServer.findByPk(id, {
      include: [
        { model: BeryllCluster, as: "cluster" },
        { model: BeryllServer, as: "server" },
        { model: User, as: "addedBy", attributes: ["id", "login", "name", "surname"] }
      ]
    });
  }
  

  async getUnassignedServers(options = {}) {
    const { status, batchId, search, limit = 100 } = options;

    const assignedServerIds = await BeryllClusterServer.findAll({
      attributes: ["serverId"]
    }).then(rows => rows.map(r => r.serverId));
    
    const where = {};
    if (assignedServerIds.length > 0) {
      where.id = { [Op.notIn]: assignedServerIds };
    }
    if (status) where.status = status;
    if (batchId) where.batchId = batchId;
    if (search) {
      where[Op.or] = [
        { apkSerialNumber: { [Op.iLike]: `%${search}%` } },
        { hostname: { [Op.iLike]: `%${search}%` } },
        { ipAddress: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    return BeryllServer.findAll({
      where,
      attributes: ["id", "apkSerialNumber", "hostname", "ipAddress", "status"],
      limit,
      order: [["apkSerialNumber", "ASC"]]
    });
  }
  
  async getServerClusters(serverId) {
    return BeryllClusterServer.findAll({
      where: { serverId },
      include: [
        { model: BeryllCluster, as: "cluster", include: [{ model: BeryllShipment, as: "shipment" }] }
      ]
    });
  }
  

  async logHistory(entityType, entityId, action, userId, comment, changes = null) {
    return BeryllExtendedHistory.create({
      entityType,
      entityId,
      action,
      userId,
      comment,
      changes
    });
  }
  
  async getHistory(entityType, entityId, options = {}) {
    const { limit = 50, offset = 0 } = options;
    
    return BeryllExtendedHistory.findAndCountAll({
      where: { entityType, entityId },
      include: [
        { model: User, as: "user", attributes: ["id", "login", "name", "surname"] }
      ],
      order: [["createdAt", "DESC"]],
      limit,
      offset
    });
  }
}

module.exports = new ClusterService();
