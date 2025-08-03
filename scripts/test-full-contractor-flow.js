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

const userPool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_auth',
  password: '12345',
  port: 5432,
});

// Test configuration
const CONTRACTOR_SERVICE_URL = 'http://localhost:3004/api/contractors';
const JWT_SECRET = 'rabhan_jwt_secret_key_for_development_only_change_in_production';

async function testFullContractorFlow() {
  console.log('🔍 Testing complete contractor profile update flow...\n');

  try {
    // Step 1: Get a contractor from contractor database
    console.log('1. Getting contractor from contractor database...');
    const contractorQuery = await contractorPool.query(`
      SELECT id, user_id, business_name, email, description, updated_at
      FROM contractors 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (contractorQuery.rows.length === 0) {
      console.log('❌ No contractor records found');
      return;
    }

    const contractor = contractorQuery.rows[0];
    console.log('✅ Found contractor:');
    console.log(`   Contractor ID: ${contractor.id}`);
    console.log(`   User ID: ${contractor.user_id}`);
    console.log(`   Business Name: ${contractor.business_name}`);
    console.log(`   Email: ${contractor.email}`);
    console.log(`   Current Description: ${contractor.description || 'NULL'}`);
    console.log(`   Last Updated: ${contractor.updated_at}\n`);

    // Step 2: Get the corresponding user from user database
    console.log('2. Getting user from user database...');
    const userQuery = await userPool.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users 
      WHERE id = $1
    `, [contractor.user_id]);

    if (userQuery.rows.length === 0) {
      console.log('❌ User record not found in user database');
      
      // Try to get any user and find their contractor profile
      console.log('   Looking for any user with contractor profile...');
      const anyUserQuery = await userPool.query(`
        SELECT id, email, first_name, last_name, role
        FROM users 
        LIMIT 5
      `);
      
      console.log(`   Found ${anyUserQuery.rows.length} users in user database`);
      
      for (const user of anyUserQuery.rows) {
        const contractorCheck = await contractorPool.query(`
          SELECT id, business_name
          FROM contractors 
          WHERE user_id = $1 AND deleted_at IS NULL
        `, [user.id]);
        
        if (contractorCheck.rows.length > 0) {
          console.log(`✅ Found matching user-contractor pair:`);
          console.log(`   User ID: ${user.id}`);
          console.log(`   Email: ${user.email}`);
          console.log(`   Name: ${user.first_name} ${user.last_name}`);
          console.log(`   Contractor Business: ${contractorCheck.rows[0].business_name}\n`);
          
          // Use this pair for testing
          const testUser = user;
          const testContractorQuery = await contractorPool.query(`
            SELECT * FROM contractors WHERE user_id = $1 AND deleted_at IS NULL
          `, [user.id]);
          const testContractor = testContractorQuery.rows[0];
          
          await performAPITest(testUser, testContractor);
          return;
        }
      }
      
      console.log('❌ No user-contractor pairs found');
      return;
      
    } else {
      const user = userQuery.rows[0];
      console.log('✅ Found user:');
      console.log(`   User ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}\n`);
      
      await performAPITest(user, contractor);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await contractorPool.end();
    await userPool.end();
  }
}

async function performAPITest(user, contractor) {
  console.log('3. Creating JWT token for authentication...');
  
  const tokenPayload = {
    id: user.id,
    email: user.email,
    first_name: user.first_name,
    last_name: user.last_name,
    role: user.role || 'contractor',
    isAdmin: false
  };
  
  const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ JWT token created for user\n');

  // Step 4: Test contractor service health
  console.log('4. Testing contractor service health...');
  try {
    const healthResponse = await axios.get(`${CONTRACTOR_SERVICE_URL}/health`);
    console.log('✅ Contractor service is healthy');
    console.log(`   Status: ${healthResponse.data.data.status}\n`);
  } catch (error) {
    console.log(`❌ Contractor service not responding: ${error.message}\n`);
    return;
  }

  // Step 5: Test get profile endpoint
  console.log('5. Testing GET profile endpoint...');
  try {
    const getProfileResponse = await axios.get(`${CONTRACTOR_SERVICE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ GET profile successful');
    console.log(`   Business Name: ${getProfileResponse.data.data.business_name}`);
    console.log(`   Description: ${getProfileResponse.data.data.description || 'NULL'}`);
    console.log(`   Status: ${getProfileResponse.data.data.status}\n`);
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ GET profile failed: ${error.response.status} - ${error.response.data.error?.message}`);
    } else {
      console.log(`❌ GET profile network error: ${error.message}`);
    }
    console.log();
  }

  // Step 6: Test update profile endpoint
  console.log('6. Testing PUT profile endpoint...');
  const updateData = {
    business_name: `Updated Business Name ${new Date().toISOString()}`,
    description: `Updated description at ${new Date().toISOString()}`,
    business_type: 'llc'
  };
  
  console.log('📝 Update data:', JSON.stringify(updateData, null, 2));
  
  try {
    const updateResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ PUT profile successful!');
    console.log(`   Status: ${updateResponse.status}`);
    console.log(`   Success: ${updateResponse.data.success}`);
    console.log(`   Message: ${updateResponse.data.message || 'No message'}`);
    
    if (updateResponse.data.data) {
      console.log('📊 Updated contractor data:');
      console.log(`   Business Name: ${updateResponse.data.data.business_name}`);
      console.log(`   Description: ${updateResponse.data.data.description}`);
      console.log(`   Business Type: ${updateResponse.data.data.business_type}`);
      console.log(`   Updated At: ${updateResponse.data.data.updated_at}`);
    }
    
    // Step 7: Verify database changes
    console.log('\n7. Verifying database changes...');
    const dbVerification = await contractorPool.query(`
      SELECT business_name, description, business_type, updated_at, updated_by
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
      console.log(`   Updated By: ${dbData.updated_by}`);
      
      // Check if changes persisted
      const businessNameMatch = dbData.business_name === updateData.business_name;
      const descriptionMatch = dbData.description === updateData.description;
      const businessTypeMatch = dbData.business_type === updateData.business_type;
      
      if (businessNameMatch && descriptionMatch && businessTypeMatch) {
        console.log('\n🎉 SUCCESS: All updates persisted correctly to database!');
      } else {
        console.log('\n❌ ISSUE: Some updates did not persist:');
        console.log(`   Business Name Match: ${businessNameMatch}`);
        console.log(`   Description Match: ${descriptionMatch}`);
        console.log(`   Business Type Match: ${businessTypeMatch}`);
      }
    } else {
      console.log('❌ Could not verify database changes - contractor not found');
    }
    
  } catch (error) {
    if (error.response) {
      console.log(`❌ PUT profile failed: ${error.response.status}`);
      console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
    } else {
      console.log(`❌ PUT profile network error: ${error.message}`);
    }
  }
}

// Run the test
testFullContractorFlow()
  .then(() => {
    console.log('\n🎉 Full contractor flow test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });