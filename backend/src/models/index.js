const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const database =
  dbConfig[env] ||
  dbConfig.developement ||
  dbConfig.development ||
  (dbConfig.database ? dbConfig : null);

if (!database || !database.database) {
  throw new Error(
    `[models] Invalid database config for NODE_ENV=${env}. Check src/config/database.js and .env`
  );
}

const sequelize = new Sequelize(database);
const db = {};

// Load all models
fs.readdirSync(__dirname)
  .filter(file => file !== 'index.js' && file.endsWith('.js'))
  .forEach(file => {
    const model = require(path.join(__dirname, file))(
      sequelize,
      Sequelize.DataTypes
    );
    db[model.name] = model;
  });

// Run associations AFTER loading models
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

// Attach sequelize
db.sequelize = sequelize;
db.Sequelize = Sequelize;

// Helpers
let dbConnected = false;

db.testConnection = async () => {
  if (dbConnected) {
    return true; // cached success
  }

  try {
    await sequelize.authenticate();
    dbConnected = true;
    console.log('✅ Database connected');
    return true;
  } catch (error) {
    dbConnected = false;
    console.error('❌ Database connection failed:', error);
    return false;
  }
};


db.syncModels = async ({ force = false, alter = false } = {}) => {
  await sequelize.sync({ force, alter });
  console.log('✅ Database synced');
};

module.exports = db;
