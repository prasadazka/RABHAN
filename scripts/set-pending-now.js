const { Pool } = require('pg');

async function setPendingNow() {
  const client = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  try {
    await client.query(
      'UPDATE user_profiles SET verification_status = $1 WHERE auth_user_id = $2',
      ['pending', '883f0f5c-3616-479b-8aef-5ae26057ce4a']
    );
    console.log('✅ Updated user verification status to pending');
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await client.end();
  }
}

setPendingNow();