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

async function testWhatsAppField() {
  console.log('🔍 Testing WhatsApp field fix in contractor profile...\n');

  try {
    // Get test contractor
    const contractorQuery = await contractorPool.query(`
      SELECT id, user_id, email, phone, whatsapp
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

    console.log('1. CURRENT DATABASE STATUS:');
    console.log(`   email: "${contractor.email}"`);
    console.log(`   phone: "${contractor.phone}"`);
    console.log(`   whatsapp: "${contractor.whatsapp || 'NULL'}"`);

    // Create token
    const token = jwt.sign({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      isAdmin: false
    }, JWT_SECRET, { expiresIn: '1h' });

    // Test with WhatsApp data
    console.log('\n2. TESTING WHATSAPP FIELD UPDATE...');
    const testContactData = {
      email: contractor.email, // Keep same email
      phone: '+966555000222',  // Update phone
      whatsapp: '+966555000333' // Add whatsapp
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

    // Verify database was updated with WhatsApp
    console.log('\n3. DATABASE VERIFICATION after WhatsApp update:');
    const dbCheck = await contractorPool.query(`
      SELECT email, phone, whatsapp, updated_at
      FROM contractors 
      WHERE id = $1
    `, [contractor.id]);

    const updatedContractor = dbCheck.rows[0];
    console.log(`   email: "${updatedContractor.email}"`);
    console.log(`   phone: "${updatedContractor.phone}"`);
    console.log(`   whatsapp: "${updatedContractor.whatsapp || 'NULL'}"`);
    console.log(`   updated_at: ${updatedContractor.updated_at}`);

    // Final verification
    console.log('\n4. WHATSAPP FIELD TEST RESULTS:');
    const whatsappMatches = testContactData.whatsapp === updatedContractor.whatsapp;
    const phoneMatches = testContactData.phone === updatedContractor.phone;

    console.log(`   ${phoneMatches ? '✅' : '❌'} Phone update: ${phoneMatches ? 'SUCCESS' : 'FAILED'}`);
    console.log(`   ${whatsappMatches ? '✅' : '❌'} WhatsApp update: ${whatsappMatches ? 'SUCCESS' : 'FAILED'}`);

    if (whatsappMatches && phoneMatches) {
      console.log('\n🎉 WHATSAPP FIELD IS NOW WORKING CORRECTLY!');
      console.log('   ✅ Backend API accepts WhatsApp data');
      console.log('   ✅ Database stores WhatsApp data');
      console.log('   ✅ Frontend should now display WhatsApp input field');
      console.log('\n📱 The contractor profile contact section now includes:');
      console.log('   • Email (read-only)');
      console.log('   • Phone (editable)');
      console.log('   • WhatsApp (editable) ← NEW FIELD ADDED');
      console.log('\n✨ Users can now enter their WhatsApp number and it will be saved!');
    } else {
      console.log('\n❌ WHATSAPP FIELD TEST FAILED!');
      console.log('   Backend or database is not handling WhatsApp correctly');
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

testWhatsAppField()
  .then(() => {
    console.log('\n🎯 WhatsApp field test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });