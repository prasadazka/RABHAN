const { Pool } = require('pg');

async function checkUsersSchema() {
  console.log('🔍 Checking users table schema...\n');

  const authPool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'rabhan_auth',
    password: '12345',
    port: 5432,
  });

  try {
    // Check users table schema
    console.log('1. Users table schema:');
    const schemaQuery = await authPool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      ORDER BY ordinal_position
    `);
    
    schemaQuery.rows.forEach((col, index) => {
      console.log(`   ${index + 1}. ${col.column_name} (${col.data_type}) - nullable: ${col.is_nullable}`);
    });
    
    // Check sample users data
    console.log('\n2. Sample users data:');
    const usersQuery = await authPool.query(`
      SELECT id, email, first_name, last_name, role, created_at
      FROM users 
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (usersQuery.rows.length === 0) {
      console.log('   No users found');
    } else {
      usersQuery.rows.forEach((user, index) => {
        console.log(`   ${index + 1}. ID: ${user.id}`);
        console.log(`      Email: ${user.email}`);
        console.log(`      Name: ${user.first_name} ${user.last_name}`);
        console.log(`      Role: ${user.role}`);
        console.log(`      Created: ${user.created_at}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Failed to check users schema:', error.message);
  } finally {
    await authPool.end();
  }
}

checkUsersSchema()
  .then(() => {
    console.log('🎉 Users schema check completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Check failed:', error);
    process.exit(1);
  });