const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_document',
  password: '12345',
  port: 5432,
});

async function searchUserDocuments() {
  try {
    const userId = '4fc43fb0-fabb-41e5-b708-083e23cc9e62';
    console.log(`Comprehensive search for user ${userId}...`);
    
    // Check auth_user_id field
    const authResult = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE auth_user_id = $1',
      [userId]
    );
    console.log(`Documents with auth_user_id: ${authResult.rows[0].count}`);
    
    // Check if there's a user_id field
    try {
      const userResult = await pool.query(
        'SELECT COUNT(*) as count FROM documents WHERE user_id = $1',
        [userId]
      );
      console.log(`Documents with user_id: ${userResult.rows[0].count}`);
    } catch (err) {
      console.log('No user_id field exists');
    }
    
    // Get recent documents (last 24 hours)
    const recentDocs = await pool.query(
      'SELECT id, auth_user_id, original_filename, created_at FROM documents WHERE created_at > NOW() - INTERVAL \'24 hours\' ORDER BY created_at DESC LIMIT 10'
    );
    
    console.log(`\nRecent documents (last 24 hours): ${recentDocs.rows.length}`);
    recentDocs.rows.forEach(doc => {
      console.log(`- ${doc.original_filename} by user ${doc.auth_user_id} at ${doc.created_at}`);
    });
    
    // Get all documents for the specific user if any exist
    const allUserDocs = await pool.query(
      'SELECT id, auth_user_id, original_filename, document_type, created_at, approval_status FROM documents WHERE auth_user_id = $1',
      [userId]
    );
    
    if (allUserDocs.rows.length > 0) {
      console.log(`\nAll documents for user ${userId}:`);
      allUserDocs.rows.forEach(doc => {
        console.log(`- ID: ${doc.id}, Type: ${doc.document_type}, File: ${doc.original_filename}, Status: ${doc.approval_status}`);
      });
    }
    
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await pool.end();
  }
}

searchUserDocuments().catch(console.error);