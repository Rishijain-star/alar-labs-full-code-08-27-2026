# Enhanced Winston Logger with Daily Rotation

## Features

✅ **Daily Log Rotation** - Separate log files created each day
✅ **Log Level Separation** - Different files for errors, warnings, HTTP, and combined logs
✅ **Automatic Compression** - Old logs are automatically zipped
✅ **Automatic Cleanup** - Old logs are deleted after retention period
✅ **Structured Logging** - Helper methods for consistent log formatting
✅ **Stack Traces** - Automatic error stack trace logging
✅ **Metadata Support** - Add contextual information to logs

## Installation

```bash
npm install winston winston-daily-rotate-file
```

## Log Files Generated

```
logs/
├── error-2024-01-29.log        # Today's errors only
├── error-2024-01-28.log        # Yesterday's errors
├── error-2024-01-27.log.gz     # Compressed older errors
├── warn-2024-01-29.log         # Today's warnings
├── warn-2024-01-28.log         # Yesterday's warnings
├── combined-2024-01-29.log     # All logs (info, warn, error, http)
├── combined-2024-01-28.log     # Yesterday's combined
├── http-2024-01-29.log         # Today's HTTP requests
└── http-2024-01-28.log         # Yesterday's HTTP requests
```

## Retention Policies

- **Error logs**: 30 days
- **Warning logs**: 30 days
- **Combined logs**: 14 days
- **HTTP logs**: 7 days

## Usage Examples

### Basic Logging

```javascript
const logger = require("./lib/logger");

// Simple logging
logger.info("Application started");
logger.warn("High memory usage detected");
logger.error("Database connection failed");
logger.debug("Processing user data");
logger.http("GET /api/users 200");
```

### Structured Error Logging

```javascript
// Using the helper method
try {
  // Some operation
} catch (error) {
  logger.logError("Failed to process payment", error, {
    userId: "12345",
    orderId: "ORD-789",
    amount: 99.99,
  });
}

// Output in error-2024-01-29.log:
// 2024-01-29 10:30:45 [ERROR]: Failed to process payment
// Metadata: {
//   "error": "Payment gateway timeout",
//   "stack": "Error: Payment gateway timeout\n    at...",
//   "code": "ETIMEDOUT",
//   "userId": "12345",
//   "orderId": "ORD-789",
//   "amount": 99.99
// }
```

### HTTP Request Logging

```javascript
// In your Express middleware
app.use((req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const responseTime = Date.now() - start;
    logger.logHttp(req, res, responseTime);
  });

  next();
});

// Output in http-2024-01-29.log:
// 2024-01-29 10:30:45 [HTTP]: GET /api/users 200 - 45ms
// Metadata: {
//   "method": "GET",
//   "url": "/api/users",
//   "statusCode": 200,
//   "responseTime": 45,
//   "ip": "192.168.1.1",
//   "userAgent": "Mozilla/5.0..."
// }
```

### Authentication Logging

```javascript
// Successful login
logger.logAuth("LOGIN_SUCCESS", userId, {
  ip: req.ip,
  userAgent: req.headers["user-agent"],
});

// Failed login
logger.logAuth("LOGIN_FAILED", null, {
  email: "user@example.com",
  reason: "Invalid password",
  ip: req.ip,
});

// Output in combined-2024-01-29.log:
// 2024-01-29 10:30:45 [INFO]: Auth: LOGIN_SUCCESS
// Metadata: {
//   "action": "LOGIN_SUCCESS",
//   "userId": "12345",
//   "ip": "192.168.1.1",
//   "userAgent": "Mozilla/5.0..."
// }
```

### Security Event Logging

```javascript
// Suspicious activity
logger.logSecurity("MULTIPLE_FAILED_LOGINS", {
  email: "user@example.com",
  attempts: 5,
  ip: req.ip,
  lastAttempt: new Date(),
});

// IP blocked
logger.logSecurity("IP_BLOCKED", {
  ip: "192.168.1.100",
  reason: "Too many failed login attempts",
  duration: "1 hour",
});

// Output in warn-2024-01-29.log:
// 2024-01-29 10:30:45 [WARN]: Security: MULTIPLE_FAILED_LOGINS
// Metadata: {
//   "event": "MULTIPLE_FAILED_LOGINS",
//   "email": "user@example.com",
//   "attempts": 5,
//   "ip": "192.168.1.100",
//   "lastAttempt": "2024-01-29T10:30:45.123Z"
// }
```

### Controller Usage

```javascript
const logger = require("../lib/logger");

class AuthController {
  async login(req, res) {
    try {
      const { email, password } = req.body;

      logger.info(`Login attempt for ${email}`);

      const result = await authService.login(email, password);

      logger.logAuth("LOGIN_SUCCESS", result.userId, {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      });

      return response.success(res, "Login successful", 200, result);
    } catch (error) {
      logger.logError("Login failed", error, {
        email: req.body.email,
        ip: req.ip,
      });

      return response.fail(res, error.message, error.statusCode);
    }
  }
}
```

### Morgan Integration (HTTP Logging)

```javascript
const morgan = require("morgan");
const logger = require("./lib/logger");

// Use the logger stream with Morgan
app.use(morgan("combined", { stream: logger.stream }));
```

## Log Rotation Events

```javascript
// Listen to rotation events
logger.on("rotate", (oldFilename, newFilename) => {
  console.log(`Log rotated: ${oldFilename} -> ${newFilename}`);
});
```

## Configuration Options

You can customize in the logger file:

```javascript
// Change date pattern (default: YYYY-MM-DD)
datePattern: "YYYY-MM-DD-HH"; // Hourly rotation

// Change max file size (default: 20m)
maxSize: "50m"; // Rotate at 50MB

// Change retention period
maxFiles: "60d"; // Keep for 60 days

// Disable compression
zippedArchive: false;
```

## Benefits

1. **Easy Debugging** - Find errors by date: `logs/error-2024-01-29.log`
2. **Disk Space Management** - Automatic compression and cleanup
3. **Performance** - Old logs don't slow down current logging
4. **Compliance** - Meet data retention requirements
5. **Monitoring** - Easy to parse and monitor daily logs
6. **Troubleshooting** - Separate files for different log levels

## Viewing Logs

```bash
# View today's errors
cat logs/error-$(date +%Y-%m-%d).log

# View yesterday's errors
cat logs/error-$(date -d "yesterday" +%Y-%m-%d).log

# View last 50 errors
tail -n 50 logs/error-$(date +%Y-%m-%d).log

# Watch errors in real-time
tail -f logs/error-$(date +%Y-%m-%d).log

# Search for specific error
grep "Database" logs/error-*.log

# View compressed logs
zcat logs/error-2024-01-20.log.gz
```

## Production Best Practices

1. **Set appropriate log levels** - Use 'info' in production, 'debug' in development
2. **Monitor disk space** - Ensure adequate space for log retention period
3. **Set up log shipping** - Send logs to centralized logging service (ELK, Splunk, etc.)
4. **Review error logs daily** - Set up alerts for critical errors
5. **Secure log files** - Restrict file permissions appropriately

## Integration with Log Management Tools

```javascript
// Example: Send logs to external service
const Transport = require("winston-transport");

class CloudWatchTransport extends Transport {
  log(info, callback) {
    // Send to AWS CloudWatch
    callback();
  }
}

logger.add(new CloudWatchTransport());
```
