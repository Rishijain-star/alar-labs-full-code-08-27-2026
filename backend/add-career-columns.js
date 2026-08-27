const db = require('./src/models');

async function run() {
    try {
        await db.sequelize.query('ALTER TABLE career_offerings ADD COLUMN metadata JSON DEFAULT NULL;');
        console.log('Added metadata column');
    } catch (e) {
        console.log(e.message);
    }
    
    try {
        await db.sequelize.query('ALTER TABLE career_offerings ADD COLUMN draft_data JSON DEFAULT NULL;');
        console.log('Added draft_data column');
    } catch (e) {
        console.log(e.message);
    }
    
    process.exit(0);
}

run();
