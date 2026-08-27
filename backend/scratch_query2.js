const fetch = require('node-fetch');
async function run() {
    // login as admin first to get the cookie
    const res = await fetch("http://localhost:3005/api/owner/cloud-services?approval=pending", {
      headers: {
        'Cookie': 'access_token=dummy' // we can't do this easily.
      }
    });
    // Let's just query DB directly
    const db = require("./src/models/index");
    const [results] = await db.sequelize.query(`SELECT id, title, metadata FROM cloud_services`);
    console.log("DB rows:");
    console.log(JSON.stringify(results, null, 2));
}
run();
