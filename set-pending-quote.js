const { Pool } = require('pg');

async function setPendingQuote() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  try {
    // Get the latest contractor quote
    const latestQuote = await pool.query(`
      SELECT id, admin_status, contractor_id 
      FROM contractor_quotes 
      ORDER BY created_at DESC 
      LIMIT 1
    `);

    if (latestQuote.rows.length === 0) {
      console.log('No contractor quotes found');
      return;
    }

    const quoteId = latestQuote.rows[0].id;
    const currentStatus = latestQuote.rows[0].admin_status;
    
    console.log(`Current quote ID: ${quoteId}`);
    console.log(`Current status: ${currentStatus}`);

    // Update to pending_review
    await pool.query(`
      UPDATE contractor_quotes 
      SET admin_status = 'pending_review',
          reviewed_at = NULL,
          admin_notes = NULL
      WHERE id = $1
    `, [quoteId]);

    console.log('✅ Quote status updated to pending_review');
    console.log('You can now test the admin approval workflow!');
    
  } catch (error) {
    console.error('Error updating quote status:', error);
  } finally {
    await pool.end();
  }
}

setPendingQuote();