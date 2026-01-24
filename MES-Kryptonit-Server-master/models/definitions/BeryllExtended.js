// Canonical BeryllExtended model definitions (replaces former models/BeryllExtended.js).
const sequelize = require("../../db");
const { DataTypes } = require("sequelize");

const RACK_STATUSES = {
  ACTIVE: "ACTIVE",
  MAINTENANCE: "MAINTENANCE",
  DECOMMISSIONED: "DECOMMISSIONED"
};

const CLUSTER_STATUSES = {
  FORMING: "FORMING",
  READY: "READY",
  SHIPPED: "SHIPPED",
  DEPLOYED: "DEPLOYED"
};

const SHIPMENT_STATUSES = {
  FORMING: "FORMING",
  READY: "READY",
  SHIPPED: "SHIPPED",
  IN_TRANSIT: "IN_TRANSIT",
  DELIVERED: "DELIVERED",
  ACCEPTED: "ACCEPTED"
};

const SERVER_ROLES = {
  MASTER: "MASTER",
  WORKER: "WORKER",
  STORAGE: "STORAGE",
  GATEWAY: "GATEWAY"
};

const REPAIR_PART_TYPES = {
  RAM: "RAM",
  RAM_ECC: "RAM_ECC",
  MOTHERBOARD: "MOTHERBOARD",
  CPU: "CPU",
  CPU_SOCKET: "CPU_SOCKET",
  HDD: "HDD",
  SSD: "SSD",
  PSU: "PSU",
  FAN: "FAN",
  THERMAL: "THERMAL",
  RAID: "RAID",
  NIC: "NIC",
  BACKPLANE: "BACKPLANE",
  BMC: "BMC",
  CABLE: "CABLE",
  PCIE_SLOT: "PCIE_SLOT",
  RAM_SOCKET: "RAM_SOCKET",
  CHASSIS: "CHASSIS",
  OTHER: "OTHER"
};

const DEFECT_RECORD_STATUSES = {
  NEW: "NEW",
  DIAGNOSING: "DIAGNOSING",
  WAITING_PARTS: "WAITING_PARTS",
  REPAIRING: "REPAIRING",
  SENT_TO_YADRO: "SENT_TO_YADRO",
  RETURNED: "RETURNED",
  RESOLVED: "RESOLVED",
  REPEATED: "REPEATED",
  CLOSED: "CLOSED"
};

const BeryllRack = sequelize.define("BeryllRack", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false,
    unique: true
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  totalUnits: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 42
  },
  networkSubnet: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  gateway: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(RACK_STATUSES)),
    allowNull: false,
    defaultValue: RACK_STATUSES.ACTIVE
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_racks",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["status"] },
    { fields: ["location"] }
  ]
});

const BeryllRackUnit = sequelize.define("BeryllRackUnit", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  rackId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_racks",
      key: "id"
    }
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  unitNumber: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  hostname: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  mgmtMacAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  mgmtIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  dataMacAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  dataIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  accessLogin: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  accessPassword: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  installedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  installedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_rack_units",
  timestamps: true,
  indexes: [
    { fields: ["rackId"] },
    { fields: ["serverId"] },
    { fields: ["unitNumber"] },
    { unique: true, fields: ["rackId", "unitNumber"] },
    { fields: ["hostname"] }
  ]
});

const BeryllShipment = sequelize.define("BeryllShipment", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(200),
    allowNull: false
  },
  destinationCity: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  destinationAddress: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  contactPerson: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  contactPhone: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  expectedCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 80
  },
  status: {
    type: DataTypes.ENUM(...Object.values(SHIPMENT_STATUSES)),
    allowNull: false,
    defaultValue: SHIPMENT_STATUSES.FORMING
  },
  plannedShipDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  actualShipDate: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  deliveredAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  acceptedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  waybillNumber: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  carrier: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_shipments",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["status"] },
    { fields: ["destinationCity"] },
    { fields: ["plannedShipDate"] }
  ]
});

