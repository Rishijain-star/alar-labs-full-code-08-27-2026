const { Sequelize } = require("sequelize");
const config = require("../backend/src/config/config");
const sequelize = new Sequelize(config.development);

async function run() {
    const [results] = await sequelize.query("SELECT COUNT(*) as count FROM cloud_services");
    console.log("Count:", results[0].count);
    
    const [active] = await sequelize.query("SELECT COUNT(*) as count FROM cloud_services WHERE is_active = 1");
    console.log("Active count:", active[0].count);
    
    process.exit(0);
}
run();
