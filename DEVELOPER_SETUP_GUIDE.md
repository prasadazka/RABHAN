# 🚀 RABHAN Platform - Complete Developer Setup Guide

## 📋 **System Requirements**

### **Minimum Requirements**
- **Operating System**: Windows 10/11, macOS 10.15+, Ubuntu 18.04+
- **Node.js**: v18.0.0 or higher (LTS recommended)
- **npm**: v9.0.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher
- **Git**: v2.30 or higher
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 10GB free space minimum

### **Recommended Tools**
- **IDE**: VS Code with TypeScript, ESLint, Prettier extensions
- **Database GUI**: pgAdmin 4 or DBeaver
- **API Testing**: Postman or Insomnia
- **Terminal**: Windows Terminal, iTerm2, or similar

---

## 🔧 **Step 1: Environment Setup**

### **1.1 Install Node.js and npm**
```bash
# Download from https://nodejs.org (LTS version)
# Verify installation
node --version    # Should be v18.0.0+
npm --version     # Should be v9.0.0+
```

### **1.2 Install PostgreSQL**
```bash
# Windows: Download from https://www.postgresql.org/download/windows/
# macOS: brew install postgresql
# Ubuntu: sudo apt update && sudo apt install postgresql postgresql-contrib

# Verify installation
psql --version    # Should be 14.0+
```

### **1.3 Install Redis**
```bash
# Windows: Download from https://github.com/microsoftarchive/redis/releases
# macOS: brew install redis
# Ubuntu: sudo apt install redis-server

# Verify installation
redis-server --version    # Should be 6.0+
```

### **1.4 Clone Repository**
```bash
# Clone the project
git clone <repository-url> rabhan-platform
cd rabhan-platform

# Verify project structure
ls -la
# Should see: backend/, frontend/, DOCS/, scripts/, etc.
```

---

## 🗄️ **Step 2: Database Setup**

### **2.1 Create PostgreSQL Databases**
```sql
-- Connect to PostgreSQL as superuser
psql -U postgres

-- Create databases for each service
CREATE DATABASE rabhan_auth;
CREATE DATABASE rabhan_users;
CREATE DATABASE rabhan_contractors;
CREATE DATABASE rabhan_documents;
CREATE DATABASE rabhan_quotes;
CREATE DATABASE rabhan_marketplace;
CREATE DATABASE rabhan_admin;

-- Create database user
CREATE USER rabhan_dev WITH PASSWORD 'your_secure_password';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE rabhan_auth TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_users TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_contractors TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_documents TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_quotes TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_marketplace TO rabhan_dev;
GRANT ALL PRIVILEGES ON DATABASE rabhan_admin TO rabhan_dev;

-- Exit PostgreSQL
\q
```

### **2.2 Start Redis Server**
```bash
# Start Redis server
redis-server

# Test Redis connection (in another terminal)
redis-cli ping
# Should return: PONG
```

---

## ⚙️ **Step 3: Environment Configuration**

### **3.1 Backend Services Environment**

Create environment files for each service:

#### **Auth Service (.env)**
```bash
# Create: backend/services/auth-service/.env
NODE_ENV=development
PORT=3001

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_auth

# Redis Configuration
REDIS_URL=redis://localhost:6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_here_make_it_long_and_secure
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3010

# SAMA Compliance
SAMA_COMPLIANCE_MODE=development
SAMA_AUDIT_ENABLED=true
SAMA_LOG_LEVEL=info

# Twilio (for SMS - optional for development)
TWILIO_ACCOUNT_SID=your_twilio_sid
TWILIO_AUTH_TOKEN=your_twilio_token
TWILIO_FROM_NUMBER=+1234567890
```

#### **User Service (.env)**
```bash
# Create: backend/services/user-service/.env
NODE_ENV=development
PORT=3002

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_users

# Redis Configuration
REDIS_URL=redis://localhost:6379

# Auth Service
AUTH_SERVICE_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
```

#### **Quote Service (.env)**
```bash
# Create: backend/services/quote-service/.env
NODE_ENV=development
PORT=3005

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_quotes

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
CONTRACTOR_SERVICE_URL=http://localhost:3004

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010

# Business Configuration
MAX_QUOTE_AMOUNT=5000
DEFAULT_SYSTEM_COST_PER_KWP=2000
PENALTY_RATE=0.05
```

#### **Contractor Service (.env)**
```bash
# Create: backend/services/contractor-service/.env
NODE_ENV=development
PORT=3004

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_contractors

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
```

#### **Document Service (.env)**
```bash
# Create: backend/services/document-service/.env
NODE_ENV=development
PORT=3003

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_documents

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=10485760
ALLOWED_FILE_TYPES=pdf,jpg,jpeg,png

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
```

#### **Admin Service (.env)**
```bash
# Create: backend/services/admin-service/.env
NODE_ENV=development
PORT=3006

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_admin

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
USER_SERVICE_URL=http://localhost:3002
CONTRACTOR_SERVICE_URL=http://localhost:3004
QUOTE_SERVICE_URL=http://localhost:3005

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
```

#### **Marketplace Service (.env)**
```bash
# Create: backend/services/marketplace-service/.env
NODE_ENV=development
PORT=3007

# Database Configuration
DATABASE_URL=postgresql://rabhan_dev:your_secure_password@localhost:5432/rabhan_marketplace

# File Storage
UPLOAD_DIR=./uploads
MAX_FILE_SIZE=5242880

# Service URLs
AUTH_SERVICE_URL=http://localhost:3001
CONTRACTOR_SERVICE_URL=http://localhost:3004

# CORS Configuration
CORS_ORIGIN=http://localhost:3000,http://localhost:3010
```

### **3.2 Frontend Environment**

#### **Rabhan Web (.env)**
```bash
# Create: frontend/rabhan-web/.env
VITE_APP_ENV=development
VITE_APP_NAME=RABHAN

# API URLs
VITE_API_BASE_URL=http://localhost:3001
VITE_AUTH_SERVICE_URL=http://localhost:3001
VITE_USER_SERVICE_URL=http://localhost:3002
VITE_DOCUMENT_SERVICE_URL=http://localhost:3003
VITE_CONTRACTOR_SERVICE_URL=http://localhost:3004
VITE_QUOTE_SERVICE_URL=http://localhost:3005
VITE_ADMIN_SERVICE_URL=http://localhost:3006
VITE_MARKETPLACE_SERVICE_URL=http://localhost:3007

# App Configuration
VITE_DEFAULT_LANGUAGE=en
VITE_SUPPORTED_LANGUAGES=en,ar
VITE_APP_THEME=light
```

#### **Admin Dashboard (.env)**
```bash
# Create: frontend/admin-dashboard/.env
VITE_APP_ENV=development
VITE_APP_NAME=RABHAN Admin

# API URLs (same as above)
VITE_API_BASE_URL=http://localhost:3006
VITE_AUTH_SERVICE_URL=http://localhost:3001
VITE_ADMIN_SERVICE_URL=http://localhost:3006

# Admin Configuration
VITE_ADMIN_PORT=3010
VITE_DEFAULT_LANGUAGE=en
```

---

## 📦 **Step 4: Install Dependencies**

### **4.1 Backend Services**
```bash
# Install dependencies for each service
cd backend/services/auth-service
npm install

cd ../user-service
npm install

cd ../contractor-service
npm install

cd ../document-service
npm install

cd ../quote-service
npm install

cd ../admin-service
npm install

cd ../marketplace-service
npm install

cd ../document-proxy-service
npm install
```

### **4.2 Frontend Applications**
```bash
# Install frontend dependencies
cd frontend/rabhan-web
npm install

cd ../admin-dashboard
npm install
```

---

## 🗄️ **Step 5: Database Migrations**

### **5.1 Run Migrations for Each Service**
```bash
# Auth Service
cd backend/services/auth-service
npm run migrate

# User Service (if migration exists)
cd ../user-service
npm run migrate

# Contractor Service
cd ../contractor-service
npm run migrate

# Quote Service
cd ../quote-service
npm run migrate

# Admin Service
cd ../admin-service
npm run migrate

# Marketplace Service
cd ../marketplace-service
npm run migrate

# Document Service
cd ../document-service
npm run migrate
```

### **5.2 Verify Database Setup**
```bash
# Connect to each database and verify tables exist
psql -U rabhan_dev -d rabhan_auth -c "\dt"
psql -U rabhan_dev -d rabhan_users -c "\dt"
psql -U rabhan_dev -d rabhan_contractors -c "\dt"
# ... repeat for other databases
```

---

## 🚀 **Step 6: Start Services**

### **6.1 Start Backend Services (in separate terminals)**

```bash
# Terminal 1: Auth Service
cd backend/services/auth-service
npm run dev

# Terminal 2: User Service
cd backend/services/user-service
npm run dev

# Terminal 3: Contractor Service
cd backend/services/contractor-service
npm run dev

# Terminal 4: Document Service
cd backend/services/document-service
npm run dev

# Terminal 5: Quote Service
cd backend/services/quote-service
npm run dev

# Terminal 6: Admin Service
cd backend/services/admin-service
npm run dev

# Terminal 7: Marketplace Service
cd backend/services/marketplace-service
npm run dev

# Terminal 8: Document Proxy Service
cd backend/services/document-proxy-service
npm run dev
```

### **6.2 Start Frontend Applications**

```bash
# Terminal 9: Main Web App
cd frontend/rabhan-web
npm run dev

# Terminal 10: Admin Dashboard
cd frontend/admin-dashboard
npm run dev
```

---

## ✅ **Step 7: Verify Setup**

### **7.1 Check Service Health**
Open your browser and verify these URLs:

```
✅ Main App: http://localhost:3000
✅ Auth Service: http://localhost:3001/health
✅ User Service: http://localhost:3002/health
✅ Document Service: http://localhost:3003/health
✅ Contractor Service: http://localhost:3004/health
✅ Quote Service: http://localhost:3005/health
✅ Admin Service: http://localhost:3006/health
✅ Marketplace Service: http://localhost:3007/health
✅ Document Proxy: http://localhost:3008/health
✅ Admin Dashboard: http://localhost:3010
```

### **7.2 Test Basic Functionality**
1. **Registration**: Try registering a new user at http://localhost:3000
2. **Login**: Test login functionality
3. **Calculator**: Use the solar calculator
4. **Admin**: Access admin dashboard at http://localhost:3010

---

## 🔧 **Development Scripts**

### **Useful Commands**
```bash
# Start all services (if you have the scripts)
npm run start:all

# Stop all services
npm run stop:all

# Check service status
npm run status

# Run tests
npm run test

# Build for production
npm run build

# Lint code
npm run lint

# Format code
npm run format
```

---

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Port Already in Use**
```bash
# Kill process on specific port
# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F

# macOS/Linux
lsof -ti:3001 | xargs kill -9
```

#### **Database Connection Error**
```bash
# Check PostgreSQL status
# Windows: Check Services
# macOS: brew services list | grep postgresql
# Linux: systemctl status postgresql

# Reset database (if needed)
dropdb rabhan_auth
createdb rabhan_auth
```

#### **Redis Connection Error**
```bash
# Check Redis status
redis-cli ping

# Start Redis if not running
redis-server
```

#### **Node Modules Issues**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

---

## 📚 **Additional Resources**

### **Documentation**
- **API Documentation**: Check each service's `/docs` endpoint
- **Database Schema**: See `migrations/` folders in each service
- **Frontend Components**: Check `src/components/` in frontend apps

### **Development Tools**
- **Database**: Use pgAdmin or DBeaver for database management
- **API Testing**: Import Postman collection (if available)
- **Logs**: Check console output and log files in each service

---

## 🔐 **Security Notes**

### **Development Environment**
- Change all default passwords and secrets
- Never commit `.env` files to version control
- Use secure JWT secrets (minimum 32 characters)
- Enable CORS only for development domains

### **Production Deployment**
- Use environment variables for all secrets
- Enable HTTPS/TLS certificates
- Configure proper firewall rules
- Set up monitoring and logging
- Follow SAMA compliance guidelines

---

## 📞 **Support**

If you encounter issues:
1. Check the troubleshooting section above
2. Review service logs in terminal output
3. Verify all environment variables are set correctly
4. Ensure all required services are running

**Happy coding! 🚀**