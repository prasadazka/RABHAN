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

const CONTRACTOR_SERVICE_URL = 'http://localhost:3004/api/contractors';
const JWT_SECRET = 'rabhan_jwt_secret_key_for_development_only_change_in_production';

async function debugUIState() {
  console.log('🔍 Debugging UI state issue - checking data structure mismatch...\n');

  try {
    // Get test data
    const contractorQuery = await contractorPool.query(`
      SELECT * FROM contractors 
      WHERE deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 1
    `);

    const userQuery = await authPool.query(`
      SELECT * FROM users 
      WHERE id = $1
    `, [contractorQuery.rows[0].user_id]);

    const contractor = contractorQuery.rows[0];
    const user = userQuery.rows[0];

    console.log('1. CURRENT DATA STRUCTURES:');
    console.log('\n📊 USER from auth database:');
    console.log(JSON.stringify(user, null, 2));
    
    console.log('\n📊 CONTRACTOR from contractor database:');
    console.log(JSON.stringify(contractor, null, 2));

    // Create token and test API
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '1h' });

    // Get current profile from API
    console.log('\n2. API RESPONSES:');
    const getResponse = await axios.get(`${CONTRACTOR_SERVICE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📊 GET /api/contractors/profile response:');
    console.log(JSON.stringify(getResponse.data.data, null, 2));

    // Test a small update
    console.log('\n3. TESTING UPDATE AND RESPONSE:');
    const testUpdate = {
      description: `Debug test ${new Date().toISOString()}`
    };

    const updateResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, testUpdate, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('\n📊 PUT /api/contractors/profile response:');
    console.log(JSON.stringify(updateResponse.data.data, null, 2));

    // Check what the frontend expects
    console.log('\n4. FRONTEND EXPECTATIONS:');
    console.log('\n🤔 The ContractorProfile component expects these user fields:');
    console.log('   - user.business_name');
    console.log('   - user.business_type'); 
    console.log('   - user.email');
    console.log('   - user.phone');
    console.log('   - user.description');
    console.log('   - user.address_line1');
    console.log('   - user.city');
    console.log('   - user.region');
    console.log('   - etc...');

    console.log('\n🤔 But the USER from auth service has:');
    Object.keys(user).forEach(key => {
      console.log(`   - user.${key}: ${user[key]}`);
    });

    console.log('\n🤔 And the CONTRACTOR data has:');
    Object.keys(contractor).forEach(key => {
      console.log(`   - contractor.${key}: ${contractor[key]}`);
    });

    console.log('\n❗ PROBLEM IDENTIFIED:');
    console.log('The ContractorProfile component expects the USER object to contain');
    console.log('contractor-specific fields (business_name, description, etc.)');
    console.log('But the USER from auth service only has basic user fields!');
    console.log('\nThe component should either:');
    console.log('1. Receive contractor data separately, OR');
    console.log('2. The user object should be merged with contractor data');

    // Check if contractor fields are missing from user
    const contractorFields = ['business_name', 'business_type', 'description', 'phone', 'address_line1', 'city', 'region'];
    const missingFields = contractorFields.filter(field => !(field in user));
    
    console.log(`\n📊 Missing contractor fields in user object: ${missingFields.join(', ')}`);

    // Check ContractorApp user merging
    console.log('\n5. SOLUTION VERIFICATION:');
    console.log('The ContractorApp should merge user + contractor data like this:');
    
    const mergedUser = {
      ...user,
      ...contractor
    };
    
    console.log('\n📊 MERGED USER (what ContractorProfile should receive):');
    console.log(JSON.stringify({
      id: mergedUser.id,
      email: mergedUser.email,
      first_name: mergedUser.first_name,
      last_name: mergedUser.last_name,
      business_name: mergedUser.business_name,
      business_type: mergedUser.business_type,
      phone: mergedUser.phone,
      description: mergedUser.description,
      address_line1: mergedUser.address_line1,
      city: mergedUser.city,
      region: mergedUser.region
    }, null, 2));

  } catch (error) {
    console.error('❌ Debug failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  } finally {
    await contractorPool.end();
    await authPool.end();
  }
}

debugUIState()
  .then(() => {
    console.log('\n🎯 Debug completed - check the data structure analysis above!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Debug failed:', error);
    process.exit(1);
  });