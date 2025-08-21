const { Pool } = require('pg');

async function checkAzkashineMapping() {
  try {
    console.log('🔍 Checking Azkashine user-contractor mapping...');
    
    // Check auth service database
    const authPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_auth',
      user: 'postgres',
      password: '12345',
    });
    
    console.log('\n1. Checking Azkashine in auth service:');
    const authResult = await authPool.query(`
      SELECT id, email, company_name, status
      FROM contractors
      WHERE LOWER(email) LIKE '%azka%' OR LOWER(company_name) LIKE '%azka%'
    `);
    
    authResult.rows.forEach(contractor => {
      console.log(`   Auth ID: ${contractor.id} - ${contractor.company_name} (${contractor.email}) - ${contractor.status}`);
    });
    
    await authPool.end();
    
    // Check contractor service database
    const contractorPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    console.log('\n2. Checking Azkashine in contractor service:');
    const contractorResult = await contractorPool.query(`
      SELECT id, user_id, business_name, email, status
      FROM contractors
      WHERE LOWER(business_name) LIKE '%azka%' OR LOWER(email) LIKE '%azka%'
    `);
    
    contractorResult.rows.forEach(contractor => {
      console.log(`   Contractor ID: ${contractor.id} - User ID: ${contractor.user_id}`);
      console.log(`   Business: ${contractor.business_name} (${contractor.email}) - ${contractor.status}`);
    });
    
    await contractorPool.end();
    
    // Check hardcoded contractor ID
    console.log('\n3. Current hardcoded contractor ID in service: 48dbdfb7-d07f-4ab0-be26-7ec17568f6fc');
    console.log('   Azkashine contractor ID should be: 47293bc5-9961-44e1-add4-bc818ffa4a9e');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAzkashineMapping();