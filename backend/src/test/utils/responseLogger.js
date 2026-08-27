/**
 * API Response Logger for Debugging
 * Logs responses to help understand what's happening
 */

const fs = require('fs');
const path = require('path');

class ResponseLogger {
  constructor() {
    this.logDir = path.join(__dirname, 'logs');
    this.ensureLogDir();
  }

  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
  }

  log(testName, method, endpoint, requestData, response) {
    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      test: testName,
      method,
      endpoint,
      request: requestData,
      response: {
        status: response.status,
        statusText: response.statusText,
        body: response.body,
        headers: response.headers,
      },
    };

    console.log(`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 TEST: ${testName}
🔗 ${method} ${endpoint}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📤 Request:
${JSON.stringify(requestData, null, 2)}

📥 Response (${response.status}):
${JSON.stringify(response.body, null, 2)}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `);

    // Also save to file
    const filename = path.join(
      this.logDir,
      `${timestamp.replace(/[:.]/g, '-')}-${method}-${endpoint.replace(/\//g, '_')}.json`
    );
    try {
      fs.writeFileSync(filename, JSON.stringify(logEntry, null, 2));
    } catch (e) {
      // Ignore file write errors
    }
  }

  logError(testName, error) {
    console.error(`
❌ ERROR in test: ${testName}
${error.message}
    `);
  }
}

module.exports = new ResponseLogger();
