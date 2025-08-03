const { Pool } = require('pg');
require('dotenv').config();

async function migrateDocumentCategories() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔄 Starting document categories migration...');
    console.log('📋 Adding MVP Phase 1 categories for split National ID\n');

    // Add new MVP categories if they don't exist
    await client.query(`
      INSERT INTO document_categories (name, description, required_for_role, max_file_size_mb, allowed_formats) VALUES
      ('national_id_front', 'Saudi National ID (Front Side)', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png']),
      ('national_id_back', 'Saudi National ID (Back Side)', 'customer', 10, ARRAY['pdf', 'jpg', 'jpeg', 'png'])
      ON CONFLICT (name) DO NOTHING;
    `);
    
    console.log('✅ Added national_id_front category');
    console.log('✅ Added national_id_back category');

    // Update existing 'national_id' category to be inactive (for backward compatibility)
    await client.query(`
      UPDATE document_categories 
      SET is_active = false, 
          description = 'Legacy - Use national_id_front and national_id_back instead'
      WHERE name = 'national_id';
    `);
    
    console.log('✅ Deactivated legacy national_id category');

    // Verify the migration
    const result = await client.query(`
      SELECT name, description, required_for_role, is_active 
      FROM document_categories 
      WHERE required_for_role = 'customer'
      ORDER BY name;
    `);

    console.log('\n📋 Current customer document categories:');
    result.rows.forEach(row => {
      const status = row.is_active ? '✅ Active' : '❌ Inactive';
      console.log(`   • ${row.name}: ${row.description} (${status})`);
    });

    console.log('\n🎉 Document categories migration completed successfully!');
    console.log('\n🔧 MVP Phase 1 KYC Requirements now supported:');
    console.log('   • national_id_front (Saudi National ID - Front Side)');
    console.log('   • national_id_back (Saudi National ID - Back Side)');
    console.log('   • proof_of_address (Proof of Address Document)');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the migration
migrateDocumentCategories();