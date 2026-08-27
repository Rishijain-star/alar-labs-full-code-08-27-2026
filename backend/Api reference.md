# 📖 API Reference

Complete API documentation for the authentication system.

Base URL: `/api/auth`

---

## Table of Contents

1. [Public Endpoints](#public-endpoints)
   - [Register](#1-register)
   - [Verify Registration](#2-verify-registration)
   - [Login](#3-login)
   - [Verify MFA (Login)](#4-verify-mfa-login)
   - [Verify Device](#5-verify-device)
   - [Resend OTP](#6-resend-otp)
   - [Forgot Password](#7-forgot-password)
   - [Verify Reset OTP](#8-verify-reset-otp)
   - [Reset Password](#9-reset-password)
   - [Refresh Token](#10-refresh-token)
   - [Validate Session](#11-validate-session)
   - [Logout](#12-logout)

2. [Protected Endpoints](#protected-endpoints)
   - [Enable MFA Start](#13-enable-mfa-start)
   - [Enable MFA Complete](#14-enable-mfa-complete)
   - [Disable MFA](#15-disable-mfa)
   - [Get MFA Status](#16-get-mfa-status)
   - [Regenerate Backup Codes](#17-regenerate-backup-codes)
   - [Change Password](#18-change-password)
   - [Logout All](#19-logout-all)
   - [Get Sessions](#20-get-sessions)
   - [Delete Session](#21-delete-session)
   - [Get Current User](#22-get-current-user)

---

## Public Endpoints

### 1. Register

Register a new user account.

**Endpoint:** `POST /api/auth/register`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**

```json
{
  "email": "user@example.com",
  "phone": "+1234567890",
  "password": "SecurePass123!",
  "fullName": "John Doe",
  "verificationType": "email"
}
```

| Field            | Type   | Required    | Description                                 |
| ---------------- | ------ | ----------- | ------------------------------------------- |
| email            | string | Conditional | User email (required if phone not provided) |
| phone            | string | Conditional | User phone (required if email not provided) |
| password         | string | Yes         | User password (min 8 characters)            |
| fullName         | string | No          | User's full name                            |
| verificationType | string | No          | "email" or "phone" (default: "email")       |

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "OTP sent to your email",
  "data": {
    "otpToken": "abc123...",
    "expiresIn": 300
  }
}
```

**Error Responses:**

- `400 Bad Request` - Missing fields or validation error
  ```json
  {
    "success": false,
    "error": "Email or phone is required",
    "code": "MISSING_CONTACT"
  }
  ```
- `400 Bad Request` - Email already exists
  ```json
  {
    "success": false,
    "error": "Email already registered",
    "code": "EMAIL_EXISTS"
  }
  ```

---

### 2. Verify Registration

Verify OTP sent during registration.

**Endpoint:** `POST /api/auth/register/verify`

**Rate Limit:** 3 requests per 5 minutes

**Request Body:**

```json
{
  "otpToken": "abc123...",
  "otp": "123456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Registration successful. You can now login.",
  "data": {
    "userId": "user_abc123"
  }
}
```

**Error Responses:**

- `400 Bad Request` - Invalid or expired OTP
- `400 Bad Request` - Session expired

---

### 3. Login

Login with email/password. Returns either session tokens or MFA challenge.

**Endpoint:** `POST /api/auth/login`

**Rate Limit:** 5 requests per 15 minutes

**Request Body:**

```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "deviceInfo": {
    "deviceName": "iPhone 13",
    "platform": "iOS",
    "browser": "Safari"
  },
  "rememberMe": true
}
```

**Success Response (No MFA):** `200 OK`

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
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

**Success Response (MFA Required):** `200 OK`

```json
{
  "success": true,
  "requiresMfa": true,
  "data": {
    "mfaToken": "mfa_abc123...",
    "message": "Please enter your authenticator code"
  }
}
```

**Success Response (Device Verification Required):** `200 OK`

```json
{
  "success": true,
  "requiresDeviceVerification": true,
  "data": {
    "otpToken": "otp_abc123...",
    "deviceFingerprint": "fp_abc123",
    "message": "New device detected. Please verify with OTP."
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid credentials
- `403 Forbidden` - Account not verified
- `403 Forbidden` - IP blocked

---

### 4. Verify MFA (Login)

Verify MFA code after login.

**Endpoint:** `POST /api/auth/mfa/verify`

**Rate Limit:** 5 requests per 5 minutes

**Request Body:**

```json
{
  "mfaToken": "mfa_abc123...",
  "code": "123456",
  "deviceInfo": {
    "deviceName": "iPhone 13",
    "platform": "iOS"
  },
  "rememberMe": true
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "MFA verification successful",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "tokenType": "Bearer",
    "expiresIn": 300,
    "sessionId": "sess_abc123",
    "user": {
      "userId": "user_123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "mfaEnabled": true
    }
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid MFA code
- `400 Bad Request` - MFA token expired

---

### 5. Verify Device

Verify new device with OTP.

**Endpoint:** `POST /api/auth/device/verify`

**Rate Limit:** 3 requests per 5 minutes

**Request Body:**

```json
{
  "otpToken": "otp_abc123...",
  "otp": "123456",
  "deviceInfo": {},
  "rememberMe": true
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Device verified successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "sessionId": "sess_abc123",
    "user": {
      /* user object */
    }
  }
}
```

---

### 6. Resend OTP

Resend OTP for any verification process.

**Endpoint:** `POST /api/auth/otp/resend`

**Rate Limit:** 3 requests per 5 minutes

**Request Body:**

```json
{
  "otpToken": "otp_abc123..."
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "OTP resent successfully",
  "data": {
    "otpToken": "new_otp_abc123...",
    "expiresIn": 300
  }
}
```

**Error Responses:**

- `429 Too Many Requests` - Maximum resend limit reached

---

### 7. Forgot Password

Initiate password reset flow.

**Endpoint:** `POST /api/auth/forgot-password`

**Rate Limit:** 3 requests per 15 minutes

**Request Body:**

```json
{
  "identifier": "user@example.com"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset code sent",
  "data": {
    "otpToken": "otp_abc123...",
    "expiresIn": 300
  }
}
```

---

### 8. Verify Reset OTP

Verify OTP for password reset.

**Endpoint:** `POST /api/auth/forgot-password/verify-otp`

**Rate Limit:** 3 requests per 5 minutes

**Request Body:**

```json
{
  "otpToken": "otp_abc123...",
  "otp": "123456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "OTP verified successfully",
  "data": {
    "resetToken": "reset_abc123...",
    "expiresIn": 900
  }
}
```

---

### 9. Reset Password

Reset password with reset token.

**Endpoint:** `POST /api/auth/reset-password`

**Rate Limit:** 3 requests per 15 minutes

**Request Body:**

```json
{
  "resetToken": "reset_abc123...",
  "newPassword": "NewSecurePass123!"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password reset successfully. Please login with your new password."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid or expired reset token
- `400 Bad Request` - Weak password

---

### 10. Refresh Token

Refresh access token using session.

**Endpoint:** `POST /api/auth/refresh`

**Rate Limit:** 30 requests per 15 minutes

**Request Body (Mobile):**

```json
{
  "sessionId": "sess_abc123"
}
```

**Note:** For web, session cookie is used automatically.

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Token refreshed successfully",
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 300
  }
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid session
- `401 Unauthorized` - Tokens revoked

---

### 11. Validate Session

Check if session is valid.

**Endpoint:** `GET /api/auth/validate`

**Rate Limit:** 60 requests per minute

**Query Parameters:**

- `sessionId` (optional for mobile)

**Success Response:** `200 OK`

```json
{
  "success": true,
  "valid": true,
  "data": {
    "userId": "user_123",
    "sessionId": "sess_abc123"
  }
}
```

---

### 12. Logout

Logout from current session.

**Endpoint:** `POST /api/auth/logout`

**Request Body (Mobile):**

```json
{
  "sessionId": "sess_abc123"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Protected Endpoints

All protected endpoints require authentication via:

- Cookie: Session cookie (web)
- Header: `Authorization: Bearer <access_token>` (mobile/API)

---

### 13. Enable MFA Start

Start MFA setup process - generates QR code and backup codes.

**Endpoint:** `POST /api/auth/mfa/enable/start`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Scan the QR code with your authenticator app",
  "data": {
    "secret": "JBSWY3DPEHPK3PXP",
    "qrCode": "data:image/png;base64,iVBORw0KGgoAAAA...",
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8",
      "I9J0K1L2",
      "M3N4O5P6",
      "Q7R8S9T0",
      "U1V2W3X4",
      "Y5Z6A7B8",
      "C9D0E1F2",
      "G3H4I5J6",
      "K7L8M9N0"
    ]
  }
}
```

**Error Responses:**

- `400 Bad Request` - MFA already enabled
- `401 Unauthorized` - Not authenticated

---

### 14. Enable MFA Complete

Complete MFA setup by verifying TOTP code.

**Endpoint:** `POST /api/auth/mfa/enable/complete`

**Rate Limit:** 5 requests per 5 minutes

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body:**

```json
{
  "code": "123456"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "MFA enabled successfully. Save your backup codes securely."
}
```

**Error Responses:**

- `400 Bad Request` - Invalid verification code
- `401 Unauthorized` - Not authenticated

---

### 15. Disable MFA

Disable MFA (requires password confirmation).

**Endpoint:** `POST /api/auth/mfa/disable`

**Rate Limit:** 3 requests per 15 minutes

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body:**

```json
{
  "password": "CurrentPassword123!"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "MFA disabled successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Invalid password

---

### 16. Get MFA Status

Get current MFA status.

**Endpoint:** `GET /api/auth/mfa/status`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "enabled": true,
    "activatedAt": 1704067200000,
    "backupCodesRemaining": 8
  }
}
```

---

### 17. Regenerate Backup Codes

Generate new backup codes (invalidates old ones).

**Endpoint:** `POST /api/auth/mfa/backup-codes/regenerate`

**Rate Limit:** 3 requests per hour

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Backup codes regenerated successfully",
  "data": {
    "backupCodes": [
      "A1B2C3D4",
      "E5F6G7H8"
      /* ... 8 more codes */
    ]
  }
}
```

**Error Responses:**

- `400 Bad Request` - MFA not enabled

---

### 18. Change Password

Change password for logged-in user.

**Endpoint:** `POST /api/auth/change-password`

**Rate Limit:** 5 requests per 15 minutes

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Request Body:**

```json
{
  "oldPassword": "OldPassword123!",
  "newPassword": "NewPassword123!"
}
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Password changed successfully"
}
```

**Error Responses:**

- `401 Unauthorized` - Incorrect old password
- `400 Bad Request` - Weak password
- `400 Bad Request` - Same as old password

---

### 19. Logout All

Logout from all devices.

**Endpoint:** `POST /api/auth/logout-all`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Logged out from all devices",
  "sessionsTerminated": 3
}
```

---

### 20. Get Sessions

Get all active sessions.

**Endpoint:** `GET /api/auth/sessions`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "sessions": [
      {
        "sessionId": "sess_abc123",
        "isCurrent": true,
        "createdAt": 1704067200000,
        "lastActivity": 1704070800000,
        "ipAddress": "192.168.1.1",
        "userAgent": "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)...",
        "deviceInfo": {
          "deviceName": "iPhone 13",
          "platform": "iOS"
        },
        "isTrusted": true
      },
      {
        "sessionId": "sess_def456",
        "isCurrent": false,
        "createdAt": 1704063600000,
        "lastActivity": 1704067200000,
        "ipAddress": "192.168.1.2",
        "userAgent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
        "deviceInfo": {
          "deviceName": "Chrome",
          "platform": "Windows"
        },
        "isTrusted": false
      }
    ],
    "total": 2
  }
}
```

---

### 21. Delete Session

Delete a specific session.

**Endpoint:** `DELETE /api/auth/sessions/:sessionId`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "message": "Session deleted successfully"
}
```

**Error Responses:**

- `404 Not Found` - Session not found or doesn't belong to user

---

### 22. Get Current User

Get current user information.

**Endpoint:** `GET /api/auth/me`

**Headers:**

```
Authorization: Bearer eyJhbGciOiJIUzI1NiIs...
```

**Success Response:** `200 OK`

```json
{
  "success": true,
  "data": {
    "user": {
      "userId": "user_123",
      "email": "user@example.com",
      "fullName": "John Doe",
      "mfaEnabled": true,
      "backupCodesRemaining": 8,
      "isVerified": true,
      "isActive": true
    }
  }
}
```

---

## Error Handling

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

### Common Error Codes

| Code                   | HTTP Status | Description                         |
| ---------------------- | ----------- | ----------------------------------- |
| `MISSING_FIELDS`       | 400         | Required fields missing             |
| `INVALID_CREDENTIALS`  | 401         | Wrong email/password                |
| `INVALID_OTP`          | 400         | Wrong OTP code                      |
| `INVALID_MFA_CODE`     | 401         | Wrong MFA code                      |
| `SESSION_EXPIRED`      | 401         | Session has expired                 |
| `INVALID_SESSION`      | 401         | Session not found                   |
| `TOKENS_REVOKED`       | 401         | All tokens have been revoked        |
| `RATE_LIMIT_EXCEEDED`  | 429         | Too many requests                   |
| `IP_BLOCKED`           | 403         | Access from IP not allowed          |
| `ACCOUNT_DISABLED`     | 403         | Account has been disabled           |
| `ACCOUNT_NOT_VERIFIED` | 403         | Email not verified                  |
| `MFA_ALREADY_ENABLED`  | 400         | MFA is already enabled              |
| `WEAK_PASSWORD`        | 400         | Password does not meet requirements |
| `USER_EXISTS`          | 400         | User already exists                 |
| `EMAIL_EXISTS`         | 400         | Email already registered            |

---

## Rate Limiting

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 2024-01-01T12:00:00.000Z
```

When rate limit is exceeded:

```json
{
  "error": "Too many requests",
  "code": "RATE_LIMIT_EXCEEDED",
  "retryAfter": 300,
  "limit": 5,
  "resetAt": 1704067200000
}
```

---

## Authentication

### Web Applications

Use cookies for session management. Include `credentials: 'include'` in fetch requests:

```javascript
fetch("/api/auth/login", {
  method: "POST",
  credentials: "include",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
```

### Mobile/API Applications

Use `Authorization` header with access token:

```javascript
fetch("/api/auth/me", {
  headers: {
    Authorization: `Bearer ${accessToken}`,
  },
});
```

---

## Changelog

### v1.0.0 (2024-01-01)

- Initial release
- Registration with OTP verification
- Login with optional MFA
- Device fingerprinting
- Session management
- Password reset flow
