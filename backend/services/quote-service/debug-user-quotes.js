const { Pool } = require('pg');
require('dotenv').config();

async function debugUserQuotes() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const targetUserId = '4fc43fb0-fabb-41e5-b708-083e23cc9e62';
    
    console.log('Debugging user quotes for user:', targetUserId);
    
    // Check all quote requests with user_id
    const allQuotes = await pool.query(`
      SELECT id, user_id, system_size_kwp, location_address, service_area, status, created_at
      FROM quote_requests 
      ORDER BY created_at DESC
    `);
    
    console.log('\n=== ALL QUOTE REQUESTS ===');
    allQuotes.rows.forEach((row, index) => {
      console.log(`${index + 1}. ID: ${row.id}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   User ID Type: ${typeof row.user_id}`);
      console.log(`   Matches Target: ${row.user_id === targetUserId}`);
      console.log(`   System Size: ${row.system_size_kwp} kWp`);
      console.log(`   Location: ${row.location_address}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
    // Test the exact query used by the service
    const serviceQuery = `
      SELECT qr.*, 
             (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id) as quote_count,
             (SELECT COUNT(*) FROM contractor_quotes cq WHERE cq.request_id = qr.id AND cq.admin_status = 'approved') as approved_quote_count
      FROM quote_requests qr 
      WHERE user_id = $1
      ORDER BY created_at desc
      LIMIT $2 OFFSET $3
    `;
    
    const serviceResult = await pool.query(serviceQuery, [targetUserId, 10, 0]);
    
    console.log('=== SERVICE QUERY RESULT ===');
    console.log('Query:', serviceQuery.replace(/\s+/g, ' ').trim());
    console.log('Parameters:', [targetUserId, 10, 0]);
    console.log('Results:', serviceResult.rows.length);
    
    if (serviceResult.rows.length > 0) {
      serviceResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}, System: ${row.system_size_kwp} kWp`);
      });
    } else {
      console.log('No results found with service query');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
  }
}

debugUserQuotes();