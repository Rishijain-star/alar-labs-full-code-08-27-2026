## Redis Manager - Testing & Debugging Guide

### Quick Start
1. **Fully stop your app** (Ctrl+C twice if needed)
2. **Clear Node cache** (optional but recommended):
   ```bash
   rm -rf node_modules/.cache
   ```
3. **Restart the app**:
   ```bash
   npm start
   ```

### What to Look For in Logs

**✅ SUCCESS - You should see these messages in order:**
```
Initializing Redis connection...
✅ Redis Manager initialized successfully
Server running on port 3000 in development mode
Auth API: http://localhost:3000/api/auth
✅ Ready to accept requests
```

**⚠️ DEGRADED MODE - If Redis is down:**
```
Initializing Redis connection...
⚠️ Redis initialization failed - app will continue with degraded functionality
Server running on port 3000 in development mode
✅ Ready to accept requests
```
In this case, rate limiting will be skipped but the app continues working.

**❌ ERROR - If startup fails:**
```
Initializing Redis connection...
Failed to start server: [error message]
```

### Testing Rate Limiting

#### Test 1: Health Check Endpoint
```bash
curl http://localhost:3000/health
```

**Expected response:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "timestamp": "2026-02-27T...",
    "uptime": 45.234,
    "redis": "connected"  // or "disconnected"
  }
}
```

#### Test 2: Make Multiple Requests
If rate limiting is configured to max: 5 requests per minute:

```bash
# Make 6 requests to trigger rate limit
for i in {1..6}; do
  curl -X GET http://localhost:3000/api/auth/profile
  echo "Request $i sent"
done
```

**Expected on 6th request (if rate limit active):**
```json
{
  "success": false,
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45,
  "resetAt": "2026-02-27T16:40:00.000Z"
}
```

**Expected on 6th request (if Redis down):**
```json
Success response - request allowed (no rate limit enforced)
```

### Verifying Redis Connection

#### Check Redis Status
```bash
# If Redis is running locally on default port
redis-cli ping
# Should respond with: PONG

# Check Redis info
redis-cli info
```

#### Check Redis Manager State
Add this temporary debug endpoint to test:

In your auth routes or any route file, add:
```javascript
router.get('/debug/redis', async (req, res) => {
  const health = await redisManager.healthCheck();
  const isReady = redisManager.isReady();

  res.json({
    redisHealth: health,
    isReady: isReady,
    timestamp: new Date().toISOString()
  });
});
```

Then test:
```bash
curl http://localhost:3000/api/auth/debug/redis
```

### Common Issues & Solutions

**Issue 1: Redis connection times out**
- Check if Redis is running: `redis-cli ping`
- Check Redis credentials in .env file
- Verify REDIS_URL or REDIS_HOST/PORT environment variables

**Issue 2: Still getting null errors**
- Make sure to **FULLY RESTART** the app (kill and restart)
- Check if you're using an older terminal session with cached code
- Clear any watch/hot-reload processes that might be interfering

**Issue 3: Rate limiting not working in degraded mode**
- This is expected - app gracefully bypasses rate limiting when Redis is unavailable
- Check app logs to confirm: "Redis unavailable, skipping rate limit check"

### Architecture Summary

```
┌─────────────────────────────────────────┐
│         Express App (app.js)            │
├─────────────────────────────────────────┤
│  1. redisManager.initialize()           │
│     ↓ (Waits for Redis to connect)      │
│  2. app.listen() (Starts server)        │
│     ↓                                   │
│  3. Requests come in                    │
│     ↓                                   │
│  4. Middleware calls:                   │
│     redisManager.getClientSafe()        │
│     ↓                                   │
│     ├─ If Redis ready → Use cache      │
│     └─ If Redis down → Skip operation   │
└─────────────────────────────────────────┘
```

### Files Modified

- ✅ `app.js` - Uses redisManager, waits for init
- ✅ `src/lib/redisManager.js` - Central Redis wrapper
- ✅ `src/middleware/rateLimit.js` - Null checks added
- ✅ `src/middleware/userRateLimit.js` - Uses redisManager
- ✅ `src/services/*.js` - All use getClientSafe()

All middleware and services now gracefully handle Redis unavailability.
