# RBAC System Documentation

## 📁 Project Structure

```
routes/
├── rbac/
│   ├── index.js                 # Main RBAC routes entry point
│   ├── roles.js                 # Role management routes
│   ├── permissions.js           # Permission management routes
│   └── permissionGroups.js      # Permission group routes
│
controllers/
├── rbac/
│   ├── roleController.js        # Role CRUD operations
│   ├── permissionController.js  # Permission CRUD operations
│   └── permissionGroupController.js  # Permission group operations
│
services/
├── rbac/
│   ├── roleService.js           # Role business logic
│   ├── permissionService.js     # Permission business logic
│   └── permissionGroupService.js # Permission group logic
│
middleware/
├── rbac.js                      # RBAC middleware (permission/role checks)
└── auth.js                      # Authentication middleware
│
config/
└── rateLimitConfig.js          # Rate limiting configuration
```

## 🚀 Integration Guide

### Step 1: Mount RBAC Routes in Your Main App

```javascript
// app.js or server.js
const express = require("express");
const app = express();

// Import routes
const authRoutes = require("./routes/auth");
const ownerRoutes = require("./routes/owner");
const rbacRoutes = require("./routes/rbac"); // <-- Add this

// Mount routes
app.use("/api/auth", authRoutes);
app.use("/api/owner", ownerRoutes);
app.use("/api/rbac", rbacRoutes); // <-- Add this

// ... rest of your app setup
```

### Step 2: Seed Initial Data

You need to create initial permission groups, permissions, and roles. See the seed data script below.

## 📝 API Endpoints

### Permission Groups

| Method | Endpoint                               | Description               | Permission Required  |
| ------ | -------------------------------------- | ------------------------- | -------------------- |
| GET    | `/api/rbac/permission-groups`          | Get all permission groups | `view_permissions`   |
| GET    | `/api/rbac/permission-groups/:groupId` | Get single group          | `view_permissions`   |
| POST   | `/api/rbac/permission-groups`          | Create group              | `create_permissions` |
| PUT    | `/api/rbac/permission-groups/:groupId` | Update group              | `edit_permissions`   |
| DELETE | `/api/rbac/permission-groups/:groupId` | Delete group              | `delete_permissions` |

### Permissions

| Method | Endpoint                                    | Description               | Permission Required  |
| ------ | ------------------------------------------- | ------------------------- | -------------------- |
| GET    | `/api/rbac/permissions`                     | Get all permissions       | `view_permissions`   |
| GET    | `/api/rbac/permissions/:permissionId`       | Get single permission     | `view_permissions`   |
| POST   | `/api/rbac/permissions`                     | Create permission         | `create_permissions` |
| PUT    | `/api/rbac/permissions/:permissionId`       | Update permission         | `edit_permissions`   |
| DELETE | `/api/rbac/permissions/:permissionId`       | Delete permission         | `delete_permissions` |
| GET    | `/api/rbac/permissions/group/:groupId`      | Get permissions by group  | `view_permissions`   |
| GET    | `/api/rbac/permissions/:permissionId/roles` | Get roles with permission | `view_permissions`   |

### Roles

| Method | Endpoint                                            | Description          | Permission Required  |
| ------ | --------------------------------------------------- | -------------------- | -------------------- |
| GET    | `/api/rbac/roles`                                   | Get all roles        | `view_roles`         |
| GET    | `/api/rbac/roles/:roleId`                           | Get single role      | `view_roles`         |
| POST   | `/api/rbac/roles`                                   | Create role          | `create_roles`       |
| PUT    | `/api/rbac/roles/:roleId`                           | Update role          | `edit_roles`         |
| DELETE | `/api/rbac/roles/:roleId`                           | Delete role          | `delete_roles`       |
| POST   | `/api/rbac/roles/:roleId/permissions`               | Assign permissions   | `assign_permissions` |
| DELETE | `/api/rbac/roles/:roleId/permissions/:permissionId` | Remove permission    | `assign_permissions` |
| GET    | `/api/rbac/roles/:roleId/permissions`               | Get role permissions | `view_roles`         |
| GET    | `/api/rbac/roles/:roleId/users`                     | Get users with role  | `view_roles`         |
| POST   | `/api/rbac/roles/:roleId/duplicate`                 | Duplicate role       | `create_roles`       |

## 🔐 RBAC Middleware Usage

### 1. Check Permission

```javascript
const { authenticate } = require("../middleware/auth");
const { checkPermission } = require("../middleware/rbac");

// Single permission
router.get(
  "/users",
  authenticate,
  checkPermission("view_users"),
  userController.getUsers,
);

// Multiple permissions (OR - user needs at least one)
router.get(
  "/dashboard",
  authenticate,
  checkPermission(["view_dashboard", "view_analytics"], "OR"),
  dashboardController.getDashboard,
);

// Multiple permissions (AND - user needs all)
router.post(
  "/critical-action",
  authenticate,
  checkPermission(["admin_access", "delete_all"], "AND"),
  criticalController.doAction,
);
```

### 2. Check Role

```javascript
const { checkRole } = require("../middleware/rbac");

// Single role
router.get(
  "/admin-panel",
  authenticate,
  checkRole("admin"),
  adminController.getPanel,
);

// Multiple roles
router.get(
  "/staff-area",
  authenticate,
  checkRole(["admin", "moderator", "support"]),
  staffController.getArea,
);
```

### 3. Check Ownership

```javascript
const { checkOwnership } = require("../middleware/rbac");

// User can only access their own profile
router.get(
  "/users/:userId/profile",
  authenticate,
  checkOwnership("userId", "user"),
  userController.getProfile,
);
```

### 4. Permission OR Ownership

```javascript
const { checkPermissionOrOwnership } = require("../middleware/rbac");

// User can edit if they own it OR have edit_users permission
router.put(
  "/users/:userId",
  authenticate,
  checkPermissionOrOwnership("edit_users", "userId"),
  userController.updateUser,
);
```

### 5. Super Admin Only

```javascript
const { checkSuperAdmin } = require("../middleware/rbac");

router.post(
  "/system/reset",
  authenticate,
  checkSuperAdmin(),
  systemController.reset,
);
```

## 📊 Example API Calls

### Create Permission Group

```bash
POST /api/rbac/permission-groups
Authorization: Bearer <token>

{
  "id": "users",
  "label": "User Management",
  "description": "Manage platform users",
  "icon": "Users",
  "displayOrder": 1
}
```

### Create Permission

```bash
POST /api/rbac/permissions
Authorization: Bearer <token>

{
  "id": "view_users",
  "label": "View Users",
  "description": "View user list and details",
  "groupId": "users",
  "resource": "users",
  "action": "read"
}
```

### Create Role

```bash
POST /api/rbac/roles
Authorization: Bearer <token>

{
  "name": "Content Manager",
  "description": "Can manage all content",
  "permissions": ["view_courses", "create_courses", "edit_courses"],
  "isActive": true,
  "priority": 5
}
```

### Assign Permissions to Role

```bash
POST /api/rbac/roles/content_manager/permissions
Authorization: Bearer <token>

{
  "permissionIds": [
    "view_users",
    "view_courses",
    "create_courses"
  ]
}
```

### Get All Roles with Filters

```bash
GET /api/rbac/roles?page=1&limit=20&search=manager&status=active&sortBy=name&sortOrder=asc
Authorization: Bearer <token>
```

## 🎯 Frontend Integration Example

```javascript
// permissionStore.js
class PermissionStore {
  async initialize() {
    if (this.initialized) return;

    const [groups, permissions, roles] = await Promise.all([
      this.fetchPermissionGroups(),
      this.fetchPermissions(),
      this.fetchRoles(),
    ]);

    this.groups = groups;
    this.permissions = permissions;
    this.roles = roles;
    this.initialized = true;
  }

  async fetchPermissionGroups() {
    const response = await fetch("/api/rbac/permission-groups", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.data.groups;
  }

  async fetchPermissions() {
    const response = await fetch("/api/rbac/permissions?limit=100", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.data.permissions;
  }

  async fetchRoles() {
    const response = await fetch("/api/rbac/roles", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await response.json();
    return data.data.roles;
  }
}
```

## ⚠️ Important Notes

1. **Database Migration**: This implementation uses Redis for demonstration. In production, migrate to PostgreSQL/MySQL with proper schema.

2. **Permission Cache**: User permissions are cached for 15 minutes. Clear cache when roles/permissions change:

   ```javascript
   const { clearUserPermissionCache } = require("../middleware/rbac");
   await clearUserPermissionCache(userId);
   ```

3. **Super Admin**: Create a super_admin role that bypasses all permission checks.

4. **Protected Routes**: Always use `authenticate` middleware before RBAC middleware.

5. **Rate Limiting**: All RBAC routes are rate-limited. Adjust limits in `config/rateLimitConfig.js`.

## 🔄 Migration to Database

To migrate from Redis to a database, update these files:

1. `services/rbac/roleService.js` - Replace Redis calls with database queries
2. `services/rbac/permissionService.js` - Replace Redis calls with database queries
3. `services/rbac/permissionGroupService.js` - Replace Redis calls with database queries
4. `middleware/rbac.js` - Update cache logic if needed

### Suggested Database Schema

```sql
-- Permission Groups
CREATE TABLE permission_groups (
  id VARCHAR(100) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  icon VARCHAR(50),
  display_order INT DEFAULT 0,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Permissions
CREATE TABLE permissions (
  id VARCHAR(100) PRIMARY KEY,
  label VARCHAR(100) NOT NULL,
  description TEXT,
  group_id VARCHAR(100),
  resource VARCHAR(100),
  action VARCHAR(50),
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES permission_groups(id)
);

-- Roles
CREATE TABLE roles (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  priority INT DEFAULT 0,
  created_by VARCHAR(100),
  deleted_by VARCHAR(100),
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Role Permissions (Many-to-Many)
CREATE TABLE role_permissions (
  role_id VARCHAR(100),
  permission_id VARCHAR(100),
  assigned_by VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- User Roles (assuming you have a users table)
CREATE TABLE user_roles (
  user_id VARCHAR(100),
  role_id VARCHAR(100),
  assigned_by VARCHAR(100),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, role_id),
  FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

## 📚 Additional Resources

- See `seedData.js` for initial data setup
- See `examples/rbacUsage.js` for more usage examples
- Check rate limit config in `config/rateLimitConfig.js`
