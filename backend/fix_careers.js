const db = require('./src/models');
async function run() {
    await db.sequelize.query(`
        UPDATE career_offerings 
        SET metadata = '{"content_approval_status":"approved"}' 
        WHERE metadata IS NULL;
    `);
    
    // Set the specific one the user just created to pending so it goes to approval
    await db.sequelize.query(`
        UPDATE career_offerings 
        SET metadata = '{"content_approval_status":"pending"}' 
        WHERE id = 'ff33fe6b-0b19-45bf-a28d-4360ed620ecf';
    `);
    
    console.log("Updated metadata");
    process.exit(0);
}
run();
