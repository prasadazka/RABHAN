const axios = require('axios');
const { Pool } = require('pg');

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

async function testContractorAPIWithAuth() {
  console.log('🔍 Testing contractor profile update API with authentication...\n');

  try {
    // Step 1: Get a contractor record to test with
    console.log('1. Getting contractor record...');
    const contractorQuery = await pool.query(`
      SELECT id, user_id, business_name, email, description
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
    console.log('✅ Test contractor:');
    console.log(`   ID: ${contractor.id}`);
    console.log(`   User ID: ${contractor.user_id}`);
    console.log(`   Business Name: ${contractor.business_name}`);
    console.log(`   Email: ${contractor.email}\n`);

    // Step 2: Try to get a JWT token (simulate login)
    console.log('2. Testing authentication...');
    
    // First, let's check if we can create a test token or get user credentials
    const userQuery = await pool.query(`
      SELECT id, email, first_name, last_name
      FROM users 
      WHERE id = $1
    `, [contractor.user_id]);

    if (userQuery.rows.length === 0) {
      console.log('❌ User record not found in users table');
      
      // Check if we can find any users
      const anyUserQuery = await pool.query(`
        SELECT id, email, first_name, last_name
        FROM users 
        WHERE deleted_at IS NULL
        LIMIT 1
      `);
      
      if (anyUserQuery.rows.length > 0) {
        console.log('✅ Found a user record:');
        console.log(`   ID: ${anyUserQuery.rows[0].id}`);
        console.log(`   Email: ${anyUserQuery.rows[0].email}`);
        
        // Now check if this user has a contractor profile
        const userContractorQuery = await pool.query(`
          SELECT id, user_id, business_name
          FROM contractors 
          WHERE user_id = $1 AND deleted_at IS NULL
        `, [anyUserQuery.rows[0].id]);
        
        if (userContractorQuery.rows.length > 0) {
          console.log('✅ User has contractor profile:');
          console.log(`   Contractor ID: ${userContractorQuery.rows[0].id}`);
          console.log(`   Business Name: ${userContractorQuery.rows[0].business_name}\n`);
          
          // Use this user-contractor pair for testing
          const testUser = anyUserQuery.rows[0];
          const testContractor = userContractorQuery.rows[0];
          
          // Step 3: Test API endpoint with mock JWT
          console.log('3. Testing API endpoint (without real auth)...');
          
          // Create a simple test request to see what the API expects
          try {
            const response = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, {
              business_name: 'API Test Update from Script',
              description: `Updated via API test at ${new Date().toISOString()}`
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer fake_jwt_token_for_testing`
              }
            });
            
            console.log('❌ Unexpected success with fake token');
            
          } catch (error) {
            if (error.response) {
              console.log(`✅ API responded with status: ${error.response.status}`);
              console.log(`   Error: ${error.response.data.error?.message || error.response.data.message}`);
              
              if (error.response.status === 401) {
                console.log('✅ Authentication properly required');
              }
            } else {
              console.log(`❌ Network error: ${error.message}`);
            }
          }
          
          // Step 4: Test with contractor service health check
          console.log('\n4. Testing contractor service health...');
          try {
            const healthResponse = await axios.get(`${CONTRACTOR_SERVICE_URL}/health`);
            console.log('✅ Contractor service is healthy');
            console.log(`   Service: ${healthResponse.data.data.service}`);
            console.log(`   Status: ${healthResponse.data.data.status}`);
            console.log(`   Version: ${healthResponse.data.data.version}`);
          } catch (error) {
            console.log(`❌ Health check failed: ${error.message}`);
          }

          // Step 5: Check if we can manually create a JWT for testing
          console.log('\n5. Checking JWT creation for testing...');
          const jwt = require('jsonwebtoken');
          const JWT_SECRET = 'rabhan_jwt_secret_key_for_development_only_change_in_production';
          
          const testPayload = {
            id: testUser.id,
            email: testUser.email,
            first_name: testUser.first_name,
            role: 'contractor',
            isAdmin: false
          };
          
          const testToken = jwt.sign(testPayload, JWT_SECRET, { expiresIn: '1h' });
          console.log('✅ Test JWT token created');
          
          // Step 6: Test API with proper JWT
          console.log('\n6. Testing API with proper JWT...');
          try {
            const authenticatedResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, {
              business_name: 'Authenticated API Test Update',
              description: `Authenticated update at ${new Date().toISOString()}`
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${testToken}`
              }
            });
            
            console.log('✅ Authenticated API call successful!');
            console.log(`   Status: ${authenticatedResponse.status}`);
            console.log(`   Success: ${authenticatedResponse.data.success}`);
            console.log(`   Message: ${authenticatedResponse.data.message || 'No message'}`);
            
            if (authenticatedResponse.data.data) {
              console.log(`   Updated Business Name: ${authenticatedResponse.data.data.business_name}`);
              console.log(`   Updated Description: ${authenticatedResponse.data.data.description}`);
            }
            
            // Step 7: Verify in database
            console.log('\n7. Verifying database update...');
            const dbVerification = await pool.query(`
              SELECT business_name, description, updated_at
              FROM contractors 
              WHERE id = $1
            `, [testContractor.id]);
            
            if (dbVerification.rows.length > 0) {
              console.log('✅ Database verification:');
              console.log(`   Current Business Name: ${dbVerification.rows[0].business_name}`);
              console.log(`   Current Description: ${dbVerification.rows[0].description}`);
              console.log(`   Last Updated: ${dbVerification.rows[0].updated_at}`);
              
              if (dbVerification.rows[0].business_name === 'Authenticated API Test Update') {
                console.log('✅ API update successfully persisted to database!');
              } else {
                console.log('❌ API update did not persist to database');
              }
            }
            
          } catch (error) {
            if (error.response) {
              console.log(`❌ Authenticated API call failed with status: ${error.response.status}`);
              console.log(`   Error: ${JSON.stringify(error.response.data, null, 2)}`);
            } else {
              console.log(`❌ Network error: ${error.message}`);
            }
          }
          
        } else {
          console.log('❌ User has no contractor profile');
        }
      } else {
        console.log('❌ No users found in database');
      }
    } else {
      console.log('✅ User found for contractor');
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testContractorAPIWithAuth()
  .then(() => {
    console.log('\n🎉 API authentication test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });