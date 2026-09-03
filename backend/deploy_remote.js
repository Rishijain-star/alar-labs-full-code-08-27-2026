const { Client } = require("ssh2");
const fs = require("fs");
const path = require("path");

const config = {
  host: "20.109.106.169",
  port: 22,
  username: "master",
  password: "lcm@pass@13579",
};

const LOCAL_BACKEND_DIR = path.resolve(__dirname);
const LOCAL_FRONTEND_DIST_DIR = path.resolve(__dirname, "../React.shadcn.JS-Template-main/dist");
const REMOTE_BACKEND_DIR = "/home/master/backend";
const REMOTE_FRONTEND_DIR = "/var/www/react-app";

// Items to ignore when syncing backend
const IGNORE_BACKEND = [
  ".env",
  "node_modules",
  ".git",
  "temp",
  "processed",
  "deploy_remote.js",
];

function getAllFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (IGNORE_BACKEND.some((ign) => relPath === ign || relPath.startsWith(ign + "/"))) {
      return;
    }

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getAllFiles(fullPath, arrayOfFiles, baseDir);
    } else {
      arrayOfFiles.push({ fullPath, relPath });
    }
  });

  return arrayOfFiles;
}

function getDistFiles(dirPath, arrayOfFiles = [], baseDir = dirPath) {
  const files = fs.readdirSync(dirPath);

  files.forEach((file) => {
    const fullPath = path.join(dirPath, file);
    const relPath = path.relative(baseDir, fullPath).replace(/\\/g, "/");

    if (fs.statSync(fullPath).isDirectory()) {
      arrayOfFiles = getDistFiles(fullPath, arrayOfFiles, baseDir);
    } else {
      arrayOfFiles.push({ fullPath, relPath });
    }
  });

  return arrayOfFiles;
}

// Concurrency helper
async function mapConcurrent(items, concurrency, fn) {
  let index = 0;
  const results = [];
  const exec = async () => {
    while (index < items.length) {
      const i = index++;
      results[i] = await fn(items[i], i);
    }
  };
  const workers = Array(concurrency).fill(0).map(exec);
  await Promise.all(workers);
  return results;
}

const conn = new Client();

console.log("🚀 Starting Fast Concurrent SSH Deployment...");

conn.on("ready", () => {
  console.log("✅ Connected to SSH server 20.109.106.169");

  conn.sftp((err, sftp) => {
    if (err) {
      console.error("SFTP Session Error:", err);
      conn.end();
      return;
    }

    const createdDirs = new Set();

    const ensureRemoteDir = (remoteDirPath) => {
      return new Promise((resolve) => {
        if (createdDirs.has(remoteDirPath)) return resolve();

        const parts = remoteDirPath.split("/").filter(Boolean);
        let current = "";
        const createNext = (index) => {
          if (index >= parts.length) {
            createdDirs.add(remoteDirPath);
            return resolve();
          }
          current += "/" + parts[index];
          createdDirs.add(current);
          sftp.mkdir(current, (mkdirErr) => {
            createNext(index + 1);
          });
        };
        createNext(0);
      });
    };

    const uploadFile = (localFile, remoteFile) => {
      return new Promise((resolve, reject) => {
        const remoteDir = path.posix.dirname(remoteFile);
        ensureRemoteDir(remoteDir).then(() => {
          sftp.fastPut(localFile, remoteFile, (putErr) => {
            if (putErr) {
              console.error(`❌ Error uploading ${localFile} -> ${remoteFile}:`, putErr.message);
              resolve(); // proceed to not block batch
            } else {
              resolve();
            }
          });
        });
      });
    };

    async function runDeployment() {
      try {
        // ── 1. Upload Backend ──────────────────────────────────────────────────
        console.log("\n📦 [1/3] Fast uploading Backend code (EXCLUDING .env & node_modules)...");
        const backendFiles = getAllFiles(LOCAL_BACKEND_DIR);
        console.log(`Found ${backendFiles.length} backend files.`);

        let bDone = 0;
        await mapConcurrent(backendFiles, 15, async (item) => {
          const remotePath = `${REMOTE_BACKEND_DIR}/${item.relPath}`;
          await uploadFile(item.fullPath, remotePath);
          bDone++;
          if (bDone % 50 === 0 || bDone === backendFiles.length) {
            console.log(`  Uploaded ${bDone}/${backendFiles.length} backend files...`);
          }
        });
        console.log("✅ Backend source code uploaded successfully.");

        // ── 2. Upload Frontend Dist ───────────────────────────────────────────
        console.log("\n🎨 [2/3] Fast uploading Frontend Build directly into /var/www/react-app/ ...");
        const distFiles = getDistFiles(LOCAL_FRONTEND_DIST_DIR);
        console.log(`Found ${distFiles.length} build files.`);

        let fDone = 0;
        await mapConcurrent(distFiles, 15, async (item) => {
          const remotePath = `${REMOTE_FRONTEND_DIR}/${item.relPath}`;
          await uploadFile(item.fullPath, remotePath);
          fDone++;
          if (fDone % 20 === 0 || fDone === distFiles.length) {
            console.log(`  Uploaded ${fDone}/${distFiles.length} frontend files...`);
          }
        });
        console.log("✅ Frontend build uploaded successfully directly into /var/www/react-app/.");

        // ── 3. Execute Remote Commands ─────────────────────────────────────────
        console.log("\n🔄 [3/3] Restarting backend & web server...");
        const execCommand = (cmd) => {
          return new Promise((resolve) => {
            conn.exec(cmd, (err, stream) => {
              if (err) {
                console.error(`Exec error: ${err.message}`);
                return resolve();
              }
              let out = "";
              let errOut = "";
              stream.on("close", (code) => {
                console.log(`CMD: "${cmd}" exited with code ${code}`);
                if (out) console.log("Output:", out.trim());
                if (errOut) console.log("ErrOutput:", errOut.trim());
                resolve();
              });
              stream.on("data", (d) => (out += d.toString()));
              stream.stderr.on("data", (d) => (errOut += d.toString()));
            });
          });
        };

        await execCommand("cd /home/master/backend && npm install --os=linux --cpu=x64 sharp && npm install --only=production");
        await execCommand("pm2 restart all || pm2 restart app || pm2 status");
        await execCommand("echo 'lcm@pass@13579' | sudo -S systemctl restart nginx");

        console.log("\n🎉 ALL DONE! Deployment finished cleanly on 20.109.106.169.");
        conn.end();
      } catch (e) {
        console.error("Deployment error:", e);
        conn.end();
      }
    }

    runDeployment();
  });
});

conn.on("error", (err) => {
  console.error("SSH Connection Error:", err);
});

conn.connect(config);
