const { BeryllServer, BeryllBatch, User } = require("../../../models/index");
const { BATCH_STATUSES } = require("../../../models/definitions/Beryll");
const { Op, fn, col } = require("sequelize");
const HistoryService = require("./HistoryService");

class BatchService {

  async getBatches(filters = {}) {
    const { status, search } = filters;
    
    const where = {};
    
    if (status && Object.values(BATCH_STATUSES).includes(status)) {
      where.status = status;
    }
    
    if (search) {
      where[Op.or] = [
        { title: { [Op.iLike]: `%${search}%` } },
        { supplier: { [Op.iLike]: `%${search}%` } }
      ];
    }
    
    const batches = await BeryllBatch.findAll({
      where,
      include: [
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] }
      ],
      order: [["createdAt", "DESC"]]
    });
    
    const batchesWithStats = await Promise.all(batches.map(async (batch) => {
      const stats = await BeryllServer.findAll({
        where: { batchId: batch.id },
        attributes: [
          "status",
          [fn("COUNT", col("id")), "count"]
        ],
        group: ["status"],
        raw: true
      });
      
      const totalCount = await BeryllServer.count({ where: { batchId: batch.id } });
      
      return {
        ...batch.toJSON(),
        totalCount,
        stats: stats.reduce((acc, s) => {
          acc[s.status] = parseInt(s.count);
          return acc;
        }, {})
      };
    }));
    
    return batchesWithStats;
  }
  
  async getBatchById(id) {
    const batch = await BeryllBatch.findByPk(id, {
      include: [
        { model: User, as: "createdBy", attributes: ["id", "login", "name", "surname"] },
        {
          model: BeryllServer,
          as: "servers",
          include: [{ model: User, as: "assignedTo", attributes: ["id", "login", "name", "surname"] }]
        }
      ]
    });
    
    if (!batch) {
      throw new Error("Партия не найдена");
    }
    
    const stats = await BeryllServer.findAll({
      where: { batchId: id },
      attributes: ["status", [fn("COUNT", col("id")), "count"]],
      group: ["status"],
      raw: true
    });
    
    return {
      ...batch.toJSON(),
      stats: stats.reduce((acc, s) => {
        acc[s.status] = parseInt(s.count);
        return acc;
      }, {})
    };
  }
  
  async createBatch(data, userId) {
    const { title, supplier, deliveryDate, expectedCount, notes } = data;
    
    if (!title) {
      throw new Error("Название партии обязательно");
    }
    
    const batch = await BeryllBatch.create({
      title,
      supplier,
      deliveryDate,
      expectedCount,
      notes,
      createdById: userId
    });
    
    return batch;
  }
  
  async updateBatch(id, data) {
    const { title, supplier, deliveryDate, expectedCount, notes, status } = data;
    
    const batch = await BeryllBatch.findByPk(id);
    
    if (!batch) {
      throw new Error("Партия не найдена");
    }
    
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (supplier !== undefined) updateData.supplier = supplier;
    if (deliveryDate !== undefined) updateData.deliveryDate = deliveryDate;
    if (expectedCount !== undefined) updateData.expectedCount = expectedCount;
    if (notes !== undefined) updateData.notes = notes;
    if (status !== undefined) {
      updateData.status = status;
      if (status === BATCH_STATUSES.COMPLETED) {
        updateData.completedAt = new Date();
      }
    }
    
    await batch.update(updateData);
    
    return batch;
  }
  
  async deleteBatch(id) {
    const batch = await BeryllBatch.findByPk(id);
    
    if (!batch) {
      throw new Error("Партия не найдена");
    }
    
    await BeryllServer.update(
      { batchId: null },
      { where: { batchId: id } }
    );
    
    await batch.destroy();
    
    return { success: true };
  }
  
  async assignServersToBatch(id, serverIds, userId) {
    const batch = await BeryllBatch.findByPk(id);
    
    if (!batch) {
      throw new Error("Партия не найдена");
    }
    
    if (!Array.isArray(serverIds) || serverIds.length === 0) {
      throw new Error("Укажите ID серверов");
    }
    
    await BeryllServer.update(
      { batchId: id },
      { where: { id: { [Op.in]: serverIds } } }
    );
    
    for (const serverId of serverIds) {
      await HistoryService.logHistory(serverId, userId, HISTORY_ACTIONS.BATCH_ASSIGNED, {
        comment: `Привязан к партии: ${batch.title}`,
        metadata: { batchId: id, batchTitle: batch.title }
      });
    }
    
    return { success: true, count: serverIds.length };
  }
  
  async removeServersFromBatch(id, serverIds, userId) {
    const batch = await BeryllBatch.findByPk(id);
    
    if (!batch) {
      throw new Error("Партия не найдена");
    }
    
    await BeryllServer.update(
      { batchId: null },
      { where: { id: { [Op.in]: serverIds }, batchId: id } }
    );
    
    for (const serverId of serverIds) {
      await HistoryService.logHistory(serverId, userId, HISTORY_ACTIONS.BATCH_REMOVED, {
        comment: `Отвязан от партии: ${batch.title}`
      });
    }
    
    return { success: true };
  }
}

module.exports = new BatchService();
