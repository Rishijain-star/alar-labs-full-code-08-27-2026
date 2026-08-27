# Complete RBAC System with Database Integration

A production-ready Role-Based Access Control (RBAC) system with authentication, using Sequelize ORM and MySQL/PostgreSQL/SQLite.

## 🌟 What's New

This is the **database-backed version** of the RBAC system. Changes from Redis version:

- ✅ **Uses Sequelize ORM** for database operations
- ✅ **Supports MySQL, PostgreSQL, SQLite**
- ✅ **Proper data persistence** with relational database
- ✅ **Foreign key constraints** for data integrity
- ✅ **Soft deletes** with paranoid mode
- ✅ **Automatic password hashing** with bcrypt
- ✅ **Model associations** for easy data retrieval
- ✅ **Migration scripts** for table creation
- ✅ **Seed scripts** for initial data

## 📁 Project Structure

```
.
├── models/
│   ├── index.js              # Model loader & DB config
│   ├── User.js               # User model with auth
│   ├── Role.js               # Role model
│   ├── Permission.js         # Permission model
│   ├── PermissionGroup.js    # Permission group model
│   ├── RolePermission.js     # Junction table
│   └── TrustedDevice.js      # Trusted device model
│
├── repositories/
│   └── userRepository.js     # User data access layer
│
├── services/
│   └── authService.js        # Authentication service
│
├── migrations/
│   └── createTables.js       # Create all tables
│
├── seeders/
│   └── seedRbacData.js       # Seed RBAC data
│
└── config/
    └── initAuthService.js    # Service initialization
```

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install sequelize mysql2 bcrypt
# OR for PostgreSQL
npm install sequelize pg pg-hstore bcrypt
# OR for SQLite
npm install sequelize sqlite3 bcrypt
```

### 2. Configure Database

Create `.env` file:

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auth_system
DB_USER=root
DB_PASSWORD=your_password
DB_DIALECT=mysql  # or 'postgres' or 'sqlite'

# Development options
DB_FORCE_SYNC=false  # Set to 'true' to drop all tables (DANGER!)
DB_ALTER_SYNC=true   # Set to 'true' to alter tables
NODE_ENV=development
```

### 3. Create Database Tables

```bash
# Create all tables
node migrations/createTables.js

# WARNING: To drop all tables and recreate (DELETES ALL DATA):
# DB_FORCE_SYNC=true node migrations/createTables.js
```

Expected output:

```
🚀 Starting database migration...
✅ Database connection established successfully
✅ Database synchronized

Tables created:
  ✓ users
  ✓ roles
  ✓ permissions
  ✓ permission_groups
  ✓ role_permissions
  ✓ trusted_devices
```

### 4. Seed RBAC Data

```bash
node seeders/seedRbacData.js
```

Expected output:

```
🚀 Starting RBAC data seeding...
✓ Created 6 permission groups
✓ Created 38 permissions
✓ Created 7 roles
✅ RBAC data seeding completed successfully!
```

### 5. Initialize Auth Service

In your `app.js` or `server.js`:

```javascript
const express = require("express");
const app = express();
const db = require("./models");
const initAuthService = require("./config/initAuthService");

// Initialize database
db.testConnection()
  .then(() => {
    console.log("Database connected");

    // Initialize auth service with user repository
    initAuthService();

    // Start server
    app.listen(3000, () => {
      console.log("Server running on port 3000");
    });
  })
  .catch((error) => {
    console.error("Database connection failed:", error);
    process.exit(1);
  });
```

### 6. Use Auth Service

```javascript
const AuthService = require("./services/authService");
const authService = new AuthService();

// Register user
const result = await authService.register({
  email: "user@example.com",
  phone: "+1234567890",
  password: "SecurePass123",
  full_name: "John Doe",
  verification_type: "email",
});

// Verify registration
await authService.verifyRegistrationOtp(result.otpToken, "123456");

// Login
const loginResult = await authService.login({
  email: "user@example.com",
  password: "SecurePass123",
  ipAddress: "192.168.1.1",
  userAgent: "Mozilla/5.0...",
  deviceInfo: {},
  rememberMe: false,
});
```

## 📊 Database Schema

### Users Table

```sql
CREATE TABLE users (
    user_id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(20) UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role_id VARCHAR(100) NOT NULL DEFAULT 'student',
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    requires_mfa BOOLEAN DEFAULT FALSE,
    mfa_secret VARCHAR(255),
    last_login_at DATETIME,
    last_login_ip VARCHAR(45),
    failed_login_attempts INT DEFAULT 0,
    locked_until DATETIME,
    password_changed_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    deleted_at DATETIME,
    FOREIGN KEY (role_id) REFERENCES roles(id)
);
```

### Roles Table

```sql
CREATE TABLE roles (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    priority INT DEFAULT 0,
    created_by VARCHAR(100),
    deleted_by VARCHAR(100),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    deleted_at DATETIME
);
```

### Permissions Table

```sql
CREATE TABLE permissions (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    group_id VARCHAR(100),
    resource VARCHAR(100),
    action VARCHAR(50),
    created_by VARCHAR(100),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (group_id) REFERENCES permission_groups(id)
);
```

### Permission Groups Table

```sql
CREATE TABLE permission_groups (
    id VARCHAR(100) PRIMARY KEY,
    label VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    display_order INT DEFAULT 0,
    created_by VARCHAR(100),
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
```

### Role Permissions Table (Junction)

```sql
CREATE TABLE role_permissions (
    role_id VARCHAR(100) NOT NULL,
    permission_id VARCHAR(100) NOT NULL,
    assigned_by VARCHAR(100),
    assigned_at DATETIME NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);
```

### Trusted Devices Table

```sql
CREATE TABLE trusted_devices (
    id UUID PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    device_fingerprint VARCHAR(255) NOT NULL,
    device_name VARCHAR(255),
    user_agent TEXT,
    ip_address VARCHAR(45),
    device_info JSON,
    is_revoked BOOLEAN DEFAULT FALSE,
    revoked_at DATETIME,
    last_used_at DATETIME NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(user_id)
);
```

## 🔐 User Model Features

### Automatic Password Hashing

```javascript
// Password is automatically hashed before save
const user = await User.create({
  user_id: "user_123",
  email: "user@example.com",
  password_hash: "plaintext_password", // Will be hashed
  full_name: "John Doe",
});

// Verify password
const isValid = await user.verifyPassword("plaintext_password");
```

### Account Locking

```javascript
// Check if account is locked
if (user.isLocked()) {
  throw new Error("Account is locked");
}

// Lock account
await user.lockAccount(30); // Lock for 30 minutes

// Unlock account
await user.unlockAccount();

// Increment failed attempts
await user.incrementFailedAttempts(); // Auto-locks after 5 attempts
```

### Instance Methods

```javascript
// Update last login
await user.updateLastLogin("192.168.1.1");

// Get safe object (without sensitive data)
const safeUser = user.toSafeObject();
// Returns user without password_hash and mfa_secret
```

## 📚 User Repository Methods

```javascript
const userRepo = new UserRepository();

// Find methods
const user = await userRepo.findByUserId("user_123");
const user = await userRepo.findByEmail("user@example.com");
const user = await userRepo.findByPhone("+1234567890");

// Create user
const newUser = await userRepo.create({
  email: "user@example.com",
  password: "SecurePass123",
  full_name: "John Doe",
  roleId: "student",
});

// Update user
await userRepo.update("user_123", {
  full_name: "Jane Doe",
  isVerified: true,
});

// Update password
await userRepo.updatePassword("user_123", "NewSecurePass456");

// Update role
await userRepo.updateRole("user_123", "instructor");

// Update MFA status
await userRepo.updateMfaStatus("user_123", "mfa_secret", true);

// Soft delete
await userRepo.delete("user_123");

// Get all users with pagination
const result = await userRepo.findAll({
  page: 1,
  limit: 20,
  search: "john",
  roleId: "student",
  isActive: true,
});

// Check existence
const exists = await userRepo.exists("user_123");
const emailExists = await userRepo.emailExists("user@example.com");
const phoneExists = await userRepo.phoneExists("+1234567890");
```

