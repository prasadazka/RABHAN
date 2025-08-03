const { Pool } = require('pg');
const axios = require('axios');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_contractors',
  password: '12345',
  port: 5432,
});

// Test configuration
const CONTRACTOR_SERVICE_URL = 'http://localhost:3004/api/contractors';
const AUTH_SERVICE_URL = 'http://localhost:3001/api/auth';

async function testContractorProfileUpdate() {
  console.log('🔍 Starting contractor profile update debug test...\n');

  try {
    // Step 1: Check database connection
    console.log('1. Testing database connection...');
    const dbResult = await pool.query('SELECT NOW()');
    console.log('✅ Database connected successfully');
    console.log(`   Current time: ${dbResult.rows[0].now}\n`);

    // Step 2: Check if contractors table exists and has data
    console.log('2. Checking contractors table...');
    const tableCheck = await pool.query(`
      SELECT COUNT(*) as total_contractors 
      FROM contractors 
      WHERE deleted_at IS NULL
    `);
    console.log(`✅ Contractors table exists with ${tableCheck.rows[0].total_contractors} records\n`);

    // Step 3: Check for contractor records
    const contractorRecords = await pool.query(`
      SELECT id, user_id, business_name, email, status, created_at, updated_at
      FROM contractors 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    console.log('3. Recent contractor records:');
    if (contractorRecords.rows.length === 0) {
      console.log('❌ No contractor records found in database');
      console.log('   This might be the issue - no contractor profiles exist to update\n');
      
      // Create a test contractor record
      console.log('4. Creating test contractor record...');
      const testUserId = '550e8400-e29b-41d4-a716-446655440000'; // Test UUID
      const testContractor = await pool.query(`
        INSERT INTO contractors (
          id, user_id, business_name, business_type, email, phone,
          address_line1, city, region, service_categories
        ) VALUES (
          uuid_generate_v4(), $1, 'Test Solar Company', 'llc', 
          'test@example.com', '+966501234567',
          'Test Street 123', 'Riyadh', 'Riyadh', 
          ARRAY['residential_solar']::service_category[]
        ) RETURNING *
      `, [testUserId]);
      
      console.log('✅ Test contractor created:');
      console.log(`   ID: ${testContractor.rows[0].id}`);
      console.log(`   Business Name: ${testContractor.rows[0].business_name}`);
      console.log(`   Email: ${testContractor.rows[0].email}\n`);
      
    } else {
      console.log('✅ Found contractor records:');
      contractorRecords.rows.forEach((contractor, index) => {
        console.log(`   ${index + 1}. ID: ${contractor.id}`);
        console.log(`      User ID: ${contractor.user_id}`);
        console.log(`      Business: ${contractor.business_name}`);
        console.log(`      Email: ${contractor.email}`);
        console.log(`      Status: ${contractor.status}`);
        console.log(`      Updated: ${contractor.updated_at}\n`);
      });
    }

    // Step 4: Test direct database update
    console.log('5. Testing direct database update...');
    const testUpdate = await pool.query(`
      UPDATE contractors 
      SET business_name = 'Updated Test Name', 
          updated_at = CURRENT_TIMESTAMP,
          description = 'Test update from debug script'
      WHERE email = 'test@example.com'
      RETURNING id, business_name, description, updated_at
    `);
    
    if (testUpdate.rows.length > 0) {
      console.log('✅ Direct database update successful:');
      console.log(`   Business Name: ${testUpdate.rows[0].business_name}`);
      console.log(`   Description: ${testUpdate.rows[0].description}`);
      console.log(`   Updated At: ${testUpdate.rows[0].updated_at}\n`);
    } else {
      console.log('❌ Direct database update failed - no rows affected\n');
    }

    // Step 5: Check contractor service endpoint
    console.log('6. Testing contractor service endpoint...');
    try {
      const healthCheck = await axios.get(`${CONTRACTOR_SERVICE_URL}/health`);
      console.log('✅ Contractor service is running');
      console.log(`   Status: ${healthCheck.data.data.status}\n`);
    } catch (error) {
      console.log('❌ Contractor service health check failed:');
      console.log(`   Error: ${error.message}`);
      console.log('   Make sure contractor service is running on port 3004\n');
    }

    // Step 6: Test profile update endpoint without auth (to check if it reaches the service)
    console.log('7. Testing profile update endpoint structure...');
    try {
      const updateResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, {
        business_name: 'API Test Update',
        description: 'Updated via API test'
      });
      console.log('❌ Unexpected: Update succeeded without authentication');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ Endpoint properly requires authentication');
      } else {
        console.log(`❌ Unexpected error: ${error.message}`);
      }
    }

    // Step 7: Check database transaction isolation
    console.log('\n8. Testing database transaction handling...');
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      const beforeUpdate = await client.query(`
        SELECT business_name, updated_at FROM contractors 
        WHERE email = 'test@example.com'
      `);
      
      await client.query(`
        UPDATE contractors 
        SET business_name = 'Transaction Test' 
        WHERE email = 'test@example.com'
      `);
      
      const duringTransaction = await client.query(`
        SELECT business_name FROM contractors 
        WHERE email = 'test@example.com'
      `);
      
      await client.query('ROLLBACK');
      
      const afterRollback = await client.query(`
        SELECT business_name FROM contractors 
        WHERE email = 'test@example.com'
      `);
      
      console.log('✅ Transaction test results:');
      console.log(`   Before: ${beforeUpdate.rows[0]?.business_name}`);
      console.log(`   During transaction: ${duringTransaction.rows[0]?.business_name}`);
      console.log(`   After rollback: ${afterRollback.rows[0]?.business_name}`);
      
      if (beforeUpdate.rows[0]?.business_name === afterRollback.rows[0]?.business_name) {
        console.log('✅ Transaction rollback working correctly\n');
      } else {
        console.log('❌ Transaction rollback issue detected\n');
      }
      
    } finally {
      client.release();
    }

    // Step 8: Check for potential foreign key issues
    console.log('9. Checking foreign key constraints...');
    const fkCheck = await pool.query(`
      SELECT 
        tc.table_name, 
        kcu.column_name, 
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name 
      FROM information_schema.table_constraints AS tc 
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY' 
        AND tc.table_name = 'contractors'
    `);
    
    console.log('✅ Foreign key constraints on contractors table:');
    fkCheck.rows.forEach(fk => {
      console.log(`   ${fk.column_name} -> ${fk.foreign_table_name}.${fk.foreign_column_name}`);
    });
    console.log();

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testContractorProfileUpdate()
  .then(() => {
    console.log('🎉 Debug test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug test failed:', error);
    process.exit(1);
  });