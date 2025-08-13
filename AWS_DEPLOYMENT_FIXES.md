# AWS Deployment Fixes - Complete Reference Guide

## Overview
This document records all the fixes applied to resolve AWS deployment issues for the RABHAN Solar BNPL platform contractor service and user profiles functionality.

**Date**: August 4, 2025  
**Issue**: Contractor and user profiles not loading on AWS deployment  
**Local Status**: Working perfectly  
**AWS Status**: Fixed after multiple schema and configuration issues  

---

## Architecture Clarification

### Service Structure
- **Auth Service** (Port 3001): Basic contractor registration data in `rabhan_auth.contractors`
- **Contractor Service** (Port 3004): Detailed business profiles in `rabhan_contractors.contractors`
- **User Service** (Port 3002): User profiles in `rabhan_user.users`
- **Frontend** (Port 80): React app served by Nginx

### Database Design
- **Auth Service**: Registration & authentication data
- **Contractor Service**: Detailed business profiles, documents, services
- **Separate User IDs**: Users can have both customer and contractor profiles with different IDs

---

## Issues Found & Fixes Applied

### 1. Frontend Environment Variable Issues

**Problem**: Frontend calling `localhost:3004` instead of AWS server IP

**Root Cause**: 
- Vite not properly loading `.env.production` variables
- Contractor service using hardcoded localhost URLs

**Fix Applied**:
```typescript
// vite.config.ts - Updated to load environment variables properly
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  
  return {
    // ... config
    define: {
      'process.env': env,
    },
  };
});
```

```typescript
// contractor.service.ts - Fixed to use environment configuration
class ContractorService {
  // BEFORE: private baseURL = process.env.REACT_APP_CONTRACTOR_SERVICE_URL || 'http://localhost:3004/api/contractors';
  // AFTER: Use api client which reads from config.contractorApiUrl
  
  async getProfile() {
    // BEFORE: await api.get(`${this.baseURL}/profile`);
    // AFTER: await api.get('/profile');
  }
}
```

### 2. CORS Configuration Issues

**Problem**: Requests blocked by CORS policy from AWS server

**Root Cause**: Contractor service CORS hardcoded, not reading from environment

**Fix Applied**:
```typescript
// server.ts - Updated CORS to use environment variable
// BEFORE: Hardcoded origins array
app.use(cors({
  origin: [
    'http://localhost:3000',
    // ... other hardcoded origins
  ],
}));

// AFTER: Use environment variable
const corsOrigins = process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(",") : [
  'http://localhost:3000',
  // ... fallback origins
];
app.use(cors({
  origin: corsOrigins,
}));
```

```bash
# .env - Added AWS server to CORS origins
CORS_ORIGIN=http://localhost:3000,http://localhost:5173,http://16.170.220.109,http://16.170.220.109:80
```

### 3. Database Schema Issues

**Problem**: Multiple missing columns causing 500 errors

**Errors Encountered**:
1. `column "deleted_at" does not exist`
2. `column "business_name" does not exist` 
3. `column "created_by" does not exist`

**Fix Applied**:
```sql
-- Added missing soft delete column
ALTER TABLE contractors ADD COLUMN deleted_at TIMESTAMP;
CREATE INDEX idx_contractors_deleted_at ON contractors (deleted_at) WHERE deleted_at IS NULL;

-- Added missing business columns (26 total)
ALTER TABLE contractors ADD COLUMN business_name VARCHAR(200);
ALTER TABLE contractors ADD COLUMN business_name_ar VARCHAR(200);
ALTER TABLE contractors ADD COLUMN business_type VARCHAR(50);
ALTER TABLE contractors ADD COLUMN commercial_registration VARCHAR(100);
ALTER TABLE contractors ADD COLUMN email VARCHAR(200);
ALTER TABLE contractors ADD COLUMN phone VARCHAR(20);
-- ... (21 more columns)

-- Added audit columns
ALTER TABLE contractors ADD COLUMN created_by UUID;
ALTER TABLE contractors ADD COLUMN updated_by UUID;
ALTER TABLE contractors ADD COLUMN ip_address INET;
ALTER TABLE contractors ADD COLUMN user_agent TEXT;

-- Created required enum types
CREATE TYPE contractor_status AS ENUM ('pending', 'documents_required', 'verification', 'verified', 'active', 'suspended', 'rejected', 'inactive');
CREATE TYPE business_type AS ENUM ('individual', 'llc', 'corporation', 'partnership', 'other');
CREATE TYPE service_category AS ENUM ('residential_solar', 'commercial_solar', 'industrial_solar', 'maintenance', 'consultation', 'design', 'electrical', 'roofing', 'all');
```

**Final Schema**: Contractors table expanded from 16 to 54 columns

### 4. Nginx Deployment Issues

**Problem**: Nginx serving old cached files instead of new build

**Root Cause**: Files deployed to wrong directory (`/var/www/rabhan-web/` vs `/var/www/html/`)

**Fix Applied**:
```bash
# Deploy to correct nginx document root
sudo cp -r /var/www/rabhan-web/* /var/www/html/
sudo chown -R www-data:www-data /var/www/html
sudo nginx -s reload
```

### 5. User Service Database Configuration

**Problem**: User service using complex DATABASE_URL instead of individual parameters

**Fix Applied**:
```typescript
// database.ts - Simplified to match working contractor service approach
// BEFORE: Complex DATABASE_URL parsing
// AFTER: Individual parameters
this.config = {
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432', 10),
  database: process.env.DATABASE_NAME || 'rabhan_user',
  user: process.env.DATABASE_USER || 'postgres',
  password: process.env.DATABASE_PASSWORD || 'postgres', // Fixed from '12345'
};
```

---

## Deployment Process

### 1. Frontend Build & Deploy
```bash
# Build with production environment
cd frontend/rabhan-web
npm run build -- --mode production

# Deploy to AWS
scp -i "rabhan-key.pem" -r dist/* ubuntu@16.170.220.109:/tmp/rabhan-web-dist
ssh -i "rabhan-key.pem" ubuntu@16.170.220.109 "sudo mkdir -p /var/www/html && sudo cp -r /tmp/rabhan-web-dist/* /var/www/html/ && sudo chown -R www-data:www-data /var/www/html && rm -rf /tmp/rabhan-web-dist"
```

### 2. Backend Service Restart
```bash
# Restart services to pick up new configuration
pm2 restart contractor-service
pm2 restart user-service
```

### 3. Database Schema Updates
```bash
# Run migration scripts or manual schema updates
sudo -u postgres psql -d rabhan_contractors -f migration_script.sql
```

---

## Testing & Verification

### 1. Service Health Checks
```bash
# Test all service endpoints
curl http://16.170.220.109:3001/api/auth/health    # Auth Service
curl http://16.170.220.109:3002/health             # User Service  
curl http://16.170.220.109:3004/api/contractors/health # Contractor Service
```

### 2. CORS Verification
```bash
# Test CORS headers from AWS server origin
curl -I -H 'Origin: http://16.170.220.109' http://localhost:3004/api/contractors/health
# Should return: Access-Control-Allow-Origin: http://16.170.220.109
```

### 3. Database Connectivity
```bash
# Verify schema completeness
sudo -u postgres psql -d rabhan_contractors -c "SELECT count(*) FROM information_schema.columns WHERE table_name = 'contractors';"
# Should return: 54 columns
```

---

## Current Status

### ✅ Fixed Issues
- [x] Frontend environment variables loading properly
- [x] CORS configuration allows AWS server requests  
- [x] Database schema complete with all required columns
- [x] Nginx serving correct build files
- [x] All services returning 200 OK responses
- [x] User service database connection working
- [x] Contractor service database connection working

### 📝 Data Issues Identified
- **Contractor Profile Data**: AWS has placeholder data instead of real business information
  - Auth Service: Has real data (`Azkashine`, `ACTIVE`)
  - Contractor Service: Has placeholder (`My Solar Business`, default values)
  - **Solution**: Contractor service should sync real data from auth service

### 🔧 Architecture Working As Designed
- **Dual Profile System**: Users can have both customer and contractor profiles with different IDs
- **Service Separation**: Auth service handles registration, contractor service handles detailed profiles
- **Data Flow**: Frontend ↔ Contractor Service ↔ Auth Service (for basic info)

---

## Key Learnings

1. **Environment Variables**: Vite requires explicit configuration to load production variables
2. **CORS Configuration**: Must be environment-aware, not hardcoded
3. **Database Schema**: Services expect specific column names and types - must match exactly
4. **Deployment Path**: Nginx document root must match deployed file location
5. **Service Architecture**: Each service has its own database and purpose - don't mix responsibilities

---

## Configuration Files Updated

### Frontend
- `vite.config.ts` - Environment variable loading
- `src/services/contractor.service.ts` - API URL configuration
- `.env.production` - AWS server URLs

### Backend Services
- `contractor-service/src/server.ts` - CORS configuration
- `contractor-service/.env` - CORS origins
- `user-service/src/config/database.ts` - Database connection
- `user-service/.env` - Database password

### AWS Infrastructure
- Database schemas updated
- Nginx configuration verified
- PM2 processes restarted

---

## Monitoring Commands

```bash
# Check service status
pm2 list

# Monitor logs
pm2 logs contractor-service --lines 20
pm2 logs user-service --lines 20

# Check database connections
sudo -u postgres psql -d rabhan_contractors -c "SELECT COUNT(*) FROM contractors;"
sudo -u postgres psql -d rabhan_auth -c "SELECT COUNT(*) FROM users;"

# Test API endpoints
curl http://16.170.220.109:3004/api/contractors/health
curl http://16.170.220.109:3002/health
```

---

**End of Documentation**  
All major deployment issues resolved. System is now functional on AWS with proper architecture separation maintained.