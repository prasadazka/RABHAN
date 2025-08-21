const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function checkContractorById() {
  try {
    const contractorId = '48dbdfb7-d07f-4ab0-be26-7ec17568f6fc';
    
    console.log('Checking contractor with ID:', contractorId);
    
    const result = await pool.query('SELECT id, email, first_name, last_name, company_name FROM contractors WHERE id = $1', [contractorId]);
    
    if (result.rows.length > 0) {
      const contractor = result.rows[0];
      console.log('✅ Found contractor:');
      console.log('   Email: ' + contractor.email);
      console.log('   Name: ' + contractor.first_name + ' ' + contractor.last_name);
      console.log('   Company: ' + contractor.company_name);
    } else {
      console.log('❌ Contractor not found');
    }
    
    // Also check the Azkashine contractor ID
    const azkashineId = 'ad44ad87-6f3a-414e-bfe6-efe3d172212e';
    console.log('\nChecking Azkashine contractor with ID:', azkashineId);
    
    const azkashineResult = await pool.query('SELECT id, email, first_name, last_name, company_name FROM contractors WHERE id = $1', [azkashineId]);
    
    if (azkashineResult.rows.length > 0) {
      const contractor = azkashineResult.rows[0];
      console.log('✅ Found Azkashine contractor:');
      console.log('   Email: ' + contractor.email);
      console.log('   Name: ' + contractor.first_name + ' ' + contractor.last_name);
      console.log('   Company: ' + contractor.company_name);
    } else {
      console.log('❌ Azkashine contractor not found');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkContractorById();