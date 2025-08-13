const { Pool } = require('pg');

async function resetQuoteToPending() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  try {
    const quoteId = 'f3f0fb02-80e4-46c5-b7bb-57877e4cc900';
    
    console.log(`Resetting quote ${quoteId} to pending_review...`);
    
    const result = await pool.query(`
      UPDATE contractor_quotes 
      SET 
        admin_status = 'pending_review',
        admin_notes = NULL,
        reviewed_at = NULL
      WHERE id = $1
      RETURNING id, admin_status
    `, [quoteId]);

    if (result.rows.length > 0) {
      console.log('✅ Quote reset successfully:', result.rows[0]);
      console.log('You can now test the approval workflow!');
    } else {
      console.log('❌ Quote not found');
    }

  } catch (error) {
    console.error('Error resetting quote:', error);
  } finally {
    await pool.end();
  }
}

resetQuoteToPending();