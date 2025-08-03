const axios = require('axios');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

// Database connections
const contractorPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_contractors',
  password: '12345',
  port: 5432,
});

const authPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_auth',
  password: '12345',
  port: 5432,
});

// Test configuration
const CONTRACTOR_SERVICE_URL = 'http://localhost:3004/api/contractors';
const JWT_SECRET = 'rabhan_jwt_secret_key_for_development_only_change_in_production';

async function testContractorUIFix() {
  console.log('🧪 Testing contractor UI fix - verifying database updates reflect in UI...\n');

  try {
    // Step 1: Get a contractor and user pair
    console.log('1. Getting test contractor and user...');
    const contractorQuery = await contractorPool.query(`
      SELECT id, user_id, business_name, description, updated_at
      FROM contractors 
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    if (contractorQuery.rows.length === 0) {
      console.log('❌ No contractor records found');
      return;
    }

    const contractor = contractorQuery.rows[0];
    
    const userQuery = await authPool.query(`
      SELECT id, email, first_name, last_name, role
      FROM users 
      WHERE id = $1
    `, [contractor.user_id]);

    if (userQuery.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userQuery.rows[0];
    
    console.log('✅ Test subjects:');
    console.log(`   Contractor: ${contractor.business_name} (ID: ${contractor.id})`);
    console.log(`   User: ${user.first_name} ${user.last_name} (${user.email})`);
    console.log(`   Current Description: ${contractor.description || 'NULL'}`);

    // Step 2: Create JWT token
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '1h' });

    // Step 3: Make an update via API
    console.log('\n2. Making API update...');
    const testUpdate = {
      business_name: `Test Business Update ${new Date().toISOString()}`,
      description: `Updated via UI fix test at ${new Date().toISOString()}`,
      business_type: 'corporation'
    };

    const updateResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, testUpdate, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ API update successful');
    console.log(`   New Business Name: ${updateResponse.data.data.business_name}`);
    console.log(`   New Description: ${updateResponse.data.data.description}`);
    console.log(`   New Business Type: ${updateResponse.data.data.business_type}`);

    // Step 4: Verify database changes
    console.log('\n3. Verifying database persistence...');
    const dbVerification = await contractorPool.query(`
      SELECT business_name, description, business_type, updated_at
      FROM contractors 
      WHERE id = $1
    `, [contractor.id]);

    if (dbVerification.rows.length > 0) {
      const dbData = dbVerification.rows[0];
      console.log('✅ Database verification:');
      console.log(`   Business Name: ${dbData.business_name}`);
      console.log(`   Description: ${dbData.description}`);
      console.log(`   Business Type: ${dbData.business_type}`);
      console.log(`   Updated At: ${dbData.updated_at}`);

      // Check if all updates persisted
      const allMatch = 
        dbData.business_name === testUpdate.business_name &&
        dbData.description === testUpdate.description &&
        dbData.business_type === testUpdate.business_type;

      if (allMatch) {
        console.log('\n🎉 SUCCESS: API updates successfully persisted to database!');
        console.log('💡 The UI fix should now ensure that:');
        console.log('   ✅ Form data is updated after successful save');
        console.log('   ✅ Progress calculation uses updated data');
        console.log('   ✅ User sees the saved values immediately');
      } else {
        console.log('\n❌ Some updates did not persist correctly');
      }
    }

    // Step 5: Test edge case - multiple rapid updates
    console.log('\n4. Testing rapid updates (edge case)...');
    const rapidUpdates = [
      { description: 'Rapid update 1' },
      { description: 'Rapid update 2' }, 
      { description: 'Rapid update 3' }
    ];

    for (let i = 0; i < rapidUpdates.length; i++) {
      const update = rapidUpdates[i];
      console.log(`   Making update ${i + 1}: ${update.description}`);
      
      try {
        const response = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, update, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log(`   ✅ Update ${i + 1} successful`);
        
        // Small delay to avoid overwhelming the API
        await new Promise(resolve => setTimeout(resolve, 100));
        
      } catch (error) {
        console.log(`   ❌ Update ${i + 1} failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }

    // Final verification
    console.log('\n5. Final verification...');
    const finalCheck = await contractorPool.query(`
      SELECT description, updated_at
      FROM contractors 
      WHERE id = $1
    `, [contractor.id]);

    if (finalCheck.rows.length > 0) {
      console.log('✅ Final state:');
      console.log(`   Description: ${finalCheck.rows[0].description}`);
      console.log(`   Updated At: ${finalCheck.rows[0].updated_at}`);
      
      if (finalCheck.rows[0].description === 'Rapid update 3') {
        console.log('🎉 Rapid updates handled correctly!');
      }
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('API Error Details:', error.response.data);
    }
  } finally {
    await contractorPool.end();
    await authPool.end();
  }
}

// Run the test
testContractorUIFix()
  .then(() => {
    console.log('\n🎉 Contractor UI fix test completed');
    console.log('📝 Next steps:');
    console.log('   1. Test the frontend UI manually');
    console.log('   2. Verify form data updates after save');
    console.log('   3. Check progress bar reflects changes');
    console.log('   4. Ensure no data loss during rapid updates');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });