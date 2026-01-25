const { QueryTypes } = require("sequelize");
const sequelize = require("../db");
const {
  User,
  Section,
  Team,
  Session,
  PC,
  Role,
} = require("../models");

const CORE_TABLES = [
  { tableName: "users", model: User },
  { tableName: "production_sections", model: Section },
  { tableName: "production_teams", model: Team },
  { tableName: "sessions", model: Session },
  { tableName: "PCs", model: PC },
  { tableName: "roles", model: Role },
];

const toColumnName = (attribute) =>
  attribute.field || attribute.fieldName || attribute.attributeName;

const getModelColumns = (model) =>
  new Set(
    Object.values(model.getAttributes()).map(toColumnName).filter(Boolean)
  );

const getDatabaseColumns = async (tableNames) => {
  const rows = await sequelize.query(
    `
      SELECT table_name, column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = ANY(:tables)
      ORDER BY table_name, ordinal_position;
    `,
    {
      replacements: { tables: tableNames },
      type: QueryTypes.SELECT,
    }
  );

  return rows.reduce((acc, row) => {
    if (!acc[row.table_name]) {
      acc[row.table_name] = [];
    }
    acc[row.table_name].push(row.column_name);
    return acc;
  }, {});
};

const diffColumns = (expected, actual) => {
  const missing = [...expected].filter((column) => !actual.has(column));
  const extra = [...actual].filter((column) => !expected.has(column));
  return { missing, extra };
};

const formatList = (items) => (items.length ? items.join(", ") : "-");

const run = async () => {
  try {
    const tableNames = CORE_TABLES.map((entry) => entry.tableName);
    const dbColumns = await getDatabaseColumns(tableNames);

    const mismatches = CORE_TABLES.map(({ tableName, model }) => {
      const expected = getModelColumns(model);
      const actual = new Set(dbColumns[tableName] || []);
      return { tableName, ...diffColumns(expected, actual) };
    }).filter(({ missing, extra }) => missing.length || extra.length);

    if (mismatches.length) {
      console.error("Schema mismatch detected:\n");
      mismatches.forEach(({ tableName, missing, extra }) => {
        console.error(`- ${tableName}`);
        console.error(`  missing: ${formatList(missing)}`);
        console.error(`  extra:   ${formatList(extra)}`);
      });
      process.exitCode = 1;
      return;
    }

    console.log("Schema check passed: core tables match Sequelize models.");
  } catch (error) {
    console.error("Schema check failed to run:", error);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

run();
