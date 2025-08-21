# 🔧 RABHAN Platform - Troubleshooting Guide

## 🚨 **Common Issues & Solutions**

### **🔌 Port Issues**

#### **"Port 3001 is already in use"**
```bash
# Find what's using the port
# Windows:
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/macOS:
lsof -ti:3001
kill -9 <PID>

# Or kill all Node processes:
pkill -f node
```

#### **"EADDRINUSE: address already in use"**
```bash
# Kill all processes on RABHAN ports
# Windows:
for %p in (3000 3001 3002 3003 3004 3005 3006 3007 3008 3010) do (
  for /f "tokens=5" %a in ('netstat -ano ^| findstr :%p') do taskkill /PID %a /F
)

# Linux/macOS:
for port in 3000 3001 3002 3003 3004 3005 3006 3007 3008 3010; do
  lsof -ti:$port | xargs kill -9 2>/dev/null
done
```

---

### **🗄️ Database Issues**

#### **"database "rabhan_auth" does not exist"**
```sql
-- Connect as PostgreSQL superuser
psql -U postgres

-- Create missing database
CREATE DATABASE rabhan_auth;
GRANT ALL PRIVILEGES ON DATABASE rabhan_auth TO rabhan_dev;
\q
```

#### **"password authentication failed for user "rabhan_dev""**
```sql
-- Reset user password
psql -U postgres
ALTER USER rabhan_dev WITH PASSWORD 'new_password';
\q

-- Update .env files with new password
-- DATABASE_URL=postgresql://rabhan_dev:new_password@localhost:5432/database_name
```

#### **"PostgreSQL connection refused"**
```bash
# Check if PostgreSQL is running
# Windows: Check Services app for "postgresql"
# Linux: sudo systemctl status postgresql
# macOS: brew services list | grep postgresql

# Start PostgreSQL if not running
# Windows: Start service from Services app
# Linux: sudo systemctl start postgresql
# macOS: brew services start postgresql

# Check PostgreSQL port (default 5432)
# Windows: netstat -an | findstr :5432
# Linux/macOS: lsof -i :5432
```

#### **"relation does not exist" errors**
```bash
# Run migrations for the specific service
cd backend/services/auth-service
npm run migrate

# If migration fails, check migration files
ls migrations/
# Run manually if needed:
psql -U rabhan_dev -d rabhan_auth -f migrations/001_create_tables.sql
```

---

### **🔴 Redis Issues**

#### **"Redis connection refused"**
```bash
# Check if Redis is running
# Windows: Check Task Manager for "redis-server"
# Linux/macOS: pgrep redis-server

# Start Redis
# Windows: redis-server.exe
# Linux: sudo systemctl start redis
# macOS: brew services start redis
# Or: redis-server

# Test Redis connection
redis-cli ping
# Should return: PONG
```

#### **"Could not connect to Redis at 127.0.0.1:6379"**
```bash
# Check Redis configuration
redis-cli info server

# Reset Redis (if needed)
redis-cli flushall

# Check Redis port
# Windows: netstat -an | findstr :6379
# Linux/macOS: lsof -i :6379
```

---

### **📦 Node.js & npm Issues**

#### **"Module not found" errors**
```bash
# Clear npm cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install

# If still failing, try:
npm install --legacy-peer-deps
```

#### **"Node version not supported"**
```bash
# Check Node version
node --version

# Install Node 18+ from https://nodejs.org
# Or use Node Version Manager (nvm):
# Install nvm: https://github.com/nvm-sh/nvm
nvm install 18
nvm use 18
```

#### **"gyp ERR! build error" (native modules)**
```bash
# Install build tools
# Windows: npm install -g windows-build-tools
# Linux: sudo apt install build-essential
# macOS: xcode-select --install

# Rebuild native modules
npm rebuild
```

---

### **🔐 Authentication Issues**

#### **"JWT malformed" or "Invalid token"**
```bash
# Check JWT_SECRET in .env files
# Make sure all services have the same JWT_SECRET

# Clear browser localStorage/sessionStorage
# In browser console:
localStorage.clear()
sessionStorage.clear()
```

