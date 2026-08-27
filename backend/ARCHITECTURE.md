# Architecture Documentation

## System Overview

This authentication system implements a secure, scalable session management solution using JWT access tokens, opaque refresh tokens, and Redis for session storage.

## Core Components

### 1. Authentication Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  POST /login {userId, password}              │
     ├──────────────────────────────────────────────>│
     │                                               │
     │              ┌─────────────────────┐         │
     │              │ 1. Validate creds   │         │
     │              │ 2. Generate tokens  │         │
     │              │ 3. Create session   │         │
     │              │ 4. Set cookie       │         │
     │              └─────────────────────┘         │
     │                                               │
     │  {access_token, refresh_token} + Cookie      │
     │<──────────────────────────────────────────────┤
     │                                               │
     │  Store access_token in memory                │
     │  Store refresh_token in secure storage       │
     │                                               │
```

### 2. Token Refresh Flow

```
┌──────────┐                                    ┌──────────┐
│  Client  │                                    │  Server  │
└────┬─────┘                                    └────┬─────┘
     │                                               │
     │  Access token expires (detected by 401)      │
     │                                               │
     │  POST /refresh {refresh_token} + Cookie      │
     ├──────────────────────────────────────────────>│
     │                                               │
     │              ┌─────────────────────┐         │
     │              │ 1. Check rate limit │         │
     │              │ 2. Validate cookie  │         │
     │              │ 3. Validate token   │         │
     │              │ 4. Rotate tokens    │         │
     │              │ 5. Update session   │         │
     │              └─────────────────────┘         │
     │                                               │
     │  {new_access_token, new_refresh_token}       │
     │<──────────────────────────────────────────────┤
     │                                               │
```

### 3. Multi-Device Logout

```
Redis Structure:

session:abc123 → {userId: "user1", refreshTokenHash: "..."}
session:def456 → {userId: "user1", refreshTokenHash: "..."}
session:ghi789 → {userId: "user1", refreshTokenHash: "..."}

user_sessions:user1 → ["abc123", "def456", "ghi789"]

Logout All Flow:
1. Get all session IDs from user_sessions:user1
2. Delete each session:* key
3. Delete user_sessions:user1 set
4. Clear cookie
```

## Security Considerations

### Token Security

**Access Token (JWT)**

- Short-lived (5 minutes)
- Stored in memory (vulnerable to XSS if stored in localStorage)
- Contains minimal claims (userId, type, iat, exp)
- Validated on every API request

**Refresh Token (Opaque)**

- Long-lived (30 days)
- Never sent in responses except during refresh
- Hashed using SHA-256 before storage
- Single-use with rotation (previous token invalidated)

**Session Cookie**

- HttpOnly (prevents JavaScript access)
- Secure (HTTPS only in production)
- SameSite=Strict (CSRF protection)
- Contains only session ID

### Attack Mitigation

| Attack Vector    | Mitigation Strategy                               |
| ---------------- | ------------------------------------------------- |
| XSS              | HttpOnly cookies, CSP headers, input sanitization |
| CSRF             | SameSite cookies, token validation                |
| Token Theft      | Short expiry, rotation, secure storage            |
| Brute Force      | Rate limiting, account lockout                    |
| Timing Attacks   | Constant-time comparison                          |
| Session Fixation | New session on login, secure ID generation        |
| Replay Attacks   | Token rotation, nonce validation                  |

## Data Models

### Session Object

```javascript
{
  userId: string,              // User identifier
  refreshTokenHash: string,    // SHA-256 hash of refresh token
  createdAt: number,          // Unix timestamp
  updatedAt: number,          // Unix timestamp
  userAgent: string,          // Client user agent
  ipAddress: string,          // Client IP
  deviceInfo: {               // Optional device metadata
    deviceName: string,
    os: string,
    browser: string
  }
}
```

### Access Token (JWT Payload)

```javascript
{
  userId: string,
  type: "access",
  iat: number,    // Issued at
  exp: number,    // Expiration
  iss: "auth-service",
  aud: "api"
}
```

## Performance Optimization

### Redis Operations

1. **Pipeline Operations**: Batch Redis commands where possible
2. **Connection Pooling**: Single Redis client instance, reused connections
3. **TTL Management**: Automatic expiration reduces manual cleanup
4. **Set Operations**: O(1) lookups for user sessions

### Rate Limiting Strategy

- **Sliding Window**: Using Redis INCR + EXPIRE
- **Per-Session**: Limits tied to session ID, not user
- **Fail Open**: If Redis fails, allow request (logged)
- **Headers**: Return rate limit info in response headers

## Scalability

### Horizontal Scaling

```
┌──────────────┐
│ Load Balancer│
└──────┬───────┘
       │
   ┌───┴────┬─────────┬─────────┐
   │        │         │         │
┌──▼──┐  ┌─▼──┐   ┌──▼──┐   ┌──▼──┐
│App 1│  │App 2│   │App 3│   │App 4│
└──┬──┘  └──┬─┘   └──┬──┘   └──┬──┘
   │        │         │         │
   └────────┴─────────┴─────────┘
            │
      ┌─────▼─────┐
      │Redis Cluster│
      └───────────┘
```

- **Stateless Apps**: All state in Redis
- **Session Affinity**: Not required
- **Redis Cluster**: Shard sessions across nodes
- **Backup Strategy**: Redis persistence (AOF + RDB)

### Monitoring

Key metrics to track:

- Active sessions count
- Token refresh rate
- Failed authentication attempts
- Rate limit violations
- Redis connection pool status
- Average session duration

## Error Handling Strategy

### Client Errors (4xx)

| Status | Code                  | Action                     |
| ------ | --------------------- | -------------------------- |
| 401    | TOKEN_EXPIRED         | Refresh token              |
| 401    | INVALID_TOKEN         | Re-authenticate            |
| 401    | INVALID_REFRESH_TOKEN | Logout, redirect to login  |
| 429    | RATE_LIMIT_EXCEEDED   | Wait for reset, show timer |

### Server Errors (5xx)

- Log with full context
- Return generic error to client
- Trigger alerts for repeated failures
- Implement circuit breaker for Redis

## Deployment Architecture

### Production Setup

```
Internet
   │
   ▼
┌─────────────┐
│   Nginx     │ ← SSL Termination, Rate Limiting
│ (Reverse    │
│  Proxy)     │
└─────┬───────┘
      │
   ┌──▼────────┐
   │  PM2      │ ← Process Manager
   │ (Cluster) │
   └──┬────────┘
      │
   ┌──▼────┬────┬────┐
   │App 1  │App2│App3│ ← Node.js instances
   └───┬───┴──┬─┴──┬─┘
       │      │    │
   ┌───▼──────▼────▼───┐
   │   Redis Cluster   │ ← Session Store
   │  (Master-Replica) │
   └───────────────────┘
```

### Environment Separation

- **Development**: Local Redis, debug logging, hot reload
- **Staging**: Managed Redis, standard logging, mimics production
- **Production**: Redis Cluster, minimal logging, auto-scaling

## Code Organization

```
/
├── config/              # Configuration management
│   └── index.js
├── controllers/         # Request handlers
│   ├── authController.js
│   ├── refreshController.js
│   ├── logoutController.js
│   └── adminController.js
├── middleware/          # Express middleware
│   ├── auth.js
│   ├── rateLimit.js
│   ├── errorHandler.js
│   └── validation.js
├── services/           # Business logic
│   ├── sessionService.js
│   └── rateLimitService.js
├── utils/              # Utility functions
│   ├── token.js
│   └── crypto.js
├── lib/                # External integrations
│   ├── redis.js
│   └── logger.js
└── app.js              # Application entry point
```

## Best Practices Checklist

- ✅ Environment-based configuration
- ✅ Centralized error handling
- ✅ Structured logging
- ✅ Input validation
- ✅ Rate limiting
- ✅ Security headers (Helmet)
- ✅ CORS configuration
- ✅ Graceful shutdown
- ✅ Health checks
- ✅ Docker support
- ✅ Code linting (ESLint)
- ✅ Code formatting (Prettier)
- ✅ Comprehensive documentation

## Future Enhancements

1. **OAuth 2.0 Integration**: Support for social login
2. **2FA/MFA**: Time-based OTP support
3. **WebAuthn**: Passwordless authentication
4. **Audit Logging**: Detailed security event logs
5. **IP Whitelisting**: Per-user IP restrictions
6. **Device Fingerprinting**: Enhanced device tracking
7. **Anomaly Detection**: ML-based suspicious activity detection
8. **Token Blacklisting**: Immediate revocation mechanism