const BeryllCluster = sequelize.define("BeryllCluster", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  shipmentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_shipments",
      key: "id"
    }
  },
  expectedCount: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 10
  },
  status: {
    type: DataTypes.ENUM(...Object.values(CLUSTER_STATUSES)),
    allowNull: false,
    defaultValue: CLUSTER_STATUSES.FORMING
  },
  configVersion: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  createdById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_clusters",
  timestamps: true,
  indexes: [
    { fields: ["name"] },
    { fields: ["shipmentId"] },
    { fields: ["status"] }
  ]
});

const BeryllClusterServer = sequelize.define("BeryllClusterServer", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  clusterId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_clusters",
      key: "id"
    }
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  role: {
    type: DataTypes.ENUM(...Object.values(SERVER_ROLES)),
    allowNull: false,
    defaultValue: SERVER_ROLES.WORKER
  },
  orderNumber: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  clusterHostname: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  clusterIpAddress: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  addedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    defaultValue: DataTypes.NOW
  },
  addedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_cluster_servers",
  timestamps: true,
  indexes: [
    { fields: ["clusterId"] },
    { fields: ["serverId"] },
    { unique: true, fields: ["clusterId", "serverId"] },
    { fields: ["role"] }
  ]
});

const BeryllDefectRecord = sequelize.define("BeryllDefectRecord", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  serverId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  yadroTicketNumber: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  hasSPISI: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  clusterCode: {
    type: DataTypes.STRING(50),
    allowNull: true
  },
  problemDescription: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  detectedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  detectedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  diagnosticianId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  diagnosisStartedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  diagnosisCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  diagnosisResult: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repairPartType: {
    type: DataTypes.ENUM(...Object.values(REPAIR_PART_TYPES)),
    allowNull: true
  },
  defectPartSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  defectPartSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  replacementPartSerialYadro: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  replacementPartSerialManuf: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  repairDetails: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repairStartedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  repairCompletedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM(...Object.values(DEFECT_RECORD_STATUSES)),
    allowNull: false,
    defaultValue: DEFECT_RECORD_STATUSES.NEW
  },
  isRepeatedDefect: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  repeatedDefectReason: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  repeatedDefectDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  previousDefectId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_defect_records",
      key: "id"
    }
  },
  sentToYadroRepair: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  sentToYadroAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  returnedFromYadro: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  returnedFromYadroAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  substituteServerId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: "beryll_servers",
      key: "id"
    }
  },
  substituteServerSerial: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  substituteIssuedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  substituteReturnedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  slaDeadline: {
    type: DataTypes.DATE,
    allowNull: true
  },
  slaBreached: {
    type: DataTypes.BOOLEAN,
    allowNull: true,
    defaultValue: false
  },
  totalDowntimeMinutes: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resolvedAt: {
    type: DataTypes.DATE,
    allowNull: true
  },
  resolvedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  resolution: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  }
}, {
  tableName: "beryll_defect_records",
  timestamps: true,
  indexes: [
    { fields: ["serverId"] },
    { fields: ["yadroTicketNumber"] },
    { fields: ["status"] },
    { fields: ["detectedAt"] },
    { fields: ["repairPartType"] },
    { fields: ["diagnosticianId"] },
    { fields: ["isRepeatedDefect"] },
    { fields: ["slaDeadline"] },
    { fields: ["slaBreached"] },
    { fields: ["substituteServerId"] },
    { fields: ["previousDefectId"] }
  ]
});

const BeryllDefectRecordFile = sequelize.define("BeryllDefectRecordFile", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  defectRecordId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: "beryll_defect_records",
      key: "id"
    }
  },
  originalName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  fileName: {
    type: DataTypes.STRING(255),
    allowNull: false
  },
  filePath: {
    type: DataTypes.STRING(500),
    allowNull: false
  },
  mimeType: {
    type: DataTypes.STRING(100),
    allowNull: true
  },
  fileSize: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  uploadedById: {
    type: DataTypes.INTEGER,
    allowNull: true
  }
}, {
  tableName: "beryll_defect_record_files",
  timestamps: true,
  indexes: [
    { fields: ["defectRecordId"] }
  ]
});

const BeryllExtendedHistory = sequelize.define("BeryllExtendedHistory", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  entityType: {
    type: DataTypes.ENUM("RACK", "CLUSTER", "SHIPMENT", "DEFECT_RECORD"),
    allowNull: false
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  action: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  changes: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true
  }
}, {
  tableName: "beryll_extended_history",
  timestamps: true,
  indexes: [
    { fields: ["entityType", "entityId"] },
    { fields: ["userId"] },
    { fields: ["createdAt"] }
  ]
});

const setupAssociations = (models) => {
  const { User, BeryllServer } = models;

  BeryllRack.hasMany(BeryllRackUnit, { as: "units", foreignKey: "rackId", onDelete: "CASCADE" });
  BeryllRackUnit.belongsTo(BeryllRack, { as: "rack", foreignKey: "rackId" });

  BeryllRackUnit.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllRackUnit, { as: "rackUnits", foreignKey: "serverId" });
  }

  BeryllRackUnit.belongsTo(User, { as: "installedBy", foreignKey: "installedById" });

  BeryllShipment.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  BeryllShipment.hasMany(BeryllCluster, { as: "clusters", foreignKey: "shipmentId" });

  BeryllCluster.belongsTo(BeryllShipment, { as: "shipment", foreignKey: "shipmentId" });
  BeryllCluster.belongsTo(User, { as: "createdBy", foreignKey: "createdById" });
  BeryllCluster.hasMany(BeryllClusterServer, { as: "clusterServers", foreignKey: "clusterId", onDelete: "CASCADE" });

  BeryllClusterServer.belongsTo(BeryllCluster, { as: "cluster", foreignKey: "clusterId" });
  BeryllClusterServer.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  BeryllClusterServer.belongsTo(User, { as: "addedBy", foreignKey: "addedById" });

  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllClusterServer, { as: "clusterMemberships", foreignKey: "serverId" });
  }

  BeryllDefectRecord.belongsTo(BeryllServer, { as: "server", foreignKey: "serverId" });
  BeryllDefectRecord.belongsTo(BeryllServer, { as: "substituteServer", foreignKey: "substituteServerId" });
  BeryllDefectRecord.belongsTo(User, { as: "detectedBy", foreignKey: "detectedById" });
  BeryllDefectRecord.belongsTo(User, { as: "diagnostician", foreignKey: "diagnosticianId" });
  BeryllDefectRecord.belongsTo(User, { as: "resolvedBy", foreignKey: "resolvedById" });
  BeryllDefectRecord.belongsTo(BeryllDefectRecord, { as: "previousDefect", foreignKey: "previousDefectId" });
  BeryllDefectRecord.hasMany(BeryllDefectRecord, { as: "repeatedDefects", foreignKey: "previousDefectId" });
  BeryllDefectRecord.hasMany(BeryllDefectRecordFile, { as: "files", foreignKey: "defectRecordId", onDelete: "CASCADE" });

  if (BeryllServer.hasMany) {
    BeryllServer.hasMany(BeryllDefectRecord, { as: "defectRecords", foreignKey: "serverId" });
  }

  BeryllDefectRecordFile.belongsTo(BeryllDefectRecord, { as: "defectRecord", foreignKey: "defectRecordId" });
  BeryllDefectRecordFile.belongsTo(User, { as: "uploadedBy", foreignKey: "uploadedById" });

  BeryllExtendedHistory.belongsTo(User, { as: "user", foreignKey: "userId" });
};

module.exports = {
  BeryllRack,
  BeryllRackUnit,
  BeryllShipment,
  BeryllCluster,
  BeryllClusterServer,
  BeryllDefectRecord,
  BeryllDefectRecordFile,
  BeryllExtendedHistory,
  RACK_STATUSES,
  CLUSTER_STATUSES,
  SHIPMENT_STATUSES,
  SERVER_ROLES,
  REPAIR_PART_TYPES,
  DEFECT_RECORD_STATUSES,
  setupAssociations,
  setupExtendedAssociations: setupAssociations
};
