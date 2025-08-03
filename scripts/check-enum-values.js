const { Pool } = require('pg');

async function checkEnumValues() {
  const client = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔍 Checking enum values...');

    // Check document status enum
    const statusEnum = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'document_status_enum'
      );
    `);

    console.log('📋 document_status_enum values:');
    statusEnum.rows.forEach(row => console.log(`  • ${row.enumlabel}`));

    // Check approval status enum
    const approvalEnum = await client.query(`
      SELECT enumlabel 
      FROM pg_enum 
      WHERE enumtypid = (
        SELECT oid FROM pg_type WHERE typname = 'approval_status_enum'
      );
    `);

    console.log('\n📋 approval_status_enum values:');
    approvalEnum.rows.forEach(row => console.log(`  • ${row.enumlabel}`));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkEnumValues();