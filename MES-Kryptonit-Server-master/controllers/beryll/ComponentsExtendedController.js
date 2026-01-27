/**
 * ComponentsExtendedController.js
 * 
 * Расширенный контроллер для управления комплектующими серверов
 * Включает: добавление, редактирование, замену, историю изменений
 * 
 * Положить в: controllers/beryll/ComponentsExtendedController.js
 */

const ApiError = require("../../error/ApiError");
const { 
  BeryllServer, 
  BeryllServerComponent, 
  BeryllHistory,
  User
} = require("../../models/index");
const { Op } = require("sequelize");
const sequelize = require("../../db");

// Константы типов компонентов
const COMPONENT_TYPES = ['CPU', 'RAM', 'HDD', 'SSD', 'NVME', 'NIC', 'MOTHERBOARD', 'PSU', 'GPU', 'RAID', 'BMC', 'OTHER'];
const COMPONENT_STATUSES = ['OK', 'WARNING', 'CRITICAL', 'UNKNOWN', 'REPLACED'];

// ============================================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ============================================

/**
 * Санитизация числовых полей - преобразует пустые строки в null
 * Решает ошибку PostgreSQL: "неверный синтаксис для типа integer: """
 * 
 * @param {Object} data - входные данные
 * @returns {Object} - данные с преобразованными числовыми полями
 */
function sanitizeNumericFields(data) {
  const integerFields = ['capacity', 'speed', 'healthPercent', 'temperature', 'catalogId', 'inventoryId', 'installedById'];
  
  const sanitized = { ...data };
  
  integerFields.forEach(field => {
    if (sanitized[field] === '' || sanitized[field] === undefined) {
      sanitized[field] = null;
    } else if (sanitized[field] !== null && typeof sanitized[field] === 'string') {
      // Пытаемся преобразовать строку в число
      const parsed = parseInt(sanitized[field], 10);
      sanitized[field] = isNaN(parsed) ? null : parsed;
    }
  });
  
  // Также обрабатываем metadata - должен быть объектом, не строкой
  if (typeof sanitized.metadata === 'string') {
    try {
      sanitized.metadata = sanitized.metadata ? JSON.parse(sanitized.metadata) : {};
    } catch (e) {
      sanitized.metadata = {};
    }
  }
  if (sanitized.metadata === '' || sanitized.metadata === undefined) {
    sanitized.metadata = null;
  }
  
  return sanitized;
}

/**
 * Проверка конфликта серийных номеров
 */
async function checkSerialConflict(serialNumber, serialNumberYadro, excludeComponentId = null) {
  if (!serialNumber && !serialNumberYadro) {
    return null;
  }

  const whereConditions = [];
  
  if (serialNumber) {
    whereConditions.push({
      [Op.or]: [
        { serialNumber },
        { serialNumberYadro: serialNumber }
      ]
    });
  }
  
  if (serialNumberYadro) {
    whereConditions.push({
      [Op.or]: [
        { serialNumber: serialNumberYadro },
        { serialNumberYadro }
      ]
    });
  }

  const where = {
    [Op.or]: whereConditions,
    status: { [Op.ne]: 'REPLACED' }
  };
  
  if (excludeComponentId) {
    where.id = { [Op.ne]: excludeComponentId };
  }

  const existing = await BeryllServerComponent.findOne({
    where,
    include: [{
      model: BeryllServer,
      as: 'server',
      attributes: ['id', 'ipAddress', 'apkSerialNumber']
    }]
  });

  return existing;
}

/**
 * Запись в историю Beryll
 */
async function logHistory(serverId, userId, action, details, transaction = null) {
  try {
    await BeryllHistory.create({
      serverId,
      userId,
      action,
      comment: typeof details === 'string' ? details : JSON.stringify(details),
      metadata: typeof details === 'object' ? details : null
    }, { transaction });
  } catch (err) {
    console.error('[ComponentsExtended] History log error:', err.message);
  }
}

// ============================================
// ДОБАВЛЕНИЕ КОМПЛЕКТУЮЩЕГО
// ============================================

/**
 * Добавить новое комплектующее к серверу
 * POST /api/beryll/servers/:id/components
 */
async function addComponent(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: serverId } = req.params;
    const userId = req.user?.id;
    
    // Санитизируем входные данные для преобразования пустых строк в null
    const sanitizedBody = sanitizeNumericFields(req.body);
    
    const {
      componentType,
      name,
      manufacturer,
      model,
      serialNumber,
      serialNumberYadro,
      partNumber,
      slot,
      capacity,
      speed,
      status = 'OK',
      metadata,
      notes
    } = sanitizedBody;

    // Проверка сервера
    const server = await BeryllServer.findByPk(serverId, { transaction });
    if (!server) {
      await transaction.rollback();
      return next(ApiError.notFound('Сервер не найден'));
    }

    // Проверка типа
    if (!componentType || !COMPONENT_TYPES.includes(componentType)) {
      await transaction.rollback();
      return next(ApiError.badRequest(`Неверный тип комплектующего. Допустимые: ${COMPONENT_TYPES.join(', ')}`));
    }

    // Проверка серийников
    if (!serialNumber && !serialNumberYadro) {
      await transaction.rollback();
      return next(ApiError.badRequest('Укажите хотя бы один серийный номер'));
    }

    // Проверка уникальности серийников
    const serialConflict = await checkSerialConflict(serialNumber, serialNumberYadro, null);
    if (serialConflict) {
      await transaction.rollback();
      const conflictServer = serialConflict.server;
      return next(ApiError.badRequest(
        `Серийный номер уже используется в компоненте "${serialConflict.name}" ` +
        `на сервере ${conflictServer?.ipAddress || conflictServer?.apkSerialNumber || serialConflict.serverId}`
      ));
    }

    // Создаём комплектующее
    const component = await BeryllServerComponent.create({
      serverId: parseInt(serverId),
      componentType,
      name: name || `${manufacturer || ''} ${model || componentType}`.trim(),
      manufacturer: manufacturer || null,
      model: model || null,
      serialNumber: serialNumber || null,
      serialNumberYadro: serialNumberYadro || null,
      partNumber: partNumber || null,
      slot: slot || null,
      capacity,  // Уже санитизировано - null или число
      speed,     // Уже санитизировано - null или число
      status,
      metadata: metadata || null,
      notes: notes || null,
      dataSource: 'MANUAL',
      installedById: userId
    }, { transaction });

    // Логируем в историю
    await logHistory(serverId, userId, 'COMPONENT_ADDED', {
      componentId: component.id,
      componentType,
      name: component.name,
      serialNumber,
      serialNumberYadro
    }, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Комплектующее добавлено',
      component
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] addComponent error:', error);
    next(ApiError.internal(error.message));
  }
}

/**
 * Добавить несколько комплектующих (batch)
 * POST /api/beryll/servers/:id/components/batch
 */
