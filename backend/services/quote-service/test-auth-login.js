const { Pool } = require('pg');

async function testAuthLogin() {
  try {
    console.log('🔍 Testing login for prasadrao@azkashine.com...');
    
    const authPool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'rabhan_auth',
      user: 'postgres',
      password: '12345',
    });
    
    // Check what records exist for this email
    const result = await authPool.query(`
      SELECT id, email, company_name, first_name, last_name, status, created_at
      FROM contractors
      WHERE email = $1
      ORDER BY created_at DESC
    `, ['prasadrao@azkashine.com']);
    
    console.log(`\n📋 Found ${result.rows.length} records for prasadrao@azkashine.com:`);
    result.rows.forEach((user, index) => {
      console.log(`\n   Record ${index + 1}:`);
      console.log(`   ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Company: ${user.company_name}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Status: ${user.status}`);
      console.log(`   Created: ${user.created_at}`);
    });
    
    // Check if there are any duplicate emails that might be causing confusion
    const duplicateCheck = await authPool.query(`
      SELECT email, COUNT(*) as count
      FROM contractors
      WHERE email ILIKE '%azkashine%' OR email ILIKE '%prasad%'
      GROUP BY email
      ORDER BY count DESC, email
    `);
    
    console.log('\n📋 All Azkashine/Prasad related emails:');
    duplicateCheck.rows.forEach(row => {
      console.log(`   ${row.email}: ${row.count} records`);
    });
    
    await authPool.end();
    
    // Check the login behavior by making a test login request
    console.log('\n🔄 Testing login API call...');
    const https = require('http');
    
    const loginData = JSON.stringify({
      email: 'prasadrao@azkashine.com',
      password: 'Contractor123!',
      userType: 'contractor'
    });
    
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(loginData)
      }
    };
    
    const req = https.request(options, (res) => {
      let responseData = '';
      
      res.on('data', (chunk) => {
        responseData += chunk;
      });
      
      res.on('end', () => {
        console.log(`   Status: ${res.statusCode}`);
        console.log(`   Response:`, JSON.stringify(JSON.parse(responseData), null, 2));
      });
    });
    
    req.on('error', (error) => {
      console.error('   Login API error:', error.message);
    });
    
    req.write(loginData);
    req.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuthLogin();