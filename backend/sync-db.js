const db = require('./src/models');

async function sync() {
    try {
        await db.testConnection();
        console.log('Truncating blacklisted_tokens...');
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
        await db.sequelize.query('TRUNCATE TABLE blacklisted_tokens');
        await db.sequelize.query('SET FOREIGN_KEY_CHECKS = 1');

        console.log('Syncing models...');
        // alter: true will add missing columns without dropping existing data
        await db.sequelize.sync({ alter: true });

        console.log('✅ Database synced successfully.');
        process.exit(0);
    } catch (error) {
        console.error('❌ Sync failed:', error);
        process.exit(1);
    }
}

sync();
