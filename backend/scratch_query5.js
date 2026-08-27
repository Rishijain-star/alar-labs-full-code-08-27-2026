const fetch = require('node-fetch');
async function run() {
    const res = await fetch("http://localhost:3005/api/cloud-services");
    const data = await res.json();
    console.log("Status:", res.status);
    console.log("Titles returned by API:");
    data.data.rows.forEach(r => console.log(r.title));
}
run();
