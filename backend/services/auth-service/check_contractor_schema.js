const { Pool } = require('pg');

async function checkContractorSchema() {
  const authPool = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_auth'
  });
  
  try {
    console.log('=== CONTRACTORS TABLE SCHEMA IN AUTH DATABASE ===');
    
    // Check contractors table structure
    const schemaResult = await authPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 Contractors table columns:');
    schemaResult.rows.forEach(col => {
      console.log(`  - ${col.column_name} (${col.data_type}) ${col.is_nullable === 'NO' ? '(NOT NULL)' : ''}`);
    });
    
    console.log('\n=== CHECKING FOR CONTRACTOR BY EMAIL ===');
    
    // Check by email
    const contractorByEmail = await authPool.query(
      'SELECT * FROM contractors WHERE email = $1',
      ['prasadrao@azkashine.com']
    );
    
    if (contractorByEmail.rows.length > 0) {
      const contractor = contractorByEmail.rows[0];
      console.log('✅ Contractor found by EMAIL:');
      Object.keys(contractor).forEach(key => {
        if (contractor[key] !== null) {
          console.log(`  ${key}: ${contractor[key]}`);
        }
      });
    } else {
      console.log('❌ No contractor found by email');
    }
    
    console.log('\n=== ALL CONTRACTORS IN AUTH DATABASE ===');
    const allContractors = await authPool.query('SELECT email, company_name, created_at FROM contractors LIMIT 10');
    
    if (allContractors.rows.length > 0) {
      console.log('📋 Sample contractors:');
      allContractors.rows.forEach(contractor => {
        console.log(`  - ${contractor.email} (${contractor.company_name || 'No company name'}) - ${contractor.created_at}`);
      });
    } else {
      console.log('❌ No contractors found in auth database');
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await authPool.end();
  }
}

checkContractorSchema();