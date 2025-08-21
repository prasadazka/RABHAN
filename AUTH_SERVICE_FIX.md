# Auth Service Fix - Complete Database Schema & Service Integration

## Problem
Auth service was not running, missing database tables, compilation errors, and no nginx routing. This is critical as auth service provides JWT tokens for all other microservices.

## Root Causes
1. **Database Issues**: Wrong database name (`rabhan_auth` vs `rabhan_main`), incorrect password
2. **Missing Tables**: Database migrations not run, incomplete schema
3. **Compilation Errors**: TypeScript build failures, missing compiled files
4. **Missing Dependencies**: `mock-redis.js` and other utility files not compiled
5. **No Nginx Routing**: Auth API not accessible through public proxy

## Solution Steps

### 1. Database Configuration & Setup

#### Check Database Container Status
```bash
ssh -i rabhan-key.pem ubuntu@ec2-16-170-220-109.eu-north-1.compute.amazonaws.com
sudo docker exec rabhan-postgres psql -U postgres -l
```

#### Create Dedicated Auth Database
```bash
# Create separate database for auth service (best practice)
sudo docker exec rabhan-postgres psql -U postgres -c 'CREATE DATABASE rabhan_auth;'
```

#### Update Auth Service Database Connection
```bash
cd /opt/rabhan/backend/services/auth-service

# Update .env file with correct database and password
sed -i 's/rabhan_main/rabhan_auth/g' .env
sed -i 's/12345/rabhan_secure_db_2024/g' .env

# Verify configuration
cat .env | grep DATABASE_URL
# Should show: postgresql://postgres:rabhan_secure_db_2024@localhost:5432/rabhan_auth
```

### 2. Run Database Migrations (CRITICAL - Maintains Schema Integrity)

#### Execute All Migrations in Correct Order
```bash
# 1. Create contractors table first
cat /opt/rabhan/backend/services/auth-service/migrations/002_create_contractors_table.sql | sudo docker exec -i rabhan-postgres psql -U postgres -d rabhan_auth

# 2. Create update function
cat /opt/rabhan/backend/services/auth-service/migrations/005_transform_to_contractor_only_auth.sql | sudo docker exec -i rabhan-postgres psql -U postgres -d rabhan_auth

# 3. Create users table and all other tables
cat /opt/rabhan/backend/services/auth-service/migrations/006_restore_users_table.sql | sudo docker exec -i rabhan-postgres psql -U postgres -d rabhan_auth

# 4. Fix missing trigger
sudo docker exec rabhan-postgres psql -U postgres -d rabhan_auth -c "CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();"
```

#### Verify Database Schema
```bash
sudo docker exec rabhan-postgres psql -U postgres -d rabhan_auth -c '\dt'
# Should show: users, contractors, user_sessions, password_reset_tokens, compliance logs, etc.
```

### 3. Fix PostgreSQL Password Authentication

#### Reset Password for External Connections
```bash
# Fix password authentication issue for host connections
sudo docker exec rabhan-postgres psql -U postgres -c "ALTER USER postgres PASSWORD 'rabhan_secure_db_2024';"

# Test connection from host
PGPASSWORD=rabhan_secure_db_2024 psql -h localhost -p 5432 -U postgres -d rabhan_auth -c 'SELECT COUNT(*) FROM users;'
```

### 4. Fix TypeScript Compilation Issues

#### Address Missing Dependencies
```bash
cd /opt/rabhan/backend/services/auth-service

# Fix TypeScript null check errors
sed -i 's/data.email.includes(domain)/data.email?.includes(domain)/g' src/services/auth.service.ts
sed -i 's/devCredentialEmails.includes(data.email)/data.email \&\& devCredentialEmails.includes(data.email)/g' src/services/auth.service.ts
```