#### **"CORS error" in browser**
```bash
# Check CORS_ORIGIN in backend .env files
CORS_ORIGIN=http://localhost:3000,http://localhost:3010

# Ensure no trailing slashes in URLs
# ❌ http://localhost:3000/
# ✅ http://localhost:3000
```

---

### **🌐 Frontend Issues**

#### **"Failed to fetch" errors**
```bash
# Check if backend services are running
curl http://localhost:3001/health
curl http://localhost:3002/health

# Check browser network tab for actual error
# Common causes:
# - Service not running
# - Wrong API URL in .env
# - CORS configuration
```

#### **"Vite build fails"**
```bash
# Check TypeScript errors
npm run typecheck

# Clear Vite cache
rm -rf node_modules/.vite
npm run dev

# Check for circular dependencies
npm ls
```

#### **"Arabic text not displaying correctly"**
```bash
# Check if Arabic fonts are loaded
# In browser dev tools, check for font loading errors

# Verify RTL CSS is applied
# Check if direction: rtl is set in HTML
```

---

### **🔍 Service-Specific Issues**

#### **Document Service: "Upload directory not found"**
```bash
# Create upload directories
cd backend/services/document-service
mkdir -p uploads
chmod 755 uploads

# Check UPLOAD_DIR in .env
UPLOAD_DIR=./uploads
```

#### **Quote Service: "Penalty scheduler failed"**
```bash
# Check quote service logs
cd backend/services/quote-service
tail -f logs/quote-service.log

# Verify database tables exist
psql -U rabhan_dev -d rabhan_quotes -c "\dt"
```

#### **Marketplace Service: "Product images not loading"**
```bash
# Check static file serving
# Verify uploads directory exists
cd backend/services/marketplace-service
ls -la uploads/

# Check file permissions
chmod -R 755 uploads/
```

---

### **🔍 Debugging Tips**

#### **Check Service Logs**
```bash
# View logs in real-time
tail -f logs/auth-service.log
tail -f logs/user-service.log

# Or check console output where services are running
```

#### **Test API Endpoints**
```bash
# Test with curl
curl -X GET http://localhost:3001/health
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Use Postman or Insomnia for complex requests
```

#### **Database Debugging**
```sql
-- Connect to database
psql -U rabhan_dev -d rabhan_auth

-- Check tables
\dt

-- Check data
SELECT * FROM users LIMIT 5;
SELECT COUNT(*) FROM users;

-- Check recent logs (if audit table exists)
SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 10;
```

---

### **🆘 Nuclear Options (Last Resort)**

#### **Complete Reset**
```bash
# Stop all services
./stop-all-services.sh

# Drop all databases
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_auth;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_users;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_contractors;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_documents;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_quotes;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_marketplace;"
psql -U postgres -c "DROP DATABASE IF EXISTS rabhan_admin;"

# Re-run setup
./scripts/setup-development.sh
```

#### **Clean Install**
```bash
# Remove all node_modules
find . -name "node_modules" -type d -exec rm -rf {} +
find . -name "package-lock.json" -delete

# Remove build artifacts
find . -name "dist" -type d -exec rm -rf {} +
find . -name ".vite" -type d -exec rm -rf {} +

# Clear npm cache
npm cache clean --force

# Re-install everything
./scripts/setup-development.sh
```

---

### **📞 Getting Help**

#### **Before Asking for Help**
1. ✅ Check this troubleshooting guide
2. ✅ Review service logs
3. ✅ Test individual components
4. ✅ Verify environment variables
5. ✅ Check if services are running

#### **Include This Information**
- Operating system and version
- Node.js version (`node --version`)
- npm version (`npm --version`)
- PostgreSQL version (`psql --version`)
- Redis version (`redis-server --version`)
- Error message (full stack trace)
- Steps to reproduce the issue
- What you've already tried

#### **Log Collection**
```bash
# Collect system info
node --version > debug-info.txt
npm --version >> debug-info.txt
psql --version >> debug-info.txt
redis-server --version >> debug-info.txt

# Collect service status
curl http://localhost:3001/health >> debug-info.txt
curl http://localhost:3002/health >> debug-info.txt
# ... for all services

# Attach this file when asking for help
```

---

**💡 Pro Tip**: Most issues are environment-related. Double-check your `.env` files first!