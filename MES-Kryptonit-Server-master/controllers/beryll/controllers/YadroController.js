const ApiError = require("../../../error/ApiError");
const { Op } = require("sequelize");
const {
  YadroTicketLog,
  SubstituteServerPool,
  SlaConfig,
  UserAlias,
  BeryllServer,
  BeryllDefectRecord,
  User,
  YADRO_REQUEST_TYPES,
  YADRO_LOG_STATUSES,
  SUBSTITUTE_STATUSES
} = require("../../../models/index");

class YadroController {

  async getAllLogs(req, res, next) {
    try {
      const {
        status,
        requestType,
        defectRecordId,
        serverId,
        dateFrom,
        dateTo,
        search,
        limit = 50,
        offset = 0
      } = req.query;

      const where = {};

      if (status) where.status = status;
      if (requestType) where.requestType = requestType;
      if (defectRecordId) where.defectRecordId = defectRecordId;
      if (serverId) where.serverId = serverId;

      if (dateFrom || dateTo) {
        where.sentAt = {};
        if (dateFrom) where.sentAt[Op.gte] = new Date(dateFrom);
        if (dateTo) where.sentAt[Op.lte] = new Date(dateTo);
      }

      if (search) {
        where[Op.or] = [
          { ticketNumber: { [Op.iLike]: `%${search}%` } },
          { problemDescription: { [Op.iLike]: `%${search}%` } },
          { sentComponentSerialYadro: { [Op.iLike]: `%${search}%` } },
          { sentComponentSerialManuf: { [Op.iLike]: `%${search}%` } }
        ];
      }

      const result = await YadroTicketLog.findAndCountAll({
        where,
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "hostname"] },
          { model: BeryllDefectRecord, as: "defectRecord", attributes: ["id", "status", "problemDescription"] },
          { model: User, as: "createdBy", attributes: ["id", "name", "surname"] }
        ],
        order: [["createdAt", "DESC"]],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });

      return res.json(result);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getLogById(req, res, next) {
    try {
      const { id } = req.params;

      const log = await YadroTicketLog.findByPk(id, {
        include: [
          { model: BeryllServer, as: "server" },
          { model: BeryllDefectRecord, as: "defectRecord" },
          { model: User, as: "createdBy", attributes: ["id", "name", "surname"] }
        ]
      });

      if (!log) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      return res.json(log);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async createLog(req, res, next) {
    try {
      const userId = req.user?.id;
      const {
        ticketNumber,
        defectRecordId,
        serverId,
        serverSerial,
        requestType,
        componentType,
        sentComponentSerialYadro,
        sentComponentSerialManuf,
        sentAt,
        problemDescription,
        notes
      } = req.body;

      if (!ticketNumber) {
        return next(ApiError.badRequest("Номер заявки обязателен"));
      }

      let finalServerId = serverId;
      if (serverSerial && !finalServerId) {
        const server = await BeryllServer.findOne({
          where: {
            [Op.or]: [
              { apkSerialNumber: serverSerial },
              { apkSerialNumber: { [Op.iLike]: `%${serverSerial}%` } }
            ]
          }
        });
        if (server) {
          finalServerId = server.id;
        }
      }

      const log = await YadroTicketLog.create({
        ticketNumber,
        defectRecordId,
        serverId: finalServerId,
        requestType: requestType || YADRO_REQUEST_TYPES.COMPONENT_REPAIR,
        status: YADRO_LOG_STATUSES.SENT,
        componentType,
        sentComponentSerialYadro,
        sentComponentSerialManuf,
        sentAt: sentAt ? new Date(sentAt) : new Date(),
        problemDescription,
        notes,
        createdById: userId
      });

      if (defectRecordId) {
        await BeryllDefectRecord.update(
          { 
            sentToYadroRepair: true, 
            sentToYadroAt: new Date(),
            yadroTicketNumber: ticketNumber
          },
          { where: { id: defectRecordId } }
        );
      }

      const created = await YadroTicketLog.findByPk(log.id, {
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "hostname"] }
        ]
      });

      return res.json(created);
    } catch (error) {
      next(error);
    }
  }

  async updateLog(req, res, next) {
    try {
      const { id } = req.params;
      const {
        ticketNumber,
        serverId,
        serverSerial,
        defectRecordId,
        requestType,
        status,
        componentType,
        sentComponentSerialYadro,
        sentComponentSerialManuf,
        receivedComponentSerialYadro,
        receivedComponentSerialManuf,
        sentAt,
        receivedAt,
        problemDescription,
        yadroResponse,
        notes
      } = req.body;

      const log = await YadroTicketLog.findByPk(id);
      if (!log) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      const updateData = {};

      if (ticketNumber !== undefined) updateData.ticketNumber = ticketNumber;
      if (defectRecordId !== undefined) updateData.defectRecordId = defectRecordId;
      if (requestType !== undefined) updateData.requestType = requestType;
      if (status !== undefined) updateData.status = status;
      if (componentType !== undefined) updateData.componentType = componentType;
      if (sentComponentSerialYadro !== undefined) updateData.sentComponentSerialYadro = sentComponentSerialYadro;
      if (sentComponentSerialManuf !== undefined) updateData.sentComponentSerialManuf = sentComponentSerialManuf;
      if (receivedComponentSerialYadro !== undefined) updateData.receivedComponentSerialYadro = receivedComponentSerialYadro;
      if (receivedComponentSerialManuf !== undefined) updateData.receivedComponentSerialManuf = receivedComponentSerialManuf;
      if (sentAt !== undefined) updateData.sentAt = sentAt ? new Date(sentAt) : null;
      if (receivedAt !== undefined) updateData.receivedAt = receivedAt ? new Date(receivedAt) : null;
      if (problemDescription !== undefined) updateData.problemDescription = problemDescription;
      if (yadroResponse !== undefined) updateData.yadroResponse = yadroResponse;
      if (notes !== undefined) updateData.notes = notes;

      if (serverId !== undefined) {
        updateData.serverId = serverId;
      } else if (serverSerial) {
        const server = await BeryllServer.findOne({
          where: {
            [Op.or]: [
              { apkSerialNumber: serverSerial },
              { apkSerialNumber: { [Op.iLike]: `%${serverSerial}%` } }
            ]
          }
        });
        if (server) {
          updateData.serverId = server.id;
        }
      }

      await log.update(updateData);

      const updated = await YadroTicketLog.findByPk(id, {
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "hostname"] },
          { model: BeryllDefectRecord, as: "defectRecord", attributes: ["id", "status", "problemDescription"] }
        ]
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async updateLogStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { 
        status, 
        yadroResponse, 
        receivedComponentSerialYadro, 
        receivedComponentSerialManuf,
        notes
      } = req.body;

      const log = await YadroTicketLog.findByPk(id);
      if (!log) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      const updateData = { status };

      switch (status) {
        case YADRO_LOG_STATUSES.IN_PROGRESS:
          break;
          
        case YADRO_LOG_STATUSES.COMPLETED:
          if (yadroResponse) updateData.yadroResponse = yadroResponse;
          break;
          
        case YADRO_LOG_STATUSES.RECEIVED:
          updateData.receivedAt = new Date();
          if (receivedComponentSerialYadro) updateData.receivedComponentSerialYadro = receivedComponentSerialYadro;
          if (receivedComponentSerialManuf) updateData.receivedComponentSerialManuf = receivedComponentSerialManuf;
          if (yadroResponse) updateData.yadroResponse = yadroResponse;
          
          if (log.defectRecordId) {
            await BeryllDefectRecord.update(
              { 
                returnedFromYadro: true, 
                returnedFromYadroAt: new Date(),
                replacementPartSerialYadro: receivedComponentSerialYadro,
                replacementPartSerialManuf: receivedComponentSerialManuf
              },
              { where: { id: log.defectRecordId } }
            );
          }
          break;
          
        case YADRO_LOG_STATUSES.CLOSED:
          if (notes) updateData.notes = (log.notes ? log.notes + "\n" : "") + notes;
          break;
      }

      await log.update(updateData);

      return res.json(log);
    } catch (error) {
      next(error);
    }
  }

  async deleteLog(req, res, next) {
    try {
      const { id } = req.params;

      const log = await YadroTicketLog.findByPk(id);
      if (!log) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      if (log.defectRecordId) {
        await BeryllDefectRecord.update(
          { 
            sentToYadroRepair: false,
            yadroTicketNumber: null 
          },
          { where: { id: log.defectRecordId } }
        );
      }

      await log.destroy();

      return res.json({ success: true, message: `Запись ${log.ticketNumber} удалена` });
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async linkLogToServer(req, res, next) {
    try {
      const { id } = req.params;
      const { serverSerial, serverId: directServerId } = req.body;

      const log = await YadroTicketLog.findByPk(id);
      if (!log) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      let serverId = directServerId;

      if (serverSerial && !serverId) {
        const server = await BeryllServer.findOne({
          where: {
            [Op.or]: [
              { apkSerialNumber: serverSerial },
              { apkSerialNumber: { [Op.iLike]: `%${serverSerial}%` } }
            ]
          }
        });

        if (!server) {
          return next(ApiError.notFound(`Сервер с S/N "${serverSerial}" не найден`));
        }

        serverId = server.id;
      }

      if (!serverId) {
        return next(ApiError.badRequest("Укажите serverId или serverSerial"));
      }

      await log.update({ serverId });

      const updated = await YadroTicketLog.findByPk(id, {
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "hostname"] }
        ]
      });

      return res.json(updated);
    } catch (error) {
      next(error);
    }
  }

  async getOpenLogs(req, res, next) {
    try {
      const logs = await YadroTicketLog.getOpenRequests();
      return res.json(logs);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getLogStats(req, res, next) {
    try {
      const { dateFrom, dateTo } = req.query;
      const stats = await YadroTicketLog.getStats(
        dateFrom ? new Date(dateFrom) : null,
        dateTo ? new Date(dateTo) : null
      );
      return res.json(stats);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getAllSubstitutes(req, res, next) {
    try {
      const { status } = req.query;

      const where = {};
      if (status) where.status = status;

      const substitutes = await SubstituteServerPool.findAll({
        where,
        include: [
          { model: BeryllServer, as: "server", attributes: ["id", "apkSerialNumber", "hostname", "ipAddress"] },
          { model: User, as: "issuedTo", attributes: ["id", "name", "surname"] },
          { model: BeryllDefectRecord, as: "currentDefect", attributes: ["id", "status", "problemDescription"] }
        ],
        order: [["status", "ASC"], ["usageCount", "ASC"]]
      });

      return res.json(substitutes);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getAvailableSubstitutes(req, res, next) {
    try {
      const substitutes = await SubstituteServerPool.getAvailable();
      return res.json(substitutes);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async addToSubstitutePool(req, res, next) {
    try {
      const { serverId, notes } = req.body;

      if (!serverId) {
        return next(ApiError.badRequest("serverId обязателен"));
      }

      const server = await BeryllServer.findByPk(serverId);
      if (!server) {
        return next(ApiError.notFound("Сервер не найден"));
      }

      const existing = await SubstituteServerPool.findOne({ where: { serverId } });
      if (existing) {
        return next(ApiError.badRequest("Сервер уже в пуле подменных"));
      }

      const substitute = await SubstituteServerPool.create({
        serverId,
        status: SUBSTITUTE_STATUSES.AVAILABLE,
        notes
      });

      await server.update({
        isSubstitutePool: true,
        substitutePoolAddedAt: new Date()
      });

      return res.json(substitute);
    } catch (error) {
      next(error);
    }
  }

  async removeFromSubstitutePool(req, res, next) {
    try {
      const { id } = req.params;

      const substitute = await SubstituteServerPool.findByPk(id);
      if (!substitute) {
        return next(ApiError.notFound("Запись не найдена"));
      }

      if (substitute.status === SUBSTITUTE_STATUSES.IN_USE) {
        return next(ApiError.badRequest("Невозможно удалить - сервер используется как подменный"));
      }

      await BeryllServer.update(
        { isSubstitutePool: false },
        { where: { id: substitute.serverId } }
      );

      await substitute.destroy();

      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async issueSubstitute(req, res, next) {
    try {
      const { id } = req.params;
      const { defectId } = req.body;
      const userId = req.user?.id;

      if (!defectId) {
        return next(ApiError.badRequest("defectId обязателен"));
      }

      const substitute = await SubstituteServerPool.findByPk(id);
      if (!substitute) {
        return next(ApiError.notFound("Подменный сервер не найден"));
      }

      await substitute.issue(defectId, userId);

      return res.json(substitute);
    } catch (error) {
      next(error);
    }
  }

  async returnSubstitute(req, res, next) {
    try {
      const { id } = req.params;

      const substitute = await SubstituteServerPool.findByPk(id);
      if (!substitute) {
        return next(ApiError.notFound("Подменный сервер не найден"));
      }

      await substitute.return();

      return res.json(substitute);
    } catch (error) {
      next(error);
    }
  }

  async setSubstituteMaintenance(req, res, next) {
    try {
      const { id } = req.params;
      const { notes } = req.body;

      const substitute = await SubstituteServerPool.findByPk(id);
      if (!substitute) {
        return next(ApiError.notFound("Подменный сервер не найден"));
      }

      await substitute.setMaintenance(notes);

      return res.json(substitute);
    } catch (error) {
      next(error);
    }
  }

  async getSubstituteStats(req, res, next) {
    try {
      const stats = await SubstituteServerPool.getStats();
      return res.json(stats);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getAllSlaConfigs(req, res, next) {
    try {
      const configs = await SlaConfig.findAll({
        where: { isActive: true },
        order: [["defectType", "ASC"], ["priority", "ASC"]]
      });
      return res.json(configs);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async createSlaConfig(req, res, next) {
    try {
      const config = await SlaConfig.create(req.body);
      return res.json(config);
    } catch (error) {
      next(error);
    }
  }

  async updateSlaConfig(req, res, next) {
    try {
      const { id } = req.params;

      const config = await SlaConfig.findByPk(id);
      if (!config) {
        return next(ApiError.notFound("Конфигурация не найдена"));
      }

      await config.update(req.body);
      return res.json(config);
    } catch (error) {
      next(error);
    }
  }

  async deleteSlaConfig(req, res, next) {
    try {
      const { id } = req.params;

      const config = await SlaConfig.findByPk(id);
      if (!config) {
        return next(ApiError.notFound("Конфигурация не найдена"));
      }

      await config.update({ isActive: false });
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async getAllAliases(req, res, next) {
    try {
      const { userId } = req.query;

      const where = { isActive: true };
      if (userId) where.userId = userId;

      const aliases = await UserAlias.findAll({
        where,
        include: [{ model: User, as: "user", attributes: ["id", "name", "surname", "login"] }],
        order: [["alias", "ASC"]]
      });

      return res.json(aliases);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async findUserByAlias(req, res, next) {
    try {
      const { alias } = req.params;

      const user = await UserAlias.findUserByAlias(alias);

      if (!user) {
        return next(ApiError.notFound("Пользователь не найден по алиасу"));
      }

      return res.json(user);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async createAlias(req, res, next) {
    try {
      const { userId, alias, source } = req.body;

      if (!userId || !alias) {
        return next(ApiError.badRequest("userId и alias обязательны"));
      }

      const record = await UserAlias.create({
        userId,
        alias: alias.trim(),
        source: source || "manual",
        isActive: true
      });

      return res.json(record);
    } catch (error) {
      next(error);
    }
  }

  async deleteAlias(req, res, next) {
    try {
      const { id } = req.params;

      const alias = await UserAlias.findByPk(id);
      if (!alias) {
        return next(ApiError.notFound("Алиас не найден"));
      }

      await alias.update({ isActive: false });
      return res.json({ success: true });
    } catch (error) {
      next(error);
    }
  }

  async generateAliasesForUser(req, res, next) {
    try {
      const { userId } = req.params;

      const user = await User.findByPk(userId);
      if (!user) {
        return next(ApiError.notFound("Пользователь не найден"));
      }

      const aliases = await UserAlias.generateAliasesFromUser(user);
      return res.json(aliases);
    } catch (error) {
      next(error);
    }
  }

  async getRequestTypes(req, res, next) {
    try {
      const types = Object.entries(YADRO_REQUEST_TYPES).map(([key, value]) => ({
        value,
        label: this.getRequestTypeLabel(value)
      }));
      return res.json(types);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  async getLogStatuses(req, res, next) {
    try {
      const statuses = Object.entries(YADRO_LOG_STATUSES).map(([key, value]) => ({
        value,
        label: this.getLogStatusLabel(value)
      }));
      return res.json(statuses);
    } catch (error) {
      next(ApiError.internal(error.message));
    }
  }

  getRequestTypeLabel(type) {
    const labels = {
      COMPONENT_REPAIR: "Ремонт компонента",
      COMPONENT_EXCHANGE: "Обмен компонента",
      WARRANTY_CLAIM: "Гарантийный случай",
      CONSULTATION: "Консультация"
    };
    return labels[type] || type;
  }

  getLogStatusLabel(status) {
    const labels = {
      SENT: "Отправлено",
      IN_PROGRESS: "В работе у Ядро",
      COMPLETED: "Ядро завершил",
      RECEIVED: "Получено обратно",
      CLOSED: "Закрыто"
    };
    return labels[status] || status;
  }
}

module.exports = new YadroController();