#### Compile Missing Files
```bash
# Remove old dist and rebuild
rm -rf dist

# Compile all TypeScript files including utilities
npx tsc src/utils/*.ts src/config/*.ts src/types/*.ts --outDir dist --target es2022 --module commonjs --esModuleInterop --skipLibCheck --rootDir src

# Compile main server file
npx tsc src/server.ts --outDir dist --target es2022 --module commonjs --esModuleInterop --skipLibCheck --rootDir src

# Verify critical files exist
ls -la dist/utils/mock-redis.js
ls -la dist/server.js
```

### 5. Start Auth Service

```bash
cd /opt/rabhan/backend/services/auth-service
npm start
```

**Expected Output:**
```
Database connection successful: { now: 2025-08-15T08:51:18.493Z }
Auth service running on port 3001
Environment: development
SAMA compliance mode: development
```

### 6. Update Nginx Configuration

#### Add Auth Service Routing
```nginx
server {
    listen 80;
    server_name _;
    
    # Auth Service API - HIGH PRIORITY (first route)
    location /api/auth/ {
        proxy_pass http://localhost:3001/api/auth/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Request-ID $request_id;
    }
    
    # Solar Calculator API  
    location /api/solar-calculator/ {
        proxy_pass http://localhost:3005/api/solar-calculator/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apply Configuration
```bash
sudo cp /tmp/rabhan-with-auth.conf /etc/nginx/sites-available/
sudo rm -f /etc/nginx/sites-enabled/*
sudo ln -sf /etc/nginx/sites-available/rabhan-with-auth.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

## Verification

### Test Database Connection
```bash
sudo docker exec rabhan-postgres psql -U postgres -d rabhan_auth -c 'SELECT COUNT(*) FROM users;'
```

### Test Auth Service Health
```bash
curl -s http://localhost:3001/health
# Expected: {"status":"healthy","service":"auth-service"...}
```

### Test API Through Nginx Proxy
```bash
curl -s http://16.170.220.109/api/auth/register -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"TestPass123!","firstName":"Test","lastName":"User","role":"USER"}'
```

### Test Login Functionality
```bash
# Register user first, then login
curl -s http://16.170.220.109/api/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test@example.com","password":"TestPass123!"}'
```

## Database Schema Maintained

### Critical Tables Created:
- **users**: Main user authentication with SAMA compliance fields
- **contractors**: Contractor-specific authentication
- **user_sessions**: JWT session management
- **user_compliance_logs**: SAMA audit trails (partitioned by month)
- **password_reset_tokens**: Secure password recovery

### Key Features:
- **SAMA Compliance**: Audit logging enabled
- **Password Security**: Complex password validation
- **JWT Tokens**: Secure authentication for microservices
- **Session Management**: Proper token handling
- **Database Integrity**: All constraints and triggers working

## Architecture

```
Browser Request → Port 80 (nginx) → Routes to:
├── /api/auth/ → Port 3001 (auth service) ✅
├── /api/solar-calculator/ → Port 3005 (solar service) ✅
└── /* → Port 3000 (frontend) ✅
```

## Key Lessons Learned

1. **Database First**: Always ensure database schema is complete before starting service
2. **Incremental Migration**: Run migrations in correct order (dependencies matter)
3. **Password Authentication**: External connections need proper password setup
4. **TypeScript Compilation**: Check for null/undefined issues in strict mode
5. **Missing Dependencies**: Manually compile utility files if automatic build fails
6. **Nginx Route Order**: Auth routes must come before catch-all frontend routes

## Status: ✅ FULLY OPERATIONAL

- **Database**: ✅ Complete schema with all tables
- **Auth Service**: ✅ Running on port 3001
- **API Endpoints**: ✅ Working through nginx proxy
- **JWT Tokens**: ✅ Ready for microservice authentication
- **SAMA Compliance**: ✅ Audit logging enabled
- **Frontend Integration**: ✅ Ready for login/registration

The auth service is now the cornerstone for all other RABHAN microservices! 🚀