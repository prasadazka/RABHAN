const { Pool } = require('pg');

async function checkUser() {
  const authPool = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_auth'
  });
  
  const contractorPool = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_contractors'
  });
  
  try {
    console.log('Checking auth database for prasadrao@azkashine.com...');
    const authResult = await authPool.query(
      'SELECT id, email, role, user_type, first_name, last_name, created_at FROM users WHERE email = $1',
      ['prasadrao@azkashine.com']
    );
    
    if (authResult.rows.length > 0) {
      const user = authResult.rows[0];
      console.log('✅ User found in auth database:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  User Type: ${user.user_type}`);
      console.log(`  Name: ${user.first_name} ${user.last_name}`);
      console.log(`  Created: ${user.created_at}`);
      
      // Check for contractor profile
      console.log('\nChecking contractor database...');
      const contractorResult = await contractorPool.query(
        'SELECT id, user_id, business_name, email, status, created_at FROM contractors WHERE user_id = $1',
        [user.id]
      );
      
      if (contractorResult.rows.length > 0) {
        const contractor = contractorResult.rows[0];
        console.log('✅ Contractor profile found:');
        console.log(`  ID: ${contractor.id}`);
        console.log(`  Business Name: ${contractor.business_name}`);
        console.log(`  Email: ${contractor.email}`);
        console.log(`  Status: ${contractor.status}`);
        console.log(`  Created: ${contractor.created_at}`);
      } else {
        console.log('❌ No contractor profile found');
      }
      
    } else {
      console.log('❌ User not found in auth database');
      
      // Check all users to see what's in the database
      console.log('\nChecking all users in database...');
      const allUsers = await authPool.query('SELECT email, role, user_type FROM users LIMIT 10');
      console.log('Sample users in database:');
      allUsers.rows.forEach(user => {
        console.log(`  - ${user.email} (${user.role}/${user.user_type})`);
      });
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await authPool.end();
    await contractorPool.end();
  }
}

checkUser();