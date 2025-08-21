const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345',
});

async function checkPreferredDates() {
  try {
    console.log('🔍 Checking preferred installation dates in database...');
    
    const result = await pool.query(`
      SELECT 
        id, 
        property_details,
        property_details->'preferred_installation_date' as preferred_date
      FROM quote_requests 
      ORDER BY created_at DESC
    `);
    
    console.log('📋 Found quote requests:');
    result.rows.forEach(row => {
      console.log(`\n📄 Request ID: ${row.id}`);
      console.log(`   Property Details:`, JSON.stringify(row.property_details, null, 2));
      console.log(`   Preferred Date: ${row.preferred_date || 'null'}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkPreferredDates();