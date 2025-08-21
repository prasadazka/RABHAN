const { Pool } = require('pg');

async function checkCurrentUser() {
  try {
    console.log('🔍 Checking what user ID 48dbdfb7-d07f-4ab0-be26-7ec17568f6fc corresponds to...');
    
    const authPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_auth',
      user: 'postgres',
      password: '12345',
    });
    
    const authResult = await authPool.query(`
      SELECT id, email, company_name, first_name, last_name, status
      FROM contractors
      WHERE id = $1
    `, ['48dbdfb7-d07f-4ab0-be26-7ec17568f6fc']);
    
    if (authResult.rows.length > 0) {
      const user = authResult.rows[0];
      console.log('\n📋 Current user details:');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Company: ${user.company_name}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Status: ${user.status}`);
    }
    
    await authPool.end();
    
    // Also check what contractor profile this maps to
    const contractorPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    const contractorResult = await contractorPool.query(`
      SELECT id, business_name, email, status
      FROM contractors
      WHERE user_id = $1
    `, ['48dbdfb7-d07f-4ab0-be26-7ec17568f6fc']);
    
    if (contractorResult.rows.length > 0) {
      const contractor = contractorResult.rows[0];
      console.log('\n📋 Mapped contractor profile:');
      console.log(`   Contractor ID: ${contractor.id}`);
      console.log(`   Business Name: ${contractor.business_name}`);
      console.log(`   Email: ${contractor.email}`);
      console.log(`   Status: ${contractor.status}`);
    }
    
    await contractorPool.end();
    
    console.log('\n📋 Expected Azkashine details:');
    console.log('   Email: prasadrao@azkashine.com');
    console.log('   User ID: ad44ad87-6f3a-414e-bfe6-efe3d172212e');
    console.log('   Contractor ID: 47293bc5-9961-44e1-add4-bc818ffa4a9e');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkCurrentUser();