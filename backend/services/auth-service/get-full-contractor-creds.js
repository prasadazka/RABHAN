const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth', // Found the correct database
  user: 'postgres',
  password: '12345'
});

async function getFullContractorCredentials() {
  try {
    console.log('🏢 Getting contractor login credentials...\n');
    
    // Get all contractors
    const result = await pool.query(`
      SELECT id, email, first_name, last_name, phone, created_at, status, email_verified
      FROM contractors 
      ORDER BY created_at DESC
    `);
    
    console.log('📋 CONTRACTOR LOGIN CREDENTIALS:\n');
    
    result.rows.forEach((contractor, index) => {
      console.log(`${index + 1}. ${contractor.first_name} ${contractor.last_name}`);
      console.log(`   📧 Email: ${contractor.email}`);
      console.log(`   🔒 Password: 12345 (default)`);
      console.log(`   🆔 ID: ${contractor.id}`);
      console.log(`   📱 Phone: ${contractor.phone}`);
      console.log(`   ✅ Status: ${contractor.status}`);
      console.log(`   📅 Created: ${contractor.created_at}`);
      console.log('   ---');
    });
    
    // Check which of these contractor IDs match our assigned ones
    const assignedContractorIds = [
      'f3d5cab5-628f-42da-8c30-2a4ef6b9a111',  // Solar Solutions KSA 5
      '87f2620a-8631-42d7-9272-7bbff3fd9441',  // Smart Solar Solutions 8  
      '1da73364-4530-4e15-8903-6ebf174d2cde'   // Solar Solutions KSA
    ];
    
    console.log('🎯 CONTRACTORS WITH QUOTE ASSIGNMENTS:');
    
    const matchedContractors = result.rows.filter(c => assignedContractorIds.includes(c.id));
    
    if (matchedContractors.length > 0) {
      matchedContractors.forEach((contractor, index) => {
        console.log(`\n${index + 1}. ⭐ ${contractor.first_name} ${contractor.last_name}`);
        console.log(`   📧 Login Email: ${contractor.email}`);  
        console.log(`   🔒 Password: 12345`);
        console.log(`   🆔 Contractor ID: ${contractor.id}`);
        console.log(`   📋 HAS QUOTE ASSIGNMENT - Check dashboard!`);
      });
    } else {
      console.log('\n⚠️  None of the assigned contractors found in auth database');
      console.log('🔧 You can use any contractor account above to test the dashboard');
      console.log('📝 The quote assignments are linked by contractor ID, not email');
    }
    
    console.log('\n💡 TESTING INSTRUCTIONS:');
    console.log('1. Use any email/password combination above');
    console.log('2. Login to contractor dashboard');  
    console.log('3. Navigate to "Quotes" or "Assigned Requests" section');
    console.log('4. Look for the quote request with system size 10 kWp');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

getFullContractorCredentials();