async function addComponentsBatch(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: serverId } = req.params;
    const userId = req.user?.id;
    const { components } = req.body;

    if (!Array.isArray(components) || components.length === 0) {
      await transaction.rollback();
      return next(ApiError.badRequest('Передайте массив комплектующих'));
    }

    const server = await BeryllServer.findByPk(serverId, { transaction });
    if (!server) {
      await transaction.rollback();
      return next(ApiError.notFound('Сервер не найден'));
    }

    const created = [];
    const errors = [];

    for (let i = 0; i < components.length; i++) {
      // Санитизируем каждый компонент
      const comp = sanitizeNumericFields(components[i]);
      
      try {
        // Проверка конфликтов
        const conflict = await checkSerialConflict(comp.serialNumber, comp.serialNumberYadro, null);
        if (conflict) {
          errors.push({
            index: i,
            error: `Серийник уже существует: ${comp.serialNumber || comp.serialNumberYadro}`
          });
          continue;
        }

        const component = await BeryllServerComponent.create({
          serverId: parseInt(serverId),
          componentType: comp.componentType,
          name: comp.name || `${comp.manufacturer || ''} ${comp.model || comp.componentType}`.trim(),
          manufacturer: comp.manufacturer || null,
          model: comp.model || null,
          serialNumber: comp.serialNumber || null,
          serialNumberYadro: comp.serialNumberYadro || null,
          partNumber: comp.partNumber || null,
          slot: comp.slot || null,
          capacity: comp.capacity,  // Уже санитизировано
          speed: comp.speed,        // Уже санитизировано
          status: comp.status || 'OK',
          metadata: comp.metadata || null,
          dataSource: 'MANUAL',
          installedById: userId
        }, { transaction });

        created.push(component);
      } catch (err) {
        errors.push({ index: i, error: err.message });
      }
    }

    if (created.length > 0) {
      await logHistory(serverId, userId, 'COMPONENTS_BATCH_ADDED', {
        count: created.length,
        componentIds: created.map(c => c.id)
      }, transaction);
    }

    await transaction.commit();

    res.json({
      success: true,
      message: `Добавлено ${created.length} из ${components.length} комплектующих`,
      created,
      errors
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] addComponentsBatch error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// РЕДАКТИРОВАНИЕ КОМПЛЕКТУЮЩЕГО
// ============================================

/**
 * Обновить комплектующее
 * PUT /api/beryll/components/:id
 */
async function updateComponent(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: componentId } = req.params;
    const userId = req.user?.id;
    
    // Санитизируем входные данные
    const sanitizedBody = sanitizeNumericFields(req.body);
    
    const {
      name,
      manufacturer,
      model,
      serialNumber,
      serialNumberYadro,
      partNumber,
      slot,
      capacity,
      speed,
      status,
      metadata,
      notes
    } = sanitizedBody;

    const component = await BeryllServerComponent.findByPk(componentId, {
      include: [{ model: BeryllServer, as: 'server' }],
      transaction
    });

    if (!component) {
      await transaction.rollback();
      return next(ApiError.notFound('Комплектующее не найдено'));
    }

    // Сохраняем старые значения для истории
    const oldValues = {
      name: component.name,
      serialNumber: component.serialNumber,
      serialNumberYadro: component.serialNumberYadro,
      manufacturer: component.manufacturer,
      model: component.model,
      status: component.status,
      capacity: component.capacity,
      speed: component.speed
    };

    // Проверка уникальности серийников при изменении
    const newSerial = serialNumber !== undefined ? serialNumber : component.serialNumber;
    const newYadro = serialNumberYadro !== undefined ? serialNumberYadro : component.serialNumberYadro;
    
    if (newSerial !== component.serialNumber || newYadro !== component.serialNumberYadro) {
      const conflict = await checkSerialConflict(newSerial, newYadro, componentId);
      if (conflict) {
        await transaction.rollback();
        return next(ApiError.badRequest(
          `Серийный номер уже используется в компоненте "${conflict.name}"`
        ));
      }
    }

    // Обновляем поля
    if (name !== undefined) component.name = name || null;
    if (manufacturer !== undefined) component.manufacturer = manufacturer || null;
    if (model !== undefined) component.model = model || null;
    if (serialNumber !== undefined) component.serialNumber = serialNumber || null;
    if (serialNumberYadro !== undefined) component.serialNumberYadro = serialNumberYadro || null;
    if (partNumber !== undefined) component.partNumber = partNumber || null;
    if (slot !== undefined) component.slot = slot || null;
    if (capacity !== undefined) component.capacity = capacity;  // Уже санитизировано
    if (speed !== undefined) component.speed = speed;           // Уже санитизировано
    if (status !== undefined && COMPONENT_STATUSES.includes(status)) {
      component.status = status;
    }
    if (metadata !== undefined) component.metadata = metadata;
    if (notes !== undefined) component.notes = notes || null;

    await component.save({ transaction });

    // Логируем изменения
    const newValues = {
      name: component.name,
      serialNumber: component.serialNumber,
      serialNumberYadro: component.serialNumberYadro,
      manufacturer: component.manufacturer,
      model: component.model,
      status: component.status,
      capacity: component.capacity,
      speed: component.speed
    };

    await logHistory(component.serverId, userId, 'COMPONENT_UPDATED', {
      componentId: component.id,
      componentType: component.componentType,
      oldValues,
      newValues
    }, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Комплектующее обновлено',
      component
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] updateComponent error:', error);
    next(ApiError.internal(error.message));
  }
}

/**
 * Обновить только серийные номера
 * PATCH /api/beryll/components/:id/serials
 */
async function updateSerials(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: componentId } = req.params;
    const userId = req.user?.id;
    const { serialNumber, serialNumberYadro } = req.body;

    if (!serialNumber && !serialNumberYadro) {
      await transaction.rollback();
      return next(ApiError.badRequest('Укажите хотя бы один серийный номер'));
    }

    const component = await BeryllServerComponent.findByPk(componentId, { transaction });
    if (!component) {
      await transaction.rollback();
      return next(ApiError.notFound('Комплектующее не найдено'));
    }

    const oldSerials = {
      serialNumber: component.serialNumber,
      serialNumberYadro: component.serialNumberYadro
    };

    // Определяем что меняем
    const serialToCheck = serialNumber !== undefined ? serialNumber : component.serialNumber;
    const yadroToCheck = serialNumberYadro !== undefined ? serialNumberYadro : component.serialNumberYadro;

    // Проверяем конфликты
    const conflict = await checkSerialConflict(serialToCheck, yadroToCheck, componentId);
    if (conflict) {
      await transaction.rollback();
      return next(ApiError.badRequest(
        `Серийный номер уже используется в компоненте "${conflict.name}"`
      ));
    }

    // Обновляем
    if (serialNumber !== undefined) component.serialNumber = serialNumber || null;
    if (serialNumberYadro !== undefined) component.serialNumberYadro = serialNumberYadro || null;

    await component.save({ transaction });

    await logHistory(component.serverId, userId, 'COMPONENT_SERIALS_UPDATED', {
      componentId: component.id,
      oldSerials,
      newSerials: {
        serialNumber: component.serialNumber,
        serialNumberYadro: component.serialNumberYadro
      }
    }, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Серийные номера обновлены',
      component
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] updateSerials error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// ЗАМЕНА КОМПЛЕКТУЮЩЕГО
// ============================================

/**
 * Заменить комплектующее
 * POST /api/beryll/components/:id/replace
 */
