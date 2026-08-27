# 🚀 Complete Installation Guide

## Step-by-Step Setup

### 1. Prerequisites

```bash
# Check Node.js version (requires 16+)
node --version

# Check npm version (requires 8+)
npm --version

# Check Redis installation
redis-cli --version
```

### 2. Install Dependencies

```bash
npm install
```

This installs:

- ✅ Express (web framework)
- ✅ Redis client
- ✅ JWT libraries
- ✅ Security packages (helmet, cors)
- ✅ MFA libraries (speakeasy, qrcode)
- ✅ OAuth library (axios)

### 3. Configure Environment

```bash
# Copy template
cp .env.example .env

# Edit configuration
nano .env
```

**Minimum Required:**

```env
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_API_KEY=your-admin-api-key
```

**Full Configuration:**

```env
# Core
NODE_ENV=production
PORT=3000
JWT_SECRET=your-super-secret-jwt-key-change-this
ADMIN_API_KEY=your-admin-api-key

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# OAuth (optional - only if using OAuth)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-secret
GITHUB_CLIENT_ID=your-github-client-id
GITHUB_CLIENT_SECRET=your-github-secret

# Security
REQUIRE_DEVICE_VERIFICATION=false
COOKIE_SECURE=true
```

### 4. Start Redis

```bash
# macOS (Homebrew)
brew services start redis

# Linux (systemd)
sudo systemctl start redis

# Docker
docker run -d -p 6379:6379 redis:7-alpine

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 5. Start Application

```bash
# Development mode (with auto-reload)
npm run dev

# Production mode
npm start

# Using PM2 (recommended for production)
pm2 start app-enhanced.js --name auth-server
```

Expected output:

```
🚀 Enhanced Auth Server running on port 3000
📝 Environment: production
🔒 Security: HTTPS
✨ Features: OAuth2, MFA, WebAuthn, IP Whitelist, Device Tracking, Audit Logging
```

### 6. Verify Installation

```bash
# Health check
curl http://localhost:3000/health

# Expected response:
{
  "status": "ok",
  "timestamp": "2024-01-28T...",
  "uptime": 123.45,
  "redis": true
}
```

### 7. Test Basic Flow

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "testuser"}' \
  -c cookies.txt

# Access protected route
curl http://localhost:3000/api/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh token
curl -X POST http://localhost:3000/api/auth/refresh \
  -b cookies.txt

# Logout
curl -X POST http://localhost:3000/api/auth/logout \
  -b cookies.txt
```

---

## 🐳 Docker Installation

### Using Docker Compose (Easiest)

```bash
# Start everything (app + Redis)
docker-compose up -d

# Check logs
docker-compose logs -f

# Stop
docker-compose down
```

### Manual Docker Build

```bash
# Build image
docker build -t auth-system .

# Run with Redis
docker run -d --name redis redis:7-alpine
docker run -d --name auth-app \
  -p 3000:3000 \
  --link redis:redis \
  -e REDIS_HOST=redis \
  auth-system
```

---

## 🔧 Troubleshooting

### Issue: "Redis client not connected"

**Solution:**

```bash
# Check if Redis is running
redis-cli ping

# If not running, start it
brew services start redis  # macOS
sudo systemctl start redis  # Linux

# Check Redis logs
tail -f /usr/local/var/log/redis.log  # macOS
sudo journalctl -u redis -f           # Linux
```

### Issue: "Port 3000 already in use"

**Solution:**

```bash
# Find and kill process
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Issue: "JWT_SECRET not found"

**Solution:**

```bash
# Make sure .env file exists
ls -la .env

# If not, copy template
cp .env.example .env

# Edit and add JWT_SECRET
nano .env
```

### Issue: Module not found errors

**Solution:**

```bash
# Clean install
rm -rf node_modules package-lock.json
npm install

# If using npm 7+, try:
npm install --legacy-peer-deps
```

---

## 📊 Verify All Features

```bash
# 1. Basic Auth
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId": "test"}' -c cookies.txt

# 2. Session Management
curl http://localhost:3000/api/owner/sessions \
  -H "Authorization: Bearer $TOKEN"

# 3. Security Overview
curl http://localhost:3000/api/owner/security/overview \
  -H "Authorization: Bearer $TOKEN"

# 4. Admin Stats
curl http://localhost:3000/api/admin/stats/sessions \
  -H "X-Admin-API-Key: your-admin-key"
```

---

## 🎓 Next Steps

1. ✅ Read `QUICKSTART.md` for tutorials
2. ✅ Check `ENHANCED_FEATURES.md` for all features
3. ✅ Review `SECURITY_ANALYSIS.md` for best practices
4. ✅ Set up OAuth providers (if needed)
5. ✅ Configure monitoring and logging
6. ✅ Set up backups for Redis data

---

## 📞 Getting Help

If you encounter issues:

1. Check logs: `tail -f logs/combined.log`
2. Check Redis: `redis-cli MONITOR`
3. Test health endpoint: `curl http://localhost:3000/health`
4. Review documentation in other .md files
