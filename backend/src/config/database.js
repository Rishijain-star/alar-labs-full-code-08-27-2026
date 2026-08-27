const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../../.env") });

function stripQuotes(s) {
  if (s == null) return "";
  const str = String(s);
  if ((str.startsWith("'") && str.endsWith("'")) || (str.startsWith('"') && str.endsWith('"'))) {
    return str.slice(1, -1);
  }
  return str;
}

const shared = {
  username: process.env.DB_USER || "root",
  password: stripQuotes(process.env.DB_PASSWORD),
  database: process.env.DB_NAME || "alar_labs",
  host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT, 10) || 3306,
  dialect: process.env.DB_DIALECT || "mysql",
  logging: process.env.DB_LOGGING === "true" ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },
};

/**
 * Sequelize CLI expects named environments. `src/models/index.js` uses NODE_ENV.
 * Includes common NODE_ENV typo `developement`.
 */
module.exports = {
  development: shared,
  developement: shared,
  test: shared,
  production: shared,
};