async function replaceComponent(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: componentId } = req.params;
    const userId = req.user?.id;
    
    // Санитизируем входные данные
    const sanitizedBody = sanitizeNumericFields(req.body);
    
    const {
      newSerialNumber,
      newSerialNumberYadro,
      newManufacturer,
      newModel,
      newPartNumber,
      reason
    } = sanitizedBody;

    // Находим старый компонент
    const oldComponent = await BeryllServerComponent.findByPk(componentId, {
      include: [{ model: BeryllServer, as: 'server' }],
      transaction
    });

    if (!oldComponent) {
      await transaction.rollback();
      return next(ApiError.notFound('Комплектующее не найдено'));
    }

    if (!newSerialNumber && !newSerialNumberYadro) {
      await transaction.rollback();
      return next(ApiError.badRequest('Укажите серийный номер нового комплектующего'));
    }

    // Проверяем конфликты для нового серийника
    const conflict = await checkSerialConflict(newSerialNumber, newSerialNumberYadro, null);
    if (conflict) {
      await transaction.rollback();
      return next(ApiError.badRequest(
        `Серийный номер уже используется в компоненте "${conflict.name}"`
      ));
    }

    // Помечаем старый компонент как заменённый
    oldComponent.status = 'REPLACED';
    oldComponent.metadata = {
      ...oldComponent.metadata,
      replacedAt: new Date().toISOString(),
      replacedBy: userId,
      replacementReason: reason
    };
    await oldComponent.save({ transaction });

    // Создаём новый компонент
    const newComponent = await BeryllServerComponent.create({
      serverId: oldComponent.serverId,
      componentType: oldComponent.componentType,
      name: `${newManufacturer || oldComponent.manufacturer || ''} ${newModel || oldComponent.model || oldComponent.componentType}`.trim(),
      manufacturer: newManufacturer || oldComponent.manufacturer,
      model: newModel || oldComponent.model,
      serialNumber: newSerialNumber || null,
      serialNumberYadro: newSerialNumberYadro || null,
      partNumber: newPartNumber || oldComponent.partNumber,
      slot: oldComponent.slot,
      capacity: oldComponent.capacity,
      speed: oldComponent.speed,
      status: 'OK',
      dataSource: 'MANUAL',
      installedById: userId,
      metadata: {
        replacesComponentId: oldComponent.id,
        replacedAt: new Date().toISOString()
      }
    }, { transaction });

    // Логируем замену
    await logHistory(oldComponent.serverId, userId, 'COMPONENT_REPLACED', {
      oldComponentId: oldComponent.id,
      newComponentId: newComponent.id,
      componentType: oldComponent.componentType,
      oldSerial: oldComponent.serialNumber || oldComponent.serialNumberYadro,
      newSerial: newSerialNumber || newSerialNumberYadro,
      reason
    }, transaction);

    await transaction.commit();

    res.json({
      success: true,
      message: 'Комплектующее заменено',
      oldComponent,
      newComponent
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] replaceComponent error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// УДАЛЕНИЕ КОМПЛЕКТУЮЩЕГО
// ============================================

/**
 * Удалить комплектующее
 * DELETE /api/beryll/components/:id
 */
async function deleteComponent(req, res, next) {
  const transaction = await sequelize.transaction();
  
  try {
    const { id: componentId } = req.params;
    const userId = req.user?.id;
    const { reason } = req.body || {};

    const component = await BeryllServerComponent.findByPk(componentId, { transaction });
    if (!component) {
      await transaction.rollback();
      return next(ApiError.notFound('Комплектующее не найдено'));
    }

    const componentData = {
      id: component.id,
      componentType: component.componentType,
      name: component.name,
      serialNumber: component.serialNumber,
      serialNumberYadro: component.serialNumberYadro
    };

    await logHistory(component.serverId, userId, 'COMPONENT_DELETED', {
      ...componentData,
      reason
    }, transaction);

    await component.destroy({ transaction });

    await transaction.commit();

    res.json({
      success: true,
      message: 'Комплектующее удалено',
      deleted: componentData
    });

  } catch (error) {
    await transaction.rollback();
    console.error('[ComponentsExtended] deleteComponent error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// ПОИСК КОМПЛЕКТУЮЩИХ
// ============================================

/**
 * Поиск комплектующего по серийному номеру
 * GET /api/beryll/components/search?q=...
 */
async function searchComponent(req, res, next) {
  try {
    const { q, type, status, serverId, limit = 50 } = req.query;

    if (!q && !type && !status && !serverId) {
      return next(ApiError.badRequest('Укажите параметры поиска'));
    }

    const where = {};
    
    if (q) {
      where[Op.or] = [
        { serialNumber: { [Op.iLike]: `%${q}%` } },
        { serialNumberYadro: { [Op.iLike]: `%${q}%` } },
        { name: { [Op.iLike]: `%${q}%` } },
        { manufacturer: { [Op.iLike]: `%${q}%` } },
        { model: { [Op.iLike]: `%${q}%` } },
        { partNumber: { [Op.iLike]: `%${q}%` } }
      ];
    }
    
    if (type) where.componentType = type;
    if (status) where.status = status;
    if (serverId) where.serverId = parseInt(serverId);

    const components = await BeryllServerComponent.findAll({
      where,
      include: [{
        model: BeryllServer,
        as: 'server',
        attributes: ['id', 'ipAddress', 'apkSerialNumber', 'status']
      }],
      limit: parseInt(limit),
      order: [['updatedAt', 'DESC']]
    });

    res.json({
      success: true,
      count: components.length,
      components
    });

  } catch (error) {
    console.error('[ComponentsExtended] searchComponent error:', error);
    next(ApiError.internal(error.message));
  }
}

/**
 * Быстрый поиск по S/N Yadro (для сканера)
 * GET /api/beryll/components/scan?serial=...
 */
async function scanYadroSerial(req, res, next) {
  try {
    const { serial } = req.query;

    if (!serial) {
      return next(ApiError.badRequest('Укажите серийный номер'));
    }

    // Сначала точное совпадение
    let component = await BeryllServerComponent.findOne({
      where: {
        [Op.or]: [
          { serialNumberYadro: serial },
          { serialNumber: serial }
        ]
      },
      include: [{
        model: BeryllServer,
        as: 'server',
        attributes: ['id', 'ipAddress', 'apkSerialNumber', 'status']
      }]
    });

    // Если не найдено - частичное совпадение
    if (!component) {
      component = await BeryllServerComponent.findOne({
        where: {
          [Op.or]: [
            { serialNumberYadro: { [Op.iLike]: `%${serial}%` } },
            { serialNumber: { [Op.iLike]: `%${serial}%` } }
          ]
        },
        include: [{
          model: BeryllServer,
          as: 'server',
          attributes: ['id', 'ipAddress', 'apkSerialNumber', 'status']
        }]
      });
    }

    if (!component) {
      return res.json({
        success: false,
        found: false,
        message: 'Комплектующее не найдено'
      });
    }

    res.json({
      success: true,
      found: true,
      component
    });

  } catch (error) {
    console.error('[ComponentsExtended] scanYadroSerial error:', error);
    next(ApiError.internal(error.message));
  }
}

/**
 * Проверка уникальности серийного номера
 * POST /api/beryll/components/check-serial
 */
async function checkSerialUniqueness(req, res, next) {
  try {
    const { serialNumber, serialNumberYadro, excludeComponentId } = req.body;

    if (!serialNumber && !serialNumberYadro) {
      return res.json({ unique: true });
    }

    const conflict = await checkSerialConflict(serialNumber, serialNumberYadro, excludeComponentId);

    if (conflict) {
      return res.json({
        unique: false,
        conflict: {
          id: conflict.id,
          name: conflict.name,
          componentType: conflict.componentType,
          serialNumber: conflict.serialNumber,
          serialNumberYadro: conflict.serialNumberYadro,
          server: conflict.server ? {
            id: conflict.server.id,
            ipAddress: conflict.server.ipAddress,
            apkSerialNumber: conflict.server.apkSerialNumber
          } : null
        }
      });
    }

    res.json({ unique: true });

  } catch (error) {
    console.error('[ComponentsExtended] checkSerialUniqueness error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// ИСТОРИЯ ИЗМЕНЕНИЙ
// ============================================

/**
 * История изменений комплектующего
 * GET /api/beryll/components/:id/history
 */
async function getComponentHistory(req, res, next) {
  try {
    const { id: componentId } = req.params;
    const { limit = 50 } = req.query;

    const component = await BeryllServerComponent.findByPk(componentId);
    if (!component) {
      return next(ApiError.notFound('Комплектующее не найдено'));
    }

    // Ищем записи где в metadata есть componentId
    const history = await BeryllHistory.findAll({
      where: {
        serverId: component.serverId,
        [Op.or]: [
          { action: { [Op.in]: ['COMPONENT_ADDED', 'COMPONENT_UPDATED', 'COMPONENT_REPLACED', 'COMPONENT_DELETED', 'COMPONENT_SERIALS_UPDATED'] } }
        ]
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'surname']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    // Фильтруем только записи для этого компонента
    const filtered = history.filter(h => {
      try {
        const meta = h.metadata || (h.comment ? JSON.parse(h.comment) : {});
        return meta.componentId === parseInt(componentId) || 
               meta.oldComponentId === parseInt(componentId) ||
               meta.newComponentId === parseInt(componentId);
      } catch {
        return false;
      }
    });

    res.json({
      success: true,
      componentId: parseInt(componentId),
      history: filtered
    });

  } catch (error) {
    console.error('[ComponentsExtended] getComponentHistory error:', error);
    next(ApiError.internal(error.message));
  }
}

/**
 * История всех комплектующих сервера
 * GET /api/beryll/servers/:id/components/history
 */
async function getServerComponentsHistory(req, res, next) {
  try {
    const { id: serverId } = req.params;
    const { limit = 100 } = req.query;

    const history = await BeryllHistory.findAll({
      where: {
        serverId: parseInt(serverId),
        action: { 
          [Op.in]: [
            'COMPONENT_ADDED', 
            'COMPONENT_UPDATED', 
            'COMPONENT_REPLACED', 
            'COMPONENT_DELETED',
            'COMPONENT_SERIALS_UPDATED',
            'COMPONENTS_BATCH_ADDED',
            'COMPONENTS_FETCHED'
          ] 
        }
      },
      include: [{
        model: User,
        as: 'user',
        attributes: ['id', 'name', 'surname']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      serverId: parseInt(serverId),
      count: history.length,
      history
    });

  } catch (error) {
    console.error('[ComponentsExtended] getServerComponentsHistory error:', error);
    next(ApiError.internal(error.message));
  }
}

// ============================================
// ЭКСПОРТ
// ============================================

module.exports = {
  // Вспомогательные функции (для использования в других модулях)
  sanitizeNumericFields,
  checkSerialConflict,
  logHistory,
  
  // CRUD операции
  addComponent,
  addComponentsBatch,
  updateComponent,
  updateSerials,
  replaceComponent,
  deleteComponent,
  
  // Поиск
  searchComponent,
  scanYadroSerial,
  checkSerialUniqueness,
  
  // История
  getComponentHistory,
  getServerComponentsHistory
};