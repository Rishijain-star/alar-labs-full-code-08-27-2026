const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");
const logger = require("../lib/logger");

class FirebaseAdminService {
  constructor() {
    this.initialized = false;
  }

  initialize() {
    if (this.initialized || admin.apps.length > 0) {
      this.initialized = true;
      return true;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      logger.warn("Firebase Admin not initialized: FIREBASE_SERVICE_ACCOUNT_PATH missing");
      return false;
    }

    try {
      const resolved = path.isAbsolute(serviceAccountPath)
        ? serviceAccountPath
        : path.resolve(process.cwd(), serviceAccountPath);
      if (!fs.existsSync(resolved)) {
        logger.warn(`Firebase Admin key file not found at: ${resolved}`);
        return false;
      }

      const serviceAccount = JSON.parse(fs.readFileSync(resolved, "utf8"));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      this.initialized = true;
      logger.info("Firebase Admin initialized");
      return true;
    } catch (error) {
      logger.error(`Firebase Admin initialization failed: ${error.message}`);
      return false;
    }
  }

  async sendMulticast({ tokens = [], notification, data = {} }) {
    if (!tokens.length) return { successCount: 0, failureCount: 0, responses: [] };
    if (!this.initialize()) return { successCount: 0, failureCount: tokens.length, responses: [] };

    try {
      const res = await admin.messaging().sendEachForMulticast({
        tokens,
        notification,
        data: Object.fromEntries(
          Object.entries(data || {}).map(([k, v]) => [k, String(v ?? "")])
        ),
      });
      return res;
    } catch (error) {
      logger.error(`Firebase multicast send failed: ${error.message}`);
      return { successCount: 0, failureCount: tokens.length, responses: [] };
    }
  }
}

module.exports = new FirebaseAdminService();

