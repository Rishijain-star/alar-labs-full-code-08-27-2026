const { Sequelize } = require("sequelize");
const logger = require("../lib/logger");

/**
 * Database Configuration
 * Supports MySQL, PostgreSQL, SQLite
 */

const dbConfig = {
  host: process.env.DB_HOST || "localhost",
  port: process.env.DB_PORT || 3306,
  database: process.env.DB_NAME || "auth_system",
  username: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  dialect: process.env.DB_DIALECT || "mysql", // 'mysql', 'postgres', 'sqlite'
  logging:
    process.env.NODE_ENV === "development" ? (msg) => logger.debug(msg) : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
  define: {
    timestamps: true,
    underscored: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
  timezone: "+00:00",
};
console.log("hi dbConfig.host dbConfig.host", dbConfig.host);
// Create Sequelize instance
const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging,
    pool: dbConfig.pool,
    define: dbConfig.define,
    timezone: dbConfig.timezone,
  },
);

/**
 * Test database connection
 */
async function testConnection() {
  try {
    await sequelize.authenticate();
    logger.info("✅ Database connection established successfully");
    return true;
  } catch (error) {
    logger.error("❌ Unable to connect to database:", error);
    throw error;
  }
}

/**
 * Initialize database (sync models)
 * WARNING: Use migrations in production, not sync()
 */
async function initDatabase(options = {}) {
  try {
    const { force = false, alter = false } = options;

    if (force) {
      logger.warn("⚠️  Forcing database sync - ALL DATA WILL BE LOST!");
    }

    await sequelize.sync({ force, alter });
    logger.info("✅ Database synchronized");

    return true;
  } catch (error) {
    logger.error("❌ Database initialization failed:", error);
    throw error;
  }
}

/**
 * Close database connection
 */
async function closeConnection() {
  try {
    await sequelize.close();
    logger.info("Database connection closed");
  } catch (error) {
    logger.error("Error closing database connection:", error);
    throw error;
  }
}

/**
 * Query helper to maintain compatibility with legacy code
 */
async function query(sql, params) {
  const isSelect = sql.trim().toUpperCase().startsWith("SELECT");
  return sequelize.query(sql, {
    replacements: params,
    type: isSelect ? Sequelize.QueryTypes.SELECT : Sequelize.QueryTypes.RAW,
  }).then(results => {
    // Legacy code expects [rows, metadata]
    // For SELECT, Sequelize returns [rows] or rows depending on options
    // For RAW/UPDATE, it returns [results, metadata]
    if (isSelect) {
      return [results, null];
    }
    return results;
  });
}

module.exports = {
  sequelize,
  testConnection,
  initDatabase,
  closeConnection,
  query,
};
