const { Pool } = require('pg');

async function setAnotherQuotePending() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  try {
    // Find a quote that can be set to pending
    const result = await pool.query(`
      SELECT id, admin_status, contractor_id 
      FROM contractor_quotes 
      WHERE admin_status != 'pending_review'
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (result.rows.length === 0) {
      console.log('No quotes found to set to pending');
      return;
    }

    const quoteId = result.rows[0].id;
    console.log(`Setting quote ${quoteId} to pending_review...`);
    
    const updateResult = await pool.query(`
      UPDATE contractor_quotes 
      SET 
        admin_status = 'pending_review',
        admin_notes = NULL,
        reviewed_at = NULL
      WHERE id = $1
      RETURNING id, admin_status
    `, [quoteId]);

    if (updateResult.rows.length > 0) {
      console.log('✅ Quote set to pending successfully:', updateResult.rows[0]);
      console.log('You can now test the approval workflow again!');
    }

  } catch (error) {
    console.error('Error setting quote to pending:', error);
  } finally {
    await pool.end();
  }
}

setAnotherQuotePending();