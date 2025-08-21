const { Pool } = require('pg');

async function checkAzkashineContractor() {
  try {
    console.log('🔍 Checking for Azkashine contractor...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_contractors',
      user: 'postgres',
      password: '12345',
    });
    
    // Search for Azkashine in different ways
    console.log('\n1. Searching by business name containing "azka" or "shine":');
    const nameResult = await pool.query(`
      SELECT id, business_name, status, region, city, deleted_at
      FROM contractors
      WHERE LOWER(business_name) LIKE '%azka%' OR LOWER(business_name) LIKE '%shine%'
    `);
    
    if (nameResult.rows.length > 0) {
      nameResult.rows.forEach(contractor => {
        console.log(`   Found: ${contractor.business_name} - Status: ${contractor.status} - Location: ${contractor.city}, ${contractor.region}`);
        console.log(`   Deleted: ${contractor.deleted_at ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No contractors found with "azka" or "shine" in name');
    }
    
    // Search by email containing azka
    console.log('\n2. Searching by email containing "azka":');
    const emailResult = await pool.query(`
      SELECT id, business_name, email, status, region, city, deleted_at
      FROM contractors
      WHERE LOWER(email) LIKE '%azka%'
    `);
    
    if (emailResult.rows.length > 0) {
      emailResult.rows.forEach(contractor => {
        console.log(`   Found: ${contractor.business_name} - Email: ${contractor.email} - Status: ${contractor.status}`);
        console.log(`   Location: ${contractor.city}, ${contractor.region} - Deleted: ${contractor.deleted_at ? 'Yes' : 'No'}`);
      });
    } else {
      console.log('   No contractors found with "azka" in email');
    }
    
    // Check all contractors currently being returned by our endpoint query
    console.log('\n3. Checking our current endpoint query results:');
    const endpointResult = await pool.query(`
      SELECT business_name, status, region, city, deleted_at
      FROM contractors
      WHERE status IN ('active', 'verified') AND deleted_at IS NULL
      ORDER BY average_rating DESC
    `);
    
    console.log(`   Total contractors returned by endpoint: ${endpointResult.rows.length}`);
    console.log('   Contractor names:');
    endpointResult.rows.forEach((contractor, index) => {
      console.log(`     ${index + 1}. ${contractor.business_name} (${contractor.status})`);
    });
    
    // Check all statuses
    console.log('\n4. All contractors grouped by status:');
    const statusResult = await pool.query(`
      SELECT status, COUNT(*) as count, 
             STRING_AGG(business_name, ', ' ORDER BY business_name) as names
      FROM contractors 
      WHERE deleted_at IS NULL
      GROUP BY status
    `);
    
    statusResult.rows.forEach(row => {
      console.log(`   Status "${row.status}": ${row.count} contractors`);
      if (row.names && row.names.length < 200) {
        console.log(`     Names: ${row.names}`);
      }
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAzkashineContractor();