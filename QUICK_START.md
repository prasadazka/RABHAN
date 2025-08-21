# 🚀 RABHAN Platform - Quick Start Guide

## For Impatient Developers 😄

### 1️⃣ **Prerequisites (5 minutes)**
```bash
# Install these first:
- Node.js 18+ → https://nodejs.org
- PostgreSQL 14+ → https://postgresql.org  
- Redis 6+ → https://redis.io
- Git → https://git-scm.com
```

### 2️⃣ **Clone & Setup (2 minutes)**
```bash
git clone <your-repo-url> rabhan-platform
cd rabhan-platform

# Quick setup (choose your platform):
# Windows:
scripts\setup-development.bat

# Linux/macOS:
chmod +x scripts/setup-development.sh
./scripts/setup-development.sh
```

### 3️⃣ **Database Setup (2 minutes)**
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create databases and user
CREATE DATABASE rabhan_auth;
CREATE DATABASE rabhan_users;
CREATE DATABASE rabhan_contractors;
CREATE DATABASE rabhan_documents;
CREATE DATABASE rabhan_quotes;
CREATE DATABASE rabhan_marketplace;
CREATE DATABASE rabhan_admin;

CREATE USER rabhan_dev WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON ALL DATABASES TO rabhan_dev;
\q
```

### 4️⃣ **Start Everything (30 seconds)**
```bash
# Windows:
start-all-services.bat

# Linux/macOS:
./start-all-services.sh
```

### 5️⃣ **Access Applications**
- **Main App**: http://localhost:3000
- **Admin Dashboard**: http://localhost:3010

### 🛑 **Stop Everything**
```bash
# Windows:
stop-all-services.bat

# Linux/macOS:
./stop-all-services.sh
```

---

## ⚡ **Manual Setup (If Scripts Fail)**

### Backend Services
```bash
# Start each in separate terminal
cd backend/services/auth-service && npm install && npm run dev     # Port 3001
cd backend/services/user-service && npm install && npm run dev     # Port 3002  
cd backend/services/contractor-service && npm install && npm run dev # Port 3004
cd backend/services/document-service && npm install && npm run dev # Port 3003
cd backend/services/quote-service && npm install && npm run dev    # Port 3005
cd backend/services/admin-service && npm install && npm run dev    # Port 3006
cd backend/services/marketplace-service && npm install && npm run dev # Port 3007
```

### Frontend Applications
```bash
# Start each in separate terminal
cd frontend/rabhan-web && npm install && npm run dev        # Port 3000
cd frontend/admin-dashboard && npm install && npm run dev   # Port 3010
```

---

## 🔧 **Environment Variables (Essential)**

Create `.env` files with these key variables:

```bash
# All backend services need:
NODE_ENV=development
DATABASE_URL=postgresql://rabhan_dev:password@localhost:5432/database_name
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
JWT_SECRET=your_super_secret_jwt_key

# All frontend apps need:
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001
```

---

## 🆘 **Quick Troubleshooting**

### Port Already in Use
```bash
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# Linux/macOS  
lsof -ti:3001 | xargs kill -9
```

### Database Connection Failed
```bash
# Check PostgreSQL is running
# Windows: Check Services
# Linux: sudo systemctl status postgresql
# macOS: brew services list | grep postgresql
```

### Redis Connection Failed
```bash
# Start Redis
redis-server

# Test connection
redis-cli ping  # Should return PONG
```

### Node Modules Issues
```bash
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📋 **Verify Setup Checklist**

- [ ] ✅ http://localhost:3000 (Main App)
- [ ] ✅ http://localhost:3010 (Admin Dashboard)  
- [ ] ✅ http://localhost:3001/health (Auth Service)
- [ ] ✅ http://localhost:3002/health (User Service)
- [ ] ✅ http://localhost:3003/health (Document Service)
- [ ] ✅ http://localhost:3004/health (Contractor Service)
- [ ] ✅ http://localhost:3005/health (Quote Service)
- [ ] ✅ http://localhost:3006/health (Admin Service)
- [ ] ✅ http://localhost:3007/health (Marketplace Service)

---

## 📚 **Next Steps**

1. **Register a user** at http://localhost:3000
2. **Test the solar calculator** 
3. **Check admin dashboard** at http://localhost:3010
4. **Read the full guide**: `DEVELOPER_SETUP_GUIDE.md`

**Happy coding! 🎉**