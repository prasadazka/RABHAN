const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_marketplace',
  user: 'postgres',
  password: '12345'
});

async function exportProducts() {
  try {
    console.log('🔄 Exporting all products from local marketplace database...');
    
    // Export products
    const productsResult = await pool.query('SELECT * FROM products ORDER BY created_at');
    console.log('📊 Found', productsResult.rows.length, 'products');
    
    // Export categories
    const categoriesResult = await pool.query('SELECT * FROM categories ORDER BY created_at');
    console.log('📊 Found', categoriesResult.rows.length, 'categories');
    
    let sqlContent = '-- Marketplace Products and Categories Export\n\n';
    
    // Categories first
    if (categoriesResult.rows.length > 0) {
      sqlContent += '-- Categories\n';
      for (const row of categoriesResult.rows) {
        const values = [
          `'${row.id}'`,
          `'${row.name}'`,
          row.name_ar ? `'${row.name_ar.replace(/'/g, "''")}'` : 'NULL',
          row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL',
          row.description_ar ? `'${row.description_ar.replace(/'/g, "''")}'` : 'NULL',
          `'${row.slug}'`,
          `'${row.status}'`,
          `'${row.created_at.toISOString()}'`,
          `'${row.updated_at.toISOString()}'`
        ];
        
        sqlContent += `INSERT INTO categories (id, name, name_ar, description, description_ar, slug, status, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }
      sqlContent += '\n';
    }
    
    // Products
    if (productsResult.rows.length > 0) {
      sqlContent += '-- Products\n';
      for (const row of productsResult.rows) {
        const values = [
          `'${row.id}'`,
          `'${row.contractor_id}'`,
          `'${row.category_id}'`,
          `'${row.name.replace(/'/g, "''")}'`,
          row.name_ar ? `'${row.name_ar.replace(/'/g, "''")}'` : 'NULL',
          row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL',
          row.description_ar ? `'${row.description_ar.replace(/'/g, "''")}'` : 'NULL',
          `'${row.slug}'`,
          row.brand ? `'${row.brand}'` : 'NULL',
          row.model ? `'${row.model}'` : 'NULL',
          row.sku ? `'${row.sku}'` : 'NULL',
          `'${JSON.stringify(row.specifications).replace(/'/g, "''")}'`,
          row.price,
          `'${row.currency}'`,
          row.vat_included,
          row.stock_quantity || 0,
          `'${row.stock_status}'`,
          `'${row.status}'`,
          `'${row.created_at.toISOString()}'`,
          `'${row.updated_at.toISOString()}'`,
          row.created_by ? `'${row.created_by}'` : 'NULL',
          row.updated_by ? `'${row.updated_by}'` : 'NULL',
          `'${row.approval_status}'`,
          row.approved_by ? `'${row.approved_by}'` : 'NULL',
          row.approved_at ? `'${row.approved_at.toISOString()}'` : 'NULL',
          row.rejection_reason ? `'${row.rejection_reason.replace(/'/g, "''")}'` : 'NULL',
          row.admin_notes ? `'${row.admin_notes.replace(/'/g, "''")}'` : 'NULL',
          `'${row.product_category}'`
        ];
        
        sqlContent += `INSERT INTO products (id, contractor_id, category_id, name, name_ar, description, description_ar, slug, brand, model, sku, specifications, price, currency, vat_included, stock_quantity, stock_status, status, created_at, updated_at, created_by, updated_by, approval_status, approved_by, approved_at, rejection_reason, admin_notes, product_category) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
      }
    }
    
    fs.writeFileSync('local_marketplace_backup.sql', sqlContent);
    console.log('✅ Marketplace data exported to local_marketplace_backup.sql');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

exportProducts();