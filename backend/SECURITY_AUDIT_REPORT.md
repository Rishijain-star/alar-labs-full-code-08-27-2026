# 🔒 Security Audit Report - Authentication & RBAC System

**Date:** 2026-02-26
**Status:** ⚠️ CRITICAL ISSUES FOUND
**Recommendation:** Address critical issues before production

---

## 📋 Executive Summary

Your auth system has a **solid foundation** with MFA, device verification, and session management. However, **3 critical security issues** must be fixed immediately.

---

## 🔴 CRITICAL ISSUES (Must Fix)

### 1. **Password NOT Being Hashed During Registration**
**File:** `src/services/authService.js:106`
**Severity:** 🔴 CRITICAL
**Issue:**
```javascript
const passwordHash = await password;  // ❌ NOT HASHING!
```

**What's wrong:**
- Password is NOT being hashed
- Plain text password stored in `pendingUser` object
- When user account created, plain password goes to database
- Anyone with DB access can read passwords

**Fix:**
```javascript
const passwordHash = await hashPassword(password);  // ✅ HASH IT
```

**Impact:** Password reset required for all users after fix

---

### 2. **Weak Password Requirements**
**File:** `src/controllers/authController.js:27`
**Severity:** 🔴 CRITICAL
**Issue:**
```javascript
password: 'nullable|string|minLength:8,maxLength:36',
```

**What's wrong:**
- Only 8 characters minimum (should be 12+)
- No complexity check (uppercase, lowercase, numbers, symbols)
- Users can register with weak passwords like `password123`

**Fix:**
```javascript
password: 'required|string|minLength:12|maxLength:36',
// Add backend validation for complexity
```

Then in authService.js, before hashing:
```javascript
const { validatePasswordStrength } = require('../validators/authValidators');
const validation = validatePasswordStrength(password);
if (!validation.isValid) {
  throw new AppError('Password does not meet requirements', 400, 'WEAK_PASSWORD');
}
```

---

### 3. **Variable Shadowing - isTrustedDevice**
**File:** `src/services/authService.js:301, 317`
**Severity:** 🔴 HIGH
**Issue:**
```javascript
let isTrustedDevice = false              // Line 301
...
const isTrustedDevice = await deviceService.isTrusted(...)  // Line 317 - creates shadow
```

**What's wrong:**
- Inner `const` shadows the outer `let`
- Device trust status might not be properly tracked
- Line 357 uses outer variable which is always `false`

**Fix:**
```javascript
// Line 317 - remove const, use assignment
isTrustedDevice = await deviceService.isTrusted(user.user_id, deviceFingerprint);
```

---

## 🟡 HIGH PRIORITY ISSUES

### 4. **Failed Login Attempts Not Properly Enforced**
**File:** `src/services/authService.js:268, 404-409`
**Severity:** 🟡 HIGH
**Issue:**
```javascript
if (user.isLocked && user.isLocked()) {  // Method call issue
  throw new AppError('Account is locked...', 403, 'ACCOUNT_LOCKED');
}
```

**Problem:**
- `isLocked` is checked as both property AND method
- Not preventing brute force attacks effectively
- User can retry forever without rate limiting

**Fix:**
Apply rate limiting middleware to login endpoint:
```javascript
// In src/routes/auth.js
const { loginAttemptRateLimit } = require('../middleware/userRateLimit');

router.post('/login', loginAttemptRateLimit(), authController.login);
```

Then clear failed attempts on success:
```javascript
// After successful login in authService.js
const { clearLoginAttempts } = require('../middleware/userRateLimit');
await clearLoginAttempts(email, ipAddress);
```

---

### 5. **OTP Token Mutation in Controller**
**File:** `src/controllers/authController.js:83-87`
**Severity:** 🟡 MEDIUM
**Issue:**
```javascript
const { otpToken, otp } = req.body;
const ip = getClientIP(req);
const location = getLocationFromIP(ip);
otpToken.location = location  // ❌ Mutating input param
otpToken.country = location.country;  // ❌ Mutation
```

**Problem:**
- Modifying request body object
- Could cause issues with OTP validation
- Data not properly passed to service

**Fix:**
```javascript
const { otpToken, otp } = req.body;
const ip = getClientIP(req);
const location = getLocationFromIP(ip);

// Pass as separate parameter or create new object
const result = await authService.verifyRegistrationOtp(otpToken, otp, {
  location,
  ip,
  country: location.country,
  state: location.state,
  city: location.city,
});
```

---

## 🟠 MEDIUM PRIORITY ISSUES

### 6. **Missing Input Sanitization on Email**
**File:** `src/controllers/authController.js:124`
**Severity:** 🟠 MEDIUM
**Issue:**
```javascript
const { email, password, deviceInfo, rememberMe } = req.body;
// Email not normalized
```

**Fix:**
```javascript
const email = req.body.email?.toLowerCase().trim();
if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
  throw new AppError('Invalid email format', 400, 'INVALID_EMAIL');
}
```

---

### 7. **No Rate Limiting on Endpoints**
**File:** All auth routes
**Severity:** 🟠 MEDIUM
**Issue:**
- Register endpoint: No rate limit (account enumeration possible)
- Verify OTP endpoint: No rate limit (OTP brute force)
- Login endpoint: No per-user rate limit

**Fix:**
```javascript
// In src/routes/auth.js
const { rateLimitByIP, loginAttemptRateLimit } = require('../middleware/userRateLimit');

router.post('/register', rateLimitByIP({ limit: 5 }), authController.register);
router.post('/auth/register/verify', rateLimitByIP({ limit: 10 }), authController.verifyRegistration);
router.post('/login', loginAttemptRateLimit(), authController.login);
```

---

### 8. **Missing RBAC on Sensitive Endpoints**
**File:** Controllers for courses, labs, certifications
**Severity:** 🟠 MEDIUM
**Issue:**
- Update/delete endpoints might not check resource ownership
- No permission checks on sensitive operations

**Recommended:**
```javascript
// In route definition:
router.put('/courses/:courseId',
  authenticate,
  checkResourcePermission('course', 'update', 'courseId'),
  courseController.updateCourse
);
```

---

## 🟢 GOOD SECURITY PRACTICES (KEEP)

✅ Password hashing hooks in User model (line 488-499)
✅ MFA support with TOTP + backup codes
✅ Device fingerprinting for trust
✅ Session management with Redis
✅ Audit logging for all auth actions
✅ Account lockout mechanism
✅ OTP-based device verification
✅ Token blacklisting support
✅ Soft delete on users

---

## 📊 Priority Fix Order

| # | Issue | Severity | Time | Impact |
|---|-------|----------|------|--------|
| 1 | Password not hashed (Issue #1) | 🔴 CRITICAL | 5 min | IMMEDIATE |
| 2 | Weak password requirements (Issue #2) | 🔴 CRITICAL | 10 min | HIGH |
| 3 | Variable shadowing (Issue #3) | 🔴 CRITICAL | 5 min | HIGH |
| 4 | Rate limiting on login (Issue #4) | 🟡 HIGH | 15 min | HIGH |
| 5 | OTP token mutation (Issue #5) | 🟡 HIGH | 10 min | MEDIUM |
| 6 | Email sanitization (Issue #6) | 🟠 MEDIUM | 5 min | MEDIUM |
| 7 | Rate limiting setup (Issue #7) | 🟠 MEDIUM | 20 min | MEDIUM |
| 8 | RBAC on endpoints (Issue #8) | 🟠 MEDIUM | 30 min | MEDIUM |

**Total time to fix critical issues: ~20 minutes**

---

## 🔐 RBAC Assessment

### Current RBAC Implementation ✅ GOOD

**Strengths:**
- Role-permission mapping via `role_permissions` table
- Role hierarchy with priority field
- Redis caching for fast permission lookups
- Token blacklisting when permissions change
- Multiple permission checks available

**Improvements Made (Optional):**
- Added resource-specific permissions (`resource_type`, `resource_id`)
- Added attribute-based conditions for dynamic access
- Added resource permission middleware

**To maintain current logic, NO RBAC CHANGES NEEDED**

---

## Summary of Required Changes

### Minimum Essential Changes (For Security):
1. Fix password hashing in `authService.js:106`
2. Enforce password complexity in validation
3. Fix variable shadowing for `isTrustedDevice`
4. Add rate limiting to auth endpoints

### Recommended Enhancements (Can do later):
- Email sanitization
- RBAC on sensitive endpoints
- OTP token handling optimization

---

## Testing Recommendations

After fixes:
```bash
# Test password hashing
npm test -- authService.register

# Test failed login attempts
npm test -- authService.login

# Test rate limiting
npm test -- userRateLimit

# Test RBAC
npm test -- rbacMiddleware
```

---

**Report Generated:** 2026-02-26
**Next Review:** After fixes applied
