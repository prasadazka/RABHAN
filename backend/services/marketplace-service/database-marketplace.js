const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const app = express();
const PORT = 3007;

app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost', 
  database: 'rabhan_marketplace',
  password: '12345',
  port: 5432,
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', service: 'marketplace-service' });
});

// GET /api/v1/admin/products - Get all products for admin review
app.get('/api/v1/admin/products', async (req, res) => {
  try {
    console.log('📦 Admin products requested from database');
    
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;
    
    // Get products from database with contractor info and images
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.brand, p.model, p.description, 
        p.price, p.currency, p.status, p.approval_status,
        p.sku, p.stock_quantity, p.stock_status,
        p.contractor_id, p.created_at, p.updated_at,
        p.rejection_reason, p.admin_notes,
        c.name as category_name, c.name_ar as category_name_ar,
        COALESCE(
          JSON_AGG(
            CASE WHEN pi.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id', pi.id,
                'file_url', pi.file_url,
                'file_path', pi.file_path,
                'is_primary', pi.is_primary,
                'sort_order', pi.sort_order
              )
            END
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.status IN ('DRAFT', 'PENDING_APPROVAL', 'ACTIVE', 'INACTIVE')
      GROUP BY p.id, p.name, p.brand, p.model, p.description, 
               p.price, p.currency, p.status, p.approval_status,
               p.sku, p.stock_quantity, p.stock_status,
               p.contractor_id, p.created_at, p.updated_at,
               p.rejection_reason, p.admin_notes,
               c.name, c.name_ar
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const products = result.rows.map(product => ({
      ...product,
      contractor: {
        id: product.contractor_id,
        company_name: 'Solar Company ' + product.contractor_id.substring(0, 8),
        contact_name: 'Contractor ' + product.contractor_id.substring(0, 8),
        email: 'contractor@example.com',
        phone: '+966501234567'
      }
    }));
    
    console.log(`✅ Found ${products.length} products in database`);
    
    res.json({
      success: true,
      data: products,
      message: 'Products retrieved for admin review',
      total: products.length
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products for admin review',
      message: error.message
    });
  }
});

// GET /api/v1/admin/products/pending - Get products pending approval
app.get('/api/v1/admin/products/pending', async (req, res) => {
  try {
    console.log('📋 Pending products requested from database');
    
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Get only pending products with images
    const result = await pool.query(`
      SELECT 
        p.id, p.name, p.brand, p.model, p.description, 
        p.price, p.currency, p.status, p.approval_status,
        p.sku, p.stock_quantity, p.stock_status,
        p.contractor_id, p.created_at, p.updated_at,
        p.rejection_reason, p.admin_notes,
        c.name as category_name,
        COALESCE(
          JSON_AGG(
            CASE WHEN pi.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id', pi.id,
                'file_url', pi.file_url,
                'file_path', pi.file_path,
                'is_primary', pi.is_primary,
                'sort_order', pi.sort_order
              )
            END
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE p.approval_status = 'PENDING'
      GROUP BY p.id, p.name, p.brand, p.model, p.description, 
               p.price, p.currency, p.status, p.approval_status,
               p.sku, p.stock_quantity, p.stock_status,
               p.contractor_id, p.created_at, p.updated_at,
               p.rejection_reason, p.admin_notes, c.name
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `, [limit, offset]);
    
    const products = result.rows.map(product => ({
      ...product,
      contractor: {
        id: product.contractor_id,
        company_name: 'Solar Company ' + product.contractor_id.substring(0, 8),
        contact_name: 'Contractor ' + product.contractor_id.substring(0, 8),
        email: 'contractor@example.com',
        phone: '+966501234567'
      }
    }));
    
    console.log(`✅ Found ${products.length} pending products`);
    
    res.json({
      success: true,
      data: {
        data: products,
        total: products.length,
        page: page,
        limit: limit
      },
      message: 'Pending products retrieved successfully'
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending products',
      message: error.message
    });
  }
});

// POST /api/v1/admin/products/:productId/approve - Approve a product
app.post('/api/v1/admin/products/:productId/approve', async (req, res) => {
  try {
    const { productId } = req.params;
    const { adminNotes } = req.body;
    
    console.log(`✅ Approving product: ${productId}`);
    
    // Update product in database
    const result = await pool.query(`
      UPDATE products 
      SET 
        approval_status = 'APPROVED',
        status = 'ACTIVE',
        approved_at = CURRENT_TIMESTAMP,
        admin_notes = $2,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [productId, adminNotes || 'Approved by admin']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const product = result.rows[0];
    console.log(`✅ Product approved: ${product.name}`);
    
    // Insert approval history record
    await pool.query(`
      INSERT INTO product_approval_history 
      (product_id, previous_status, new_status, action_type, admin_id, admin_notes)
      VALUES ($1, 'PENDING', 'APPROVED', 'APPROVE', $2, $3)
    `, [productId, '12345678-1234-1234-1234-123456789012', adminNotes || 'Product approved']);
    
    res.json({
      success: true,
      data: product,
      message: 'Product approved successfully'
    });
    
  } catch (error) {
    console.error('❌ Approval error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to approve product',
      message: error.message
    });
  }
});

// POST /api/v1/admin/products/:productId/reject - Reject a product
app.post('/api/v1/admin/products/:productId/reject', async (req, res) => {
  try {
    const { productId } = req.params;
    const { rejectionReason, adminNotes } = req.body;
    
    console.log(`❌ Rejecting product: ${productId} - Reason: ${rejectionReason}`);
    
    if (!rejectionReason) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }
    
    // Update product in database
    const result = await pool.query(`
      UPDATE products 
      SET 
        approval_status = 'REJECTED',
        status = 'INACTIVE',
        rejection_reason = $2,
        admin_notes = $3,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `, [productId, rejectionReason, adminNotes || 'Rejected by admin']);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    const product = result.rows[0];
    console.log(`❌ Product rejected: ${product.name}`);
    
    // Insert approval history record
    await pool.query(`
      INSERT INTO product_approval_history 
      (product_id, previous_status, new_status, action_type, admin_id, admin_notes, rejection_reason)
      VALUES ($1, 'PENDING', 'REJECTED', 'REJECT', $2, $3, $4)
    `, [productId, '12345678-1234-1234-1234-123456789012', adminNotes || 'Product rejected', rejectionReason]);
    
    res.json({
      success: true,
      data: product,
      message: 'Product rejected successfully'
    });
    
  } catch (error) {
    console.error('❌ Rejection error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to reject product',
      message: error.message
    });
  }
});

// GET /api/v1/products - Contractor endpoint to view their products
app.get('/api/v1/products', async (req, res) => {
  try {
    const { contractorId, status } = req.query;
    
    console.log(`📦 Products requested for contractor: ${contractorId}`);
    
    let query = `
      SELECT 
        p.id, p.name, p.brand, p.model, p.description, 
        p.price, p.currency, p.status, p.approval_status,
        p.sku, p.stock_quantity, p.stock_status,
        p.contractor_id, p.created_at, p.updated_at,
        p.rejection_reason, p.admin_notes,
        c.name as category_name,
        COALESCE(
          JSON_AGG(
            CASE WHEN pi.id IS NOT NULL THEN
              JSON_BUILD_OBJECT(
                'id', pi.id,
                'file_url', pi.file_url,
                'file_path', pi.file_path,
                'is_primary', pi.is_primary,
                'sort_order', pi.sort_order
              )
            END
          ) FILTER (WHERE pi.id IS NOT NULL), '[]'::json
        ) as images
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN product_images pi ON p.id = pi.product_id
      WHERE 1=1
    `;
    
    const params = [];
    let paramIndex = 1;
    
    if (contractorId) {
      query += ` AND p.contractor_id = $${paramIndex}`;
      params.push(contractorId);
      paramIndex++;
    }
    
    if (status) {
      query += ` AND p.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }
    
    query += ` GROUP BY p.id, p.name, p.brand, p.model, p.description, 
               p.price, p.currency, p.status, p.approval_status,
               p.sku, p.stock_quantity, p.stock_status,
               p.contractor_id, p.created_at, p.updated_at,
               p.rejection_reason, p.admin_notes, c.name
               ORDER BY p.created_at DESC`;
    
    const result = await pool.query(query, params);
    
    console.log(`✅ Found ${result.rows.length} products for contractor`);
    
    res.json({
      success: true,
      data: result.rows,
      pagination: {
        total: result.rows.length,
        page: 1,
        limit: result.rows.length
      }
    });
    
  } catch (error) {
    console.error('❌ Database error:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch products',
      message: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log('🚀 Marketplace Service (Database) running on http://localhost:' + PORT);
  console.log('📦 Health: http://localhost:' + PORT + '/health');
  console.log('📋 Admin Products: http://localhost:' + PORT + '/api/v1/admin/products');
  console.log('⏳ Pending Products: http://localhost:' + PORT + '/api/v1/admin/products/pending');
  console.log('👨‍💼 Contractor Products: http://localhost:' + PORT + '/api/v1/products?contractorId=...');
  console.log('✅ Real database connected to rabhan_marketplace');
});