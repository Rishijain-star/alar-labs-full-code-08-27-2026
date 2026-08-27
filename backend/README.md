# 🔐 Production-Ready Authentication System

A complete, secure authentication system with multi-device session management, admin controls, and rate limiting built on Redis, JWT, and Express.

## ✨ Features

- 🔑 **JWT Access Tokens** - Short-lived tokens (5 min) stored in memory
- 🔄 **Refresh Token Rotation** - Secure token rotation on each refresh
- 🍪 **HttpOnly Cookies** - Session ID stored securely
- 📦 **Redis Session Store** - Fast, scalable session management
- 🚀 **Multi-Device Support** - Manage sessions across devices
- 👤 **User-Initiated Logout** - Logout from current or all devices
- 🛡️ **Admin Force Logout** - Admin can terminate any user's sessions
- ⏱️ **Rate Limiting** - Prevent refresh token abuse
- 📊 **Session Analytics** - View active sessions and statistics
- 🔒 **Security Best Practices** - Helmet, CORS, secure cookies
- 📝 **Comprehensive Logging** - Winston logger with rotation
- ✅ **Input Validation** - Express-validator integration
- 🚨 **Error Handling** - Centralized error management

## 🏗️ Architecture

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Login (userId + password)
       ▼
┌─────────────────────────────────────┐
│         Express Server              │
│  ┌───────────────────────────────┐  │
│  │  Controllers & Middleware     │  │
│  │  - Auth, Rate Limit, Validate │  │
│  └───────────┬───────────────────┘  │
│              │                       │
│              ▼                       │
│  ┌─────────────────────────────┐   │
│  │    Session Service          │   │
│  │  - Create/Update/Delete     │   │
│  └───────────┬─────────────────┘   │
└──────────────┼─────────────────────┘
               │
               ▼
        ┌─────────────┐
        │    Redis    │
        │  - Sessions │
        │  - Rate     │
        └─────────────┘
```

### Data Flow

1. **Login**: Client sends credentials → Server creates session → Returns access + refresh tokens + httpOnly cookie
2. **API Request**: Client sends access token in header → Server validates → Returns data
3. **Token Expired**: Client detects 401 → Calls refresh endpoint → Gets new tokens
4. **Refresh**: Client sends refresh token + cookie → Server validates both → Returns new tokens (rotation)
5. **Logout**: Client calls logout → Server deletes session → Clears cookie

## 📦 Installation

```bash
# Clone repository
git clone <repo-url>
cd production-auth-system

# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Edit .env with your configuration
nano .env

# Start Redis (if not running)
redis-server

# Run in development
npm run dev

# Run in production
npm start
```

## 🔧 Configuration

Edit `.env` file:

```env
# Server
NODE_ENV=production
PORT=3000

# JWT
JWT_SECRET=your-super-secret-change-this
JWT_ACCESS_EXPIRY=5m
JWT_REFRESH_EXPIRY=30d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Session
SESSION_COOKIE_NAME=sid
SESSION_TTL_SECONDS=2592000
COOKIE_SECURE=true
COOKIE_SAME_SITE=strict

# Rate Limiting
REFRESH_RATE_LIMIT=10
REFRESH_RATE_WINDOW=60

# Admin
ADMIN_API_KEY=your-admin-api-key
```

## 📡 API Endpoints

### Authentication

#### 1. Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "userId": "user123",
  "deviceInfo": {
    "deviceName": "iPhone 14",
    "os": "iOS 16"
  }
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "a1b2c3d4e5f6...",
    "token_type": "Bearer",
    "expires_in": 300
  }
}
```

**Cookie Set:** `sid=<session-id>; HttpOnly; Secure; SameSite=Strict`

---

#### 2. Refresh Token

```http
POST /api/auth/refresh
Content-Type: application/json
Cookie: sid=<session-id>

{
  "refresh_token": "a1b2c3d4e5f6..."
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "refresh_token": "x9y8z7w6v5u4...",
    "token_type": "Bearer",
    "expires_in": 300
  }
}
```

**Rate Limited:** Max 10 requests per minute per session

---

#### 3. Logout (Current Device)

```http
POST /api/auth/logout
Cookie: sid=<session-id>
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

#### 4. Logout All Devices

```http
POST /api/auth/logout-all
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Logged out from all devices",
  "sessionsTerminated": 3
}
```

---

### Session Management

#### 5. Get Active Sessions

```http
GET /api/auth/sessions
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "abc123",
        "current": true,
        "createdAt": 1234567890,
        "userAgent": "Mozilla/5.0...",
        "ipAddress": "192.168.1.1"
      },
      {
        "sessionId": "def456",
        "current": false,
        "createdAt": 1234567800,
        "userAgent": "Mobile App",
        "ipAddress": "192.168.1.2"
      }
    ],
    "total": 2
  }
}
```

---

#### 6. Logout Specific Session

```http
DELETE /api/auth/sessions/:sessionId
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "success": true,
  "message": "Session terminated successfully"
}
```

---

### Admin Endpoints

All admin endpoints require `X-Admin-API-Key` header.

#### 7. Force Logout User (All Devices)

```http
POST /api/admin/users/:userId/logout
X-Admin-API-Key: <admin-key>
Content-Type: application/json

