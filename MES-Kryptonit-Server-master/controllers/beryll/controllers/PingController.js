

const PingController = require("../controllers/beryll/controllers/PingController");


router.get(
  "/monitoring/stats",
  ...protect,
  checkAbility("beryll.view"),
  PingController.getMonitoringStats.bind(PingController)
);

// Кэшированные статусы
router.get(
  "/monitoring/status",
  ...protect,
  checkAbility("beryll.view"),
  PingController.getCachedStatus.bind(PingController)
);

// Пинг одного сервера
router.get(
  "/monitoring/ping/:id",
  ...protect,
  checkAbility("beryll.view"),
  PingController.pingServer.bind(PingController)
);

// Массовый пинг
router.post(
  "/monitoring/ping-all",
  ...protect,
  checkAbility("beryll.work"),
  PingController.pingAllServers.bind(PingController)
);

// Онлайн серверы
router.get(
  "/monitoring/servers/online",
  ...protect,
  checkAbility("beryll.view"),
  PingController.getOnlineServers.bind(PingController)
);

// Офлайн серверы
router.get(
  "/monitoring/servers/offline",
  ...protect,
  checkAbility("beryll.view"),
  PingController.getOfflineServers.bind(PingController)
);

// Очистка кэша
router.post(
  "/monitoring/clear-cache",
  ...protect,
  checkAbility("beryll.manage"),
  PingController.clearCache.bind(PingController)
);
