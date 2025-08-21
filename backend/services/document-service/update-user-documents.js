const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_document',
  password: '12345',
  port: 5432,
});

async function updateUserDocuments() {
  try {
    const oldUserId = '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0';
    const newUserId = '4fc43fb0-fabb-41e5-b708-083e23cc9e62';
    
    console.log(`Updating documents from ${oldUserId} to ${newUserId}...`);
    
    // First, check current state
    const beforeResult = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE auth_user_id = $1',
      [oldUserId]
    );
    console.log(`Documents currently with old user ID: ${beforeResult.rows[0].count}`);
    
    // Update the documents
    const result = await pool.query(
      'UPDATE documents SET auth_user_id = $1 WHERE auth_user_id = $2',
      [newUserId, oldUserId]
    );
    
    console.log(`Updated ${result.rowCount} documents`);
    
    // Verify the update
    const verifyResult = await pool.query(
      'SELECT COUNT(*) as count FROM documents WHERE auth_user_id = $1',
      [newUserId]
    );
    
    console.log(`Documents now associated with ${newUserId}: ${verifyResult.rows[0].count}`);
    
    // Show the updated documents
    const updatedDocs = await pool.query(
      'SELECT id, auth_user_id, original_filename FROM documents WHERE auth_user_id = $1',
      [newUserId]
    );
    
    console.log('Updated documents:');
    updatedDocs.rows.forEach(doc => {
      console.log(`- ${doc.original_filename} (ID: ${doc.id})`);
    });
    
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await pool.end();
  }
}

updateUserDocuments().catch(console.error);