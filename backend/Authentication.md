# Authentication System - Complete Flow Documentation

## Overview

This is a production-ready authentication system with:
- Email/Phone registration with OTP verification
- Login with optional MFA (TOTP)
- Device fingerprinting and verification
- Session management
- Password reset flow
- Comprehensive security features

---

## 🔐 Complete Authentication Flows

### 1. REGISTRATION FLOW

```
User                    Frontend                Backend                     Redis
 |                         |                       |                           |
 |--- Enter Details -----> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /register ---> |                           |
 |                         |  {email, password}    |                           |
 |                         |                       |                           |
 |                         |                       |-- Check if exists ------> |
 |                         |                       |                           |
 |                         |                       |-- Generate OTP ---------> |
 |                         |                       |  Store pending user       |
 |                         |                       |                           |
 |                         | <-- { otpToken } ---- |                           |
 |                         |                       |                           |
 | <-- Enter OTP --------- |                       |                           |
 |                         |                       |                           |
 |--- Enter OTP ---------> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /register/     |                           |
 |                         |  verify               |                           |
 |                         |  {otpToken, otp}      |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify OTP -----------> |
 |                         |                       |  Get pending user         |
 |                         |                       |                           |
 |                         |                       |-- Create User in DB       |
 |                         |                       |                           |
 |                         | <-- Success --------- |                           |
 | <-- Registration        |                       |                           |
 |     Complete            |                       |                           |
```

**API Endpoints:**
1. `POST /api/auth/register`
2. `POST /api/auth/register/verify`

---

### 2. LOGIN FLOW (Without MFA)

```
User                    Frontend                Backend                     Redis
 |                         |                       |                           |
 |--- Enter Credentials -> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /login ------> |                           |
 |                         |  {email, password}    |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify credentials      |
 |                         |                       |  Check IP whitelist       |
 |                         |                       |  Check MFA status ------> |
 |                         |                       |  (MFA disabled)           |
 |                         |                       |                           |
 |                         |                       |-- Create Session -------> |
 |                         |                       |  Store refresh token      |
 |                         |                       |                           |
 |                         | <-- { accessToken, ---|                           |
 |                         |      sessionId }      |                           |
 | <-- Login Success ----- |                       |                           |
```

**API Endpoint:**
- `POST /api/auth/login`

**Response:**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "tokenType": "Bearer",
    "expiresIn": 300,
    "sessionId": "sess_abc123",
    "user": {
      "userId": "user_123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "mfaEnabled": false
    }
  }
}
```

---

### 3. LOGIN FLOW (With MFA Enabled)

```
User                    Frontend                Backend                     Redis
 |                         |                       |                           |
 |--- Enter Credentials -> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /login ------> |                           |
 |                         |  {email, password}    |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify credentials      |
 |                         |                       |  Check MFA status ------> |
 |                         |                       |  (MFA enabled!)           |
 |                         |                       |                           |
 |                         |                       |-- Generate MFA token ---> |
 |                         |                       |  Store challenge          |
 |                         |                       |                           |
 |                         | <-- { requiresMfa: ---|                           |
 |                         |      true,            |                           |
 |                         |      mfaToken }       |                           |
 |                         |                       |                           |
 | <-- Enter MFA Code ---- |                       |                           |
 |                         |                       |                           |
 |--- Enter Code --------> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /mfa/verify -> |                           |
 |                         |  {mfaToken, code}     |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify TOTP Code -----> |
 |                         |                       |  Get challenge            |
 |                         |                       |  Verify against secret    |
 |                         |                       |                           |
 |                         |                       |-- Create Session -------> |
 |                         |                       |  Store refresh token      |
 |                         |                       |                           |
 |                         | <-- { accessToken, ---|                           |
 |                         |      sessionId }      |                           |
 | <-- Login Success ----- |                       |                           |
```

**API Endpoints:**
1. `POST /api/auth/login` → Returns `{ requiresMfa: true, mfaToken }`
2. `POST /api/auth/mfa/verify` → Returns `{ accessToken, sessionId }`

---

### 4. ENABLE MFA FLOW

```
User (Logged In)        Frontend                Backend                     Redis
 |                         |                       |                           |
 | <-- Want to Enable      |                       |                           |
 |     MFA                 |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /mfa/enable/   |                           |
 |                         |  start                |                           |
 |                         |  [Auth Header]        |                           |
 |                         |                       |                           |
 |                         |                       |-- Generate Secret ------> |
 |                         |                       |  Generate QR Code         |
 |                         |                       |  Generate Backup Codes    |
 |                         |                       |  Store temporarily        |
 |                         |                       |                           |
 |                         | <-- { qrCode,      ---|                           |
 |                         |      secret,          |                           |
 |                         |      backupCodes }    |                           |
 |                         |                       |                           |
 | <-- Scan QR Code &      |                       |                           |
 |     Save Backup Codes   |                       |                           |
 |                         |                       |                           |
 |--- Enter Code from      |                       |                           |
 |    Authenticator App -> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /mfa/enable/   |                           |
 |                         |  complete             |                           |
 |                         |  {code}               |                           |
 |                         |  [Auth Header]        |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify Code ----------> |
 |                         |                       |  Get temp setup data      |
 |                         |                       |  Verify TOTP              |
 |                         |                       |                           |
 |                         |                       |-- Activate MFA ---------> |
 |                         |                       |  Move to permanent        |
 |                         |                       |  Update user DB           |
 |                         |                       |                           |
 |                         | <-- Success --------- |                           |
 | <-- MFA Enabled --------|                       |                           |
