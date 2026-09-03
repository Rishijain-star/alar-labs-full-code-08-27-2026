const { Client } = require('ssh2');
const conn = new Client();

conn.on('ready', () => {
  console.log('Running DB seed script on remote server...');
  const remoteCmd = `node -e 'const { Permission } = require("./src/models"); async function seed() { await Permission.findOrCreate({ where: { id: "approve_cloud_services" }, defaults: { id: "approve_cloud_services", label: "Approve Cloud Services", description: "Approve cloud services for publication" } }); await Permission.findOrCreate({ where: { id: "approve_career_offerings" }, defaults: { id: "approve_career_offerings", label: "Approve Tech Career Pathways", description: "Approve tech career pathways for publication" } }); const service = require("./src/services/rbac/permissionService"); await service.clearPermissionsCache(); console.log("REMOTE DB PERMISSIONS SEEDED & CACHE CLEARED SUCCESSFULLY"); } seed().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });'`;
  
  conn.exec(`cd /home/master/backend && ${remoteCmd}`, (err, stream) => {
    if (err) throw err;
    stream.on('data', d => console.log(d.toString()));
    stream.stderr.on('data', d => console.error(d.toString()));
    stream.on('close', code => {
      console.log('Remote seed finished with code:', code);
      conn.end();
    });
  });
});

conn.connect({ host: '20.109.106.169', port: 22, username: 'master', password: 'lcm@pass@13579' });
