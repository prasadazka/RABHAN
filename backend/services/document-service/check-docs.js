const { Pool } = require('pg');
require('dotenv').config();

async function checkDocuments() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('📋 Checking documents in database...\n');
    
    const result = await client.query(`
      SELECT id, user_id, category_id, original_filename, status, approval_status, created_at 
      FROM documents 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    if (result.rows.length === 0) {
      console.log('No documents found in database.');
      return;
    }
    
    console.log(`Found ${result.rows.length} documents:`);
    console.log('');
    
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. Document ID: ${row.id}`);
      console.log(`   User ID: ${row.user_id}`);
      console.log(`   Category: ${row.category_id}`);
      console.log(`   Filename: ${row.original_filename}`);
      console.log(`   Status: ${row.status}`);
      console.log(`   Approval: ${row.approval_status}`);
      console.log(`   Created: ${row.created_at}`);
      console.log('');
    });
    
  } catch (error) {
    console.error('❌ Error checking documents:', error.message);
  } finally {
    await client.end();
  }
}

checkDocuments();