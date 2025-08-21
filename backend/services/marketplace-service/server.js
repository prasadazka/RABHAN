/**
 * RABHAN Marketplace Service - JavaScript Working Server
 * Quick fix to get the service running for admin dashboard
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

console.log('🚀 Starting RABHAN Marketplace Service...');

const app = express();
const PORT = process.env.PORT || 3007;

// Middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3006', 'http://localhost:3010'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
  res.json({
    service: 'RABHAN Marketplace Service',
    version: '1.0.0',
    status: 'operational',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      products: '/api/v1/products',
      adminProducts: '/api/dashboard/products'
    }
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    service: 'marketplace-service',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Products endpoint for marketplace with database integration
app.get('/api/v1/products', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    await client.connect();
    
    // Check for filtering parameters
    const { 
      contractorId, 
      page = 1, 
      limit = 100,
      status,
      approvalStatus,
      inStockOnly,
      search,
      minPrice,
      maxPrice
    } = req.query;
    const offset = (page - 1) * limit;
    
    let productsQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.status != 'DELETED'
    `;
    
    const queryParams = [];
    
    // Add contractor filter if provided
    if (contractorId) {
      productsQuery += ' AND p.contractor_id = $' + (queryParams.length + 1);
      queryParams.push(contractorId);
      console.log(`🏗️ Filtering products for contractor: ${contractorId}`);
    }
    
    // Add status filter (ACTIVE, INACTIVE, etc.)
    if (status) {
      productsQuery += ' AND p.status = $' + (queryParams.length + 1);
      queryParams.push(status);
      console.log(`📋 Filtering by status: ${status}`);
    }
    
    // Add approval status filter (APPROVED, PENDING, REJECTED)
    if (approvalStatus) {
      productsQuery += ' AND p.approval_status = $' + (queryParams.length + 1);
      queryParams.push(approvalStatus);
      console.log(`✅ Filtering by approval status: ${approvalStatus}`);
    }
    
    // Add stock filter (only in-stock products)
    if (inStockOnly === 'true') {
      productsQuery += ' AND p.stock_status = \'IN_STOCK\'';
      console.log(`📦 Filtering for in-stock products only`);
    }
    
    // Add search filter
    if (search) {
      productsQuery += ' AND (p.name ILIKE $' + (queryParams.length + 1) + ' OR p.description ILIKE $' + (queryParams.length + 1) + ')';
      queryParams.push(`%${search}%`);
      console.log(`🔍 Searching for: ${search}`);
    }
    
    // Add price range filters
    if (minPrice) {
      productsQuery += ' AND p.price >= $' + (queryParams.length + 1);
      queryParams.push(parseFloat(minPrice));
      console.log(`💰 Min price: ${minPrice}`);
    }
    
    if (maxPrice) {
      productsQuery += ' AND p.price <= $' + (queryParams.length + 1);
      queryParams.push(parseFloat(maxPrice));
      console.log(`💰 Max price: ${maxPrice}`);
    }
    
    productsQuery += ' ORDER BY p.created_at DESC LIMIT $' + (queryParams.length + 1) + ' OFFSET $' + (queryParams.length + 2);
    queryParams.push(limit, offset);
    
    const productsResult = await client.query(productsQuery, queryParams);
    
    // Get images for products
    const productIds = productsResult.rows.map(p => p.id);
    let imagesResult = { rows: [] };
    
    if (productIds.length > 0) {
      const placeholders = productIds.map((_, i) => `$${i + 1}`).join(',');
      const imagesQuery = `
        SELECT * FROM product_images 
        WHERE product_id IN (${placeholders})
        ORDER BY product_id, sort_order
      `;
      imagesResult = await client.query(imagesQuery, productIds);
    }
    
    // Group images by product_id
    const imagesByProduct = {};
    imagesResult.rows.forEach(img => {
      if (!imagesByProduct[img.product_id]) {
        imagesByProduct[img.product_id] = [];
      }
      imagesByProduct[img.product_id].push(img);
    });
    
    // Attach images and parse specifications
    const baseUrl = `http://localhost:${PORT}`;
    const productsWithImages = productsResult.rows.map(product => {
      const productImages = (imagesByProduct[product.id] || []).map(img => ({
        ...img,
        file_url: img.file_url.startsWith('http') ? img.file_url : `${baseUrl}${img.file_url}`,
        thumbnail_url: img.file_url.startsWith('http') ? img.file_url : `${baseUrl}${img.file_url}`
      }));
      
      const primaryImage = productImages.find(img => img.is_primary);
      
      return {
        ...product,
        specifications: typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications || '{}')
          : product.specifications || {},
        images: productImages,
        primaryImage: primaryImage?.file_url || null
      };
    });
    
    // Get total count for pagination
    let totalQuery = `
      SELECT COUNT(*) as total
      FROM products p
      WHERE p.status != 'DELETED'
    `;
    
    const totalParams = [];
    if (contractorId) {
      totalQuery += ' AND p.contractor_id = $1';
      totalParams.push(contractorId);
    }
    
    const totalResult = await client.query(totalQuery, totalParams);
    const total = parseInt(totalResult.rows[0].total);
    
    console.log(`📦 Fetched ${productsWithImages.length} products from database (${total} total${contractorId ? ' for contractor' : ''})`);
    
    res.json({
      success: true,
      data: productsWithImages,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total,
        totalPages: Math.ceil(total / limit),
        hasNext: (page * limit) < total,
        hasPrev: page > 1
      },
      message: `Retrieved ${productsWithImages.length} products from database`
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Admin dashboard products endpoint (for admin service port 3006)
app.get('/api/dashboard/products', async (req, res) => {
  console.log('📦 Admin dashboard requesting products...');
  // Redirect to the main products endpoint with database integration
  try {
    const response = await fetch('http://localhost:3007/api/v1/products');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// Configure multer for file uploads
const multer = require('multer');
const fs = require('fs');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads', 'products');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).substring(2)}${ext}`;
    cb(null, filename);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPEG, PNG, and WebP images are allowed.'));
    }
  }
});

// Create product endpoint (POST) with file upload support
app.post('/api/v1/products', upload.array('images', 10), async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    await client.connect();
    
    // Get uploaded files
    const uploadedFiles = req.files || [];
    
    // Parse FormData fields (all fields come as strings from FormData)
    const {
      contractorId,
      categoryId,
      name,
      nameAr,
      description,
      descriptionAr,
      brand,
      model,
      sku,
      specifications: specificationsStr = '{}',
      price: priceStr,
      currency = 'SAR',
      vatIncluded: vatIncludedStr = 'true',
      stockQuantity: stockQuantityStr,
      status = 'DRAFT',
      productCategory,
      primaryImageIndex: primaryImageIndexStr = '0'
    } = req.body;

    // Parse string values to appropriate types
    const specifications = JSON.parse(specificationsStr);
    const price = parseFloat(priceStr);
    const vatIncluded = vatIncludedStr === 'true';
    const stockQuantity = parseInt(stockQuantityStr);
    const primaryImageIndex = parseInt(primaryImageIndexStr);

    console.log(`📦 Creating new product: ${name} for contractor ${contractorId}`);
    console.log(`📋 Product category: ${productCategory}`);
    console.log(`📋 Specifications:`, JSON.stringify(specifications, null, 2));
    console.log(`🔍 Full request body:`, JSON.stringify(req.body, null, 2));

    // Comprehensive validation
    const errors = [];
    if (!contractorId) errors.push('contractorId is required');
    if (!categoryId) errors.push('categoryId is required');
    if (!name) errors.push('name is required');
    if (!brand) errors.push('brand is required');
    if (!price || price <= 0) errors.push('price must be greater than 0');
    if (!stockQuantity || stockQuantity < 0) errors.push('stockQuantity must be 0 or greater');
    if (!productCategory) errors.push('productCategory is required');

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    // Check SKU uniqueness if provided
    if (sku) {
      const existingSku = await client.query(
        'SELECT id, name, brand FROM products WHERE sku = $1 AND status != $2', 
        [sku, 'DELETED']
      );
      if (existingSku.rows.length > 0) {
        const existingProduct = existingSku.rows[0];
        return res.status(400).json({
          success: false,
          error: 'SKU already exists',
          message: `SKU "${sku}" is already used by product "${existingProduct.name}" (${existingProduct.brand})`,
          field: 'sku',
          code: 'DUPLICATE_SKU'
        });
      }
    }

    // Generate unique slug from name
    const baseSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim('-');
    
    const slug = `${baseSlug}-${Date.now()}`;
    
    // Start database transaction
    await client.query('BEGIN');

    try {
      // Insert product with product_category field
      const productResult = await client.query(`
        INSERT INTO products (
          contractor_id, category_id, name, name_ar, description, description_ar,
          slug, brand, model, sku, specifications, price, currency, vat_included,
          stock_quantity, stock_status, status, approval_status, product_category,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW()
        ) RETURNING *
      `, [
        contractorId, categoryId, name, nameAr, description, descriptionAr,
        slug, brand, model, sku, JSON.stringify(specifications || {}), price, currency, vatIncluded,
        stockQuantity,
        stockQuantity > 10 ? 'IN_STOCK' : stockQuantity > 0 ? 'LOW_STOCK' : 'OUT_OF_STOCK',
        status, 'PENDING', productCategory
      ]);

      const product = productResult.rows[0];

      // Handle uploaded product images
      const productImages = [];
      if (uploadedFiles && uploadedFiles.length > 0) {
        console.log(`📸 Processing ${uploadedFiles.length} uploaded images...`);
        
        for (let i = 0; i < uploadedFiles.length; i++) {
          const file = uploadedFiles[i];
          const imageUrl = `/uploads/products/${file.filename}`;
          
          const imageResult = await client.query(`
            INSERT INTO product_images (
              product_id, file_path, file_url, file_name, sort_order, is_primary, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, NOW()) RETURNING *
          `, [
            product.id,
            file.path,
            imageUrl,
            file.originalname,
            i + 1,
            i === primaryImageIndex
          ]);
          productImages.push(imageResult.rows[0]);
        }
      }

      await client.query('COMMIT');
      
      console.log(`✅ Product created: ${name} (${product.id}) by contractor ${contractorId}`);
      console.log(`📋 Product category: ${productCategory}`);
      console.log(`📸 Images added: ${productImages.length}`);

      // Return product with parsed specifications and images
      const responseData = {
        ...product,
        specifications: typeof product.specifications === 'string' 
          ? JSON.parse(product.specifications || '{}')
          : product.specifications || {},
        images: productImages,
        primaryImage: productImages.find(img => img.is_primary)?.file_url || productImages[0]?.file_url
      };
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
        data: responseData
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }

  } catch (error) {
    console.error('❌ Product creation error:', error.message);
    
    // Handle specific database errors
    if (error.code === '23505') { // Unique constraint violation
      if (error.constraint === 'products_sku_key') {
        return res.status(400).json({
          success: false,
          error: 'SKU already exists',
          message: `SKU "${req.body.sku || 'provided'}" is already used by another product. Please use a different SKU.`,
          field: 'sku',
          code: 'DUPLICATE_SKU'
        });
      }
      if (error.constraint === 'products_slug_key') {
        return res.status(400).json({
          success: false,
          error: 'Product name conflict',
          message: 'A product with similar name already exists. Please use a different name.',
          field: 'name',
          code: 'DUPLICATE_NAME'
        });
      }
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to create product',
      message: error.message,
      code: 'SERVER_ERROR'
    });
  } finally {
    await client.end();
  }
});

// Update product endpoint (PUT)
app.put('/api/v1/products/:productId', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    await client.connect();
    
    const { productId } = req.params;
    const updateData = req.body;
    
    console.log(`🔄 Updating product: ${productId}`);
    console.log(`📋 Update data:`, JSON.stringify(updateData, null, 2));

    // Remove non-updatable fields
    const { id, contractor_id, created_at, images, ...allowedUpdates } = updateData;

    if (Object.keys(allowedUpdates).length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No valid fields to update'
      });
    }

    // Build dynamic update query
    const updateFields = [];
    const values = [];
    let paramIndex = 1;

    Object.entries(allowedUpdates).forEach(([key, value]) => {
      if (key === 'specifications') {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(JSON.stringify(value));
      } else if (key === 'productCategory') {
        // Handle productCategory -> product_category
        updateFields.push(`product_category = $${paramIndex}`);
        values.push(value);
      } else if (key === 'stockQuantity') {
        // Handle camelCase -> snake_case
        updateFields.push(`stock_quantity = $${paramIndex}`);
        values.push(value);
      } else if (key === 'vatIncluded') {
        updateFields.push(`vat_included = $${paramIndex}`);
        values.push(value);
      } else if (key === 'nameAr') {
        updateFields.push(`name_ar = $${paramIndex}`);
        values.push(value);
      } else if (key === 'descriptionAr') {
        updateFields.push(`description_ar = $${paramIndex}`);
        values.push(value);
      } else if (key === 'categoryId') {
        updateFields.push(`category_id = $${paramIndex}`);
        values.push(value);
      } else {
        updateFields.push(`${key} = $${paramIndex}`);
        values.push(value);
      }
      paramIndex++;
    });

    updateFields.push('updated_at = NOW()');
    values.push(productId);

    const query = `
      UPDATE products 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex} AND status != 'DELETED'
      RETURNING *
    `;

    console.log(`📋 SQL Query:`, query);
    console.log(`📋 Values:`, values);

    const result = await client.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Product not found or cannot be updated'
      });
    }

    // Fetch images for the updated product
    const imageResult = await client.query(
      'SELECT * FROM product_images WHERE product_id = $1 ORDER BY sort_order, created_at',
      [productId]
    );
    
    console.log(`✅ Product updated: ${result.rows[0].name} (${productId}) with ${imageResult.rows.length} images`);

    const updatedProduct = {
      ...result.rows[0],
      specifications: typeof result.rows[0].specifications === 'string'
        ? JSON.parse(result.rows[0].specifications || '{}')
        : result.rows[0].specifications || {},
      images: imageResult.rows.map(img => ({
        ...img,
        file_url: img.file_url.startsWith('http') ? img.file_url : `http://localhost:3007${img.file_url}`
      })),
      primaryImage: imageResult.rows.find(img => img.is_primary)?.file_url || imageResult.rows[0]?.file_url
    };

    res.json({
      success: true,
      message: 'Product updated successfully',
      data: updatedProduct
    });

  } catch (error) {
    console.error('❌ Product update error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to update product',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Single product endpoint
app.get('/api/v1/products/:productId', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    await client.connect();
    const { productId } = req.params;
    
    console.log(`📦 Loading single product: ${productId}`);
    
    // Get product with category info
    const productQuery = `
      SELECT 
        p.*,
        c.name as category_name,
        c.name_ar as category_name_ar
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      WHERE p.id = $1 AND p.status != 'DELETED'
    `;
    
    const productResult = await client.query(productQuery, [productId]);
    
    if (productResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found',
        error: 'Product does not exist or has been deleted'
      });
    }
    
    const product = productResult.rows[0];
    
    // Get product images
    const imagesQuery = `
      SELECT * FROM product_images 
      WHERE product_id = $1
      ORDER BY sort_order ASC, created_at ASC
    `;
    
    const imagesResult = await client.query(imagesQuery, [productId]);
    const productImages = imagesResult.rows.map(img => ({
      ...img,
      file_url: img.file_url.startsWith('http') ? img.file_url : `http://localhost:3007${img.file_url}`,
      thumbnail_url: img.file_url.startsWith('http') ? img.file_url : `http://localhost:3007${img.file_url}`
    }));
    
    // Find primary image
    const primaryImage = productImages.find(img => img.is_primary) || productImages[0];
    
    // Format response
    const formattedProduct = {
      ...product,
      specifications: typeof product.specifications === 'string' 
        ? JSON.parse(product.specifications || '{}')
        : product.specifications || {},
      images: productImages,
      primaryImage: primaryImage?.file_url || null
    };
    
    console.log(`✅ Found product: ${formattedProduct.name}`);
    
    res.json({
      success: true,
      data: formattedProduct,
      message: 'Product retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch product',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Admin products endpoint (for microservice connector)
app.get('/api/v1/admin/products', async (req, res) => {
  console.log('📦 Admin microservice requesting products...');
  // Redirect to the main products endpoint with database integration
  try {
    const response = await fetch('http://localhost:3007/api/v1/products');
    const data = await response.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

// Product approval endpoints
app.post('/api/v1/admin/products/:productId/approve', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    const { productId } = req.params;
    const { adminNotes, approvedBy, approvedAt } = req.body;
    
    console.log(`✅ Approving product: ${productId}`);
    
    await client.connect();
    
    // Update product approval status
    const updateQuery = `
      UPDATE products 
      SET 
        approval_status = 'APPROVED',
        status = 'ACTIVE',
        approved_at = $1,
        admin_notes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      new Date().toISOString(),
      adminNotes || 'Product approved by admin',
      productId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log(`✅ Product ${productId} approved successfully`);
    
    res.json({
      success: true,
      message: 'Product approved successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Product approval error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to approve product',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

app.post('/api/v1/admin/products/:productId/reject', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    const { productId } = req.params;
    const { rejectionReason, adminNotes, rejectedBy, rejectedAt } = req.body;
    
    console.log(`❌ Rejecting product: ${productId}, reason: ${rejectionReason}`);
    
    await client.connect();
    
    // Update product rejection status
    const updateQuery = `
      UPDATE products 
      SET 
        approval_status = 'REJECTED',
        status = 'INACTIVE',
        rejection_reason = $1,
        admin_notes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $3
      RETURNING *
    `;
    
    const result = await client.query(updateQuery, [
      rejectionReason || 'Product rejected by admin',
      adminNotes || `Product rejected: ${rejectionReason}`,
      productId
    ]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    console.log(`❌ Product ${productId} rejected successfully`);
    
    res.json({
      success: true,
      message: 'Product rejected successfully',
      data: result.rows[0]
    });
    
  } catch (error) {
    console.error('❌ Product rejection error:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to reject product',
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// Categories endpoint with database integration
app.get('/api/v1/categories', async (req, res) => {
  const { Client } = require('pg');
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_marketplace',
    user: 'postgres',
    password: '12345'
  });
  
  try {
    await client.connect();
    
    console.log('📋 Loading categories from database...');
    
    // Query categories with products count
    const categoriesQuery = `
      SELECT 
        c.*,
        COALESCE(COUNT(p.id), 0) as products_count
      FROM categories c
      LEFT JOIN products p ON c.id = p.category_id AND p.status = 'ACTIVE'
      WHERE c.is_active = true
      GROUP BY c.id
      ORDER BY c.sort_order ASC, c.name ASC
    `;
    
    const result = await client.query(categoriesQuery);
    
    console.log(`✅ Found ${result.rows.length} categories from database`);
    
    res.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
      message: `Retrieved ${result.rows.length} categories from database`
    });
    
  } catch (error) {
    console.error('❌ Categories database error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Database connection failed',
      message: error.message
    });
  } finally {
    await client.end();
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('❌ Server error:', err.message);
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: err.message
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    message: `Route ${req.method} ${req.originalUrl} not found`
  });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 RABHAN Marketplace Service started successfully!');
  console.log(`📍 Server: http://localhost:${PORT}`);
  console.log(`🏥 Health: http://localhost:${PORT}/health`);
  console.log(`📚 API Info: http://localhost:${PORT}/`);
  console.log(`👨‍💼 Admin Products: http://localhost:${PORT}/api/dashboard/products`);
  console.log('✅ Ready to receive requests from admin dashboard');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT received, shutting down gracefully...');
  process.exit(0);
});

module.exports = app;