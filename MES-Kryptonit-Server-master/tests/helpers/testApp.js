process.env.NODE_ENV = 'test';
process.env.KEYCLOAK_AUTO_SYNC = 'false';

jest.mock('../../middleware/authMiddleware', () => {
  const { authMiddleware } = require('./mockAuth');
  return authMiddleware;
});

jest.mock('../../middleware/syncUserMiddleware', () => {
  const { syncUserMiddleware } = require('./mockAuth');
  return syncUserMiddleware;
});

jest.mock('../../middleware/checkAbilityMiddleware', () => {
  const { allowAbility } = require('./mockAuth');
  return allowAbility;
});

jest.mock('../../services/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn(),
}));

jest.mock('../../routes/beryll/beryllExtendedRoutes', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../../routes/beryllExtendedRouter', () => {
  const express = require('express');
  return express.Router();
});

jest.mock('../../models/ProductionOutput', () => ({
  ProductionOutput: {
    findAll: jest.fn(),
  },
  OUTPUT_STATUSES: {
    APPROVED: 'APPROVED',
  },
}));

jest.mock('../../models/definitions/Beryll', () => ({
  SERVER_STATUSES: {},
  HISTORY_ACTIONS: {},
  DEFECT_CATEGORIES: {},
  DEFECT_PRIORITIES: {},
  DEFECT_STATUSES: {},
  COMPONENT_TYPES: {},
  COMPONENT_STATUSES: {},
  setupAssociations: jest.fn(),
  BeryllServer: {},
  BeryllBatch: {},
  BeryllHistory: {},
  BeryllChecklistTemplate: {},
  BeryllServerChecklist: {},
  BeryllDefectComment: {},
  BeryllDefectFile: {},
  BeryllServerComponent: {},
}));

const { app } = require('../../index');

module.exports = { app };
