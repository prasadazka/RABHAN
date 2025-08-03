const axios = require('axios');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');

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

async function testExactIssue() {
  console.log('🔍 Testing EXACT issue - step by step...\n');

  try {
    // Get the exact same contractor from logs
    const contractorQuery = await contractorPool.query(`
      SELECT * FROM contractors 
      WHERE user_id = '79f18d65-b180-400f-8668-36449bdef3dc'
      AND deleted_at IS NULL
    `);

    const userQuery = await authPool.query(`
      SELECT * FROM users 
      WHERE id = '79f18d65-b180-400f-8668-36449bdef3dc'
    `);

    if (contractorQuery.rows.length === 0 || userQuery.rows.length === 0) {
      console.log('❌ Test user/contractor not found');
      return;
    }

    const contractor = contractorQuery.rows[0];
    const user = userQuery.rows[0];

    console.log('1. CURRENT STATE FROM LOGS:');
    console.log(`   User: ${user.first_name} ${user.last_name}`);
    console.log(`   Business: ${contractor.business_name}`);
    console.log(`   Phone (user): ${user.phone}`);
    console.log(`   Phone (contractor): ${contractor.phone}`);
    console.log(`   Description: ${contractor.description?.substring(0, 50)}...`);

    // Create the exact merge that happens in ContractorApp
    const mergedData = {
      ...user,
      ...contractor,
      id: user.id,
      email: user.email,
      phone: contractor.phone || user.phone,
    };

    console.log('\n2. MERGED DATA (what ContractorProfile receives):');
    console.log(`   business_name: "${mergedData.business_name}"`);
    console.log(`   phone: "${mergedData.phone}"`);
    console.log(`   description: "${mergedData.description?.substring(0, 50)}..."`);

    // Create token
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '1h' });

    // Make a simple update
    console.log('\n3. MAKING UPDATE...');
    const updateData = {
      description: `TEST EXACT ISSUE ${new Date().toISOString()}`
    };

    console.log(`   Updating description to: "${updateData.description}"`);

    const response = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('✅ Update successful');
    console.log(`   API returned description: "${response.data.data.description}"`);

    // Check database
    console.log('\n4. CHECKING DATABASE...');
    const dbCheck = await contractorPool.query(`
      SELECT description, updated_at FROM contractors 
      WHERE id = $1
    `, [contractor.id]);

    console.log(`   DB description: "${dbCheck.rows[0].description}"`);
    console.log(`   DB updated_at: ${dbCheck.rows[0].updated_at}`);

    // Now simulate what SHOULD happen in the frontend
    console.log('\n5. FRONTEND SIMULATION...');
    
    console.log('   Step 1: ContractorProfile saves successfully ✅');
    console.log('   Step 2: ContractorProfile updates its own formData ✅');
    console.log('   Step 3: ContractorProfile calls onUpdate callback ✅');
    console.log('   Step 4: ContractorApp updates currentUser state ✅');
    console.log('   Step 5: ContractorApp passes updated user to ContractorProfile ✅');
    console.log('   Step 6: ContractorProfile useEffect sees user prop change...');

    const updatedMergedData = {
      ...mergedData,
      ...updateData
    };

    console.log(`   Step 7: ContractorProfile should update formData with: "${updatedMergedData.description}"`);

    console.log('\n6. THE PROBLEM:');
    console.log('   The ContractorProfile component might be:');
    console.log('   a) Not receiving the updated user prop from ContractorApp');
    console.log('   b) The useEffect dependency array is not triggering');
    console.log('   c) The merge in ContractorApp is not working correctly');
    console.log('   d) Multiple re-renders causing race conditions');
    
    console.log('\n7. DEBUGGING CLUES FROM LOGS:');
    console.log('   ✅ ContractorApp fetches profile data correctly');
    console.log('   ✅ ContractorApp merges data correctly');
    console.log('   ✅ ContractorProfile receives merged data');
    console.log('   ✅ ContractorProfile updates formData in useEffect');
    console.log('   ❓ But form fields still show old values after save');

    console.log('\n8. LIKELY CAUSE:');
    console.log('   The ContractorProfile onUpdate callback updates currentUser in ContractorApp,');
    console.log('   but the updated user prop might not be triggering the useEffect properly,');
    console.log('   OR there is a timing issue with the state updates.');

    console.log('\n9. SOLUTION:');
    console.log('   Need to ensure ContractorProfile form gets updated IMMEDIATELY after save,');
    console.log('   not just rely on the user prop change from parent.');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('API Error:', error.response.data);
    }
  } finally {
    await contractorPool.end();
    await authPool.end();
  }
}

testExactIssue()
  .then(() => {
    console.log('\n🎯 Exact issue analysis completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });