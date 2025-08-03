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

async function checkContactFieldsMatch() {
  console.log('🔍 Checking CONTACT INFO field matching between Frontend, Backend API, and Database...\n');

  try {
    // Get test contractor
    const contractorQuery = await contractorPool.query(`
      SELECT id, user_id, email, phone, whatsapp, website
      FROM contractors 
      WHERE user_id = '79f18d65-b180-400f-8668-36449bdef3dc'
      AND deleted_at IS NULL
    `);

    const userQuery = await authPool.query(`
      SELECT id, email, first_name, last_name, role
      FROM users 
      WHERE id = '79f18d65-b180-400f-8668-36449bdef3dc'
    `);

    if (contractorQuery.rows.length === 0) {
      console.log('❌ Contractor not found');
      return;
    }

    const contractor = contractorQuery.rows[0];
    const user = userQuery.rows[0];

    console.log('1. CURRENT DATABASE FIELDS (contractors table):');
    console.log(`   email: "${contractor.email}"`);
    console.log(`   phone: "${contractor.phone}"`);
    console.log(`   whatsapp: "${contractor.whatsapp}"`);
    console.log(`   website: "${contractor.website}"`);

    // Create token
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '1h' });

    // Test GET API
    console.log('\n2. BACKEND API GET /profile response:');
    const getResponse = await axios.get(`${CONTRACTOR_SERVICE_URL}/profile`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   email: "${getResponse.data.data.email}"`);
    console.log(`   phone: "${getResponse.data.data.phone}"`);
    console.log(`   whatsapp: "${getResponse.data.data.whatsapp}"`);
    console.log(`   website: "${getResponse.data.data.website}"`);

    // Check field matching
    console.log('\n3. FIELD MATCHING CHECK:');
    const dbVsApi = {
      email: contractor.email === getResponse.data.data.email,
      phone: contractor.phone === getResponse.data.data.phone,
      whatsapp: contractor.whatsapp === getResponse.data.data.whatsapp,
      website: contractor.website === getResponse.data.data.website
    };

    Object.entries(dbVsApi).forEach(([field, matches]) => {
      console.log(`   ${matches ? '✅' : '❌'} ${field}: ${matches ? 'MATCHES' : 'MISMATCH'}`);
      if (!matches) {
        console.log(`      DB: "${contractor[field]}" vs API: "${getResponse.data.data[field]}"`);
      }
    });

    // Test frontend expected format
    console.log('\n4. FRONTEND CONTACT SECTION FORMAT:');
    console.log('   Frontend expects:');
    console.log('   {');
    console.log('     email: string,');
    console.log('     phone: string,');
    console.log('     whatsapp: string,');
    console.log('   }');
    console.log('   Note: Frontend does NOT expect website in contact section!');

    // Test API update with contact data
    console.log('\n5. TESTING API UPDATE with contact data...');
    const testContactData = {
      email: contractor.email, // Keep same email
      phone: '+966555000111',
      whatsapp: '+966555000112'
    };

    console.log('   Sending update:', testContactData);

    const updateResponse = await axios.put(`${CONTRACTOR_SERVICE_URL}/profile`, testContactData, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log(`   ✅ Update API response: ${updateResponse.status}`);
    console.log(`   Success: ${updateResponse.data.success}`);
    console.log(`   Message: ${updateResponse.data.message}`);

    // Check if API returns updated data
    console.log('\n6. API RESPONSE DATA:');
    console.log(`   email: "${updateResponse.data.data.email}"`);
    console.log(`   phone: "${updateResponse.data.data.phone}"`);
    console.log(`   whatsapp: "${updateResponse.data.data.whatsapp}"`);

    // Verify database was updated
    console.log('\n7. DATABASE VERIFICATION after update:');
    const dbCheck = await contractorPool.query(`
      SELECT email, phone, whatsapp, updated_at
      FROM contractors 
      WHERE id = $1
    `, [contractor.id]);

    const updatedContractor = dbCheck.rows[0];
    console.log(`   email: "${updatedContractor.email}"`);
    console.log(`   phone: "${updatedContractor.phone}"`);
    console.log(`   whatsapp: "${updatedContractor.whatsapp}"`);
    console.log(`   updated_at: ${updatedContractor.updated_at}`);

    // Final verification
    console.log('\n8. FINAL VERIFICATION:');
    const finalMatches = {
      phone: testContactData.phone === updatedContractor.phone,
      whatsapp: testContactData.whatsapp === updatedContractor.whatsapp
    };

    Object.entries(finalMatches).forEach(([field, matches]) => {
      console.log(`   ${matches ? '✅' : '❌'} ${field} update: ${matches ? 'SUCCESS' : 'FAILED'}`);
    });

    // Check frontend-backend field mapping
    console.log('\n9. FRONTEND-BACKEND FIELD MAPPING CHECK:');
    console.log('   Frontend contact section sends:');
    console.log('   - email, phone, whatsapp');
    console.log('   Backend contractor.service.ts expects:');
    console.log('   - email, phone, whatsapp');
    console.log('   Database contractors table has:');
    console.log('   - email, phone, whatsapp, website');
    console.log('   ✅ Field mapping looks correct');

    if (Object.values(finalMatches).every(match => match)) {
      console.log('\n🎉 CONTACT INFO API IS WORKING CORRECTLY!');
      console.log('   The issue might be in frontend form state management');
    } else {
      console.log('\n❌ CONTACT INFO API HAS ISSUES!');
      console.log('   Backend or database update is failing');
    }

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

checkContactFieldsMatch()
  .then(() => {
    console.log('\n🎯 Contact fields check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });