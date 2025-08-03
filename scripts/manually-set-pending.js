const { Pool } = require('pg');

async function manuallySetPending() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  try {
    console.log('🔄 Manually setting user verification status to pending for testing...');

    // Update the test user to pending status
    await userClient.query(`
      UPDATE user_profiles 
      SET verification_status = 'pending', 
          profile_completed = true, 
          profile_completion_percentage = 100,
          updated_at = CURRENT_TIMESTAMP
      WHERE auth_user_id = 'd0f3debe-b956-4e51-881c-08c94411328f'
    `);

    console.log('✅ User verification status set to pending');

    // Check the result
    const result = await userClient.query(`
      SELECT auth_user_id, profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = 'd0f3debe-b956-4e51-881c-08c94411328f'
    `);

    console.log('📊 Updated user profile:', result.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
  }
}

manuallySetPending();