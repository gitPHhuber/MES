/**
 * OpenBMCService.js
 * 
 * Сервис для получения информации о комплектующих сервера через Redfish API
 * 
 * Положить в: controllers/beryll/services/OpenBMCService.js
 */

const axios = require("axios");
const https = require("https");
const logger = require("../../../services/logger");

// Отключаем проверку SSL для самоподписанных сертификатов
const agent = new https.Agent({ rejectUnauthorized: false });

// Конфигурация BMC по умолчанию
const BMC_CONFIG = {
  username: "admin",
  password: "V36man",
  timeout: 30000, // Увеличено до 30 секунд
  protocol: "https",
  retries: 2,      // Количество повторных попыток
  retryDelay: 2000 // Задержка между попытками (мс)
};

class OpenBMCService {
  
  /**
   * Создание axios клиента для BMC
   */
  static createClient(bmcAddress, config = {}) {
    const { username, password, protocol, timeout } = { ...BMC_CONFIG, ...config };
    
    const baseURL = `${protocol}://${bmcAddress}`;
    
    return axios.create({
      baseURL,
      timeout,
      auth: { username, password },
      httpsAgent: agent,
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json"
      }
    });
  }

  /**
   * Выполнить запрос с retry логикой
   */
  static async requestWithRetry(client, url, config = {}) {
    const { retries = BMC_CONFIG.retries, retryDelay = BMC_CONFIG.retryDelay } = config;
    let lastError;
    
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await client.get(url);
        return response;
      } catch (error) {
        lastError = error;
        
        // Не повторяем при 404 или 401
        if (error.response?.status === 404 || error.response?.status === 401) {
          throw error;
        }
        
        if (attempt < retries) {
          logger.info(`[OpenBMC] Retry ${attempt + 1}/${retries} for ${url}...`);
          await this.sleep(retryDelay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Задержка
   */
  static sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Проверка доступности BMC
   */
  static async checkConnection(bmcAddress, config = {}) {
    try {
      const client = this.createClient(bmcAddress, { ...config, timeout: 15000 });
      const response = await client.get("/redfish/v1/");
      return {
        success: true,
        redfishVersion: response.data?.RedfishVersion,
        name: response.data?.Name,
        uuid: response.data?.UUID
      };
    } catch (error) {
      return {
        success: false,
        error: error.code === 'ECONNABORTED' ? 'Таймаут подключения к BMC' : error.message
      };
    }
  }

  /**
   * Получить информацию о системе
   */
  static async getSystemInfo(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    
    try {
      const paths = [
        "/redfish/v1/Systems/system",
        "/redfish/v1/Systems/1",
        "/redfish/v1/Systems"
      ];
      
      for (const path of paths) {
        try {
          const response = await this.requestWithRetry(client, path, config);
          if (response.data) {
            if (response.data.Members) {
              const firstSystem = response.data.Members[0];
              if (firstSystem?.["@odata.id"]) {
                const systemResponse = await this.requestWithRetry(client, firstSystem["@odata.id"], config);
                return systemResponse.data;
              }
            }
            return response.data;
          }
        } catch (e) {
          continue;
        }
      }
      throw new Error("System info not found");
    } catch (error) {
      logger.error("[OpenBMC] Error getting system info:", error.message);
      throw error;
    }
  }

  /**
   * Получить информацию о процессорах
   */
  static async getProcessors(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    const processors = [];
    
    try {
      const paths = [
        "/redfish/v1/Systems/system/Processors",
        "/redfish/v1/Systems/1/Processors"
      ];
      
      for (const basePath of paths) {
        try {
          const response = await this.requestWithRetry(client, basePath, config);
          if (response.data?.Members) {
            // Последовательно, чтобы не перегружать BMC
            for (const member of response.data.Members) {
              try {
                const cpuResponse = await this.requestWithRetry(client, member["@odata.id"], config);
                const cpu = cpuResponse.data;
                
                processors.push({
                  componentType: "CPU",
                  name: cpu.Model || `${cpu.Manufacturer || 'CPU'} ${cpu.Socket || cpu.Id || ''}`.trim(),
                  slot: cpu.Socket || cpu.Id,
                  manufacturer: cpu.Manufacturer,
                  model: cpu.Model,
                  serialNumber: cpu.SerialNumber,
                  partNumber: cpu.PartNumber,
                  cores: cpu.TotalCores,
                  threads: cpu.TotalThreads,
                  speedMHz: cpu.MaxSpeedMHz || cpu.OperatingSpeedMHz,
                  architecture: cpu.InstructionSet || cpu.ProcessorArchitecture,
                  status: this.mapStatus(cpu.Status?.State, cpu.Status?.Health),
                  health: cpu.Status?.Health,
                  rawData: cpu
                });
              } catch (e) {
                logger.error("[OpenBMC] Error fetching CPU:", e.message);
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting processors:", error.message);
    }
    
    return processors;
  }

  /**
   * Получить информацию о памяти
   */
  static async getMemory(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    const memory = [];
    
    try {
      const paths = [
        "/redfish/v1/Systems/system/Memory",
        "/redfish/v1/Systems/1/Memory"
      ];
      
      for (const basePath of paths) {
        try {
          const response = await this.requestWithRetry(client, basePath, config);
          if (response.data?.Members) {
            for (const member of response.data.Members) {
              try {
                const memResponse = await this.requestWithRetry(client, member["@odata.id"], config);
                const mem = memResponse.data;
                
                // Пропускаем пустые слоты
                if (!mem.CapacityMiB && !mem.SizeMB) continue;
                
                const capacityMB = mem.CapacityMiB || mem.SizeMB || 0;
                const capacityGB = Math.round(capacityMB / 1024);
                
                memory.push({
                  componentType: "RAM",
                  name: `${mem.Manufacturer || 'RAM'} ${capacityGB}GB ${mem.MemoryDeviceType || ''}`.trim(),
                  slot: mem.DeviceLocator || mem.Id,
                  manufacturer: mem.Manufacturer,
                  model: mem.PartNumber,
                  serialNumber: mem.SerialNumber,
                  partNumber: mem.PartNumber,
                  capacity: `${capacityGB} GB`,
                  capacityBytes: capacityMB * 1024 * 1024,
                  memoryType: mem.MemoryDeviceType || mem.MemoryType,
                  speedMT: mem.OperatingSpeedMhz || mem.Speed,
                  rank: mem.RankCount,
                  status: this.mapStatus(mem.Status?.State, mem.Status?.Health),
                  health: mem.Status?.Health,
                  rawData: mem
                });
              } catch (e) {
                logger.error("[OpenBMC] Error fetching memory:", e.message);
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting memory:", error.message);
    }
    
    return memory;
  }

  /**
   * Получить информацию о накопителях
   */
  static async getStorage(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    const storage = [];
    
    try {
      const paths = [
        "/redfish/v1/Systems/system/Storage",
        "/redfish/v1/Systems/1/Storage"
      ];
      
      for (const basePath of paths) {
        try {
          const response = await this.requestWithRetry(client, basePath, config);
          if (response.data?.Members) {
            for (const storageMember of response.data.Members) {
              try {
                const storageResponse = await this.requestWithRetry(client, storageMember["@odata.id"], config);
                const storageData = storageResponse.data;
                
                // Контроллер
                if (storageData.StorageControllers?.length > 0) {
                  for (const ctrl of storageData.StorageControllers) {
                    storage.push({
                      componentType: "RAID",
                      name: ctrl.Model || ctrl.Name || "Storage Controller",
                      slot: ctrl.MemberId || storageData.Id,
                      manufacturer: ctrl.Manufacturer,
                      model: ctrl.Model,
                      serialNumber: ctrl.SerialNumber,
                      firmwareVersion: ctrl.FirmwareVersion,
                      status: this.mapStatus(ctrl.Status?.State, ctrl.Status?.Health),
                      health: ctrl.Status?.Health,
                      rawData: ctrl
                    });
                  }
                }
                
                // Диски
                if (storageData.Drives) {
                  for (const driveRef of storageData.Drives) {
                    try {
                      const driveResponse = await this.requestWithRetry(client, driveRef["@odata.id"], config);
                      const drive = driveResponse.data;
                      
                      const capacityGB = drive.CapacityBytes 
                        ? Math.round(drive.CapacityBytes / (1024 * 1024 * 1024)) 
                        : 0;
                      
                      const driveType = this.detectDriveType(drive);
                      
                      storage.push({
                        componentType: driveType,
                        name: `${drive.Model || driveType} ${capacityGB}GB`,
                        slot: drive.PhysicalLocation?.PartLocation?.ServiceLabel || drive.Id,
                        manufacturer: drive.Manufacturer,
                        model: drive.Model,
                        serialNumber: drive.SerialNumber,
                        partNumber: drive.PartNumber,
                        capacity: `${capacityGB} GB`,
                        capacityBytes: drive.CapacityBytes,
                        mediaType: drive.MediaType,
                        interface: drive.Protocol,
                        firmwareVersion: drive.Revision || drive.FirmwareVersion,
                        status: this.mapStatus(drive.Status?.State, drive.Status?.Health),
                        health: drive.Status?.Health,
                        rawData: drive
                      });
                    } catch (e) {
                      logger.error("[OpenBMC] Error fetching drive:", e.message);
                    }
                  }
                }
              } catch (e) {
                logger.error("[OpenBMC] Error fetching storage controller:", e.message);
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting storage:", error.message);
    }
    
    return storage;
  }

  /**
   * Определить тип диска
   */
  static detectDriveType(drive) {
    const mediaType = (drive.MediaType || "").toUpperCase();
    const protocol = (drive.Protocol || "").toUpperCase();
    
    if (protocol.includes("NVME") || protocol.includes("PCIE")) return "NVME";
    if (mediaType.includes("SSD") || mediaType === "SOLIDSTATEDRIVE") return "SSD";
    if (mediaType.includes("HDD") || mediaType === "ROTATIONAL") return "HDD";
    
    return "SSD"; // По умолчанию
  }

  /**
   * Получить информацию о сетевых адаптерах
   */
  static async getNetworkAdapters(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    const adapters = [];
    
    try {
      // Пробуем разные пути для сетевых адаптеров
      const paths = [
        "/redfish/v1/Systems/system/EthernetInterfaces",
        "/redfish/v1/Systems/1/EthernetInterfaces",
        "/redfish/v1/Chassis/chassis/NetworkAdapters",
        "/redfish/v1/Chassis/1/NetworkAdapters"
      ];
      
      for (const basePath of paths) {
        try {
          const response = await this.requestWithRetry(client, basePath, config);
          if (response.data?.Members) {
            for (const member of response.data.Members) {
              try {
                const nicResponse = await this.requestWithRetry(client, member["@odata.id"], config);
                const nic = nicResponse.data;
                
                adapters.push({
                  componentType: "NIC",
                  name: nic.Name || nic.Description || `NIC ${nic.Id}`,
                  slot: nic.Id,
                  manufacturer: nic.Manufacturer,
                  model: nic.Model,
                  macAddress: nic.MACAddress || nic.PermanentMACAddress,
                  linkSpeed: nic.SpeedMbps ? `${nic.SpeedMbps} Mbps` : null,
                  firmwareVersion: nic.FirmwarePackageVersion,
                  status: this.mapStatus(nic.Status?.State, nic.Status?.Health),
                  health: nic.Status?.Health,
                  rawData: nic
                });
              } catch (e) {
                logger.error("[OpenBMC] Error fetching NIC:", e.message);
              }
            }
            break;
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting network adapters:", error.message);
    }
    
    return adapters;
  }

  /**
   * Получить информацию о материнской плате (из Chassis)
   */
  static async getMotherboard(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    
    try {
      const paths = [
        "/redfish/v1/Chassis/chassis",
        "/redfish/v1/Chassis/1",
        "/redfish/v1/Chassis"
      ];
      
      for (const path of paths) {
        try {
          const response = await this.requestWithRetry(client, path, config);
          let chassisData = response.data;
          
          if (chassisData.Members) {
            const first = chassisData.Members[0];
            if (first?.["@odata.id"]) {
              const chassisResponse = await this.requestWithRetry(client, first["@odata.id"], config);
              chassisData = chassisResponse.data;
            }
          }
          
          if (chassisData.Manufacturer || chassisData.Model) {
            return {
              componentType: "MOTHERBOARD",
              name: chassisData.Model || `${chassisData.Manufacturer || ''} Motherboard`.trim(),
              slot: "Main",
              manufacturer: chassisData.Manufacturer,
              model: chassisData.Model,
              serialNumber: chassisData.SerialNumber,
              partNumber: chassisData.PartNumber || chassisData.SKU,
              status: this.mapStatus(chassisData.Status?.State, chassisData.Status?.Health),
              health: chassisData.Status?.Health,
              rawData: chassisData
            };
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting motherboard:", error.message);
    }
    
    return null;
  }

  /**
   * Получить информацию о BMC
   */
  static async getBMCInfo(bmcAddress, config = {}) {
    const client = this.createClient(bmcAddress, config);
    
    try {
      const paths = [
        "/redfish/v1/Managers/bmc",
        "/redfish/v1/Managers/1",
        "/redfish/v1/Managers"
      ];
      
      for (const path of paths) {
        try {
          const response = await this.requestWithRetry(client, path, config);
          let bmcData = response.data;
          
          if (bmcData.Members) {
            const first = bmcData.Members[0];
            if (first?.["@odata.id"]) {
              const bmcResponse = await this.requestWithRetry(client, first["@odata.id"], config);
              bmcData = bmcResponse.data;
            }
          }
          
          if (bmcData.FirmwareVersion || bmcData.Model) {
            return {
              componentType: "BMC",
              name: bmcData.Model || "BMC Controller",
              slot: "BMC",
              manufacturer: bmcData.Manufacturer,
              model: bmcData.Model,
              firmwareVersion: bmcData.FirmwareVersion,
              status: this.mapStatus(bmcData.Status?.State, bmcData.Status?.Health),
              health: bmcData.Status?.Health,
              rawData: bmcData
            };
          }
        } catch (e) {
          continue;
        }
      }
    } catch (error) {
      logger.error("[OpenBMC] Error getting BMC info:", error.message);
    }
    
    return null;
  }

  /**
   * Получить ВСЕ комплектующие сервера
   * Последовательная загрузка для избежания перегрузки BMC
   */
  static async getAllComponents(bmcAddress, config = {}) {
    logger.info(`[OpenBMC] Fetching components from ${bmcAddress}...`);
    
    // Сначала проверяем доступность
    const connectionCheck = await this.checkConnection(bmcAddress, config);
    if (!connectionCheck.success) {
      logger.error(`[OpenBMC] BMC недоступен: ${connectionCheck.error}`);
      return [];
    }
    
    const components = [];
    
    // Последовательная загрузка - BMC может не справляться с параллельными запросами
    logger.info("[OpenBMC] Загрузка процессоров...");
    const processors = await this.getProcessors(bmcAddress, config);
    components.push(...processors);
    
    logger.info("[OpenBMC] Загрузка памяти...");
    const memory = await this.getMemory(bmcAddress, config);
    components.push(...memory);
    
    logger.info("[OpenBMC] Загрузка накопителей...");
    const storage = await this.getStorage(bmcAddress, config);
    components.push(...storage);
    
    logger.info("[OpenBMC] Загрузка сетевых адаптеров...");
    const network = await this.getNetworkAdapters(bmcAddress, config);
    components.push(...network);
    
    logger.info("[OpenBMC] Загрузка информации о плате...");
    const motherboard = await this.getMotherboard(bmcAddress, config);
    if (motherboard) components.push(motherboard);
    
    logger.info("[OpenBMC] Загрузка информации о BMC...");
    const bmc = await this.getBMCInfo(bmcAddress, config);
    if (bmc) components.push(bmc);
    
    logger.info(`[OpenBMC] Found ${components.length} components`);
    
    return components;
  }

  /**
   * Маппинг статуса Redfish в наш ENUM
   */
  static mapStatus(state, health) {
    if (!state && !health) return "UNKNOWN";
    
    if (health === "Critical" || state === "Disabled" || state === "UnavailableOffline") {
      return "CRITICAL";
    }
    if (health === "Warning" || state === "Degraded") {
      return "WARNING";
    }
    if (health === "OK" || state === "Enabled" || state === "StandbyOffline") {
      return "OK";
    }
    
    return "UNKNOWN";
  }
}

module.exports = OpenBMCService;