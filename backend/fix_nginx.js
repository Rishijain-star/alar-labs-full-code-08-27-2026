const { Client } = require("ssh2");

const conn = new Client();

conn.on("ready", () => {
  console.log("Connected. Fixing Nginx configuration...");

  const cmd = `
    echo 'lcm@pass@13579' | sudo -S sed -i 's|proxy_pass http://localhost:3000/;|proxy_pass http://localhost:3000;|g' /etc/nginx/sites-available/default
    echo 'lcm@pass@13579' | sudo -S nginx -t
    echo 'lcm@pass@13579' | sudo -S systemctl reload nginx
  `;

  conn.exec(cmd, (err, stream) => {
    if (err) {
      console.error("Exec error:", err);
      return conn.end();
    }
    stream.on("data", (d) => console.log(d.toString()));
    stream.stderr.on("data", (d) => console.error(d.toString()));
    stream.on("close", (code) => {
      console.log("Script completed with code:", code);
      conn.end();
    });
  });
});

conn.connect({
  host: "20.109.106.169",
  username: "master",
  password: "lcm@pass@13579",
});
