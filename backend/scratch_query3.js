const db = require("./src/models/index");
async function run() {
    try {
        const [results] = await db.sequelize.query(`SELECT id, title FROM cloud_services WHERE is_active = true AND JSON_UNQUOTE(JSON_EXTRACT(metadata, '$.content_approval_status')) = 'approved'`);
        console.log("Results length:", results.length);
    } catch (e) {
        console.error("Error:", e.message);
    }
    process.exit(0);
}
run();
