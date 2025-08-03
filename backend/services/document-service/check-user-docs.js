const { Pool } = require('pg');
require('dotenv').config();

async function checkUserDocuments() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    // Check documents for the specific user that's having issues
    const userId = '1f475729-c2e0-4b3d-a678-e4a4ea4d6cc0'; // From the logs above
    
    console.log(`📋 Checking documents for user: ${userId}\n`);
    
    const result = await client.query(`
      SELECT d.id, d.category_id, d.original_filename, d.status, d.approval_status, d.created_at,
             c.name as category_name
      FROM documents d
      LEFT JOIN document_categories c ON d.category_id = c.id
      WHERE d.user_id = $1 AND d.status != 'archived'
      ORDER BY d.created_at DESC
    `, [userId]);
    
    if (result.rows.length === 0) {
      console.log('No documents found for this user.');
      return;
    }
    
    console.log(`Found ${result.rows.length} documents for this user:`);
    console.log('');
    
    const categoryGroups = {};
    
    result.rows.forEach(doc => {
      const categoryName = doc.category_name || 'Unknown';
      if (!categoryGroups[categoryName]) {
        categoryGroups[categoryName] = [];
      }
      categoryGroups[categoryName].push(doc);
    });
    
    Object.keys(categoryGroups).forEach(categoryName => {
      const docs = categoryGroups[categoryName];
      console.log(`📂 ${categoryName}:`);
      docs.forEach((doc, index) => {
        console.log(`   ${index + 1}. ${doc.original_filename}`);
        console.log(`      ID: ${doc.id}`);
        console.log(`      Status: ${doc.status} / ${doc.approval_status}`);
        console.log(`      Created: ${doc.created_at}`);
        
        // Check if this document can be replaced
        const canReplace = doc.approval_status !== 'approved';
        console.log(`      Can Replace: ${canReplace ? '✅ Yes' : '❌ No (Admin verified)'}`);
        console.log('');
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkUserDocuments();