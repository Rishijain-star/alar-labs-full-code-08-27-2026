const db = require('./src/models');
async function check() {
    const cs = await db.CloudService.findAll();
    for (const c of cs) {
        console.log(`\n--- ${c.title} ---`);
        console.log("Type:", typeof c.features);
        console.log("Is Array?", Array.isArray(c.features));
        console.log("Raw JSON stringified:", JSON.stringify(c.features));
        console.log("Value:", c.features);
    }
}
check();
