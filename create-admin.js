const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const authPool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function createAdmin() {
  try {
    const hash = await bcrypt.hash('TempPass123!', 12);
    
    // Try to insert
    try {
      const result = await authPool.query(
        'INSERT INTO users (email, password_hash, first_name, last_name, role, user_type, phone) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING email',
        ['admin@rabhan.sa', hash, 'Admin', 'User', 'USER', 'HOMEOWNER', '+966501234567']
      );
      console.log('✅ Created admin user:', result.rows[0].email);
    } catch (insertError) {
      if (insertError.code === '23505') {
        // User exists, update password
        const updateResult = await authPool.query(
          'UPDATE users SET password_hash = $2 WHERE email = $1 RETURNING email',
          ['admin@rabhan.sa', hash]
        );
        console.log('✅ Updated admin user:', updateResult.rows[0].email);
      } else {
        throw insertError;
      }
    }
    
    await authPool.end();
    console.log('✅ Admin credentials: admin@rabhan.sa / TempPass123!');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    await authPool.end();
  }
}

createAdmin();