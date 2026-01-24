const ReservationService = require("../services/warehouse/ReservationService");

const DEFAULT_INTERVAL_MS = 60 * 1000;

const releaseExpiredReservations = async () => {
  await ReservationService.releaseExpired();
};

const scheduleReleaseExpiredReservations = () => {
  const intervalMs =
    Number(process.env.RELEASE_EXPIRED_RESERVATIONS_INTERVAL_MS) ||
    DEFAULT_INTERVAL_MS;

  releaseExpiredReservations().catch((error) => {
    console.error("Failed to release expired reservations:", error);
  });

  setInterval(() => {
    releaseExpiredReservations().catch((error) => {
      console.error("Failed to release expired reservations:", error);
    });
  }, intervalMs);
};

module.exports = {
  releaseExpiredReservations,
  scheduleReleaseExpiredReservations,
};
