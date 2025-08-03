const { Client } = require('pg');

async function checkUserConflict() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'rabhan_auth'
  });

  try {
    await client.connect();
    console.log('✅ Connected to rabhan_auth database successfully!');
    
    const email = 'prasad@azkashine.com';
    console.log(`\n🔍 Checking user data for: ${email}`);
    console.log('='.repeat(60));
    
    // First, let's check what columns exist in the users table
    const columnsQuery = `
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'users' AND table_schema = 'public'
      ORDER BY ordinal_position
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('📋 Available columns in users table:');
    columnsResult.rows.forEach(row => {
      console.log(`  - ${row.column_name} (${row.data_type})`);
    });
    
    // Check users table
    const userQuery = `
      SELECT id, email, role, user_type, first_name, last_name, created_at
      FROM users 
      WHERE email = $1
    `;
    
    const userResult = await client.query(userQuery, [email]);
    
    if (userResult.rows.length === 0) {
      console.log('❌ No user found with this email in users table');
    } else {
      console.log('👤 User found in users table:');
      console.log(JSON.stringify(userResult.rows[0], null, 2));
      
      const userId = userResult.rows[0].id;
      
      // Check contractors table
      console.log('\n🔍 Checking contractors table for this user...');
      const contractorQuery = `
        SELECT * FROM contractors 
        WHERE user_id = $1
      `;
      
      const contractorResult = await client.query(contractorQuery, [userId]);
      
      if (contractorResult.rows.length === 0) {
        console.log('❌ No contractor record found for this user');
      } else {
        console.log('🏗️ Contractor record found:');
        console.log(JSON.stringify(contractorResult.rows[0], null, 2));
      }
      
      // Check what tables exist in the database
      console.log('\n🔍 Checking available tables...');
      const tablesQuery = `
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `;
      
      const tablesResult = await client.query(tablesQuery);
      console.log('📋 Available tables:');
      tablesResult.rows.forEach(row => {
        console.log(`  - ${row.table_name}`);
      });
      
      // Check contractors table structure
      console.log('\n🔍 Checking contractors table structure...');
      const contractorColumnsQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'contractors' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const contractorColumnsResult = await client.query(contractorColumnsQuery);
      if (contractorColumnsResult.rows.length > 0) {
        console.log('📋 Contractors table columns:');
        contractorColumnsResult.rows.forEach(row => {
          console.log(`  - ${row.column_name} (${row.data_type})`);
        });
      } else {
        console.log('❌ Contractors table does not exist or has no columns');
      }
    }
    
    // Additional check: Look for any duplicate emails
    console.log('\n🔍 Checking for any duplicate emails...');
    const duplicateQuery = `
      SELECT email, COUNT(*) as count
      FROM users
      WHERE email = $1
      GROUP BY email
      HAVING COUNT(*) > 1
    `;
    
    const duplicateResult = await client.query(duplicateQuery, [email]);
    
    if (duplicateResult.rows.length > 0) {
      console.log('⚠️ Duplicate emails found:');
      console.log(JSON.stringify(duplicateResult.rows, null, 2));
    } else {
      console.log('✅ No duplicate emails found');
    }
    
  } catch (err) {
    console.error('❌ Query failed:', err.message);
    console.error('Full error:', err);
  } finally {
    await client.end();
  }
}

// Run the check
checkUserConflict();