const path = require("path");

// Директория для файлов
const UPLOAD_DIR = path.join(__dirname, "..", "..", "uploads", "beryll");

// Конфигурация DHCP сервера
const DHCP_CONFIG = {
  host: "10.11.0.10",
  username: "root",
  password: process.env.DHCP_SSH_PASSWORD || "",
  leaseFile: "/var/lib/dhcp/dhcpd.leases"
};

module.exports = {
  UPLOAD_DIR,
  DHCP_CONFIG
};
