# API Endpoints and Parameter Reference

Comprehensive reference for all API endpoints, their parameters, validators, and expected responses.

## Table of Contents
1. [Authentication Routes](#authentication-routes)
2. [Categories Routes](#categories-routes)
3. [Labs Routes](#labs-routes)
4. [Courses Routes](#courses-routes)
5. [Owner/User Routes](#owneruser-routes)
6. [RBAC Routes](#rbac-routes)
7. [Validation Rules Summary](#validation-rules-summary)

---

## Authentication Routes

**Base URL:** `/api/auth`

### POST /register
Register new user with email, phone, and password.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| email | string | Yes | email format, must be unique |
| phone | string | Yes | international format, 10-15 digits |
| password | string | Yes | min 12 chars, uppercase, lowercase, number, special char |
| full_name | string | Yes | 2-100 characters |
| verification_type | string | No | enum: 'email', 'phone' (default: 'email') |

**Success Response:**
```json
{
  "success": true,
  "message": "Registration successful",
  "data": {
    "otpToken": "token_string",
    "expiresIn": 300,
    "verificationType": "email"
  }
}
```

**Error Cases:**
- 400: Invalid email format, weak password, invalid phone
- 409: Email/phone already exists

---

### POST /register/verify
Verify user registration with OTP.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| otpToken | string | Yes | from registration response |
| otp | string | Yes | exactly 6 digits |

**Success Response:** (200)
```json
{
  "success": true,
  "message": "Account verified successfully"
}
```

**Error Cases:**
- 400: Invalid OTP format, missing token
- 401: Invalid or expired token

---

### POST /login
Authenticate user with email/phone and password.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| email | string | Conditional | email format (email OR phone required) |
| phone | string | Conditional | phone format (email OR phone required) |
| password | string | Yes | trimmed, non-empty |
| mfaCode | string | No | numeric, 6+ digits |
| rememberMe | boolean | No | true/false |

**Success Response:** (200)
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "jwt_token",
    "refreshToken": "refresh_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com"
    }
  }
}
```

**Error Cases:**
- 400: Missing email/phone, invalid format
- 401: Invalid credentials
- 403: MFA required

---

### POST /forgot-password
Start password reset flow.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| email | string | Yes | valid email format |

**Success Response:** (200)
```json
{
  "success": true,
  "message": "Password reset email sent"
}
```

---

### POST /reset-password
Reset password with reset token.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| token | string | Yes | valid reset token |
| newPassword | string | Yes | min 12 chars, complexity requirements |
| confirmPassword | string | Yes | must match newPassword |

**Success Response:** (200)
```json
{
  "success": true,
  "message": "Password reset successfully"
}
```

**Error Cases:**
- 400: Passwords don't match, weak password
- 401: Invalid/expired token

---

### POST /oauth/google/popup
Google OAuth popup login.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| idToken | string | Yes | valid Google ID token |
| deviceInfo | object | No | user-agent, platform info |
| rememberMe | boolean | No | true/false |

**Success Response:** (200)
- Returns same as login endpoint

---

### POST /device/verify
Verify new device with OTP.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| deviceCode | string | Yes | from device login attempt |
| otp | string | Yes | 6 digits |

---

### POST /mfa/verify
Verify MFA code during login.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| code | string | Yes | 6 alphanumeric characters |

---

### POST /otp/resend
Resend OTP to user email/phone.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| identifier | string | Yes | email or phone number |
| type | string | Yes | enum: 'email', 'phone' |

---

## Categories Routes

**Base URL:** `/api/categories`

### GET /active
Get all active categories (PUBLIC).

**Query Parameters:**
| Parameter | Type | Default | Validator |
|-----------|------|---------|-----------|
| page | number | 1 | positive integer |
| limit | number | 10 | 1-100 |
| status | string | active | enum |

**Response:** Array of category objects

---

### GET /slug/:slug
Get category by slug (PUBLIC).

**Path Parameters:**
| Parameter | Validator |
|-----------|-----------|
| slug | kebab-case string, lowercase |

---

### GET / (Protected)
Get all categories with admin access.

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-100 |
| search | string | min 2 characters |
| sort | string | enum: name, created_at |
| order | string | enum: asc, desc |

---

### GET /:id (Protected)
Get category by ID.

**Path Parameters:**
| Parameter | Validator |
|-----------|-----------|
| id | UUID format |

---

### POST / (Protected)
Create new category.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| name | string | Yes | 2-100 characters, non-empty |
| slug | string | Yes | kebab-case, unique |
| description | string | No | max 500 characters |
| is_active | boolean | No | default: true |

**Success Response:** (201)
```json
{
  "success": true,
  "message": "Category created",
  "data": {
    "id": "uuid",
    "name": "Category Name",
    "slug": "category-name"
  }
}
```

---

### PUT /:id (Protected)
Update category.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| name | string | No | 2-100 characters |
| slug | string | No | kebab-case |
| description | string | No | max 500 characters |
| is_active | boolean | No | boolean |

---

### DELETE /:id (Protected)
Delete category.

**Success Response:** (200)
```json
{
  "success": true,
  "message": "Category deleted"
}
```

---

## Labs Routes

**Base URL:** `/api/labs`

### GET /
Get all labs.

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-100 |
| difficulty | string | enum: beginner, intermediate, advanced, expert |
| search | string | min 2 characters |
| category_id | number | positive integer |

---

### GET /:id
Get lab by ID.

**Path Parameters:**
| Parameter | Validator |
|-----------|-----------|
| id | UUID |

**Response includes:**
- Lab details
- Questions array
- Required technologies

---

### POST / (Protected)
Create new lab.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| title | string | Yes | non-empty, 2-200 chars |
| slug | string | Yes | unique, kebab-case |
| description | string | No | max 1000 chars |
| difficulty | string | Yes | enum: beginner, intermediate, advanced, expert |
| estimated_time | number | Yes | positive integer (minutes) |
| category_id | number | No | existing category |
| subcategory_id | number | No | existing subcategory |

**Success Response:** (201)

---

### POST /create-full (Protected)
Create lab with questions in one request.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| title | string | Yes | non-empty |
| slug | string | Yes | unique, kebab-case |
| difficulty | string | Yes | enum |
| estimated_time | number | Yes | positive |
| questions | array | No | max 100 questions |
| questions[].question_text | string | Yes | non-empty |
| questions[].question_type | string | Yes | enum: multiple-choice, short-answer, code |
| questions[].options | array | No | for multiple-choice |
| questions[].correct_answer | string/number | Yes | answer to question |

---

### PUT /:id (Protected)
Update lab.

**Parameters:** Same as POST / (partial allowed)

---

### DELETE /:id (Protected)
Delete lab.

---

### POST /:id/questions (Protected)
Add question to lab.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| question_text | string | Yes | non-empty |
| question_type | string | Yes | enum: multiple-choice, short-answer, code, true-false |
| options | array | Conditional | required for multiple-choice |
| correct_answer | string/number | Yes | answer value |
| explanation | string | No | educational context |
| order | number | No | position in lab |

---

### POST /:id/questions/bulk (Protected)
Add multiple questions.

**Parameters (Body):**
```json
{
  "questions": [
    { /* question object */ },
    { /* question object */ }
  ]
}
```

**Validator:** Array of valid question objects, max 100

---

### POST /:id/assignments (Protected)
Assign lab to user.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| user_id | number | Yes | existing user |
| due_date | string | No | ISO 8601 datetime |
| priority | string | No | enum: low, medium, high |

---

### GET /my/assignments (Protected)
Get labs assigned to current user.

**Response:** Array of lab assignments

---

## Courses Routes

**Base URL:** `/api/owner/courses`

### GET /
Get all courses (Protected).

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-100 |
| level | string | enum: beginner, intermediate, advanced |
| search | string | min 2 characters |
| status | string | enum: draft, published, archived |

---

### GET /:id
Get course by ID.

**Response includes:**
- Course metadata
- Media array
- Questions array
- Certification info

---

### GET /slug/:slug
Get course by slug.

---

### POST / (Protected)
Create new course.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| title | string | Yes | non-empty, 2-200 chars |
| slug | string | Yes | unique, kebab-case |
| description | string | No | max 2000 chars |
| duration | number | Yes | positive integer (minutes) |
| level | string | Yes | enum: beginner, intermediate, advanced |
| category_id | number | No | existing category |
| subcategory_id | number | No | existing subcategory |
| is_published | boolean | No | default: false |

---

### POST /create-full (Protected)
Create course with media and questions.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| title | string | Yes | non-empty |
| slug | string | Yes | unique |
| level | string | Yes | enum |
| media | array | No | media objects |
| questions | array | No | question objects |

**Media object:**
```json
{
  "title": "string",
  "media_type": "video|image|document|code",
  "url": "string (valid URL)",
  "description": "string",
  "order": "number"
}
```

---

### PUT /:id (Protected)
Update course.

**Parameters:** Same as POST / (partial allowed)

---

### PATCH /:id/publish (Protected)
Publish course.

---

### PATCH /:id/archive (Protected)
Archive course.

---

### DELETE /:id (Protected)
Delete course.

---

### POST /:id/media (Protected)
Add media to course.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| title | string | Yes | non-empty |
| media_type | string | Yes | enum: video, image, document, code |
| url/content | string | Yes | valid URL or content |
| description | string | No | max 500 chars |
| order | number | No | sequence order |

---

### PUT /:id/media/:mediaId (Protected)
Update media.

---

### DELETE /:id/media/:mediaId (Protected)
Delete media.

---

### POST /:id/questions (Protected)
Add question to course.

**Same validators as lab questions**

---

### POST /:id/questions/bulk (Protected)
Bulk add questions.

---

### PUT /:id/questions/:questionId (Protected)
Update question.

---

### DELETE /:id/questions/:questionId (Protected)
Delete question.

---

### PUT /:id/header (Protected)
Update course header.

**Parameters (Body):**
| Field | Type | Validator |
|-------|------|-----------|
| header_image | string | valid URL or image path |
| header_title | string | max 200 chars |
| header_subtitle | string | max 500 chars |

---

### PUT /:id/footer (Protected)
Update course footer.

**Parameters (Body):**
| Field | Type | Validator |
|-------|------|-----------|
| footer_text | string | max 1000 chars |
| footer_link | string | valid URL |

---

### POST /:id/certification (Protected)
Assign certification to course.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| certification_id | number | Yes | existing certification |

---

## Owner/User Routes

**Base URL:** `/api/owner`

### POST /refresh
Refresh access token.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| refreshToken | string | Yes | valid JWT |

---

### POST /logout (Protected)
Logout user.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| logoutAllDevices | boolean | No | boolean |

---

### POST /logout-all (Protected)
Logout from all devices.

---

### GET /validate (Protected)
Validate current session.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "userId": "uuid",
    "expiresAt": "ISO 8601"
  }
}
```

---

### GET /me (Protected)
Get current user profile.

**Response includes:**
- User ID, email, phone
- Full name
- Profile image
- Roles and permissions

---

### PUT /me (Protected)
Update current user profile.

**Parameters (Body):**
| Field | Type | Validator |
|-------|------|-----------|
| full_name | string | 2-100 characters |
| phone | string | international format |
| bio | string | max 500 chars |
| profileImage | file | multipart/form-data |

---

### POST /change-password (Protected)
Change user password.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| currentPassword | string | Yes | non-empty |
| newPassword | string | Yes | 12+ chars, complexity |
| confirmPassword | string | Yes | must match newPassword |

---

### GET /audit-logs (Protected)
Get user audit logs.

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-50 |
| action | string | filter by action type |
| startDate | string | ISO 8601 |
| endDate | string | ISO 8601 |

---

### GET /get-security-overview (Protected)
Get security settings overview.

**Response includes:**
- MFA enabled status
- IP whitelist enabled status
- Last login info
- Active sessions count

---

### GET /get-ip-whitelist (Protected)
Get IP whitelist entries.

---

### POST /add-ip-whitelist (Protected)
Add IP to whitelist.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| ip_address | string | Yes | valid IPv4/IPv6 |
| description | string | No | max 200 chars |

---

### POST /ip-whitelist/toggle (Protected)
Toggle IP whitelist enforcement.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| enabled | boolean | Yes | boolean |

---

### GET /devices (Protected)
Get trusted devices.

---

### GET /sessions (Protected)
Get all active sessions.

---

### DELETE /sessions/:sessionId (Protected)
Delete specific session.

---

### GET /users (Protected)
Get all users (admin).

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-100 |
| role_id | number | filter by role |
| status | string | enum: active, inactive |

---

### GET /user/:userId (Protected)
Get specific user details (admin).

---

### POST /add-user (Protected)
Add new user (admin).

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| email | string | Yes | valid email, unique |
| full_name | string | Yes | 2-100 chars |
| role_id | number | Yes | existing role |
| phone | string | No | international format |

---

### PUT /users/:userId/role (Protected)
Update user role (admin).

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| role_id | number | Yes | existing role ID |

---

### GET /me/permissions (Protected)
Get current user permissions.

---

### GET /me/access-summary (Protected)
Get user access summary.

---

## RBAC Routes

**Base URL:** `/api/rbac`

### GET /roles (Protected)
Get all roles.

**Query Parameters:**
| Parameter | Type | Validator |
|-----------|------|-----------|
| page | number | positive integer |
| limit | number | 1-100 |
| status | string | enum: active, inactive |

---

### GET /roles/:roleId (Protected)
Get role details.

---

### GET /roles/:roleId/complete (Protected)
Get complete role with permissions and routes.

---

### POST /roles (Protected)
Create new role.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| name | string | Yes | unique, 2-100 chars |
| description | string | No | max 500 chars |
| is_active | boolean | No | default: true |
| permissions | array | No | permission IDs |

---

### PUT /roles/:roleId (Protected)
Update role.

**Parameters:** Same as POST /roles (partial allowed)

---

### DELETE /roles/:roleId (Protected)
Delete role.

---

### POST /roles/:roleId/duplicate (Protected)
Duplicate role with new name.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| new_name | string | Yes | unique, 2-100 chars |

---

### GET /roles/:roleId/permissions (Protected)
Get role permissions.

---

### POST /roles/:roleId/permissions (Protected)
Assign permissions to role.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| permission_ids | array | Yes | array of permission IDs |

---

### DELETE /roles/:roleId/permissions/:permissionId (Protected)
Remove permission from role.

---

### GET /roles/:roleId/routes (Protected)
Get role routes.

---

### POST /roles/:roleId/routes (Protected)
Assign routes to role.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| route_ids | array | Yes | array of route IDs |

---

### DELETE /roles/:roleId/routes/:routeId (Protected)
Remove route from role.

---

### GET /roles/:roleId/users (Protected)
Get users with this role.

---

### GET /permissions (Protected)
Get all permissions.

---

### GET /permissions/:permissionId (Protected)
Get permission details.

---

### POST /permissions (Protected)
Create permission.

**Parameters (Body):**
| Field | Type | Required | Validator |
|-------|------|----------|-----------|
| name | string | Yes | unique, snake_case, 2-100 chars |
| description | string | No | max 500 chars |

---

### PUT /permissions/:permissionId (Protected)
Update permission.

---

### DELETE /permissions/:permissionId (Protected)
Delete permission.

---

### GET /permissions/:permissionId/roles (Protected)
Get roles with this permission.

---

## Validation Rules Summary

### String Validations
- **Email:** RFC 5322 format, unique in system
- **Phone:** International format, 10-15 digits
- **URL:** Valid HTTP/HTTPS URL
- **UUID:** Standard UUID v4 format
- **Slug:** lowercase, kebab-case, no spaces
- **Password:** 12+ chars, uppercase, lowercase, number, special char
- **Username:** lowercase, 3-50 chars, alphanumeric + underscore

### Numeric Validations
- **Positive Integer:** >= 0 or > 0
- **Range:** Specify min/max values
- **Decimals:** Rounding rules for currencies

### Date Validations
- **ISO 8601:** YYYY-MM-DDTHH:mm:ssZ format
- **Future Date:** must be after current date
- **Past Date:** must be before current date

### Array Validations
- **Max Length:** Typically 100 items
- **Min Length:** At least 1 item
- **Item Type:** All items must match expected type
- **Unique Items:** No duplicate values

### Enum Validations
- **Difficulty:** beginner, intermediate, advanced, expert
- **Level:** beginner, intermediate, advanced
- **Status:** active, inactive, draft, published, archived
- **Media Type:** video, image, document, code
- **Question Type:** multiple-choice, short-answer, code, true-false

---

**Last Updated:** 2024
**API Version:** 1.0
**Total Endpoints:** 100+