```

**API Endpoints:**
1. `POST /api/auth/mfa/enable/start` (Protected)
2. `POST /api/auth/mfa/enable/complete` (Protected)

---

### 5. FORGOT PASSWORD FLOW

```
User                    Frontend                Backend                     Redis
 |                         |                       |                           |
 |--- Forgot Password ---> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /forgot-    -> |                           |
 |                         |  password             |                           |
 |                         |  {identifier}         |                           |
 |                         |                       |                           |
 |                         |                       |-- Find User               |
 |                         |                       |  Generate OTP ----------> |
 |                         |                       |  Send Email/SMS           |
 |                         |                       |                           |
 |                         | <-- { otpToken } ---- |                           |
 |                         |                       |                           |
 | <-- Enter OTP --------- |                       |                           |
 |                         |                       |                           |
 |--- Enter OTP ---------> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /forgot-       |                           |
 |                         |  password/verify-otp  |                           |
 |                         |  {otpToken, otp}      |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify OTP -----------> |
 |                         |                       |  Generate reset token     |
 |                         |                       |                           |
 |                         | <-- { resetToken } ---|                           |
 |                         |                       |                           |
 | <-- Enter New Pass. --- |                       |                           |
 |                         |                       |                           |
 |--- Enter Password ----> |                       |                           |
 |                         |                       |                           |
 |                         |-- POST /reset-     -> |                           |
 |                         |  password             |                           |
 |                         |  {resetToken,         |                           |
 |                         |   newPassword}        |                           |
 |                         |                       |                           |
 |                         |                       |-- Verify reset token ---> |
 |                         |                       |  Update password          |
 |                         |                       |  Logout all sessions      |
 |                         |                       |                           |
 |                         | <-- Success --------- |                           |
 | <-- Password Reset ---- |                       |                           |
```

**API Endpoints:**
1. `POST /api/auth/forgot-password`
2. `POST /api/auth/forgot-password/verify-otp`
3. `POST /api/auth/reset-password`

---

## 📱 Session Management

### Session Structure in Redis

```javascript
{
  userId: "user_123",
  refreshTokenHash: "hashed_refresh_token",
  createdAt: 1704067200000,
  updatedAt: 1704067200000,
  userAgent: "Mozilla/5.0...",
  ipAddress: "192.168.1.1",
  deviceInfo: { /* device details */ },
  deviceFingerprint: "fp_abc123",
  isTrusted: false,
  mfaVerified: true,
  rememberMe: false
}
```

### Token Refresh Flow

```
Client                  Backend                     Redis
 |                         |                           |
 |-- POST /refresh ------> |                           |
 |  [Session Cookie]       |                           |
 |                         |                           |
 |                         |-- Get Session ----------> |
 |                         |  Validate refresh token   |
 |                         |  Check blacklist          |
 |                         |                           |
 |                         |-- Generate new tokens     |
 |                         |  Rotate refresh token --> |
 |                         |                           |
 | <-- { accessToken } --- |                           |
```

---

## 🔑 Key Features

### 1. **MFA Support**
- TOTP (Time-based One-Time Password)
- QR code generation for authenticator apps
- Backup codes (10 codes)
- Optional MFA per user

### 2. **Device Fingerprinting**
- Based on User-Agent, IP, and device info
- Trust devices with "Remember Me"
- New device verification via OTP

### 3. **IP Whitelisting**
- Optional IP-based access control
- Configurable per user

### 4. **Session Management**
- Redis-based session storage
- Multiple active sessions
- Session listing and revocation
- "Logout All Devices" functionality

### 5. **Security**
- Rate limiting on all endpoints
- Password hashing (bcrypt)
- Refresh token rotation
- Token blacklisting
- Audit logging

---

## 📊 Redis Data Structure

```
Keys Used:
- session:{sessionId}                    → Session data
- user_sessions:{userId}                 → Set of session IDs
- mfa:{userId}                          → MFA configuration
- mfa_challenge:{mfaToken}              → Temporary MFA challenge
- mfa_setup:{userId}                    → Temporary MFA setup data
- pending_user:{otpToken}               → Pending registration
- reset_token:{resetToken}              → Password reset token
- otp:{otpToken}                        → OTP data
- token_blacklist:{token}               → Blacklisted tokens
- user_token_blacklist:{userId}         → User-level blacklist
- rate:{key}                            → Rate limiting counters
```

---

## 🚀 Usage Examples

### Register a New User

```javascript
// Step 1: Register
const response1 = await fetch('/api/auth/register', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    fullName: 'John Doe',
    verificationType: 'email'
  })
});
const { otpToken } = await response1.json();

// Step 2: Verify OTP
const response2 = await fetch('/api/auth/register/verify', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    otpToken,
    otp: '123456'
  })
});
```

### Login Without MFA

```javascript
const response = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include', // Important for cookies
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!',
    rememberMe: true
  })
});

const { data } = await response.json();
// data.accessToken → Use in Authorization header
// Session cookie automatically set
```

### Login With MFA

```javascript
// Step 1: Login
const response1 = await fetch('/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'user@example.com',
    password: 'SecurePass123!'
  })
});

const result1 = await response1.json();

if (result1.requiresMfa) {
  // Step 2: Verify MFA
  const response2 = await fetch('/api/auth/mfa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      mfaToken: result1.data.mfaToken,
      code: '123456' // From authenticator app
    })
  });
  
  const result2 = await response2.json();
  // result2.data.accessToken
}
```

### Enable MFA

```javascript
// Step 1: Start MFA setup
const response1 = await fetch('/api/auth/mfa/enable/start', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});

const { data } = await response1.json();
// data.qrCode → Display to user
// data.backupCodes → Show and ask user to save

// Step 2: Verify and activate
const response2 = await fetch('/api/auth/mfa/enable/complete', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    code: '123456' // From authenticator app
  })
});
```

---

## ⚙️ Configuration

```javascript
// config.js
module.exports = {
  session: {
    cookieName: 'sid',
    ttl: 24 * 60 * 60, // 24 hours
    extendedTtl: 30 * 24 * 60 * 60, // 30 days (remember me)
    cookieOptions: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    }
  },
  security: {
    requireDeviceVerification: true,
    allowedOrigins: ['http://localhost:3000']
  }
};
```

---

## 🔒 Security Best Practices

1. **Always use HTTPS in production**
2. **Store backup codes securely** (encrypted in DB)
3. **Implement rate limiting** (already included)
4. **Use secure cookie settings** (httpOnly, secure, sameSite)
5. **Rotate refresh tokens** (automatic on refresh)
6. **Monitor failed login attempts**
7. **Implement CSRF protection** if needed
8. **Use environment variables** for secrets

---

## 📝 Error Codes

| Code | Description |
|------|-------------|
| `USER_EXISTS` | User already registered |
| `EMAIL_EXISTS` | Email already in use |
| `INVALID_CREDENTIALS` | Wrong email/password |
| `ACCOUNT_NOT_VERIFIED` | Email not verified |
| `INVALID_OTP` | Wrong OTP code |
| `INVALID_MFA_CODE` | Wrong MFA code |
| `MFA_ALREADY_ENABLED` | MFA is already enabled |
| `SESSION_EXPIRED` | Session has expired |
| `INVALID_SESSION` | Session not found |
| `RATE_LIMIT_EXCEEDED` | Too many requests |

---

## 🧪 Testing

```javascript
// Example test
describe('Authentication Flow', () => {
  it('should register and login user', async () => {
    // 1. Register
    const regRes = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
        fullName: 'Test User'
      });
    
    expect(regRes.status).toBe(200);
    const { otpToken } = regRes.body.data;
    
    // 2. Verify (mock OTP in test)
    const verifyRes = await request(app)
      .post('/api/auth/register/verify')
      .send({ otpToken, otp: '123456' });
    
    expect(verifyRes.status).toBe(200);
    
    // 3. Login
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!'
      });
    
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data).toHaveProperty('accessToken');
  });
});
```

---

## 📦 Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.0",
    "bcryptjs": "^2.4.3",
    "speakeasy": "^2.0.0",
    "qrcode": "^1.5.0",
    "redis": "^4.6.0",
    "jsonwebtoken": "^9.0.0"
  }
}
```

---

## 🎯 Next Steps

1. Implement email/SMS services (currently mocked)
2. Add WebAuthn/Passkey support
3. Implement social OAuth (Google, GitHub, etc.)
4. Add biometric authentication
5. Implement account recovery questions
6. Add IP geolocation blocking
7. Implement anomaly detection

---

## 📞 Support

For issues or questions, please refer to the API documentation or contact the development team.