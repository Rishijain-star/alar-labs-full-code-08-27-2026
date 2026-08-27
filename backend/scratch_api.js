const fetch = require('node-fetch');
async function run() {
    const res = await fetch("http://localhost:3005/api/cloud-services");
    const data = await res.json();
    console.log("From API:");
    for (const r of data.data.rows) {
        console.log(`\n--- ${r.title} ---`);
        console.log("Features type:", typeof r.features);
        console.log("Features Array.isArray?", Array.isArray(r.features));
        console.log("Features Value:", r.features);
    }
}
run();
