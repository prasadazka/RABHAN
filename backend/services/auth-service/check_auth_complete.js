const { Pool } = require('pg');

async function checkAuthComplete() {
  const authPool = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_auth'
  });
  
  try {
    console.log('=== Checking AUTH DATABASE STRUCTURE ===');
    
    // Check what tables exist in auth database
    const tablesResult = await authPool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    console.log('\n📋 Tables in rabhan_auth database:');
    tablesResult.rows.forEach(table => {
      console.log(`  - ${table.table_name}`);
    });
    
    console.log('\n=== CHECKING USER: prasadrao@azkashine.com ===');
    
    // Check users table
    console.log('\n👤 Checking USERS table...');
    const userResult = await authPool.query(
      'SELECT id, email, role, user_type, first_name, last_name, created_at FROM users WHERE email = $1',
      ['prasadrao@azkashine.com']
    );
    
    if (userResult.rows.length > 0) {
      const user = userResult.rows[0];
      console.log('✅ User found in USERS table:');
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.email}`);
      console.log(`  Role: ${user.role}`);
      console.log(`  User Type: ${user.user_type}`);
      console.log(`  Name: ${user.first_name} ${user.last_name}`);
      console.log(`  Created: ${user.created_at}`);
      
      // Check if contractors table exists in auth DB
      const contractorTableCheck = await authPool.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'contractors';
      `);
      
      if (contractorTableCheck.rows.length > 0) {
        console.log('\n🏢 Checking CONTRACTORS table in AUTH database...');
        const contractorResult = await authPool.query(
          'SELECT * FROM contractors WHERE user_id = $1 OR email = $2',
          [user.id, user.email]
        );
        
        if (contractorResult.rows.length > 0) {
          const contractor = contractorResult.rows[0];
          console.log('✅ Contractor found in AUTH database:');
          console.log(`  ID: ${contractor.id}`);
          console.log(`  User ID: ${contractor.user_id}`);
          console.log(`  Email: ${contractor.email}`);
          console.log(`  Company Name: ${contractor.company_name || contractor.business_name || 'N/A'}`);
          console.log(`  Business Type: ${contractor.business_type || 'N/A'}`);
          console.log(`  Status: ${contractor.status || contractor.verification_status || 'N/A'}`);
          console.log(`  Created: ${contractor.created_at}`);
          
          // Show all columns for this contractor
          console.log('\n📋 All contractor data:');
          Object.keys(contractor).forEach(key => {
            if (contractor[key] !== null) {
              console.log(`  ${key}: ${contractor[key]}`);
            }
          });
        } else {
          console.log('❌ No contractor found in AUTH database');
        }
      } else {
        console.log('❌ No CONTRACTORS table found in AUTH database');
      }
      
    } else {
      console.log('❌ User not found in USERS table');
    }
    
    // Check total counts
    console.log('\n=== DATABASE STATISTICS ===');
    const userCount = await authPool.query('SELECT COUNT(*) FROM users');
    console.log(`👥 Total users: ${userCount.rows[0].count}`);
    
    if (tablesResult.rows.some(t => t.table_name === 'contractors')) {
      const contractorCount = await authPool.query('SELECT COUNT(*) FROM contractors');
      console.log(`🏢 Total contractors: ${contractorCount.rows[0].count}`);
    }
    
  } catch (error) {
    console.error('Database error:', error.message);
  } finally {
    await authPool.end();
  }
}

checkAuthComplete();