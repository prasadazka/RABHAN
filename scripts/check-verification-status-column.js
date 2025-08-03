const { Pool } = require('pg');

async function checkVerificationStatusColumn() {
  const client = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  try {
    console.log('🔍 Checking if verification_status column exists...');

    // Check if column exists
    const columnCheck = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'user_profiles' 
      AND column_name = 'verification_status';
    `);

    if (columnCheck.rows.length === 0) {
      console.log('❌ verification_status column does NOT exist. Adding it...');
      
      // Add the column
      await client.query(`
        ALTER TABLE user_profiles 
        ADD COLUMN verification_status VARCHAR(20) DEFAULT 'not_verified';
      `);
      
      console.log('✅ verification_status column added successfully');
    } else {
      console.log('✅ verification_status column already exists:', columnCheck.rows[0]);
    }

    // Check a sample user record
    const sampleUser = await client.query(`
      SELECT id, auth_user_id, profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      LIMIT 1;
    `);

    if (sampleUser.rows.length > 0) {
      console.log('📋 Sample user record:', sampleUser.rows[0]);
    } else {
      console.log('⚠️ No user records found');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

checkVerificationStatusColumn();