## 🔧 Model Associations

```javascript
// User includes role and permissions
const user = await User.findOne({
  where: { user_id: "user_123" },
  include: [
    {
      model: Role,
      as: "role",
      include: [
        {
          model: Permission,
          as: "permissions",
        },
      ],
    },
  ],
});

console.log(user.role.name); // 'Student'
console.log(user.role.permissions); // Array of permissions

// Role includes permissions
const role = await Role.findByPk("admin", {
  include: [
    {
      model: Permission,
      as: "permissions",
    },
  ],
});

// Permission includes group
const permission = await Permission.findByPk("view_users", {
  include: [
    {
      model: PermissionGroup,
      as: "group",
    },
  ],
});
```

## 🎯 Default Roles & Permissions

### Roles Created by Seeder

| Role ID         | Name            | Priority | Description                    |
| --------------- | --------------- | -------- | ------------------------------ |
| super_admin     | Super Admin     | 100      | Full system access             |
| admin           | Admin           | 90       | Administrative access          |
| content_manager | Content Manager | 70       | Manage courses/content         |
| instructor      | Instructor      | 60       | Create/manage courses          |
| support_staff   | Support Staff   | 50       | View users and provide support |
| student         | Student         | 10       | Basic user access              |
| guest           | Guest           | 0        | Limited access                 |

### Permission Groups (6 groups, 38 permissions)

1. **User Management** (6 permissions)
2. **Role Management** (9 permissions)
3. **Course Management** (6 permissions)
4. **Content Management** (5 permissions)
5. **Analytics & Reports** (3 permissions)
6. **System Settings** (4 permissions)

## 🧪 Testing

### Test Database Connection

```javascript
const db = require("./models");

db.testConnection()
  .then(() => console.log("Connected!"))
  .catch((err) => console.error("Error:", err));
```

### Test User Creation

```javascript
const UserRepository = require("./repositories/userRepository");
const userRepo = new UserRepository();

const user = await userRepo.create({
  email: "test@example.com",
  password: "TestPass123",
  full_name: "Test User",
  roleId: "student",
});

console.log("User created:", user.user_id);
```

## 🔄 Migration from Redis

If migrating from Redis version:

1. Run migrations to create tables
2. Run seeder to populate RBAC data
3. Update service initialization to use database
4. Services will work the same way (API unchanged)

## ⚠️ Important Notes

1. **Use migrations in production**, not `sync({ force: true })`
2. **Soft deletes** are enabled (paranoid mode) - deleted records are not permanently removed
3. **Password hashing** is automatic - never store plain passwords
4. **Foreign key constraints** ensure data integrity
5. **Indexes** are created for performance on frequently queried fields

## 🔒 Security Features

- Automatic password hashing with bcrypt (10 rounds)
- Account locking after 5 failed login attempts
- Soft deletes with paranoid mode
- Failed login attempt tracking
- Last login tracking
- MFA secret storage
- Trusted device management

## 📝 Environment Variables

```env
# Database
DB_HOST=localhost
DB_PORT=3306
DB_NAME=auth_system
DB_USER=root
DB_PASSWORD=
DB_DIALECT=mysql

# Development
DB_FORCE_SYNC=false
DB_ALTER_SYNC=true
NODE_ENV=development

# JWT & Session (from existing config)
JWT_SECRET=your-secret-key
JWT_EXPIRES_IN=300
SESSION_TTL=86400
SESSION_EXTENDED_TTL=2592000
```

## 🆘 Troubleshooting

### Tables not created

```bash
# Check database connection
DB_FORCE_SYNC=true node migrations/createTables.js
```

### Foreign key errors

- Ensure parent tables exist before child tables
- Run migrations in correct order

### Duplicate key errors

- Clear existing data or use different database
- Check if seeder already ran

## ✨ Next Steps

1. Add more models as needed (Courses, Enrollments, etc.)
2. Create proper database migrations (use Sequelize CLI)
3. Add data validation rules
4. Implement caching layer (Redis) for performance
5. Add database query logging
6. Set up database backups

---

**Built with Sequelize ORM for production-ready database integration** 🚀
