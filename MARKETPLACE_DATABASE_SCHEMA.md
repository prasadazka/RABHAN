# 🗄️ MARKETPLACE SERVICE - DATABASE SCHEMA

## 📊 **DATABASE OVERVIEW**

**Database Name**: `rabhan_marketplace`  
**Engine**: PostgreSQL 14+  
**Encoding**: UTF8  
**Collation**: en_US.UTF-8  
**Time Zone**: Asia/Riyadh

---

## 🏗️ **COMPLETE DATABASE SCHEMA**

### **1. PRODUCTS TABLE (Core)**
```sql
CREATE TABLE products (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    contractor_id UUID NOT NULL,
    category_id UUID NOT NULL,
    subcategory_id UUID,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    name_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    slug VARCHAR(255) NOT NULL UNIQUE,
    
    -- Product Details
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100),
    sku VARCHAR(50) UNIQUE,
    barcode VARCHAR(50),
    
    -- Technical Specifications (JSON)
    specifications JSONB DEFAULT '{}',
    certifications TEXT[],
    warranty_years INTEGER DEFAULT 0,
    warranty_details TEXT,
    
    -- Pricing (MVP: Fixed 2000 SAR/kWp)
    price DECIMAL(10,2) NOT NULL CHECK (price > 0),
    currency VARCHAR(3) DEFAULT 'SAR',
    price_per_kwp DECIMAL(10,2) CHECK (price_per_kwp = 2000.00), -- MVP Constraint
    cost_price DECIMAL(10,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
    vat_rate DECIMAL(5,2) DEFAULT 15.00,
    vat_included BOOLEAN DEFAULT true,
    
    -- Inventory Management
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    stock_status VARCHAR(20) DEFAULT 'IN_STOCK' CHECK (stock_status IN ('IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK', 'DISCONTINUED')),
    minimum_stock INTEGER DEFAULT 5,
    maximum_stock INTEGER DEFAULT 1000,
    minimum_order_quantity INTEGER DEFAULT 1 CHECK (minimum_order_quantity > 0),
    
    -- Physical Properties
    weight_kg DECIMAL(8,2),
    dimensions_length_cm DECIMAL(8,2),
    dimensions_width_cm DECIMAL(8,2),
    dimensions_height_cm DECIMAL(8,2),
    
    -- Status Management
    status VARCHAR(20) DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE', 'DISCONTINUED')),
    approval_status VARCHAR(20) DEFAULT 'PENDING' CHECK (approval_status IN ('PENDING', 'APPROVED', 'REJECTED', 'CHANGES_REQUIRED')),
    approved_by UUID,
    approved_at TIMESTAMP WITH TIME ZONE,
    rejection_reason TEXT,
    
    -- SEO and Marketing
    meta_title VARCHAR(255),
    meta_description TEXT,
    keywords TEXT[],
    tags TEXT[],
    
    -- Analytics and Performance
    view_count INTEGER DEFAULT 0,
    sales_count INTEGER DEFAULT 0,
    rating_average DECIMAL(3,2) DEFAULT 0 CHECK (rating_average >= 0 AND rating_average <= 5),
    rating_count INTEGER DEFAULT 0,
    
    -- Timestamps and Audit
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_by UUID,
    updated_by UUID,
    
    -- Constraints
    CONSTRAINT fk_products_contractor FOREIGN KEY (contractor_id) REFERENCES contractors(id) ON DELETE CASCADE,
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
    CONSTRAINT fk_products_subcategory FOREIGN KEY (subcategory_id) REFERENCES subcategories(id) ON DELETE SET NULL,
    CONSTRAINT fk_products_approved_by FOREIGN KEY (approved_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Indexes for Products
CREATE INDEX idx_products_contractor_id ON products(contractor_id);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_subcategory_id ON products(subcategory_id);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_approval_status ON products(approval_status);
CREATE INDEX idx_products_stock_status ON products(stock_status);
CREATE INDEX idx_products_price ON products(price);
CREATE INDEX idx_products_brand ON products(brand);
CREATE INDEX idx_products_created_at ON products(created_at DESC);
CREATE INDEX idx_products_name_search ON products USING GIN(to_tsvector('english', name || ' ' || COALESCE(description, '')));
CREATE INDEX idx_products_name_ar_search ON products USING GIN(to_tsvector('arabic', COALESCE(name_ar, '') || ' ' || COALESCE(description_ar, '')));
CREATE INDEX idx_products_specifications ON products USING GIN(specifications);
CREATE INDEX idx_products_tags ON products USING GIN(tags);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **2. CATEGORIES TABLE**
```sql
CREATE TABLE categories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Category Information
    name VARCHAR(100) NOT NULL UNIQUE,
    name_ar VARCHAR(100),
    slug VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    description_ar TEXT,
    
    -- Visual Elements
    icon VARCHAR(50), -- Font Awesome icon name
    color_code VARCHAR(7), -- Hex color code
    image_url VARCHAR(500),
    
    -- Hierarchy and Organization
    parent_id UUID,
    sort_order INTEGER DEFAULT 0,
    level INTEGER DEFAULT 0,
    path TEXT, -- For hierarchical queries
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    is_featured BOOLEAN DEFAULT false,
    products_count INTEGER DEFAULT 0,
    
    -- SEO
    meta_title VARCHAR(255),
    meta_description TEXT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE
);

-- Indexes for Categories
CREATE INDEX idx_categories_parent_id ON categories(parent_id);
CREATE INDEX idx_categories_slug ON categories(slug);
CREATE INDEX idx_categories_sort_order ON categories(sort_order);
CREATE INDEX idx_categories_is_active ON categories(is_active);
CREATE INDEX idx_categories_is_featured ON categories(is_featured);

-- Trigger for updated_at
CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **3. SUBCATEGORIES TABLE**
```sql
CREATE TABLE subcategories (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    category_id UUID NOT NULL,
    
    -- Subcategory Information
    name VARCHAR(100) NOT NULL,
    name_ar VARCHAR(100),
    slug VARCHAR(100) NOT NULL,
    description TEXT,
    description_ar TEXT,
    
    -- Visual Elements
    icon VARCHAR(50),
    image_url VARCHAR(500),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    
    -- Settings
    is_active BOOLEAN DEFAULT true,
    products_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_subcategories_category FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE,
    CONSTRAINT unique_subcategory_name_per_category UNIQUE(category_id, name)
);

-- Indexes for Subcategories
CREATE INDEX idx_subcategories_category_id ON subcategories(category_id);
CREATE INDEX idx_subcategories_slug ON subcategories(slug);
CREATE INDEX idx_subcategories_is_active ON subcategories(is_active);

-- Trigger for updated_at
CREATE TRIGGER update_subcategories_updated_at BEFORE UPDATE ON subcategories
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **4. PRODUCT_IMAGES TABLE**
```sql
CREATE TABLE product_images (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    product_id UUID NOT NULL,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500),
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    
    -- Image Properties
    width INTEGER,
    height INTEGER,
    alt_text VARCHAR(255),
    alt_text_ar VARCHAR(255),
    
    -- Thumbnails
    thumbnail_small_url VARCHAR(500),
    thumbnail_medium_url VARCHAR(500),
    thumbnail_large_url VARCHAR(500),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_primary BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Processing Status
    processing_status VARCHAR(20) DEFAULT 'PENDING' CHECK (processing_status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for Product Images
CREATE INDEX idx_product_images_product_id ON product_images(product_id);
CREATE INDEX idx_product_images_is_primary ON product_images(is_primary);
CREATE INDEX idx_product_images_sort_order ON product_images(sort_order);
CREATE INDEX idx_product_images_is_active ON product_images(is_active);

-- Ensure only one primary image per product
CREATE UNIQUE INDEX idx_product_images_one_primary 
ON product_images(product_id) 
WHERE is_primary = true;

-- Trigger for updated_at
CREATE TRIGGER update_product_images_updated_at BEFORE UPDATE ON product_images
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **5. PRODUCT_DOCUMENTS TABLE**
```sql
CREATE TABLE product_documents (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    product_id UUID NOT NULL,
    
    -- Document Information
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('DATASHEET', 'MANUAL', 'WARRANTY', 'CERTIFICATE', 'BROCHURE', 'SPECIFICATION')),
    title VARCHAR(255) NOT NULL,
    title_ar VARCHAR(255),
    description TEXT,
    description_ar TEXT,
    
    -- File Information
    file_name VARCHAR(255) NOT NULL,
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_url VARCHAR(500),
    mime_type VARCHAR(100) NOT NULL,
    file_size INTEGER NOT NULL CHECK (file_size > 0),
    
    -- Organization
    sort_order INTEGER DEFAULT 0,
    is_public BOOLEAN DEFAULT true,
    
    -- Download Tracking
    download_count INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_product_documents_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for Product Documents
CREATE INDEX idx_product_documents_product_id ON product_documents(product_id);
CREATE INDEX idx_product_documents_type ON product_documents(document_type);
CREATE INDEX idx_product_documents_is_public ON product_documents(is_public);

-- Trigger for updated_at
CREATE TRIGGER update_product_documents_updated_at BEFORE UPDATE ON product_documents
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **6. INVENTORY_LOGS TABLE**
```sql
CREATE TABLE inventory_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    product_id UUID NOT NULL,
    
    -- Inventory Changes
    action_type VARCHAR(20) NOT NULL CHECK (action_type IN ('STOCK_IN', 'STOCK_OUT', 'ADJUSTMENT', 'SALE', 'RETURN', 'DAMAGE', 'EXPIRED')),
    quantity_change INTEGER NOT NULL,
    quantity_before INTEGER NOT NULL,
    quantity_after INTEGER NOT NULL,
    
    -- Context Information
    reference_type VARCHAR(50), -- 'ORDER', 'ADJUSTMENT', 'RETURN', etc.
    reference_id UUID, -- Order ID, Adjustment ID, etc.
    reason TEXT,
    notes TEXT,
    
    -- Location Information (for future multi-warehouse)
    warehouse_id UUID,
    location VARCHAR(100),
    
    -- User Information
    performed_by UUID NOT NULL,
    performed_by_type VARCHAR(20) DEFAULT 'USER' CHECK (performed_by_type IN ('USER', 'CONTRACTOR', 'ADMIN', 'SYSTEM')),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_inventory_logs_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- Indexes for Inventory Logs
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_action_type ON inventory_logs(action_type);
CREATE INDEX idx_inventory_logs_performed_by ON inventory_logs(performed_by);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at DESC);
CREATE INDEX idx_inventory_logs_reference ON inventory_logs(reference_type, reference_id);
```

### **7. PRODUCT_REVIEWS TABLE**
```sql
CREATE TABLE product_reviews (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Keys
    product_id UUID NOT NULL,
    customer_id UUID NOT NULL,
    order_id UUID, -- For verified purchases
    
    -- Review Information
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    review_text TEXT,
    review_text_ar TEXT,
    
    -- Review Categories (detailed ratings)
    quality_rating INTEGER CHECK (quality_rating >= 1 AND quality_rating <= 5),
    value_rating INTEGER CHECK (value_rating >= 1 AND value_rating <= 5),
    delivery_rating INTEGER CHECK (delivery_rating >= 1 AND delivery_rating <= 5),
    
    -- Verification and Moderation
    is_verified_purchase BOOLEAN DEFAULT false,
    is_approved BOOLEAN DEFAULT false,
    is_featured BOOLEAN DEFAULT false,
    moderation_status VARCHAR(20) DEFAULT 'PENDING' CHECK (moderation_status IN ('PENDING', 'APPROVED', 'REJECTED', 'FLAGGED')),
    moderation_reason TEXT,
    moderated_by UUID,
    moderated_at TIMESTAMP WITH TIME ZONE,
    
    -- Interaction Tracking
    helpful_count INTEGER DEFAULT 0,
    reported_count INTEGER DEFAULT 0,
    
    -- Contractor Response
    contractor_response TEXT,
    contractor_response_ar TEXT,
    contractor_responded_at TIMESTAMP WITH TIME ZONE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_product_reviews_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT unique_review_per_customer_product UNIQUE(product_id, customer_id)
);

-- Indexes for Product Reviews
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_product_reviews_customer_id ON product_reviews(customer_id);
CREATE INDEX idx_product_reviews_rating ON product_reviews(rating);
CREATE INDEX idx_product_reviews_is_approved ON product_reviews(is_approved);
CREATE INDEX idx_product_reviews_created_at ON product_reviews(created_at DESC);

-- Trigger for updated_at
CREATE TRIGGER update_product_reviews_updated_at BEFORE UPDATE ON product_reviews
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **8. PRODUCT_ATTRIBUTES TABLE (for dynamic specifications)**
```sql
CREATE TABLE product_attributes (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Foreign Key
    product_id UUID NOT NULL,
    
    -- Attribute Information
    attribute_name VARCHAR(100) NOT NULL,
    attribute_name_ar VARCHAR(100),
    attribute_value TEXT NOT NULL,
    attribute_value_ar TEXT,
    attribute_unit VARCHAR(20),
    
    -- Data Type Information
    data_type VARCHAR(20) DEFAULT 'TEXT' CHECK (data_type IN ('TEXT', 'NUMBER', 'BOOLEAN', 'DATE', 'URL')),
    is_searchable BOOLEAN DEFAULT false,
    is_filterable BOOLEAN DEFAULT false,
    
    -- Organization
    attribute_group VARCHAR(50), -- 'TECHNICAL', 'PHYSICAL', 'PERFORMANCE', etc.
    sort_order INTEGER DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT fk_product_attributes_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
    CONSTRAINT unique_attribute_per_product UNIQUE(product_id, attribute_name)
);

-- Indexes for Product Attributes
CREATE INDEX idx_product_attributes_product_id ON product_attributes(product_id);
CREATE INDEX idx_product_attributes_name ON product_attributes(attribute_name);
CREATE INDEX idx_product_attributes_searchable ON product_attributes(is_searchable);
CREATE INDEX idx_product_attributes_filterable ON product_attributes(is_filterable);
CREATE INDEX idx_product_attributes_group ON product_attributes(attribute_group);

-- Trigger for updated_at
CREATE TRIGGER update_product_attributes_updated_at BEFORE UPDATE ON product_attributes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### **9. SEARCH_LOGS TABLE (for analytics)**
```sql
CREATE TABLE search_logs (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Search Information
    search_term VARCHAR(255),
    search_filters JSONB,
    results_count INTEGER,
    
    -- User Context
    user_id UUID,
    user_type VARCHAR(20),
    session_id VARCHAR(100),
    ip_address INET,
    user_agent TEXT,
    
    -- Performance Metrics
    response_time_ms INTEGER,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for Search Logs
CREATE INDEX idx_search_logs_search_term ON search_logs(search_term);
CREATE INDEX idx_search_logs_user_id ON search_logs(user_id);
CREATE INDEX idx_search_logs_created_at ON search_logs(created_at DESC);
CREATE INDEX idx_search_logs_filters ON search_logs USING GIN(search_filters);
```

---

## 🔧 **DATABASE FUNCTIONS & PROCEDURES**

### **1. Update Product Stock Function**
```sql
CREATE OR REPLACE FUNCTION update_product_stock(
    p_product_id UUID,
    p_quantity_change INTEGER,
    p_action_type VARCHAR,
    p_reference_type VARCHAR DEFAULT NULL,
    p_reference_id UUID DEFAULT NULL,
    p_reason TEXT DEFAULT NULL,
    p_performed_by UUID DEFAULT NULL
)
RETURNS BOOLEAN AS $$
DECLARE
    current_stock INTEGER;
    new_stock INTEGER;
BEGIN
    -- Get current stock
    SELECT stock_quantity INTO current_stock 
    FROM products 
    WHERE id = p_product_id;
    
    IF current_stock IS NULL THEN
        RAISE EXCEPTION 'Product not found: %', p_product_id;
    END IF;
    
    -- Calculate new stock
    new_stock := current_stock + p_quantity_change;
    
    -- Check for negative stock
    IF new_stock < 0 THEN
        RAISE EXCEPTION 'Insufficient stock. Current: %, Requested: %', current_stock, ABS(p_quantity_change);
    END IF;
    
    -- Update product stock
    UPDATE products 
    SET 
        stock_quantity = new_stock,
        stock_status = CASE 
            WHEN new_stock = 0 THEN 'OUT_OF_STOCK'
            WHEN new_stock <= minimum_stock THEN 'LOW_STOCK'
            ELSE 'IN_STOCK'
        END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
    
    -- Log inventory change
    INSERT INTO inventory_logs (
        product_id, action_type, quantity_change, 
        quantity_before, quantity_after, 
        reference_type, reference_id, reason, performed_by
    ) VALUES (
        p_product_id, p_action_type, p_quantity_change,
        current_stock, new_stock,
        p_reference_type, p_reference_id, p_reason, p_performed_by
    );
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;
```

### **2. Calculate Product Rating Function**
```sql
CREATE OR REPLACE FUNCTION update_product_rating(p_product_id UUID)
RETURNS VOID AS $$
DECLARE
    avg_rating DECIMAL(3,2);
    total_reviews INTEGER;
BEGIN
    SELECT 
        COALESCE(AVG(rating), 0)::DECIMAL(3,2),
        COUNT(*)
    INTO avg_rating, total_reviews
    FROM product_reviews 
    WHERE product_id = p_product_id AND is_approved = true;
    
    UPDATE products 
    SET 
        rating_average = avg_rating,
        rating_count = total_reviews,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql;
```

### **3. Product Search Function**
```sql
CREATE OR REPLACE FUNCTION search_products(
    p_search_term TEXT DEFAULT NULL,
    p_category_id UUID DEFAULT NULL,
    p_min_price DECIMAL DEFAULT NULL,
    p_max_price DECIMAL DEFAULT NULL,
    p_brand VARCHAR DEFAULT NULL,
    p_in_stock_only BOOLEAN DEFAULT false,
    p_sort_by VARCHAR DEFAULT 'created_at',
    p_sort_order VARCHAR DEFAULT 'DESC',
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID, name VARCHAR, price DECIMAL, stock_quantity INTEGER,
    rating_average DECIMAL, rating_count INTEGER, created_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.name, p.price, p.stock_quantity,
        p.rating_average, p.rating_count, p.created_at
    FROM products p
    WHERE 
        p.status = 'ACTIVE'
        AND p.approval_status = 'APPROVED'
        AND (p_search_term IS NULL OR 
             p.name ILIKE '%' || p_search_term || '%' OR
             p.description ILIKE '%' || p_search_term || '%' OR
             p.brand ILIKE '%' || p_search_term || '%')
        AND (p_category_id IS NULL OR p.category_id = p_category_id)
        AND (p_min_price IS NULL OR p.price >= p_min_price)
        AND (p_max_price IS NULL OR p.price <= p_max_price)
        AND (p_brand IS NULL OR p.brand ILIKE p_brand)
        AND (NOT p_in_stock_only OR p.stock_quantity > 0)
    ORDER BY 
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'ASC' THEN p.name END ASC,
        CASE WHEN p_sort_by = 'name' AND p_sort_order = 'DESC' THEN p.name END DESC,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'ASC' THEN p.price END ASC,
        CASE WHEN p_sort_by = 'price' AND p_sort_order = 'DESC' THEN p.price END DESC,
        CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'ASC' THEN p.rating_average END ASC,
        CASE WHEN p_sort_by = 'rating' AND p_sort_order = 'DESC' THEN p.rating_average END DESC,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'ASC' THEN p.created_at END ASC,
        CASE WHEN p_sort_by = 'created_at' AND p_sort_order = 'DESC' THEN p.created_at END DESC
    LIMIT p_limit OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;
```

---

## 📊 **INITIAL DATA SETUP**

### **1. Default Categories**
```sql
-- Insert default categories
INSERT INTO categories (id, name, name_ar, slug, description, icon, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Solar Panels', 'الألواح الشمسية', 'solar-panels', 'Photovoltaic solar panels and modules', 'solar-panel', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Inverters', 'العاكسات', 'inverters', 'Solar power inverters and converters', 'zap', 2),
('550e8400-e29b-41d4-a716-446655440003', 'Mounting Systems', 'أنظمة التركيب', 'mounting-systems', 'Solar panel mounting and racking systems', 'tool', 3),
('550e8400-e29b-41d4-a716-446655440004', 'Batteries', 'البطاريات', 'batteries', 'Energy storage batteries and systems', 'battery', 4),
('550e8400-e29b-41d4-a716-446655440005', 'Cables & Accessories', 'الكابلات والملحقات', 'cables-accessories', 'DC/AC cables and electrical accessories', 'cable', 5),
('550e8400-e29b-41d4-a716-446655440006', 'Monitoring Systems', 'أنظمة المراقبة', 'monitoring-systems', 'Energy monitoring and management systems', 'monitor', 6);

-- Insert subcategories for Solar Panels
INSERT INTO subcategories (category_id, name, name_ar, slug, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440001', 'Monocrystalline', 'أحادي البلورة', 'monocrystalline', 1),
('550e8400-e29b-41d4-a716-446655440001', 'Polycrystalline', 'متعدد البلورات', 'polycrystalline', 2),
('550e8400-e29b-41d4-a716-446655440001', 'Thin Film', 'الأغشية الرقيقة', 'thin-film', 3),
('550e8400-e29b-41d4-a716-446655440001', 'Bifacial', 'ثنائي الوجه', 'bifacial', 4);

-- Insert subcategories for Inverters  
INSERT INTO subcategories (category_id, name, name_ar, slug, sort_order) VALUES
('550e8400-e29b-41d4-a716-446655440002', 'String Inverters', 'عاكسات السلسلة', 'string-inverters', 1),
('550e8400-e29b-41d4-a716-446655440002', 'Power Optimizers', 'محسنات الطاقة', 'power-optimizers', 2),
('550e8400-e29b-41d4-a716-446655440002', 'Micro Inverters', 'العاكسات الدقيقة', 'micro-inverters', 3),
('550e8400-e29b-41d4-a716-446655440002', 'Hybrid Inverters', 'العاكسات المختلطة', 'hybrid-inverters', 4);
```

---

## 🔍 **DATABASE VIEWS FOR COMMON QUERIES**

### **1. Product Catalog View**
```sql
CREATE VIEW v_product_catalog AS
SELECT 
    p.id,
    p.name,
    p.name_ar,
    p.description,
    p.brand,
    p.model,
    p.price,
    p.stock_quantity,
    p.stock_status,
    p.rating_average,
    p.rating_count,
    p.view_count,
    p.sales_count,
    c.name as category_name,
    c.name_ar as category_name_ar,
    s.name as subcategory_name,
    s.name_ar as subcategory_name_ar,
    co.business_name as contractor_name,
    co.email as contractor_email,
    pi.file_url as primary_image_url,
    p.created_at,
    p.updated_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN subcategories s ON p.subcategory_id = s.id  
LEFT JOIN contractors co ON p.contractor_id = co.id
LEFT JOIN product_images pi ON p.id = pi.product_id AND pi.is_primary = true
WHERE p.status = 'ACTIVE' 
AND p.approval_status = 'APPROVED'
AND p.deleted_at IS NULL;
```

### **2. Inventory Summary View**
```sql
CREATE VIEW v_inventory_summary AS
SELECT 
    p.id as product_id,
    p.name as product_name,
    p.stock_quantity,
    p.minimum_stock,
    p.stock_status,
    c.name as category_name,
    co.business_name as contractor_name,
    CASE 
        WHEN p.stock_quantity = 0 THEN 'Out of Stock'
        WHEN p.stock_quantity <= p.minimum_stock THEN 'Low Stock'
        ELSE 'In Stock'
    END as stock_alert,
    p.updated_at as last_stock_update
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
LEFT JOIN contractors co ON p.contractor_id = co.id
WHERE p.status = 'ACTIVE'
ORDER BY p.stock_quantity ASC;
```

---

## 🔒 **SECURITY POLICIES & RLS**

### **Row Level Security Setup**
```sql
-- Enable RLS on products table
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Policy for contractors to see only their products
CREATE POLICY contractor_products_policy ON products
    FOR ALL TO contractor_role
    USING (contractor_id = current_setting('app.current_contractor_id')::UUID);

-- Policy for admins to see all products
CREATE POLICY admin_products_policy ON products
    FOR ALL TO admin_role
    USING (true);

-- Policy for public users to see only approved products
CREATE POLICY public_products_policy ON products
    FOR SELECT TO public_role
    USING (status = 'ACTIVE' AND approval_status = 'APPROVED');
```

---

## 📈 **PERFORMANCE OPTIMIZATION**

### **1. Materialized Views for Analytics**
```sql
CREATE MATERIALIZED VIEW mv_category_stats AS
SELECT 
    c.id,
    c.name,
    COUNT(p.id) as product_count,
    AVG(p.price) as avg_price,
    AVG(p.rating_average) as avg_rating,
    SUM(p.sales_count) as total_sales
FROM categories c
LEFT JOIN products p ON c.id = p.category_id 
WHERE p.status = 'ACTIVE' AND p.approval_status = 'APPROVED'
GROUP BY c.id, c.name;

CREATE UNIQUE INDEX idx_mv_category_stats_id ON mv_category_stats(id);

-- Refresh materialized view daily
CREATE OR REPLACE FUNCTION refresh_category_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_category_stats;
END;
$$ LANGUAGE plpgsql;
```

### **2. Partitioning for Large Tables**
```sql
-- Partition inventory_logs by month for better performance
CREATE TABLE inventory_logs_y2025m08 PARTITION OF inventory_logs
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE inventory_logs_y2025m09 PARTITION OF inventory_logs
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');
```

---

## 🛡️ **BACKUP & MAINTENANCE**

### **Database Maintenance Script**
```sql
-- Update product counters
UPDATE categories SET products_count = (
    SELECT COUNT(*) FROM products 
    WHERE category_id = categories.id 
    AND status = 'ACTIVE' 
    AND approval_status = 'APPROVED'
);

-- Clean up old search logs (older than 6 months)
DELETE FROM search_logs 
WHERE created_at < CURRENT_DATE - INTERVAL '6 months';

-- Update product view rankings
UPDATE products SET 
    view_count = view_count + 1 
WHERE id IN (
    SELECT product_id FROM recent_product_views 
    WHERE created_at >= CURRENT_DATE
);

-- Vacuum and analyze tables
VACUUM ANALYZE products;
VACUUM ANALYZE product_reviews;
VACUUM ANALYZE inventory_logs;
```

This comprehensive database schema provides a solid foundation for the Marketplace Service with proper indexing, constraints, security policies, and performance optimizations. All tables include proper audit trails, multi-language support, and are designed for scalability.