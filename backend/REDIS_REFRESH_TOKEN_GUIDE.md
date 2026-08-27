# 🔍 Redis Refresh Token Flow - Complete Guide

## Overview

This guide shows **exactly where** refresh tokens are saved to and retrieved from Redis throughout the authentication lifecycle.

---

## 📊 Quick Reference Table

| Action                           | Where                                   | File                         | Function  |
| -------------------------------- | --------------------------------------- | ---------------------------- | --------- |
| **Save** refresh token           | `sessionService.createSession()`        | `services/sessionService.js` | Line ~45  |
| **Check/Validate** refresh token | `sessionService.validateRefreshToken()` | `services/sessionService.js` | Line ~115 |
| **Update** refresh token         | `sessionService.updateSession()`        | `services/sessionService.js` | Line ~155 |
| **Delete** refresh token         | `sessionService.deleteSession()`        | `services/sessionService.js` | Line ~180 |

---

## 1️⃣ SAVE: Where Refresh Token is Saved to Redis

### Location: `services/sessionService.js` → `createSession()`

```javascript
/**
 * Create a new session in Redis
 * THIS IS WHERE THE REFRESH TOKEN IS FIRST SAVED
 */
async createSession(sessionId, userId, refreshToken, metadata = {}, ttl = null) {
  try {
  
    const sessionKey = `session:${sessionId}`;
    const userSessionsKey = `user_sessions:${userId}`;

    // 🔐 SAVE REFRESH TOKEN HERE
    const sessionData = {
      userId,
      refreshTokenHash: hash(refreshToken), // ← SAVED AS SHA-256 HASH
      createdAt: Date.now(),
      ...metadata,
    };

    // Store in Redis with TTL
    await redisClient.set(
      sessionKey,                    // Key: "session:abc123"
      ttl || this.sessionTTL,        // TTL: 30 days default
      JSON.stringify(sessionData)     // Value: {userId, refreshTokenHash, ...}
    );

    // Also add to user's session set
    await redis.sAdd(userSessionsKey, sessionId);
    await redis.expire(userSessionsKey, ttl || this.sessionTTL);

    logger.info(`Session created: ${sessionId} for user: ${userId}`);
    return true;
  } catch (error) {
    logger.error('Failed to create session:', error);
    throw new Error('Session creation failed');
  }
}
```

**Redis Data Structure After Save:**

```
Key: "session:abc123"
Value: {
  "userId": "user123",
  "refreshTokenHash": "9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08",
  "createdAt": 1234567890,
  "userAgent": "Mozilla/5.0...",
  "ipAddress": "192.168.1.1"
}
TTL: 2592000 seconds (30 days)

Key: "user_sessions:user123"
Value: ["abc123", "def456"]  (Set of session IDs)
```

**Called From:**

- ✅ `AuthController.login()` - After successful login
- ✅ `AuthController.verifyMfa()` - After MFA verification
- ✅ `AuthController.oauthCallback()` - After OAuth login
- ✅ `AuthController.webauthnLoginFinish()` - After WebAuthn login

---

## 2️⃣ CHECK: Where Refresh Token is Validated

### Location: `services/sessionService.js` → `validateRefreshToken()`

```javascript
/**
 * Validate refresh token against stored hash
 * THIS IS WHERE THE REFRESH TOKEN IS CHECKED
 */
async validateRefreshToken(sessionId, refreshToken) {
  try {
    // 🔍 STEP 1: Get session from Redis
    const session = await this.getSession(sessionId);

    if (!session) {
      logger.warn(`Session not found: ${sessionId}`);
      return null;
    }

    // 🔍 STEP 2: Hash the provided refresh token
    const providedHash = hash(refreshToken);

    // 🔍 STEP 3: Compare with stored hash (constant-time)
    if (!secureCompare(providedHash, session.refreshTokenHash)) {
      logger.warn(`Invalid refresh token for session: ${sessionId}`);
      await this.deleteSession(sessionId); // Security: Delete on mismatch
      return null;
    }

    // ✅ Token is valid
    return session;
  } catch (error) {
    logger.error('Failed to validate refresh token:', error);
    return null;
  }
}
```

**How Validation Works:**

```
1. Client sends: refresh_token = "abc123xyz789"
2. Server hashes: hash("abc123xyz789") = "9f86d08..."
3. Server retrieves from Redis: session.refreshTokenHash = "9f86d08..."
4. Server compares: providedHash === storedHash
5. Result: Valid ✅ or Invalid ❌
```

**Called From:**

- ❌ `AuthController.refresh()` - OLD WAY (with token in body)
- ⚠️ NOT used in secure cookie-based approach

---

## 3️⃣ UPDATE: Where Refresh Token is Rotated

### Location: `services/sessionService.js` → `updateSession()`

```javascript
/**
 * Update session with new refresh token (TOKEN ROTATION)
 * THIS IS WHERE THE REFRESH TOKEN IS UPDATED
 */
async updateSession(sessionId, newRefreshToken, session) {
  try {
  
    const sessionKey = `session:${sessionId}`;

    // 🔄 ROTATE: Hash the NEW refresh token
    const updatedSession = {
      ...session,
      refreshTokenHash: hash(newRefreshToken), // ← NEW HASH SAVED
      updatedAt: Date.now(),
    };

    // Save back to Redis
    await redisClient.set(
      sessionKey,
      this.sessionTTL,
      JSON.stringify(updatedSession)
    );

    logger.info(`Session updated: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error('Failed to update session:', error);
    throw new Error('Session update failed');
  }
}
```

**Token Rotation Flow:**

```
Before Refresh:
  session:abc123 → {refreshTokenHash: "old_hash_xxx"}

After Refresh:
  session:abc123 → {refreshTokenHash: "new_hash_yyy"}

Old refresh token is now invalid!
```

**Called From:**

- ✅ `AuthController.refresh()` - Every time access token is refreshed

---

## 4️⃣ DELETE: Where Refresh Token is Removed

### Location: `services/sessionService.js` → `deleteSession()`

```javascript
/**
 * Delete a single session
 * THIS IS WHERE THE REFRESH TOKEN IS DELETED
 */
async deleteSession(sessionId) {
  try {
  

    // 🔍 Get session first to remove from user's set
    const session = await this.getSession(sessionId);

    if (session) {
      const userSessionsKey = `user_sessions:${session.userId}`;
      await redis.sRem(userSessionsKey, sessionId);
    }

    // 🗑️ DELETE: Remove session (and refresh token hash)
    const sessionKey = `session:${sessionId}`;
    await redisClient.del(sessionKey);

    logger.info(`Session deleted: ${sessionId}`);
    return true;
  } catch (error) {
    logger.error('Failed to delete session:', error);
    return false;
  }
}
```

**Called From:**

- ✅ `AuthController.logout()` - User logs out
- ✅ `AuthController.logoutAll()` - User logs out all devices
- ✅ `sessionService.validateRefreshToken()` - On validation failure
- ✅ Admin force logout

---

## 🔄 Complete Flow Diagrams

### Flow 1: Login (Save Refresh Token)

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ POST /api/auth/login {userId, password}
     │
┌────▼────────────────────────────────────┐
│ AuthController.login()                  │
│                                         │
│ 1. Validate credentials                │
│ 2. Generate tokens:                    │
│    - sessionId = createSessionId()     │
│    - refreshToken = createRefreshToken()│  ← Generate refresh token
│    - accessToken = createAccessToken() │
└────┬────────────────────────────────────┘
     │
     │ sessionService.createSession(sessionId, userId, refreshToken, ...)
     │
┌────▼────────────────────────────────────┐
│ SessionService.createSession()          │
│                                         │
│ 1. Hash refresh token:                 │
│    refreshTokenHash = hash(refreshToken)│  ← Hash it!
│                                         │
│ 2. Save to Redis:                      │
│    redisClient.set(                        │
│      "session:abc123",                 │
│      {                                 │
│        userId: "user123",              │
│        refreshTokenHash: "9f86d08..." │  ← SAVED HERE!
│      }                                 │
│    )                                   │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Redis Database                          │
│                                         │
│ session:abc123 → {                     │
│   userId: "user123",                   │
│   refreshTokenHash: "9f86d08...",     │  ✅ STORED!
│   createdAt: 1234567890                │
│ }                                       │
└─────────────────────────────────────────┘
```

### Flow 2: Token Refresh (Check & Update)

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ POST /api/auth/refresh
     │ Cookie: sid=abc123
     │
┌────▼────────────────────────────────────┐
│ AuthController.refresh()                │
│                                         │
│ sessionId = req.cookies.sid            │
└────┬────────────────────────────────────┘
     │
     │ sessionService.getSession(sessionId)
     │
┌────▼────────────────────────────────────┐
│ SessionService.getSession()             │
│                                         │
│ 1. Get from Redis:                     │
│    data = redisClient.get("session:abc123")  │  ← READ from Redis
│                                         │
│ 2. Return: {                           │
│      userId: "user123",                │
│      refreshTokenHash: "9f86d08..."   │  ✅ RETRIEVED!
│    }                                   │
└────┬────────────────────────────────────┘
     │
     ▼ session data returned
     │
┌────▼────────────────────────────────────┐
│ AuthController.refresh()                │
│                                         │
│ 1. Generate new tokens:                │
│    newRefreshToken = createRefreshToken()│  ← New refresh token
│    newAccessToken = createAccessToken() │
│                                         │
│ 2. Rotate in Redis:                    │
└────┬────────────────────────────────────┘
     │
     │ sessionService.updateSession(sessionId, newRefreshToken, session)
     │
┌────▼────────────────────────────────────┐
│ SessionService.updateSession()          │
│                                         │
│ 1. Hash new refresh token:             │
│    newHash = hash(newRefreshToken)     │  ← Hash new token
│                                         │
│ 2. Update in Redis:                    │
│    redisClient.set(                        │
│      "session:abc123",                 │
│      {                                 │
│        userId: "user123",              │
│        refreshTokenHash: newHash      │  ✅ UPDATED!
│      }                                 │
│    )                                   │
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Redis Database                          │
│                                         │
│ session:abc123 → {                     │
│   userId: "user123",                   │
│   refreshTokenHash: "NEW_HASH_xyz",   │  ✅ ROTATED!
│   updatedAt: 1234567899                │
│ }                                       │
│                                         │
│ Old hash is gone → Old token invalid   │
└─────────────────────────────────────────┘
```

### Flow 3: Logout (Delete Refresh Token)

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ POST /api/auth/logout
     │ Cookie: sid=abc123
     │
┌────▼────────────────────────────────────┐
│ AuthController.logout()                 │
│                                         │
│ sessionId = req.cookies.sid            │
└────┬────────────────────────────────────┘
     │
     │ sessionService.deleteSession(sessionId)
     │
┌────▼────────────────────────────────────┐
│ SessionService.deleteSession()          │
│                                         │
│ 1. Get session first:                  │
│    session = getSession(sessionId)     │
│                                         │
│ 2. Remove from user's set:             │
│    redis.sRem("user_sessions:user123", │
│               sessionId)                │
│                                         │
│ 3. Delete session:                     │
│    redisClient.del("session:abc123")        │  ✅ DELETED!
└────┬────────────────────────────────────┘
     │
     ▼
┌─────────────────────────────────────────┐
│ Redis Database                          │
│                                         │
│ session:abc123 → DELETED               │  🗑️ GONE!
│                                         │
│ Refresh token is now completely removed│
└─────────────────────────────────────────┘
```

---

## 🔍 How to Check Redis Data Manually

### Using Redis CLI

```bash
# Connect to Redis
redis-cli

# View all sessions
KEYS session:*

# Get specific session
GET session:abc123

# View user's sessions
SMEMBERS user_sessions:user123

# Check TTL (time to live)
TTL session:abc123

# View session data (formatted)
GET session:abc123 | python -m json.tool
```

### Example Output

```bash
$ redis-cli GET session:abc123
"{\"userId\":\"user123\",\"refreshTokenHash\":\"9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08\",\"createdAt\":1234567890,\"userAgent\":\"Mozilla/5.0...\",\"ipAddress\":\"192.168.1.1\"}"

$ redis-cli TTL session:abc123
2591999  # Seconds remaining (29.9 days)

$ redis-cli SMEMBERS user_sessions:user123
1) "abc123"
2) "def456"
3) "ghi789"
```

---

## 🧪 Testing the Flow

### Test 1: Verify Token is Saved on Login

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "testuser"}' \
  -c cookies.txt

# Check Redis
redis-cli KEYS "session:*"
redis-cli GET "session:xxx"  # Use actual session ID from cookie
```

**Expected:** You should see `refreshTokenHash` in the session data

### Test 2: Verify Token is Rotated on Refresh

```bash
# Get initial hash
INITIAL_HASH=$(redis-cli GET session:xxx | jq -r '.refreshTokenHash')
echo "Initial: $INITIAL_HASH"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt

# Get new hash
NEW_HASH=$(redis-cli GET session:xxx | jq -r '.refreshTokenHash')
echo "New: $NEW_HASH"

# Compare
if [ "$INITIAL_HASH" != "$NEW_HASH" ]; then
  echo "✅ Token rotated successfully!"
else
  echo "❌ Token was NOT rotated"
fi
```

### Test 3: Verify Token is Deleted on Logout

```bash
# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt

# Check Redis
redis-cli EXISTS session:xxx

# Expected output: (integer) 0  (means deleted)
```

---

## 📊 Redis Data Structure Summary

```
┌─────────────────────────────────────────────────────────────┐
│                     REDIS DATABASE                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ SESSION STORAGE (Refresh Token Hash):                      │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Key: session:abc123                                 │   │
│ │ Type: String                                        │   │
│ │ TTL: 2592000 seconds (30 days)                     │   │
│ │                                                     │   │
│ │ Value: {                                           │   │
│ │   "userId": "user123",                            │   │
│ │   "refreshTokenHash": "9f86d081...",  ← HERE!     │   │
│ │   "createdAt": 1234567890,                        │   │
│ │   "updatedAt": 1234567890,                        │   │
│ │   "userAgent": "Mozilla/5.0...",                  │   │
│ │   "ipAddress": "192.168.1.1",                     │   │
│ │   "deviceFingerprint": "def456..."                │   │
│ │ }                                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ USER SESSIONS INDEX:                                        │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Key: user_sessions:user123                         │   │
│ │ Type: Set                                           │   │
│ │ TTL: 2592000 seconds                               │   │
│ │                                                     │   │
│ │ Members: [                                         │   │
│ │   "abc123",                                        │   │
│ │   "def456",                                        │   │
│ │   "ghi789"                                         │   │
│ │ ]                                                  │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 Security Notes

### Why Hash the Refresh Token?

```javascript
// ❌ DON'T STORE PLAIN TEXT
session:abc123 → {
  refreshToken: "plain_token_123"  // Anyone with Redis access can steal!
}

// ✅ DO STORE HASH
session:abc123 → {
  refreshTokenHash: "9f86d081..."  // Useless even if stolen
}
```

**Benefits:**

1. Even if Redis is compromised, attacker can't use the hash
2. Follows principle of least privilege
3. Matches password hashing best practices

### Why Rotate on Every Refresh?

```javascript
// Without rotation
Time T0: refreshToken = "abc123"
Time T1: refreshToken = "abc123"  // Same token
Time T2: refreshToken = "abc123"  // Still same!

// If stolen at T0, attacker has access until T2 (weeks!)

// With rotation
Time T0: refreshToken = "abc123"
Time T1: refreshToken = "xyz789"  // New token
Time T2: refreshToken = "qwe456"  // New again!

// If stolen at T0, only valid until T1 (minutes!)
```

**Benefits:**

1. Limits damage if token is stolen
2. Detects token reuse (possible attack)
3. Industry best practice

---

## 🎯 Quick Checklist

To verify refresh tokens are working correctly:

- [ ] **Login**: Check `session:*` key exists in Redis
- [ ] **Login**: Verify `refreshTokenHash` field is present
- [ ] **Login**: Confirm hash is 64 characters (SHA-256)
- [ ] **Refresh**: Verify hash changes after refresh
- [ ] **Refresh**: Confirm old token is now invalid
- [ ] **Logout**: Verify `session:*` key is deleted
- [ ] **Logout**: Confirm token can't be used anymore

---

## 📝 Summary

**Refresh tokens in Redis are:**

1. **Saved** during login → `sessionService.createSession()`
2. **Checked** during refresh → `sessionService.validateRefreshToken()` _(old way)_ or `sessionService.getSession()` _(secure way)_
3. **Updated** during refresh → `sessionService.updateSession()`
4. **Deleted** during logout → `sessionService.deleteSession()`

**All operations happen in:** `services/sessionService.js`

**Stored as:** SHA-256 hash in Redis key `session:{sessionId}`

**TTL:** 30 days (configurable)

**Security:** Hashed, rotated, and httpOnly cookie protected
