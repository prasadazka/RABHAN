-- RABHAN Marketplace Service - Approval Workflow and Order Management (Simplified)
-- SAMA Compliant | Zero-Trust Security | Complete Product Lifecycle

BEGIN;

-- =====================================================
-- 1. EXTEND PRODUCTS TABLE FOR APPROVAL WORKFLOW
-- =====================================================

-- Add approval workflow fields to products table
ALTER TABLE products ADD COLUMN approval_status VARCHAR(20) DEFAULT 'PENDING' 
    CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUIRED'));

ALTER TABLE products ADD COLUMN approved_by UUID;
ALTER TABLE products ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE products ADD COLUMN rejection_reason TEXT;
ALTER TABLE products ADD COLUMN admin_notes TEXT;

-- Update status constraint to include draft and pending states
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_status_check;
ALTER TABLE products ADD CONSTRAINT products_status_check 
    CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'DISCONTINUED'));

-- Update default status for new products
ALTER TABLE products ALTER COLUMN status SET DEFAULT 'DRAFT';

-- Add indexes for approval queries
CREATE INDEX idx_products_approval_status ON products(approval_status);
CREATE INDEX idx_products_approved_by ON products(approved_by);
CREATE INDEX idx_products_pending_approval ON products(status, approval_status) 
    WHERE status = 'PENDING_APPROVAL' AND approval_status = 'PENDING';

-- =====================================================
-- 2. ORDERS TABLE (Complete Order Management)
-- =====================================================

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number VARCHAR(20) NOT NULL UNIQUE,
    user_id UUID NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(20) NOT NULL,
    
    -- Shipping Address
    shipping_address_line1 VARCHAR(255) NOT NULL,
    shipping_address_line2 VARCHAR(255),
    shipping_city VARCHAR(100) NOT NULL,
    shipping_region VARCHAR(100) NOT NULL,
    shipping_postal_code VARCHAR(20),
    shipping_country VARCHAR(3) DEFAULT 'SAU',
    
    -- Billing Address
    billing_same_as_shipping BOOLEAN DEFAULT true,
    billing_address_line1 VARCHAR(255),
    billing_address_line2 VARCHAR(255),
    billing_city VARCHAR(100),
    billing_region VARCHAR(100),
    billing_postal_code VARCHAR(20),
    billing_country VARCHAR(3) DEFAULT 'SAU',
    
    -- Order Totals
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
    shipping_cost DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (shipping_cost >= 0),
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
    total_amount DECIMAL(12,2) NOT NULL CHECK (total_amount >= 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    
    -- Order Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED')
    ),
    payment_status VARCHAR(20) DEFAULT 'PENDING' CHECK (
        payment_status IN ('PENDING', 'PAID', 'PARTIALLY_PAID', 'FAILED', 'REFUNDED')
    ),
    
    -- Special Requirements
    special_instructions TEXT,
    delivery_notes TEXT,
    estimated_delivery_date DATE,
    actual_delivery_date DATE,
    
    -- Payment Information
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    payment_date TIMESTAMP WITH TIME ZONE,
    
    -- Installation
    assigned_contractor_id UUID,
    installation_required BOOLEAN DEFAULT false,
    installation_date DATE,
    installation_status VARCHAR(20) CHECK (
        installation_status IN ('NOT_REQUIRED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')
    ),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    
    -- SAMA Compliance
    sama_reference_number VARCHAR(50),
    compliance_verified BOOLEAN DEFAULT false
);

-- =====================================================
-- 3. ORDER_ITEMS TABLE
-- =====================================================

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    product_id UUID NOT NULL,
    contractor_id UUID NOT NULL,
    
    -- Product snapshot
    product_name VARCHAR(255) NOT NULL,
    product_name_ar VARCHAR(255),
    product_sku VARCHAR(50),
    product_brand VARCHAR(100),
    product_model VARCHAR(100),
    
    -- Pricing
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    line_total DECIMAL(12,2) NOT NULL CHECK (line_total >= 0),
    
    -- Details
    specifications JSONB DEFAULT '{}',
    installation_required BOOLEAN DEFAULT false,
    installation_notes TEXT,
    warranty_period_months INTEGER DEFAULT 0,
    
    -- Status
    status VARCHAR(20) DEFAULT 'PENDING' CHECK (
        status IN ('PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'RETURNED')
    ),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
    CONSTRAINT check_line_total CHECK (line_total = unit_price * quantity)
);

-- =====================================================
-- 4. ORDER_STATUS_HISTORY TABLE
-- =====================================================

CREATE TABLE order_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id UUID NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    status_type VARCHAR(20) NOT NULL CHECK (status_type IN ('ORDER', 'PAYMENT', 'SHIPPING', 'INSTALLATION')),
    reason VARCHAR(255),
    notes TEXT,
    changed_by UUID NOT NULL,
    changed_by_role VARCHAR(20) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_order_status_history_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- =====================================================
-- 5. PRODUCT_APPROVAL_HISTORY TABLE
-- =====================================================

CREATE TABLE product_approval_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL,
    previous_status VARCHAR(20),
    new_status VARCHAR(20) NOT NULL,
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('SUBMIT', 'APPROVE', 'REJECT', 'REQUEST_CHANGES')),
    admin_id UUID NOT NULL,
    admin_notes TEXT,
    rejection_reason TEXT,
    changes_required TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_product_approval_history_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- =====================================================
-- INDEXES
-- =====================================================

-- Orders indexes
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_payment_status ON orders(payment_status);
CREATE INDEX idx_orders_assigned_contractor ON orders(assigned_contractor_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_order_number ON orders(order_number);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_order_items_contractor_id ON order_items(contractor_id);

-- Status history indexes
CREATE INDEX idx_order_status_history_order_id ON order_status_history(order_id);
CREATE INDEX idx_order_status_history_created_at ON order_status_history(created_at DESC);

-- Approval history indexes
CREATE INDEX idx_product_approval_history_product_id ON product_approval_history(product_id);
CREATE INDEX idx_product_approval_history_admin_id ON product_approval_history(admin_id);
CREATE INDEX idx_product_approval_history_created_at ON product_approval_history(created_at DESC);

COMMIT;