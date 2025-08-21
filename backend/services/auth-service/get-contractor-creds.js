const { database } = require('./dist/config/database.config.js');

async function getContractorUsers() {
  try {
    const result = await database.query("SELECT id, email, first_name, last_name, role FROM users WHERE role = $1 LIMIT 10", ['contractor']);
    console.log('Available contractor users:');
    result.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Name: ${user.first_name} ${user.last_name}`);
      console.log(`   Role: ${user.role}`);
      console.log('---');
    });
    
    // For testing purposes, let's get one specific contractor
    if (result.rows.length > 0) {
      const testContractor = result.rows[0];
      console.log('\n🔑 Test Contractor Credentials:');
      console.log('Email:', testContractor.email);
      console.log('Password: Use default password (12345 or check your setup)');
      console.log('Contractor ID:', testContractor.id);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

getContractorUsers();