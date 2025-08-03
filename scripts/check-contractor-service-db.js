const { Client } = require('pg');

async function checkContractorServiceDB() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'rabhan_contractors'
  });

  try {
    await client.connect();
    console.log('✅ Connected to rabhan_contractors database successfully!');
    
    const email = 'prasad@azkashine.com';
    const userId = 'd6f7a99e-fb23-4173-ada2-5848c51f5ece';
    
    console.log(`\n🔍 Checking contractor service data for: ${email}`);
    console.log(`User ID: ${userId}`);
    console.log('='.repeat(60));
    
    // Check what tables exist
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tablesResult = await client.query(tablesQuery);
    console.log('📋 Available tables in contractor service:');
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });
    
    // Check contractors table if it exists
    if (tablesResult.rows.some(row => row.table_name === 'contractors')) {
      console.log('\n🔍 Checking contractors table...');
      
      // First check structure
      const columnsQuery = `
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'contractors' AND table_schema = 'public'
        ORDER BY ordinal_position
      `;
      
      const columnsResult = await client.query(columnsQuery);
      console.log('📋 Contractors table structure:');
      columnsResult.rows.forEach(row => {
        console.log(`  - ${row.column_name} (${row.data_type})`);
      });
      
      // Check for records by user_id
      const contractorQuery = `
        SELECT * FROM contractors 
        WHERE user_id = $1
      `;
      
      const contractorResult = await client.query(contractorQuery, [userId]);
      
      if (contractorResult.rows.length === 0) {
        console.log('❌ No contractor record found for this user_id');
      } else {
        console.log('🏗️ Contractor record found:');
        console.log(JSON.stringify(contractorResult.rows[0], null, 2));
      }
      
      // Also check by email if there's an email column
      const hasEmailColumn = columnsResult.rows.some(row => row.column_name === 'email');
      if (hasEmailColumn) {
        const emailQuery = `
          SELECT * FROM contractors 
          WHERE email = $1
        `;
        
        const emailResult = await client.query(emailQuery, [email]);
        
        if (emailResult.rows.length > 0) {
          console.log('🏗️ Contractor record found by email:');
          console.log(JSON.stringify(emailResult.rows[0], null, 2));
        }
      }
      
      // Check all contractors to see if there are any
      const allContractorsQuery = `SELECT COUNT(*) as total FROM contractors`;
      const allContractorsResult = await client.query(allContractorsQuery);
      console.log(`\n📊 Total contractors in database: ${allContractorsResult.rows[0].total}`);
    }
    
  } catch (err) {
    console.error('❌ Connection or query failed:', err.message);
    if (err.code === '3D000') {
      console.log('Database "rabhan_contractors" does not exist.');
    }
  } finally {
    await client.end();
  }
}

// Run the check
checkContractorServiceDB();