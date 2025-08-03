const { Pool } = require('pg');
require('dotenv').config();

async function cleanupCategories() {
  const client = new Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🧹 Cleaning up document categories...');
    console.log('📋 Ensuring MVP Phase 1 categories match exactly\n');

    // Update the mapping for USER categories to use correct internal names
    await client.query(`
      UPDATE document_categories 
      SET name = 'proof_of_address', description = 'Proof of address document (utility bill, bank statement)'
      WHERE name = 'Address Proof' AND required_for_role = 'customer';
    `);
    
    console.log('✅ Updated Address Proof → proof_of_address');

    // Deactivate confusing legacy categories
    await client.query(`
      UPDATE document_categories 
      SET is_active = false
      WHERE name IN ('National ID', 'Income Proof') AND required_for_role = 'customer';
    `);
    
    console.log('✅ Deactivated legacy National ID and Income Proof categories');

    // Verify final state
    const result = await client.query(`
      SELECT name, description, required_for_role, is_active 
      FROM document_categories 
      WHERE required_for_role = 'customer' AND is_active = true
      ORDER BY name;
    `);

    console.log('\n📋 Final active customer document categories:');
    result.rows.forEach(row => {
      console.log(`   • ${row.name}: ${row.description}`);
    });

    console.log('\n🎉 Category cleanup completed!');
    console.log('\n🔧 MVP Phase 1 categories now match backend expectations:');
    console.log('   • national_id_front');
    console.log('   • national_id_back'); 
    console.log('   • proof_of_address');

  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

// Run the cleanup
cleanupCategories();