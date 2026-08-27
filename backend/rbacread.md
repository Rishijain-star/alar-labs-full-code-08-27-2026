# Complete RBAC System for Node.js

A production-ready Role-Based Access Control (RBAC) system with authentication, built for Node.js/Express applications.

## 🌟 Features

- ✅ **Complete RBAC Implementation**
  - Roles, Permissions, and Permission Groups
  - Hierarchical permission system
  - Flexible role management

- ✅ **Advanced Authentication**
  - JWT-based authentication
  - Session management with Redis
  - Multi-factor authentication (MFA/TOTP)
  - Device verification
  - IP whitelisting

- ✅ **Security Features**
  - Rate limiting (configurable per endpoint)
  - Token blacklisting
  - Audit logging
  - Secure password hashing
  - Session invalidation

- ✅ **Developer Friendly**
  - Clean, modular architecture
  - Comprehensive documentation
  - Seed data script included
  - Type-safe with input validation
  - RESTful API design

## 📁 Project Structure

```
.
├── routes/
│   ├── rbac/
│   │   ├── index.js              # RBAC routes entry
│   │   ├── roles.js              # Role CRUD routes
│   │   ├── permissions.js        # Permission CRUD routes
│   │   └── permissionGroups.js   # Group CRUD routes
│   ├── auth.js                   # Authentication routes
│   └── owner.js                  # User self-service routes
│
├── controllers/
│   ├── rbac/
│   │   ├── roleController.js
│   │   ├── permissionController.js
│   │   └── permissionGroupController.js
│   ├── authController.js
│   └── ownerController.js
│
├── services/
│   ├── rbac/
│   │   ├── roleService.js
│   │   ├── permissionService.js
│   │   └── permissionGroupService.js
│   ├── authService.js
│   ├── ownerService.js
│   ├── sessionService.js
│   ├── otpService.js
│   ├── totpService.js
│   ├── auditService.js
│   ├── ipWhitelistService.js
│   └── tokenBlacklistService.js
│
├── middleware/
│   ├── rbac.js                   # RBAC middleware (permissions, roles)
│   ├── auth.js                   # Authentication middleware
│   ├── errorHandler.js
│   └── rateLimit.js
│
├── config/
│   └── rateLimitConfig.js        # Rate limit configurations
│
├── seedRbacData.js              # Seed script for initial data
├── RBAC_DOCUMENTATION.md        # Detailed documentation
└── RBAC_QUICK_START.md          # Quick start guide
```

## 🚀 Quick Start

### 1. Installation

```bash
# Install dependencies
npm install express redis node-input-validator speakeasy qrcode
```

### 2. Set Up Redis

```bash
# Install and start Redis
brew install redis  # macOS
# or
sudo apt-get install redis-server  # Ubuntu

# Start Redis
redis-server
```

### 3. Copy Files to Your Project

Copy all the generated files to your project:

```bash
# Copy route files
cp -r routes/rbac/ your-project/routes/
cp routes/owner.js your-project/routes/

# Copy controllers
cp -r controllers/rbac/ your-project/controllers/

# Copy services
cp -r services/rbac/ your-project/services/

# Copy middleware
cp middleware/rbac.js your-project/middleware/

# Copy config
cp config/rateLimitConfig.js your-project/config/

# Copy seed script and docs
cp seedRbacData.js your-project/
cp RBAC_*.md your-project/
```

### 4. Mount Routes in Your App

```javascript
// app.js or server.js
const express = require("express");
const app = express();

// Your existing routes
const authRoutes = require("./routes/auth");
const ownerRoutes = require("./routes/owner");

// NEW: RBAC routes
const rbacRoutes = require("./routes/rbac");

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/rbac", rbacRoutes); // <-- Add this line
```

### 5. Seed Initial Data

```bash
node seedRbacData.js
```

Expected output:

```
Starting RBAC data seeding...
Creating permission groups...
✓ Created permission group: User Management
✓ Created permission group: Role Management
...
✅ RBAC data seeding completed successfully!

Summary:
- Permission Groups: 6
- Permissions: 32
- Roles: 7
```

### 6. Start Using RBAC

Protect your routes:

```javascript
const { authenticate } = require("./middleware/auth");
const { checkPermission } = require("./middleware/rbac");

router.get(
  "/users",
  authenticate,
  checkPermission("view_users"),
  userController.getUsers,
);
```

## 📚 Documentation

- **[RBAC_QUICK_START.md](./RBAC_QUICK_START.md)** - Get started in 5 minutes
- **[RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md)** - Complete documentation

## 🎯 Default Roles & Permissions

### Roles Created by Seed Script

| Role                | Description            | Use Case                |
| ------------------- | ---------------------- | ----------------------- |
| **Super Admin**     | Full system access     | System administrators   |
| **Admin**           | Administrative access  | Platform administrators |
| **Content Manager** | Manage courses/content | Content team            |
| **Instructor**      | Create/manage courses  | Teachers, educators     |
| **Support Staff**   | View & support users   | Customer support        |
| **Student**         | Basic user access      | End users               |
| **Guest**           | Limited access         | Unauthenticated users   |

### Permission Groups

1. **User Management** - Manage platform users
2. **Role Management** - Manage roles and permissions
3. **Course Management** - Manage educational content
4. **Content Management** - Manage website content
5. **Analytics & Reports** - View analytics and reports
6. **System Settings** - Configure system settings

## 🔐 RBAC Middleware Examples

### Check Single Permission

```javascript
router.get(
  "/users",
  authenticate,
  checkPermission("view_users"),
  controller.getUsers,
);
```

### Check Multiple Permissions (OR)

```javascript
// User needs at least ONE of these permissions
router.get(
  "/dashboard",
  authenticate,
  checkPermission(["view_analytics", "view_reports"], "OR"),
  controller.getDashboard,
);
```

### Check Multiple Permissions (AND)

```javascript
// User needs ALL of these permissions
router.post(
  "/critical-action",
  authenticate,
  checkPermission(["admin_access", "delete_all"], "AND"),
  controller.criticalAction,
);
```

### Check Role

```javascript
router.get(
  "/admin-panel",
  authenticate,
  checkRole(["admin", "super_admin"]),
  controller.getAdminPanel,
);
```

### Permission OR Ownership

```javascript
// User can edit if they own it OR have edit_users permission
router.put(
  "/users/:userId",
  authenticate,
  checkPermissionOrOwnership("edit_users", "userId"),
  controller.updateUser,
);
```

### Super Admin Only

```javascript
router.post(
  "/system/reset",
  authenticate,
  checkSuperAdmin(),
  controller.resetSystem,
);
```

## 🌐 API Endpoints

### RBAC Endpoints

#### Permission Groups

- `GET /api/rbac/permission-groups` - Get all groups
- `GET /api/rbac/permission-groups/:id` - Get single group
- `POST /api/rbac/permission-groups` - Create group
- `PUT /api/rbac/permission-groups/:id` - Update group
- `DELETE /api/rbac/permission-groups/:id` - Delete group

#### Permissions

- `GET /api/rbac/permissions` - Get all permissions
- `GET /api/rbac/permissions/:id` - Get single permission
- `POST /api/rbac/permissions` - Create permission
- `PUT /api/rbac/permissions/:id` - Update permission
- `DELETE /api/rbac/permissions/:id` - Delete permission
- `GET /api/rbac/permissions/group/:groupId` - Get by group
- `GET /api/rbac/permissions/:id/roles` - Get roles with permission

#### Roles

- `GET /api/rbac/roles` - Get all roles
- `GET /api/rbac/roles/:id` - Get single role
- `POST /api/rbac/roles` - Create role
- `PUT /api/rbac/roles/:id` - Update role
- `DELETE /api/rbac/roles/:id` - Delete role
- `POST /api/rbac/roles/:id/permissions` - Assign permissions
- `DELETE /api/rbac/roles/:id/permissions/:permId` - Remove permission
- `GET /api/rbac/roles/:id/permissions` - Get role permissions
- `GET /api/rbac/roles/:id/users` - Get users with role
- `POST /api/rbac/roles/:id/duplicate` - Duplicate role

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/register/verify` - Verify registration OTP
- `POST /api/auth/login` - Login
- `POST /api/auth/mfa/verify` - Verify MFA code
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### User Self-Service Endpoints (Owner)

- `GET /api/owner/me` - Get current user
- `POST /api/owner/change-password` - Change password
- `POST /api/owner/mfa/enable/start` - Start MFA setup
- `POST /api/owner/mfa/enable/complete` - Complete MFA setup
- `POST /api/owner/mfa/disable` - Disable MFA
- `GET /api/owner/mfa/status` - Get MFA status
- `GET /api/owner/sessions` - Get active sessions
- `DELETE /api/owner/sessions/:id` - Delete session
- `POST /api/owner/logout-all` - Logout all devices

## 🔧 Configuration

### Rate Limiting

Configure in `config/rateLimitConfig.js`:

```javascript
module.exports = {
  authenticatedDefault: {
    max: 100,
    windowMs: 15 * 60 * 1000,
    message: "Too many requests",
  },
  createRole: {
    max: 20,
    windowMs: 60 * 60 * 1000,
  },
  // ... more configurations
};
```

### Redis Connection

```javascript
// lib/redis.js
const redis = require("redis");
const client = redis.createClient({
  host: process.env.REDIS_HOST || "localhost",
  port: process.env.REDIS_PORT || 6379,
});
```

## 🧪 Testing

### Test Permission Check

```bash
curl -X GET "http://localhost:3000/api/rbac/roles" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test Role Creation

```bash
curl -X POST "http://localhost:3000/api/rbac/roles" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Marketing Manager",
    "description": "Manages marketing",
    "permissions": ["view_content", "edit_content"],
    "isActive": true
  }'
```

## 📊 Database Migration

The current implementation uses Redis for storage. For production, migrate to PostgreSQL/MySQL:

### Suggested Schema

```sql
-- See RBAC_DOCUMENTATION.md for complete schema
CREATE TABLE roles (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
  id VARCHAR(100) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  group_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
  role_id VARCHAR(100),
  permission_id VARCHAR(100),
  PRIMARY KEY (role_id, permission_id)
);
```

## 🎨 Frontend Integration

### React Example

```javascript
function UserManagement() {
  const { hasPermission } = usePermissions();

  return (
    <div>
      {hasPermission("view_users") && <UserList />}
      {hasPermission("create_users") && <button>Create User</button>}
    </div>
  );
}
```

### Vue Example

```vue
<template>
  <button v-permission="'create_users'">Create User</button>
</template>
```

## 🛡️ Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate JWT secrets** regularly
3. **Implement rate limiting** on all endpoints
4. **Enable MFA** for admin accounts
5. **Audit logs** regularly
6. **Clear caches** after permission changes
7. **Use strong passwords** (enforce in validation)
8. **Whitelist IPs** for sensitive operations

## 📝 License

This code is provided as-is for educational and commercial use.

## 🤝 Contributing

Contributions welcome! Areas for improvement:

- [ ] Add database adapter pattern
- [ ] Implement resource-based permissions
- [ ] Add permission inheritance
- [ ] Create admin UI
- [ ] Add TypeScript definitions
- [ ] Implement permission caching strategies
- [ ] Add more audit log features

## 🆘 Support

- Check [RBAC_QUICK_START.md](./RBAC_QUICK_START.md) for common issues
- Review [RBAC_DOCUMENTATION.md](./RBAC_DOCUMENTATION.md) for detailed docs
- Examine seed data in `seedRbacData.js` for examples

## ✨ Features Roadmap

- [ ] GraphQL support
- [ ] Webhook notifications for role changes
- [ ] Permission presets/templates
- [ ] Bulk operations API
- [ ] Export/import roles
- [ ] Multi-tenancy support
- [ ] Fine-grained resource permissions

---

**Built with ❤️ for the Node.js community**

For detailed documentation, see:

- [Quick Start Guide](./RBAC_QUICK_START.md)
- [Full Documentation](./RBAC_DOCUMENTATION.md)
