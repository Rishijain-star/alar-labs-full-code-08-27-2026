const db = require('./src/models/index');

async function check() {
  const [results] = await db.sequelize.query(`SELECT id, title, description FROM cloud_services ORDER BY created_at DESC LIMIT 5`);
  for (const r of results) {
    console.log(`\n--- Title: ${r.title} ---`);
    console.log(r.description);
  }
}
check();
