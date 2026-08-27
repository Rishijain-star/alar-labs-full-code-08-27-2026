const fetch = require('node-fetch');
async function run() {
    const res = await fetch("http://localhost:3005/api/cloud-services");
    const data = await res.json();
    const target = data.data.rows.find(r => r.title === 'Hiii bravo' || r.title.includes('Hiii'));
    if (target) {
        console.log("Description from public API:");
        console.log(target.description);
    } else {
        console.log("Not found in public API, probably not approved.");
    }
}
run();
