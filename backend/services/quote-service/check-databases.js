const { Pool } = require('pg');

async function checkDatabases() {
  try {
    console.log('🔍 Checking available databases...');
    
    const adminPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'postgres',
      user: 'postgres',
      password: '12345',
    });
    
    const result = await adminPool.query(`
      SELECT datname FROM pg_database 
      WHERE datistemplate = false 
      ORDER BY datname
    `);
    
    console.log('📋 Available databases:');
    result.rows.forEach(row => {
      console.log(`   - ${row.datname}`);
    });
    
    await adminPool.end();
    
    // Try to check contractors table in different databases
    const possibleDatabases = result.rows.map(row => row.datname).filter(name => 
      name.includes('auth') || name.includes('contractor') || name.includes('rabhan')
    );
    
    for (const dbName of possibleDatabases) {
      try {
        console.log(`\n🔍 Checking contractors table in database: ${dbName}`);
        
        const pool = new Pool({
          host: 'localhost',
          port: 5432,
          database: dbName,
          user: 'postgres',
          password: '12345',
        });
        
        const contractorsResult = await pool.query(`
          SELECT COUNT(*) as count
          FROM contractors
          WHERE status = 'approved'
          LIMIT 1
        `);
        
        console.log(`   ✅ Found ${contractorsResult.rows[0].count} approved contractors`);
        
        const sampleResult = await pool.query(`
          SELECT id, business_name, region, city
          FROM contractors
          WHERE status = 'approved'
          LIMIT 3
        `);
        
        console.log('   Sample contractors:');
        sampleResult.rows.forEach(contractor => {
          console.log(`     - ${contractor.business_name} (${contractor.city}, ${contractor.region})`);
        });
        
        await pool.end();
        
      } catch (dbError) {
        console.log(`   ❌ Error checking ${dbName}: ${dbError.message}`);
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabases();