const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function findAzkashineContractor() {
  try {
    console.log('Searching for Azkashine contractor in auth database...');
    
    // Search for prasadrao@azkashine.com or variations
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, phone, company_name, status, phone_verified, password_hash, created_at
      FROM contractors 
      WHERE email ILIKE '%prasadrao%' OR email ILIKE '%azkashine%' OR company_name ILIKE '%azka%'
      ORDER BY created_at DESC
    `);
    
    console.log(`\nFound ${result.rows.length} matching contractors:`);
    
    if (result.rows.length > 0) {
      result.rows.forEach((contractor, index) => {
        console.log(`\n${index + 1}. ${contractor.first_name} ${contractor.last_name}`);
        console.log(`   Email: ${contractor.email}`);
        console.log(`   Company: ${contractor.company_name}`);
        console.log(`   Phone: ${contractor.phone}`);
        console.log(`   Status: ${contractor.status}`);
        console.log(`   Phone Verified: ${contractor.phone_verified}`);
        console.log(`   Has Password: ${contractor.password_hash ? 'YES' : 'NO'}`);
        console.log(`   Created: ${contractor.created_at}`);
        console.log(`   ID: ${contractor.id}`);
      });
    } else {
      console.log('❌ No contractors found matching "prasadrao" or "azkashine"');
      
      // Let's also check all contractors to see what we have
      console.log('\n📋 All contractors in auth database:');
      const allResult = await pool.query(`
        SELECT id, email, first_name, last_name, company_name, status, created_at
        FROM contractors 
        ORDER BY created_at DESC
        LIMIT 20
      `);
      
      allResult.rows.forEach((contractor, index) => {
        console.log(`\n${index + 1}. ${contractor.first_name} ${contractor.last_name}`);
        console.log(`   Email: ${contractor.email}`);
        console.log(`   Company: ${contractor.company_name || 'N/A'}`);
        console.log(`   Status: ${contractor.status}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

findAzkashineContractor();