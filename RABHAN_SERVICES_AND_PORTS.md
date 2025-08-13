# RABHAN Platform - Services & Ports Documentation

## 🏗️ Platform Overview
RABHAN is a comprehensive Solar BNPL (Buy Now Pay Later) platform built with microservices architecture and designed for SAMA compliance. The platform enables homeowners and businesses to finance solar installations through regulated financial services.

---

## 🔌 **Service Ports & Applications**

### **Frontend Applications**
| Port | Service Name | Status | Description | Technology |
|------|-------------|--------|-------------|------------|
| **3000** | **Rabhan Web** | ✅ Running | Main user & contractor web application | React 18 + TypeScript + Vite |
| **3010** | **Admin Dashboard** | ✅ Running | Administrative interface for platform management | React 18 + TypeScript + Tailwind CSS |

### **Backend Microservices**
| Port | Service Name | Status | Description | Database | Health Endpoint |
|------|-------------|--------|-------------|----------|----------------|
| **3001** | **Auth Service** | ✅ Running | Authentication & authorization service | `rabhan_auth` | `/health` |
| **3002** | **User Service** | ✅ Running | User profile management & KYC | `rabhan_users` | `/health` |
| **3003** | **Document Service** | ✅ Running | Document upload & verification | `rabhan_documents` | `/health` |
| **3004** | **Contractor Service** | ✅ Running | Contractor management & business logic | `rabhan_contractors` | `/health` |
| **3005** | **Solar Calculator Service** | ✅ Running | Solar system calculations & estimations | Shared DB | `/health` |
| **3006** | **Admin Service** | ✅ Running | Admin operations & dashboard APIs | `rabhan_admin` | `/health` |
| **3007** | **Marketplace Service** | ✅ Running | Product catalog & marketplace | `rabhan_marketplace` | `/health` |
| **3009** | **Quote Service** | ✅ Running | Quote requests & management | `rabhan_quotes` | `/health` |

---

## 📊 **Service Details**

### **🌐 Frontend Applications**

#### **Rabhan Web (Port 3000)**
- **Purpose**: Main customer-facing web application
- **Users**: Homeowners, contractors, general public
- **Features**:
  - User registration and authentication
  - Contractor registration and dashboard
  - Solar calculator with real-time estimates
  - Document upload and KYC process
  - Marketplace browsing and product selection
  - Quote request and management
  - Multi-language support (Arabic RTL + English LTR)
  - Responsive design with mobile-first approach
- **Technology Stack**:
  - React 18 with TypeScript
  - Vite for build tooling
  - Styled Components for styling
  - React Router for navigation
  - i18next for internationalization
  - Framer Motion for animations

#### **Admin Dashboard (Port 3010)**
- **Purpose**: Administrative interface for platform management
- **Users**: RABHAN administrators and staff
- **Features**:
  - User management and KYC review
  - Contractor verification and approval
  - Quote review and processing
  - Analytics and reporting
  - Compliance monitoring
  - System configuration
- **Technology Stack**:
  - React 18 with TypeScript
  - Tailwind CSS for styling
  - Chart.js for analytics
  - React Query for data management

### **🔧 Backend Microservices**

#### **Auth Service (Port 3001)**
- **Database**: `rabhan_auth`
- **Purpose**: Centralized authentication and authorization
- **Key Features**:
  - JWT-based authentication with refresh tokens
  - Role-based access control (USER, CONTRACTOR, ADMIN)
  - Phone and email verification
  - Session management with HttpOnly cookies
  - SAMA CSF compliance logging
  - Rate limiting and security controls
- **API Endpoints**:
  - `POST /api/auth/register` - User registration
  - `POST /api/auth/login` - User authentication
  - `POST /api/auth/logout` - Session termination
  - `POST /api/auth/refresh` - Token refresh
  - `GET /api/auth/profile` - Current user profile
  - `POST /api/auth/phone/verify` - Phone verification
  - `POST /api/auth/email/verify` - Email verification

#### **User Service (Port 3002)**
- **Database**: `rabhan_users`
- **Purpose**: User profile management and KYC processing
- **Key Features**:
  - Complete user profile management
  - KYC document tracking
  - BNPL eligibility assessment
  - Geographic and property information
  - Solar system preferences
  - Compliance audit logging
- **API Endpoints**:
  - `POST /api/users/profiles` - Create user profile
  - `GET /api/users/profiles/me` - Get current user profile
  - `PUT /api/users/profiles/me` - Update user profile
  - `GET /api/users/profiles/me/bnpl-eligibility` - Check BNPL eligibility
  - `GET /api/users/profiles/me/documents` - Get user documents

#### **Document Service (Port 3003)**
- **Database**: `rabhan_documents`
- **Purpose**: Secure document handling and verification
- **Key Features**:
  - Encrypted file storage
  - Document verification workflow
  - Multiple document types support
  - Metadata management
  - Compliance tracking
- **API Endpoints**:
  - `POST /api/documents/upload` - Upload document
  - `GET /api/documents/status/:id` - Document status
  - `GET /api/documents/download/:id` - Download document
  - `PUT /api/documents/:id/verify` - Verify document

#### **Contractor Service (Port 3004)**
- **Database**: `rabhan_contractors`
- **Purpose**: Contractor business management
- **Key Features**:
  - Contractor registration and verification
  - Business license validation
  - Service area management
  - Performance tracking
  - Quote assignment
- **API Endpoints**:
  - `POST /api/contractors/register` - Contractor registration
  - `GET /api/contractors/profile` - Contractor profile
  - `PUT /api/contractors/profile` - Update profile
  - `GET /api/contractors/quotes` - Assigned quotes
  - `POST /api/contractors/quotes/:id/respond` - Respond to quote

#### **Solar Calculator Service (Port 3005)**
- **Purpose**: Solar system calculations and estimations
- **Key Features**:
  - Real-time solar calculations
  - Regional pricing data
  - Installation cost estimates
  - ROI calculations
  - Financing options
- **API Endpoints**:
  - `POST /api/solar-calculator/calculate` - Calculate solar system
  - `GET /api/solar-calculator/pricing` - Get pricing data
  - `POST /api/solar-calculator/estimate` - Generate estimate

#### **Admin Service (Port 3006)**
- **Database**: `rabhan_admin`
- **Purpose**: Administrative operations and management
- **Key Features**:
  - User and contractor management
  - KYC review and approval
  - System analytics and reporting
  - Compliance monitoring
  - Configuration management
- **API Endpoints**:
  - `GET /api/admin/users` - List all users
  - `GET /api/admin/contractors` - List all contractors
  - `GET /api/admin/analytics` - System analytics
  - `PUT /api/admin/users/:id/verify` - Verify user
  - `GET /api/admin/compliance` - Compliance reports

#### **Marketplace Service (Port 3007)**
- **Database**: `rabhan_marketplace`
- **Purpose**: Product catalog and marketplace management
- **Key Features**:
  - Solar product catalog
  - Pricing management
  - Inventory tracking
  - Product recommendations
  - Order management
- **API Endpoints**:
  - `GET /api/marketplace/products` - List products
  - `GET /api/marketplace/products/:id` - Product details
  - `POST /api/marketplace/products` - Add product
  - `PUT /api/marketplace/products/:id` - Update product
  - `POST /api/marketplace/orders` - Create order

#### **Quote Service (Port 3009)**
- **Database**: `rabhan_quotes`
- **Purpose**: Quote request and management system
- **Key Features**:
  - Quote request processing
  - Contractor assignment
  - Quote comparison
  - Approval workflow
  - Status tracking
- **API Endpoints**:
  - `POST /api/quotes/request` - Create quote request
  - `GET /api/quotes` - List quotes
  - `GET /api/quotes/:id` - Quote details
  - `PUT /api/quotes/:id/assign` - Assign contractor
  - `POST /api/quotes/:id/approve` - Approve quote

---

## 🗄️ **Database Architecture**

### **Separate Databases by Service**
| Database Name | Service | Purpose | Key Tables |
|---------------|---------|---------|------------|
| `rabhan_auth` | Auth Service | Authentication data | `users`, `contractors`, `sessions`, `tokens` |
| `rabhan_users` | User Service | User profiles & KYC | `user_profiles`, `user_documents`, `user_activities` |
| `rabhan_contractors` | Contractor Service | Contractor data | `contractor_profiles`, `certifications`, `service_areas` |
| `rabhan_documents` | Document Service | Document management | `documents`, `document_metadata`, `verification_logs` |
| `rabhan_admin` | Admin Service | Admin operations | `admin_users`, `audit_logs`, `system_settings` |
| `rabhan_marketplace` | Marketplace Service | Product catalog | `products`, `categories`, `inventory`, `orders` |
| `rabhan_quotes` | Quote Service | Quote management | `quote_requests`, `quotations`, `contractor_assignments` |

---

## 🔐 **Security & Compliance**

### **Security Features**
- **Authentication**: JWT with refresh tokens and HttpOnly cookies
- **Authorization**: Role-based access control (RBAC)
- **Data Protection**: Encryption at rest and in transit
- **Rate Limiting**: API rate limiting and DDoS protection
- **Input Validation**: Comprehensive input sanitization
- **Audit Logging**: Complete audit trail for compliance

### **SAMA Compliance**
- **CSF Framework**: SAMA Cybersecurity Framework implementation
- **Data Residency**: All data stored within Saudi Arabia
- **Audit Trails**: Comprehensive logging for regulatory compliance
- **Risk Assessment**: Continuous risk monitoring and assessment
- **Incident Response**: Automated incident detection and response

---

## 🚀 **Deployment & Operations**

### **Environment Configuration**
- **Development**: All services running on localhost
- **Production**: AWS-based deployment with load balancing
- **Security**: WAF, SSL/TLS termination, VPC isolation
- **Monitoring**: CloudWatch, application metrics, health checks
- **Backup**: Automated daily backups with point-in-time recovery

### **Service Dependencies**
```
┌─────────────────┐    ┌─────────────────┐
│  Rabhan Web     │────│  Admin Dashboard │
│  (Port 3000)    │    │  (Port 3010)     │
└─────────────────┘    └─────────────────┘
         │                       │
         ▼                       ▼
┌─────────────────────────────────────────────────┐
│              API Gateway / Load Balancer         │
└─────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  Auth Service   │  │  User Service   │  │ Document Service│
│  (Port 3001)    │  │  (Port 3002)    │  │  (Port 3003)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│Contractor Service│ │ Solar Calculator │ │  Admin Service  │
│  (Port 3004)    │  │  (Port 3005)    │  │  (Port 3006)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐           │           ┌─────────────────┐
│Marketplace Svc  │           │           │  Quote Service  │
│  (Port 3007)    │           │           │  (Port 3009)    │
└─────────────────┘           ▼           └─────────────────┘
                     ┌─────────────────┐
                     │   Shared Redis   │
                     │   PostgreSQL     │
                     └─────────────────┘
```

---

## 📈 **Health & Monitoring**

### **Health Check Endpoints**
All services expose `/health` endpoints with the following information:
- Service status and version
- Database connectivity
- Memory usage and uptime
- Environment and configuration
- Dependency health status

### **Current Service Status**
✅ **All Services Operational** (100% Availability)
- Frontend Applications: 2/2 Running
- Backend Services: 8/8 Running
- Average Uptime: >23,000 seconds (6.5+ hours)
- All health checks passing

---

## 🔄 **API Response Format**

### **Standard Response Structure**
```json
{
  "success": true,
  "data": {},
  "message": "Optional message",
  "metadata": {
    "timestamp": "2025-08-13T17:00:00.000Z",
    "version": "1.0.0",
    "requestId": "req_12345"
  }
}
```

### **Error Response Structure**
```json
{
  "success": false,
  "error": "Error description",
  "code": "ERROR_CODE",
  "details": {},
  "metadata": {
    "timestamp": "2025-08-13T17:00:00.000Z",
    "version": "1.0.0",
    "requestId": "req_12345"
  }
}
```

---

## 📝 **Notes**

### **Port Allocation Strategy**
- **30xx**: Main application ports
- **3000**: Primary frontend (user-facing)
- **3001-3009**: Backend microservices
- **3010**: Secondary frontend (admin)

### **Service Communication**
- **HTTP/REST**: Primary communication protocol
- **JWT**: Authentication between services
- **PostgreSQL**: Primary data storage
- **Redis**: Session storage and caching

### **Development Environment**
- **Node.js**: Runtime environment
- **TypeScript**: Primary development language
- **Docker**: Containerization (prepared)
- **Vite**: Frontend build tool
- **Jest**: Testing framework

---

*Last Updated: August 13, 2025*  
*Platform Version: 1.0.0*  
*Environment: Development*