{
  "reason": "Security violation"
}
```

**Response:**

```json
{
  "success": true,
  "message": "User user123 logged out from all devices",
  "data": {
    "userId": "user123",
    "sessionsTerminated": 3,
    "reason": "Security violation"
  }
}
```

---

#### 8. Terminate Specific Session (Admin)

```http
DELETE /api/admin/sessions/:sessionId
X-Admin-API-Key: <admin-key>
Content-Type: application/json

{
  "reason": "Suspicious activity"
}
```

---

#### 9. Get User's Sessions (Admin)

```http
GET /api/admin/users/:userId/sessions
X-Admin-API-Key: <admin-key>
```

---

#### 10. Session Statistics

```http
GET /api/admin/stats/sessions
X-Admin-API-Key: <admin-key>
```

**Response:**

```json
{
  "success": true,
  "data": {
    "totalSessions": 1523,
    "totalUsers": 842,
    "samples": [...]
  }
}
```

---

## 🔒 Security Features

### 1. Token Strategy

- **Access Token**: JWT, 5-minute expiry, stored in memory (client-side)
- **Refresh Token**: Opaque token, 30-day expiry, backend only
- **Session Cookie**: HttpOnly, Secure, SameSite=Strict

### 2. Token Rotation

Every refresh generates new tokens, invalidating old ones.

### 3. Rate Limiting

- Refresh endpoint: 10 requests/minute per session
- Global API: 1000 requests/minute per IP

### 4. Secure Comparison

Constant-time comparison prevents timing attacks.

### 5. CSRF Protection

- HttpOnly cookies
- SameSite attribute
- CORS configuration

## 🧪 Testing

### Example Client Code (JavaScript)

```javascript
class AuthClient {
  constructor() {
    this.accessToken = null;
    this.refreshToken = null;
  }

  async login(userId) {
    const response = await fetch("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ userId }),
    });

    const data = await response.json();

    if (data.success) {
      this.accessToken = data.data.access_token;
      this.refreshToken = data.data.refresh_token;

      // Schedule refresh before expiry
      setTimeout(() => this.refresh(), 4 * 60 * 1000); // 4 minutes
    }

    return data;
  }

  async refresh() {
    const response = await fetch("http://localhost:3000/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });

    const data = await response.json();

    if (data.success) {
      this.accessToken = data.data.access_token;
      this.refreshToken = data.data.refresh_token;

      setTimeout(() => this.refresh(), 4 * 60 * 1000);
    } else if (data.code === "INVALID_REFRESH_TOKEN") {
      this.logout();
    }

    return data;
  }

  async apiCall(endpoint) {
    let response = await fetch(endpoint, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    // Auto-refresh on 401
    if (response.status === 401) {
      await this.refresh();

      response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
        },
      });
    }

    return response.json();
  }

  async logout() {
    await fetch("http://localhost:3000/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });

    this.accessToken = null;
    this.refreshToken = null;
  }

  async logoutAll() {
    await fetch("http://localhost:3000/api/auth/logout-all", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
      },
    });

    this.accessToken = null;
    this.refreshToken = null;
  }
}

// Usage
const auth = new AuthClient();
await auth.login("user123");
const data = await auth.apiCall("http://localhost:3000/api/protected");
```

## 📊 Redis Data Structure

```
# Session
session:abc123 → {
  userId: "user123",
  refreshTokenHash: "sha256...",
  createdAt: 1234567890,
  userAgent: "Mozilla...",
  ipAddress: "192.168.1.1"
}
TTL: 30 days

# User Sessions Set
user_sessions:user123 → ["abc123", "def456", "ghi789"]
TTL: 30 days

# Rate Limiting
rate:refresh:abc123 → 3
TTL: 60 seconds
```

## 🎯 Best Practices Implemented

1. ✅ Never expose refresh tokens to client-side JavaScript
2. ✅ Use secure, httpOnly cookies for session IDs
3. ✅ Rotate refresh tokens on every use
4. ✅ Implement rate limiting on sensitive endpoints
5. ✅ Use constant-time comparison for tokens
6. ✅ Hash refresh tokens before storage
7. ✅ Implement proper error handling and logging
8. ✅ Validate all inputs
9. ✅ Use HTTPS in production (secure cookies)
10. ✅ Implement graceful shutdown

## 🚀 Production Deployment

1. **Environment Variables**: Set all required env vars
2. **HTTPS**: Enable SSL/TLS (Let's Encrypt recommended)
3. **Redis**: Use Redis Cluster or managed service (AWS ElastiCache, Redis Cloud)
4. **Process Manager**: Use PM2 or similar
5. **Monitoring**: Integrate with logging service (Datadog, New Relic)
6. **Reverse Proxy**: Use Nginx or similar

```bash
# Using PM2
npm install -g pm2
pm2 start app.js --name auth-server
pm2 save
pm2 startup
```

## 📝 License

MIT

## 🤝 Contributing

Contributions welcome! Please read the contributing guidelines first.
