const { Pool } = require('pg');

async function checkDocumentsSchema() {
  const client = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔍 Checking documents table schema...');

    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'documents' 
      ORDER BY ordinal_position;
    `);

    console.log('📋 Documents table columns:');
    columns.rows.forEach(col => {
      console.log(`  • ${col.column_name}: ${col.data_type}`);
    });

    // Get sample document
    const sample = await client.query('SELECT * FROM documents LIMIT 1');
    if (sample.rows.length > 0) {
      console.log('\n📄 Sample document:', sample.rows[0]);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDocumentsSchema();