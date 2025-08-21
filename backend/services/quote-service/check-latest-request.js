const { Pool } = require('pg');

async function checkLatestRequest() {
  try {
    console.log('🔍 Checking latest quote request...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345',
    });
    
    // Get the latest quote request
    const result = await pool.query(`
      SELECT *
      FROM quote_requests 
      ORDER BY created_at DESC 
      LIMIT 1
    `);
    
    if (result.rows.length > 0) {
      const latestRequest = result.rows[0];
      console.log('\n📋 Latest quote request:');
      Object.keys(latestRequest).forEach(key => {
        const value = latestRequest[key];
        if (key === 'property_details' && value) {
          console.log(`   ${key}:`, JSON.stringify(value, null, 4));
        } else {
          console.log(`   ${key}: ${value}`);
        }
      });
    } else {
      console.log('   No quote requests found');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkLatestRequest();