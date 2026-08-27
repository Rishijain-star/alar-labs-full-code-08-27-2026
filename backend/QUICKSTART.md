# Quick Start Guide

## Prerequisites

- Node.js 16+ installed
- Redis server running
- Terminal/Command line access

## Installation (5 minutes)

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` and set your values (minimum required):

```env
JWT_SECRET=change-this-to-a-long-random-string
ADMIN_API_KEY=your-secure-admin-key
```

### Step 3: Start Redis

```bash
# macOS (via Homebrew)
brew services start redis

# Linux
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Or use Docker Compose (includes Redis)
docker-compose up -d
```

### Step 4: Start Server

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start
```

Server should start on `http://localhost:3000`

## Test the API (Postman/cURL)

### 1. Health Check

```bash
curl http://localhost:3000/health
```

**Expected Response:**

```json
{
  "status": "ok",
  "timestamp": "2024-01-28T...",
  "uptime": 123.45,
  "redis": true
}
```

---

### 2. Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "testuser123"
  }' \
  -c cookies.txt
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6g7h8...",
    "token_type": "Bearer",
    "expires_in": 300
  }
}
```

**Save these values:**

- `access_token` → Use in Authorization header
- `refresh_token` → Use for refresh endpoint
- Cookie automatically saved to `cookies.txt`

---

### 3. Access Protected Route

```bash
# Replace YOUR_ACCESS_TOKEN with the token from step 2
curl http://localhost:3000/api/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "message": "This is a protected route",
  "user": {
    "userId": "testuser123",
    "type": "access",
    "iat": 1234567890,
    "exp": 1234568190
  }
}
```

---

### 4. Refresh Token

```bash
# Wait 5+ minutes for access token to expire, or test immediately
curl -X POST http://localhost:3000/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }' \
  -b cookies.txt
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "x9y8z7w6v5u4t3s2...",
    "token_type": "Bearer",
    "expires_in": 300
  }
}
```

---

### 5. View Active Sessions

```bash
curl http://localhost:3000/api/auth/sessions \
  -H "Authorization: Bearer YOUR_NEW_ACCESS_TOKEN"
```

**Expected Response:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "abc-123-def-456",
        "current": true,
        "createdAt": 1234567890,
        "userAgent": "curl/7.68.0",
        "ipAddress": "::1"
      }
    ],
    "total": 1
  }
}
```

---

### 6. Logout Current Device

```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

### 7. Login Again (Multi-Device Test)

```bash
# Login from "Device 1"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "testuser123"}' \
  -c device1.txt

# Login from "Device 2"
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "testuser123"}' \
  -c device2.txt
```

Now check sessions (should show 2):

```bash
curl http://localhost:3000/api/auth/sessions \
  -H "Authorization: Bearer ACCESS_TOKEN_FROM_DEVICE_1"
```

---

### 8. Logout All Devices

```bash
curl -X POST http://localhost:3000/api/auth/logout-all \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -b device1.txt
```

**Expected Response:**

```json
{
  "success": true,
  "message": "Logged out from all devices",
  "sessionsTerminated": 2
}
```

---

### 9. Admin Force Logout (requires admin key)

```bash
curl -X POST http://localhost:3000/api/admin/users/testuser123/logout \
  -H "X-Admin-API-Key: your-admin-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Security audit"
  }'
```

**Expected Response:**

```json
{
  "success": true,
  "message": "User testuser123 logged out from all devices",
  "data": {
    "userId": "testuser123",
    "sessionsTerminated": 1,
    "reason": "Security audit"
  }
}
```

---

### 10. Test Rate Limiting

```bash
# Run this 11 times quickly (should get rate limited on 11th)
for i in {1..11}; do
  echo "Attempt $i:"
  curl -X POST http://localhost:3000/api/auth/refresh \
    -H "Content-Type: application/json" \
    -d '{"refresh_token": "YOUR_REFRESH_TOKEN"}' \
    -b cookies.txt
  echo "\n---"
done
```

**Expected on 11th attempt:**

```json
{
  "error": "Too many refresh attempts",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 45,
  "limit": 10,
  "resetAt": 1234567890000
}
```

## JavaScript Client Example

Create a file `test-client.js`:

```javascript
const fetch = require("node-fetch");

class AuthClient {
  constructor(baseURL = "http://localhost:3000") {
    this.baseURL = baseURL;
    this.accessToken = null;
    this.refreshToken = null;
    this.sessionCookie = null;
  }

  async login(userId) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (data.success) {
      this.accessToken = data.data.access_token;
      this.refreshToken = data.data.refresh_token;

      // Extract session cookie
      const cookies = response.headers.raw()["set-cookie"];
      this.sessionCookie = cookies[0].split(";")[0];

      console.log("✅ Login successful");
      console.log("Access Token:", this.accessToken.substring(0, 20) + "...");
      console.log("Refresh Token:", this.refreshToken.substring(0, 20) + "...");
    }

    return data;
  }

  async refresh() {
    const response = await fetch(`${this.baseURL}/api/auth/refresh`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Cookie: this.sessionCookie,
      },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      this.accessToken = data.data.access_token;
      this.refreshToken = data.data.refresh_token;
      console.log("✅ Token refreshed");
    }

    return data;
  }

  async getProtected() {
    const response = await fetch(`${this.baseURL}/api/protected`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.json();
  }

  async getSessions() {
    const response = await fetch(`${this.baseURL}/api/auth/sessions`, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    return response.json();
  }

  async logout() {
    const response = await fetch(`${this.baseURL}/api/auth/logout`, {
      method: "POST",
      headers: {
        Cookie: this.sessionCookie,
      },
    });

    console.log("✅ Logged out");
    return response.json();
  }

  async logoutAll() {
    const response = await fetch(`${this.baseURL}/api/auth/logout-all`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    const data = await response.json();
    console.log(`✅ Logged out from ${data.sessionsTerminated} devices`);
    return data;
  }
}

// Run tests
async function runTests() {
  const client = new AuthClient();

  console.log("\n🧪 Test 1: Login");
  await client.login("testuser123");

  console.log("\n🧪 Test 2: Access Protected Route");
  const protected1 = await client.getProtected();
  console.log("Protected data:", protected1);

  console.log("\n🧪 Test 3: Get Sessions");
  const sessions1 = await client.getSessions();
  console.log("Active sessions:", sessions1.data.total);

  console.log("\n🧪 Test 4: Refresh Token");
  await client.refresh();

  console.log("\n🧪 Test 5: Create Second Session");
  const client2 = new AuthClient();
  await client2.login("testuser123");

  const sessions2 = await client.getSessions();
  console.log("Active sessions after 2nd login:", sessions2.data.total);

  console.log("\n🧪 Test 6: Logout All Devices");
  await client.logoutAll();

  console.log("\n✅ All tests completed!");
}

runTests().catch(console.error);
```

Run it:

```bash
npm install node-fetch@2
node test-client.js
```

## Troubleshooting

### Issue: "Redis client not connected"

**Solution:**

```bash
# Check if Redis is running
redis-cli ping
# Should return: PONG

# If not running, start it
brew services start redis  # macOS
sudo systemctl start redis # Linux
```

### Issue: "Port 3000 already in use"

**Solution:**

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue: Rate limit triggered immediately

**Solution:**

```bash
# Clear Redis rate limit keys
redis-cli KEYS "rate:*" | xargs redis-cli DEL
```

### Issue: Session not found after restart

**Cause:** Redis data is not persisted

**Solution:**

```bash
# Enable Redis persistence
redis-cli CONFIG SET appendonly yes
redis-cli CONFIG SET save "900 1 300 10 60 10000"
```

## Next Steps

1. ✅ Explore the full API in `README.md`
2. ✅ Review security best practices in `ARCHITECTURE.md`
3. ✅ Deploy using Docker: `docker-compose up -d`
4. ✅ Set up monitoring and logging
5. ✅ Integrate with your user database

## Support

- Check logs: `tail -f logs/combined.log`
- Check Redis: `redis-cli MONITOR`
- Test health: `curl http://localhost:3000/health`
