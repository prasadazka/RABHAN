const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function updatePhoneVerified() {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    console.log('🔄 Updating phone verification status for existing users...');
    
    // Read the migration file
    const migrationPath = path.join(__dirname, '..', 'migrations', '003_update_phone_verified_existing_users.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Execute the migration
    const result = await pool.query(migrationSQL);
    
    // Get count of updated users
    const countResult = await pool.query(`
      SELECT COUNT(*) as total_users,
             COUNT(CASE WHEN phone_verified = true THEN 1 END) as verified_users,
             COUNT(CASE WHEN phone IS NOT NULL AND phone != '' THEN 1 END) as users_with_phone
      FROM users
    `);
    
    const stats = countResult.rows[0];
    
    console.log('✅ Phone verification update completed!');
    console.log(`📊 Statistics:`);
    console.log(`   - Total users: ${stats.total_users}`);
    console.log(`   - Users with phone: ${stats.users_with_phone}`);
    console.log(`   - Verified phones: ${stats.verified_users}`);
    
  } catch (error) {
    console.error('❌ Error updating phone verification:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the update
updatePhoneVerified();