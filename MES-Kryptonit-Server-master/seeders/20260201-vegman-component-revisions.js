"use strict";

/**
 * Seeder: Ревизии комплектующих VegmanS220v8
 * Заполняет component_catalog данными из таблицы "Форма комплектующие VegmanS220v8"
 */

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const now = new Date();

    // Проверяем, не были ли уже добавлены записи с пометкой vegman
    const existing = await queryInterface.sequelize.query(
      `SELECT COUNT(*) as cnt FROM component_catalog WHERE notes LIKE '%VegmanS220v8%'`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    if (existing[0]?.cnt > 0) {
      console.log("⚠️  Ревизии VegmanS220v8 уже существуют, пропускаем...");
      return;
    }

    const catalogData = [
      // ============================================================
      // МАТЕРИНСКИЕ ПЛАТЫ (MOTHERBOARD)
      // ============================================================
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001E",
        revision: "1E-",
        partNumber: "MBDX86780001E",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          serverModel: "Vegman S220"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Мат. плата ревизия 1E-",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001E1",
        revision: "1E1-",
        partNumber: "MBDX86780001E1",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          serverModel: "Vegman R220"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Мат. плата ревизия 1E1-",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "MOTHERBOARD",
        manufacturer: "Yadro",
        model: "MBDX86780001D",
        revision: "1D",
        partNumber: "MBDX86780001D",
        specifications: JSON.stringify({
          socket: "LGA4677",
          chipset: "Intel C741",
          formFactor: "E-ATX",
          serverModel: "Сервер Х2-262",
          variants: ["1E+", "1D+", "1D-"]
        }),
        isActive: true,
        notes: "VegmanS220v8 — Мат. плата ревизия 1D (типы: 1E+, 1D+, 1D-)",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // СЕТЕВЫЕ КАРТЫ (NIC)
      // ============================================================
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.20",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.20",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.21",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.21",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.AV",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.AV",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.22",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.22",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.B3",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.B3",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.B6",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.B6",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "NIC",
        manufacturer: "Mellanox",
        model: "CX4121A",
        revision: "Rev.B7",
        partNumber: "P225P",
        specifications: JSON.stringify({ interface: "25GbE", ports: 2 }),
        isActive: true,
        notes: "VegmanS220v8 — Сетевая карта P225P Rev.B7",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // RAID-КОНТРОЛЛЕРЫ (RAID)
      // ============================================================
      {
        type: "RAID",
        manufacturer: "Broadcom",
        model: "Тип 1",
        revision: null,
        partNumber: null,
        specifications: JSON.stringify({ raidType: "Тип 1" }),
        isActive: true,
        notes: "VegmanS220v8 — RAID-контроллер Тип 1 (Broadcom)",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAID",
        manufacturer: null,
        model: "Тип 2",
        revision: null,
        partNumber: null,
        specifications: JSON.stringify({ raidType: "Тип 2" }),
        isActive: true,
        notes: "VegmanS220v8 — RAID-контроллер Тип 2",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // КУЛЕРЫ (FAN)
      // ============================================================
      {
        type: "FAN",
        manufacturer: null,
        model: "Тип 1",
        revision: null,
        partNumber: null,
        specifications: JSON.stringify({ coolerType: "Тип 1" }),
        isActive: true,
        notes: "VegmanS220v8 — Кулеры CPU Тип 1",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "FAN",
        manufacturer: null,
        model: "Тип 2",
        revision: null,
        partNumber: null,
        specifications: JSON.stringify({ coolerType: "Тип 2" }),
        isActive: true,
        notes: "VegmanS220v8 — Кулеры CPU Тип 2",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // BACKPLANE (BACKPLANE)
      // ============================================================
      {
        type: "BACKPLANE",
        manufacturer: "Yadro",
        model: "BPLSAS780002C",
        revision: null,
        partNumber: "BPLSAS780002C",
        specifications: JSON.stringify({
          slots: 12,
          interface: "SAS",
          backplanePresent: true
        }),
        isActive: true,
        notes: "VegmanS220v8 — Backplane 12 дисков (Backplane: +)",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "BACKPLANE",
        manufacturer: "Yadro",
        model: "BPLSAS780001A1",
        revision: null,
        partNumber: "BPLSAS780001A1",
        specifications: JSON.stringify({
          slots: 12,
          interface: "SAS",
          backplanePresent: false
        }),
        isActive: true,
        notes: "VegmanS220v8 — Backplane 12 дисков (Backplane: -)",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // BMC (BMC)
      // ============================================================
      {
        type: "BMC",
        manufacturer: "Yadro",
        model: "IOBBMC740001A1",
        revision: null,
        partNumber: "IOBBMC740001A1",
        specifications: JSON.stringify({ bmcType: "A1" }),
        isActive: true,
        notes: "VegmanS220v8 — BMC IOBBMC740001A1",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "BMC",
        manufacturer: "Yadro",
        model: "IOBBMC740001C",
        revision: null,
        partNumber: "IOBBMC740001C",
        specifications: JSON.stringify({ bmcType: "C" }),
        isActive: true,
        notes: "VegmanS220v8 — BMC IOBBMC740001C",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // SSD (SSD)
      // ============================================================
      {
        type: "SSD",
        manufacturer: "Intel",
        model: "SSDSC2KB960G8",
        revision: null,
        partNumber: "SSDSC2KB960G8",
        specifications: JSON.stringify({
          capacity: "960GB",
          interface: "SATA",
          formFactor: "2.5\""
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Intel SSDSC2KB960G8",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Samsung",
        model: "MZ-QL27T60",
        revision: null,
        partNumber: "MZ-QL27T60",
        specifications: JSON.stringify({
          capacity: "7.68TB",
          interface: "NVMe",
          formFactor: "U.2"
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Samsung MZ-QL27T60",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Micron",
        model: "MTFDHAL6T4TDR-1AT1ZABYY",
        revision: null,
        partNumber: "MTFDHAL6T4TDR-1AT1ZABYY",
        specifications: JSON.stringify({
          capacity: "6.4TB",
          interface: "NVMe"
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Micron MTFDHAL6T4TDR-1AT1ZABYY",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Micron",
        model: "MTFDKCB7T6TDZ",
        revision: null,
        partNumber: "MTFDKCB7T6TDZ",
        specifications: JSON.stringify({
          capacity: "7.68TB",
          interface: "NVMe"
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Micron MTFDKCB7T6TDZ",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Samsung",
        model: "MZ-7KH9600",
        revision: null,
        partNumber: "MZ-7KH9600",
        specifications: JSON.stringify({
          capacity: "960GB",
          interface: "SATA",
          formFactor: "2.5\""
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Samsung MZ-7KH9600",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "SSD",
        manufacturer: "Intel",
        model: "SSDSC2KB960GZ",
        revision: null,
        partNumber: "SSDSC2KB960GZ",
        specifications: JSON.stringify({
          capacity: "960GB",
          interface: "SATA",
          formFactor: "2.5\""
        }),
        isActive: true,
        notes: "VegmanS220v8 — SSD Intel SSDSC2KB960GZ",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // HDD (HDD)
      // ============================================================
      {
        type: "HDD",
        manufacturer: "Seagate",
        model: "STL015",
        revision: null,
        partNumber: "STL015",
        specifications: JSON.stringify({
          interface: "SAS",
          formFactor: "3.5\""
        }),
        isActive: true,
        notes: "VegmanS220v8 — HDD Seagate STL015",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "HDD",
        manufacturer: "Seagate",
        model: "STL009",
        revision: null,
        partNumber: "STL009",
        specifications: JSON.stringify({
          interface: "SAS",
          formFactor: "3.5\""
        }),
        isActive: true,
        notes: "VegmanS220v8 — HDD Seagate STL009",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // БЛОКИ ПИТАНИЯ (PSU)
      // ============================================================
      {
        type: "PSU",
        manufacturer: "Aspower",
        model: "U1A-D11200-DRB",
        revision: null,
        partNumber: "U1A-D11200-DRB",
        specifications: JSON.stringify({
          wattage: "1200W",
          efficiency: "80+ Platinum"
        }),
        isActive: true,
        notes: "VegmanS220v8 — БП Aspower U1A-D11200-DRB",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "PSU",
        manufacturer: "AcBel",
        model: "R1CA2122A",
        revision: null,
        partNumber: "R1CA2122A",
        specifications: JSON.stringify({
          wattage: "1200W"
        }),
        isActive: true,
        notes: "VegmanS220v8 — БП AcBel R1CA2122A",
        createdAt: now,
        updatedAt: now
      },

      // ============================================================
      // ПЛАНКИ ПАМЯТИ (RAM) — ревизии
      // ============================================================
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2245",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2245",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2249",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2249",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2248",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2248",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2320",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2320",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2250",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2250",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2312",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2312",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2251",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2251",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2306",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2306",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2308",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2308",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2305",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2305",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWEC0",
        revision: "2310",
        partNumber: "M393A8G40AB2-CWEC0",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2310",
        createdAt: now,
        updatedAt: now
      },
      {
        type: "RAM",
        manufacturer: "Samsung",
        model: "KR M393A8G40AB2-CWE",
        revision: "2250",
        partNumber: "M393A8G40AB2-CWE",
        specifications: JSON.stringify({
          capacity: "64GB",
          type: "DDR4",
          speed: "3200 MT/s",
          formFactor: "RDIMM"
        }),
        isActive: true,
        notes: "VegmanS220v8 — Планка памяти Samsung 64GB DDR4 rev.2250 (CWE)",
        createdAt: now,
        updatedAt: now
      }
    ];

    // Вставляем, пропуская дубликаты по (type, manufacturer, model)
    for (const entry of catalogData) {
      try {
        const exists = await queryInterface.sequelize.query(
          `SELECT id FROM component_catalog 
           WHERE type = :type 
           AND (manufacturer = :manufacturer OR (manufacturer IS NULL AND :manufacturer IS NULL))
           AND model = :model`,
          {
            replacements: {
              type: entry.type,
              manufacturer: entry.manufacturer,
              model: entry.model
            },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (exists.length === 0) {
          await queryInterface.bulkInsert("component_catalog", [entry]);
          console.log(`  ✅ ${entry.type}: ${entry.manufacturer || ''} ${entry.model} (rev: ${entry.revision || '-'})`);
        } else {
          // Обновляем revision и notes если запись уже есть
          await queryInterface.sequelize.query(
            `UPDATE component_catalog SET revision = :revision, notes = :notes, "updatedAt" = NOW()
             WHERE id = :id`,
            {
              replacements: {
                revision: entry.revision,
                notes: entry.notes,
                id: exists[0].id
              }
            }
          );
          console.log(`  🔄 ${entry.type}: ${entry.manufacturer || ''} ${entry.model} — обновлено`);
        }
      } catch (err) {
        console.error(`  ❌ ${entry.type}: ${entry.model} — ${err.message}`);
      }
    }

    console.log(`\n✅ Seeded VegmanS220v8 component revisions (${catalogData.length} entries)`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete("component_catalog", {
      notes: { [Sequelize.Op.like]: "%VegmanS220v8%" }
    });
    console.log("✅ Removed VegmanS220v8 component revisions");
  }
};