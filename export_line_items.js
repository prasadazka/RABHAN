const { Pool } = require('pg');
const fs = require('fs');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function exportLineItems() {
  try {
    console.log('🔄 Exporting all line items from local database...');
    
    const result = await pool.query('SELECT * FROM quotation_line_items ORDER BY created_at');
    console.log('📊 Found', result.rows.length, 'line items');
    
    let sqlContent = '-- Line Items Export\n\n';
    
    for (const row of result.rows) {
      const values = [
        `'${row.id}'`,
        `'${row.quotation_id}'`,
        `'${row.item_name.replace(/'/g, "''")}'`,
        row.description ? `'${row.description.replace(/'/g, "''")}'` : 'NULL',
        row.specifications ? `'${row.specifications.replace(/'/g, "''")}'` : 'NULL',
        row.units,
        row.unit_price,
        row.line_order || 1,
        `'${row.created_at.toISOString()}'`,
        `'${row.updated_at.toISOString()}'`
      ];
      
      sqlContent += `INSERT INTO quotation_line_items (id, quotation_id, item_name, description, specifications, units, unit_price, line_order, created_at, updated_at) VALUES (${values.join(', ')}) ON CONFLICT (id) DO NOTHING;\n`;
    }
    
    fs.writeFileSync('local_line_items_backup.sql', sqlContent);
    console.log('✅ Line items exported to local_line_items_backup.sql');
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

exportLineItems();