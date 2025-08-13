# Quote Management Service Implementation Plan

## 🎯 Service Overview

The Quote Management Service is a financial intermediation system that manages the complete quote-to-payment lifecycle between users, contractors, and the RABHAN platform. It handles pricing calculations, commissions, wallets, penalties, and payment processing.

## 📊 Service Architecture

### Port Configuration
- **Quote Service Port**: 3009 (avoiding conflicts with existing services)
- **Database**: PostgreSQL (quote_service_db)
- **Redis**: For caching and session management

### Integration Points
```
User Service (3002) ←→ Quote Service (3009) ←→ Contractor Service (3004)
                            ↑
                            ↓
                     Admin Service (3006)
                            ↑
                            ↓
                  Solar Calculator Service (3005)
```

## 💰 Financial Configuration

### Configurable Business Rules (environment variables)
```env
# Pricing Rules
MAX_PRICE_PER_KWP=2000          # Maximum contractor price per kWp
PLATFORM_OVERPRICE_PERCENT=10    # Platform markup percentage
PLATFORM_COMMISSION_PERCENT=15   # Commission from contractor

# Penalty Rules
USER_CANCELLATION_PENALTY=500    # Fixed penalty for user cancellation
CONTRACTOR_PENALTY_PERCENT=50    # Percentage to contractor from user penalty
INSTALLATION_DELAY_PENALTY_PER_DAY=100  # Daily penalty for late installation

# Payment Rules
MIN_DOWN_PAYMENT_PERCENT=20      # Minimum down payment percentage
MAX_INSTALLMENT_MONTHS=24        # Maximum BNPL duration
```

## 🗄️ Database Schema

### Core Tables

```sql
-- 1. Quote Requests Table
CREATE TABLE quote_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    property_details JSONB NOT NULL,
    electricity_consumption JSONB NOT NULL,
    system_size_kwp DECIMAL(10,2) NOT NULL,
    location_gps POINT NOT NULL,
    roof_size_sqm DECIMAL(10,2),
    status VARCHAR(50) DEFAULT 'pending',
    inspection_dates JSONB,
    selected_contractors UUID[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Contractor Quotes Table
CREATE TABLE contractor_quotes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES quote_requests(id),
    contractor_id UUID NOT NULL,
    base_price DECIMAL(12,2) NOT NULL,
    price_per_kwp DECIMAL(10,2) NOT NULL,
    overprice_amount DECIMAL(12,2),
    total_user_price DECIMAL(12,2),
    installation_timeline_days INTEGER,
    system_specs JSONB NOT NULL,
    warranty_terms JSONB,
    maintenance_terms JSONB,
    admin_status VARCHAR(50) DEFAULT 'pending_review',
    admin_notes TEXT,
    reviewed_by UUID,
    reviewed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. Invoices Table
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES contractor_quotes(id),
    invoice_number VARCHAR(100) UNIQUE,
    total_amount DECIMAL(12,2) NOT NULL,
    overprice_deduction DECIMAL(12,2),
    commission_deduction DECIMAL(12,2),
    penalty_deduction DECIMAL(12,2) DEFAULT 0,
    net_amount DECIMAL(12,2) NOT NULL,
    vat_amount DECIMAL(12,2),
    invoice_file_url TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. Contractor Wallets Table
CREATE TABLE contractor_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    contractor_id UUID UNIQUE NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0,
    pending_balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(12,2) DEFAULT 0,
    total_commission_paid DECIMAL(12,2) DEFAULT 0,
    total_penalties DECIMAL(12,2) DEFAULT 0,
    bank_account_details JSONB,
    payment_methods JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. Wallet Transactions Table
CREATE TABLE wallet_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_id UUID REFERENCES contractor_wallets(id),
    transaction_type VARCHAR(50), -- payment, commission, penalty, withdrawal
    amount DECIMAL(12,2) NOT NULL,
    reference_id UUID,
    reference_type VARCHAR(50), -- quote, invoice, penalty
    description TEXT,
    balance_after DECIMAL(12,2),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Penalties Table
CREATE TABLE penalties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES contractor_quotes(id),
    penalty_type VARCHAR(50), -- user_cancellation, installation_delay
    amount DECIMAL(12,2) NOT NULL,
    reason TEXT,
    applied_to VARCHAR(50), -- user, contractor
    wallet_transaction_id UUID,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Payment Schedules Table
CREATE TABLE payment_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id UUID REFERENCES contractor_quotes(id),
    total_amount DECIMAL(12,2) NOT NULL,
    down_payment DECIMAL(12,2) NOT NULL,
    installment_months INTEGER,
    monthly_amount DECIMAL(12,2),
    payments_completed INTEGER DEFAULT 0,
    next_payment_date DATE,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. Quote Comparisons Table
CREATE TABLE quote_comparisons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id UUID REFERENCES quote_requests(id),
    user_id UUID NOT NULL,
    compared_quotes UUID[],
    selected_quote_id UUID,
    comparison_criteria JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_quote_requests_user_id ON quote_requests(user_id);
CREATE INDEX idx_quote_requests_status ON quote_requests(status);
CREATE INDEX idx_contractor_quotes_request_id ON contractor_quotes(request_id);
CREATE INDEX idx_contractor_quotes_contractor_id ON contractor_quotes(contractor_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON wallet_transactions(wallet_id);
CREATE INDEX idx_invoices_quote_id ON invoices(quote_id);
```

## 🚀 Implementation Phases

### Phase 1: Core Quote Management (Task 1-4)
- Quote request creation and management
- Contractor matching based on location
- Basic quote submission and validation
- Price calculation with configurable rules

### Phase 2: Financial Processing (Task 5-6)
- Commission calculation engine
- Invoice generation with deductions
- Contractor wallet system
- Transaction history tracking

### Phase 3: Admin Integration (Task 7-8)
- Quote approval workflow
- Price validation and override
- Penalty management system
- Reporting and analytics

### Phase 4: Frontend Integration (Task 9-10)
- User quote request interface
- Contractor quote submission
- Quote comparison view
- Wallet dashboard for contractors

## 🔧 API Endpoints

### User Endpoints
```
POST   /api/quotes/request              - Create quote request
GET    /api/quotes/my-requests          - Get user's quote requests
GET    /api/quotes/request/:id/quotes   - Get quotes for a request
POST   /api/quotes/compare              - Compare multiple quotes
POST   /api/quotes/select               - Select a quote
GET    /api/quotes/payment-schedule/:id - Get payment schedule
```

### Contractor Endpoints
```
GET    /api/quotes/contractor/requests     - Get available requests in area
POST   /api/quotes/contractor/submit       - Submit a quote
GET    /api/quotes/contractor/my-quotes    - Get contractor's quotes
POST   /api/quotes/contractor/invoice      - Upload invoice
GET    /api/quotes/contractor/wallet       - Get wallet details
GET    /api/quotes/contractor/transactions - Get transaction history
```

### Admin Endpoints
```
GET    /api/quotes/admin/pending-review    - Get quotes pending review
POST   /api/quotes/admin/approve/:id       - Approve a quote
POST   /api/quotes/admin/reject/:id        - Reject a quote
POST   /api/quotes/admin/apply-penalty     - Apply penalty
GET    /api/quotes/admin/analytics         - Get quote analytics
PUT    /api/quotes/admin/config            - Update business rules
```

## 🎨 Frontend Components (Using Theme Colors)

### Theme Configuration
```typescript
// Using RABHAN theme colors
const quoteTheme = {
  primary: '#3eb2b1',      // Main actions
  secondary: '#2d8786',    // Hover states
  success: '#4caf50',      // Approved quotes
  warning: '#ff9800',      // Pending quotes
  danger: '#f44336',       // Rejected/penalties
  background: '#f5f5f5',   // Page background
  card: '#ffffff',         // Card backgrounds
  text: {
    primary: '#212121',    // Main text
    secondary: '#757575',  // Secondary text
    white: '#ffffff'       // Text on colored backgrounds
  }
}
```

### Component Structure
```
/frontend/rabhan-web/src/pages/quotes/
  ├── UserQuoteRequest.tsx       // Quote request form
  ├── UserQuoteList.tsx          // User's quote requests
  ├── QuoteComparison.tsx        // Compare contractor quotes
  ├── ContractorQuoteForm.tsx    // Contractor quote submission
  ├── ContractorWallet.tsx       // Enhanced wallet view
  └── AdminQuoteApproval.tsx     // Admin approval interface
```

## 📈 Calculation Examples

### Example 1: Standard Quote
```javascript
// User requests 5kWp system
const systemSize = 5; // kWp
const contractorPrice = 1800; // SAR per kWp (below max 2000)

// Calculations
const basePrice = systemSize * contractorPrice; // 9,000 SAR
const overprice = basePrice * 0.10; // 900 SAR
const userPrice = basePrice + overprice; // 9,900 SAR

// Contractor receives
const commission = basePrice * 0.15; // 1,350 SAR
const netPayment = basePrice - commission; // 7,650 SAR
```

### Example 2: With Installation Delay Penalty
```javascript
const delayDays = 3;
const penaltyPerDay = 100; // SAR
const totalPenalty = delayDays * penaltyPerDay; // 300 SAR

// Final contractor payment
const finalPayment = netPayment - totalPenalty; // 7,350 SAR
```

## 🔒 Security Considerations

1. **Role-based Access Control**
   - Users can only see their quotes
   - Contractors see quotes in their service area
   - Admin has full access with audit trail

2. **Price Validation**
   - Automatic rejection if price > MAX_PRICE_PER_KWP
   - Admin override with justification required

3. **Financial Security**
   - All amounts stored with 2 decimal precision
   - Transaction logging for audit trail
   - Wallet balance validation before withdrawals

4. **Data Protection**
   - Encrypted sensitive financial data
   - PII protection in compliance with SAMA
   - Regular backups of financial records

## 🧪 Testing Strategy

1. **Unit Tests**
   - Financial calculation accuracy
   - Business rule validation
   - Database constraint testing

2. **Integration Tests**
   - Service-to-service communication
   - Complete quote lifecycle
   - Payment processing flow

3. **Load Testing**
   - 1000+ concurrent quote requests
   - Wallet transaction performance
   - Real-time calculation speed

## 📊 Monitoring & Analytics

### Key Metrics
- Average quote response time
- Quote approval rate
- Commission revenue tracking
- Penalty frequency analysis
- Contractor performance scores
- User satisfaction ratings

### Dashboards
- Admin: Revenue, approvals, penalties
- Contractor: Earnings, quotes, performance
- User: Savings, payment schedule, quotes

## 🚦 Success Criteria

- [ ] All financial calculations accurate to 2 decimal places
- [ ] Quote approval < 24 hours
- [ ] 99.9% uptime for financial operations
- [ ] Complete audit trail for all transactions
- [ ] Configurable business rules without code changes
- [ ] Mobile-responsive UI with theme consistency
- [ ] SAMA compliance for financial operations

## 📝 Next Steps

1. **Task 1**: Create this documentation ✅
2. **Task 2**: Set up database schema
3. **Task 3**: Create Quote Service backend
4. **Task 4**: Implement core quote APIs
5. **Task 5**: Build financial engine
6. **Task 6**: Create wallet system
7. **Task 7**: Admin approval workflow
8. **Task 8**: Penalty management
9. **Task 9**: Frontend components
10. **Task 10**: End-to-end testing

---

**Service Ready for Implementation**