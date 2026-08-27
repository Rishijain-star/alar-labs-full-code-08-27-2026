const fetch = require('node-fetch');
async function run() {
    const res = await fetch("http://localhost:3005/api/cloud-services");
    const data = await res.json();
    console.log(JSON.stringify(data.data.rows.map(r => ({ id: r.id, title: r.title, metadata: r.metadata })), null, 2));
}
run();
