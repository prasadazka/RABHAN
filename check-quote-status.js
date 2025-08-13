const { Pool } = require('pg');

async function checkQuoteStatus() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  try {
    // Check the specific quote you're trying to approve
    const targetQuoteId = 'f3f0fb02-80e4-46c5-b7bb-57877e4cc900';
    
    console.log(`Checking quote: ${targetQuoteId}`);
    
    const result = await pool.query(`
      SELECT id, admin_status, contractor_id, base_price, created_at, request_id
      FROM contractor_quotes 
      WHERE id = $1
    `, [targetQuoteId]);

    if (result.rows.length === 0) {
      console.log('❌ Quote not found in database');
    } else {
      console.log('✅ Quote found:', result.rows[0]);
    }

    // Also check all pending quotes
    console.log('\n--- All pending quotes ---');
    const pendingResult = await pool.query(`
      SELECT id, admin_status, contractor_id, base_price, created_at, request_id
      FROM contractor_quotes 
      WHERE admin_status = 'pending_review'
      ORDER BY created_at DESC
    `);

    console.log(`Found ${pendingResult.rows.length} pending quotes:`);
    pendingResult.rows.forEach(quote => {
      console.log(`- ID: ${quote.id}, Status: ${quote.admin_status}, Contractor: ${quote.contractor_id}`);
    });

  } catch (error) {
    console.error('Error checking quote:', error);
  } finally {
    await pool.end();
  }
}

checkQuoteStatus();