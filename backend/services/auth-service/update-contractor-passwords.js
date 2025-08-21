const pg = require('pg');
const bcrypt = require('bcrypt');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function updateContractorPasswords() {
  try {
    console.log('🔒 Updating contractor passwords to meet validation requirements...\n');
    
    // Strong password that meets most frontend validations
    const newPassword = 'Contractor123!';
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Get all contractors
    const result = await pool.query('SELECT id, email, first_name, last_name FROM contractors');
    
    console.log(`📝 Updating ${result.rows.length} contractor passwords...\n`);
    
    // Update all contractor passwords
    await pool.query('UPDATE contractors SET password_hash = $1', [hashedPassword]);
    
    console.log('✅ All contractor passwords updated successfully!\n');
    
    console.log('🔑 **UPDATED CONTRACTOR LOGIN CREDENTIALS**:\n');
    
    // Show first few accounts for testing
    const testAccounts = result.rows.slice(0, 5);
    
    testAccounts.forEach((contractor, index) => {
      console.log(`${index + 1}. ${contractor.first_name} ${contractor.last_name}`);
      console.log(`   📧 Email: ${contractor.email}`);
      console.log(`   🔒 Password: Contractor123!`);
      console.log('   ---');
    });
    
    console.log('\n🎯 **RECOMMENDED FOR TESTING**:');
    console.log('📧 Email: contractor.nasser.rashid1@business.com');
    console.log('🔒 Password: Contractor123!');
    console.log('');
    console.log('📧 Email: testcontractor@example.com');
    console.log('🔒 Password: Contractor123!');
    
    console.log('\n✅ **Password Requirements Met**:');
    console.log('• 8+ characters: ✅');
    console.log('• Uppercase letters: ✅ (C)');
    console.log('• Lowercase letters: ✅ (ontractor)'); 
    console.log('• Numbers: ✅ (123)');
    console.log('• Special characters: ✅ (!)');
    
    console.log('\n💡 **Next Steps**:');
    console.log('1. Login to contractor dashboard with new credentials');
    console.log('2. Navigate to "Quotes" section');
    console.log('3. Check for assigned quote requests');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

updateContractorPasswords();