# 🛒 MARKETPLACE SERVICE - Implementation Plan & Architecture

## 📊 **SYSTEM ARCHITECTURE DIAGRAM**

```mermaid
graph TB
    subgraph "FRONTEND LAYER"
        UWA[User Web App<br/>Port 3000]
        ADB[Admin Dashboard<br/>Port 3000]
        CDB[Contractor Dashboard<br/>Port 3000]
    end

    subgraph "API GATEWAY LAYER"
        GW[API Gateway<br/>Load Balancer]
    end

    subgraph "MARKETPLACE SERVICE"
        MS[Marketplace Service<br/>Port 3007<br/>Node.js/TypeScript]
        
        subgraph "Marketplace Components"
            PC[Product Controller]
            CC[Category Controller]
            SC[Search Controller]
            IC[Inventory Controller]
            AC[Admin Controller]
        end
        
        subgraph "Business Logic"
            PM[Product Manager]
            SM[Search Manager]
            IM[Inventory Manager]
            VM[Validation Manager]
        end
    end

    subgraph "DATABASE LAYER"
        MPDB[(Marketplace DB<br/>PostgreSQL<br/>rabhan_marketplace)]
        
        subgraph "Tables"
            PT[products]
            CT[categories]
            IT[inventory]
            PIT[product_images]
            PDT[product_documents]
        end
    end

    subgraph "EXISTING SERVICES"
        AS[Auth Service<br/>Port 3001]
        US[User Service<br/>Port 3002]
        CS[Contractor Service<br/>Port 3004]
        DS[Document Service<br/>Port 3003]
        ADS[Admin Service<br/>Port 3006]
    end

    subgraph "EXTERNAL STORAGE"
        MINIO[MinIO Object Storage<br/>Product Images & Documents]
    end

    subgraph "FUTURE SERVICES"
        QMS[Quote Management Service<br/>Port 3008]
        NS[Notification Service<br/>Port 3009]
    end

    %% Frontend to Gateway
    UWA --> GW
    ADB --> GW
    CDB --> GW

    %% Gateway to Marketplace
    GW --> MS

    %% Marketplace Internal Flow
    MS --> PC
    MS --> CC
    MS --> SC
    MS --> IC
    MS --> AC
    
    PC --> PM
    CC --> PM
    SC --> SM
    IC --> IM
    AC --> VM

    %% Database Connections
    PM --> MPDB
    SM --> MPDB
    IM --> MPDB
    VM --> MPDB

    %% Service Integrations
    MS --> AS
    MS --> CS
    MS --> DS
    MS --> ADS

    %% Storage Integration
    MS --> MINIO

    %% Future Integration Points
    MS -.-> QMS
    MS -.-> NS

    %% Database Tables
    MPDB --> PT
    MPDB --> CT
    MPDB --> IT
    MPDB --> PIT
    MPDB --> PDT

    style MS fill:#3eb2b1,stroke:#2d8a87,color:#fff
    style MPDB fill:#ff9999,stroke:#cc0000,color:#fff
    style MINIO fill:#ffcc99,stroke:#ff6600,color:#000
    style QMS fill:#cccccc,stroke:#999999,color:#000
    style NS fill:#cccccc,stroke:#999999,color:#000
```

---

## 🗓️ **IMPLEMENTATION TIMELINE DIAGRAM**

```mermaid
gantt
    title Marketplace Service Implementation Timeline
    dateFormat  YYYY-MM-DD
    section Phase 1: Backend Foundation
    Database Schema & Models       :phase1a, 2025-08-06, 2d
    Product CRUD APIs             :phase1b, after phase1a, 2d
    Category Management APIs      :phase1c, after phase1b, 2d
    Search & Filtering APIs       :phase1d, after phase1c, 2d
    Basic Validation & Security   :phase1e, after phase1d, 1d

    section Phase 2: Frontend Development
    Product Listing Pages         :phase2a, 2025-08-13, 3d
    Product Detail Pages          :phase2b, after phase2a, 2d
    Search & Filter Interface     :phase2c, after phase2b, 2d
    Responsive Design             :phase2d, after phase2c, 1d

    section Phase 3: Contractor Integration
    Contractor Product Dashboard  :phase3a, 2025-08-21, 2d
    Product Creation/Edit Forms   :phase3b, after phase3a, 2d
    Inventory Management UI       :phase3c, after phase3b, 2d
    Image Upload Functionality    :phase3d, after phase3c, 1d

    section Phase 4: Admin & Integration
    Admin Product Approval       :phase4a, 2025-08-28, 2d
    Service Integration Testing   :phase4b, after phase4a, 2d
    Performance Optimization     :phase4c, after phase4b, 1d
    Final Testing & Deployment    :phase4d, after phase4c, 1d
```

---

## 🔄 **SERVICE INTEGRATION FLOW DIAGRAM**

```mermaid
sequenceDiagram
    participant U as User
    participant UWA as User Web App
    participant MS as Marketplace Service
    participant CS as Contractor Service
    participant AS as Auth Service
    participant DS as Document Service
    participant MINIO as MinIO Storage

    Note over U, MINIO: User Browsing Products Flow

    U->>UWA: Browse Products
    UWA->>MS: GET /api/products?category=solar_panels
    MS->>AS: Validate Session Token
    AS-->>MS: Token Valid
    MS->>MS: Query Products Database
    MS-->>UWA: Return Product List
    UWA-->>U: Display Products

    Note over U, MINIO: Product Detail View Flow

    U->>UWA: Click Product Details
    UWA->>MS: GET /api/products/{productId}
    MS->>CS: GET contractor details
    CS-->>MS: Contractor info
    MS->>MINIO: Get product images
    MINIO-->>MS: Image URLs
    MS-->>UWA: Complete Product Data
    UWA-->>U: Display Product Details

    Note over U, MINIO: Contractor Adding Product Flow

    U->>UWA: Login as Contractor
    UWA->>AS: Authenticate
    AS-->>UWA: Contractor Token
    
    U->>UWA: Add New Product
    UWA->>MS: POST /api/products
    MS->>AS: Validate Contractor Token
    AS-->>MS: Valid Contractor
    MS->>DS: Upload Product Images
    DS->>MINIO: Store Images
    MINIO-->>DS: Image URLs
    DS-->>MS: Image References
    MS->>MS: Save Product to Database
    MS-->>UWA: Product Created
    UWA-->>U: Success Message
```

---

## 🏗️ **DATABASE SCHEMA DIAGRAM**

```mermaid
erDiagram
    PRODUCTS {
        uuid id PK
        uuid contractor_id FK
        varchar name
        varchar name_ar
        text description
        text description_ar
        varchar category
        varchar subcategory
        varchar brand
        varchar model
        jsonb specifications
        decimal price
        varchar currency
        decimal price_per_kwp
        boolean vat_included
        integer stock_quantity
        varchar stock_status
        integer minimum_order
        varchar status
        varchar approval_status
        timestamp created_at
        timestamp updated_at
    }

    CATEGORIES {
        uuid id PK
        varchar name
        varchar name_ar
        varchar slug
        text description
        text description_ar
        varchar icon
        integer sort_order
        boolean is_active
        timestamp created_at
    }

    SUBCATEGORIES {
        uuid id PK
        uuid category_id FK
        varchar name
        varchar name_ar
        varchar slug
        text description
        integer sort_order
        boolean is_active
    }

    PRODUCT_IMAGES {
        uuid id PK
        uuid product_id FK
        varchar file_name
        varchar original_name
        varchar file_path
        varchar mime_type
        integer file_size
        integer sort_order
        boolean is_primary
        timestamp created_at
    }

    PRODUCT_DOCUMENTS {
        uuid id PK
        uuid product_id FK
        varchar document_type
        varchar file_name
        varchar original_name
        varchar file_path
        varchar mime_type
        integer file_size
        timestamp created_at
    }

    INVENTORY_LOGS {
        uuid id PK
        uuid product_id FK
        varchar action_type
        integer quantity_change
        integer quantity_before
        integer quantity_after
        varchar reason
        uuid created_by
        timestamp created_at
    }

    PRODUCT_REVIEWS {
        uuid id PK
        uuid product_id FK
        uuid customer_id FK
        integer rating
        text review_text
        boolean is_verified
        boolean is_approved
        timestamp created_at
    }

    CONTRACTORS {
        uuid id PK
        varchar business_name
        varchar email
        varchar phone
        varchar status
    }

    PRODUCTS ||--o{ PRODUCT_IMAGES : has
    PRODUCTS ||--o{ PRODUCT_DOCUMENTS : has
    PRODUCTS ||--o{ INVENTORY_LOGS : tracks
    PRODUCTS ||--o{ PRODUCT_REVIEWS : receives
    PRODUCTS }o--|| CONTRACTORS : belongs_to
    CATEGORIES ||--o{ SUBCATEGORIES : contains
    PRODUCTS }o--|| CATEGORIES : categorized_in
    PRODUCTS }o--|| SUBCATEGORIES : sub_categorized_in
```

---

## 🎯 **FEATURE IMPLEMENTATION PHASES**

```mermaid
mindmap
  root((Marketplace Service))
    Phase 1: Backend Core
      Database Models
        Product Model
        Category Model
        Inventory Model
        Image Model
      API Endpoints
        Product CRUD
        Category Management
        Search & Filter
        Inventory Tracking
      Business Logic
        Product Validation
        Price Validation (2000 SAR/kWp)
        Stock Management
        Image Processing
    
    Phase 2: Frontend Core  
      User Interface
        Product Listing Page
        Product Detail Page
        Category Browsing
        Search Results
      Components
        Product Card
        Product Gallery
        Search Bar
        Filter Panel
      Responsive Design
        Mobile First
        Tablet Optimization
        Desktop Layout
    
    Phase 3: Contractor Tools
      Dashboard
        Product Management
        Inventory Overview
        Sales Analytics
        Upload Interface
      Forms
        Product Creation
        Product Editing
        Image Upload
        Bulk Operations
      Integration
        Contractor Service
        Document Service
        Authentication
    
    Phase 4: Admin & Polish
      Admin Panel
        Product Approval
        Category Management
        Quality Control
        Price Monitoring
      Integration Testing
        End-to-End Testing
        Performance Testing
        Security Testing
      Optimization
        Database Indexing
        Caching Strategy
        Image Optimization
```

---

## 🔐 **SECURITY & COMPLIANCE FLOW**

```mermaid
flowchart TD
    A[User Request] --> B{Authenticated?}
    B -->|No| C[Redirect to Login]
    B -->|Yes| D{Authorized Role?}
    
    D -->|User| E[Product Browsing Only]
    D -->|Contractor| F[Own Products Management]
    D -->|Admin| G[All Products Management]
    
    E --> H{Valid Product Request?}
    F --> I{Own Product?}
    G --> J[Full Access Granted]
    
    H -->|Yes| K[Return Public Product Data]
    H -->|No| L[404 Not Found]
    
    I -->|Yes| M[Allow Modification]
    I -->|No| N[403 Forbidden]
    
    K --> O[Audit Log: Product View]
    M --> P[Audit Log: Product Modified]
    N --> Q[Audit Log: Unauthorized Access]
    J --> R[Audit Log: Admin Action]
    
    O --> S[SAMA Compliance Check]
    P --> S
    Q --> S
    R --> S
    
    S --> T[Response with Security Headers]
    
    style A fill:#e1f5fe
    style S fill:#f3e5f5
    style T fill:#e8f5e8
```

---

## 📊 **PERFORMANCE & SCALABILITY PLAN**

```mermaid
graph LR
    subgraph "Performance Optimization"
        A[Database Indexing] --> B[Query Optimization]
        B --> C[Connection Pooling]
        C --> D[Caching Strategy]
    end
    
    subgraph "Caching Layers"
        D --> E[Redis Cache]
        E --> F[Product Listings]
        E --> G[Search Results]
        E --> H[Category Data]
    end
    
    subgraph "Image Optimization"
        I[Image Upload] --> J[Compression]
        J --> K[Multiple Sizes]
        K --> L[WebP Conversion]
        L --> M[CDN Distribution]
    end
    
    subgraph "Search Optimization"
        N[Full-Text Search] --> O[Elasticsearch]
        O --> P[Search Analytics]
        P --> Q[Auto-suggestions]
    end
    
    subgraph "Monitoring"
        R[Response Times] --> S[Database Metrics]
        S --> T[Error Rates]
        T --> U[User Analytics]
    end
    
    style E fill:#ff9999
    style O fill:#99ccff
    style M fill:#99ff99
```

---

## 🧪 **TESTING STRATEGY DIAGRAM**

```mermaid
pyramid
    title Testing Pyramid - Marketplace Service
    
    section Unit Tests
        Product Model Tests
        Category Model Tests
        Search Logic Tests
        Validation Tests
        Business Logic Tests
    
    section Integration Tests
        Database Operations
        Service-to-Service APIs
        Authentication Flow
        File Upload Flow
        Search Functionality
    
    section E2E Tests
        Product Browsing Journey
        Contractor Product Management
        Admin Approval Workflow
        Mobile Responsiveness
        Cross-browser Testing
    
    section Performance Tests
        Load Testing (1000+ concurrent)
        Database Performance
        Search Performance
        Image Loading Speed
```

---

## 🔄 **DEPLOYMENT STRATEGY**

```mermaid
flowchart LR
    subgraph "Development"
        A[Local Development] --> B[Unit Tests]
        B --> C[Integration Tests]
    end
    
    subgraph "CI/CD Pipeline"
        C --> D[GitHub Actions]
        D --> E[Build & Test]
        E --> F[Security Scan]
        F --> G[Code Quality Check]
    end
    
    subgraph "Staging Environment"
        G --> H[Deploy to Staging]
        H --> I[E2E Tests]
        I --> J[Performance Tests]
        J --> K[User Acceptance Testing]
    end
    
    subgraph "Production"
        K --> L[Blue-Green Deployment]
        L --> M[Health Checks]
        M --> N[Monitor & Alert]
    end
    
    subgraph "Rollback Strategy"
        N --> O{Issues Detected?}
        O -->|Yes| P[Automatic Rollback]
        O -->|No| Q[Deployment Success]
    end
    
    style D fill:#4CAF50
    style L fill:#2196F3
    style P fill:#f44336
```

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Backend Foundation (Week 1)**
- [ ] **Day 1-2**: Database schema creation
  - [ ] Create PostgreSQL database
  - [ ] Design and implement tables
  - [ ] Set up relationships and indexes
  - [ ] Create migration scripts

- [ ] **Day 3-4**: Core API development  
  - [ ] Product CRUD endpoints
  - [ ] Category management APIs
  - [ ] Search and filtering APIs
  - [ ] Authentication middleware

- [ ] **Day 5**: Validation and security
  - [ ] Input validation rules
  - [ ] Price validation (2000 SAR/kWp)
  - [ ] Authorization checks
  - [ ] Audit logging

### **Phase 2: Frontend Development (Week 2)**
- [ ] **Day 1-3**: Core UI components
  - [ ] Product listing page
  - [ ] Product detail page
  - [ ] Search interface
  - [ ] Filter components

- [ ] **Day 4-5**: Integration and polish
  - [ ] API integration
  - [ ] Responsive design
  - [ ] Loading states
  - [ ] Error handling

### **Phase 3: Contractor Integration (Week 3)**
- [ ] **Day 1-2**: Contractor dashboard
  - [ ] Product management interface
  - [ ] Inventory tracking
  - [ ] Upload functionality

- [ ] **Day 3-4**: Advanced features
  - [ ] Bulk operations
  - [ ] Image galleries
  - [ ] Product analytics

- [ ] **Day 5**: Admin integration
  - [ ] Approval workflows
  - [ ] Quality control
  - [ ] Final testing

---

## 🎯 **SUCCESS METRICS**

### **Technical KPIs**
- **API Response Time**: < 200ms for product listings
- **Search Performance**: < 500ms for complex searches
- **Image Load Time**: < 2 seconds for product galleries
- **Database Query Time**: < 50ms average
- **Uptime Target**: 99.9%

### **Business KPIs** 
- **Product Catalog Size**: 100+ products by launch
- **Contractor Participation**: 80% of verified contractors
- **Search Success Rate**: 95% of searches return results
- **User Engagement**: Average 2+ minutes on product pages
- **Mobile Usage**: 60%+ of traffic from mobile devices

### **SAMA Compliance KPIs**
- **Price Compliance**: 100% adherence to 2000 SAR/kWp
- **Audit Trail Coverage**: 100% of admin actions logged
- **Security Scan Results**: Zero critical vulnerabilities
- **Data Protection**: 100% PII encryption compliance

---

## 🚀 **NEXT STEPS**

1. **🏗️ START PHASE 1**: Begin database schema and backend API development
2. **👥 TEAM ASSIGNMENT**: Assign 3-4 developers (2 backend, 2 frontend)
3. **🔧 ENVIRONMENT SETUP**: Configure development and testing environments
4. **📊 MONITORING SETUP**: Implement logging and performance monitoring
5. **🧪 TESTING FRAMEWORK**: Set up automated testing pipeline

**Estimated Total Duration**: 3 weeks
**Team Size**: 4 developers
**Dependencies**: Existing services must remain stable
**Risk Level**: Low-Medium (well-defined requirements)

This plan provides a comprehensive roadmap for implementing the Marketplace Service with clear phases, dependencies, and success criteria. Each component is designed to integrate seamlessly with existing services while maintaining SAMA compliance and MVP requirements.