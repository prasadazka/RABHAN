const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function checkContractorSchema() {
  try {
    console.log('🔍 Checking contractors table schema...\n');
    
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'contractors' 
      ORDER BY ordinal_position
    `);
    
    console.log('📋 Contractors table columns:');
    result.rows.forEach(col => {
      console.log(`- ${col.column_name}: ${col.data_type} (${col.is_nullable === 'YES' ? 'nullable' : 'not null'})`);
    });
    
    // Check if there's a password_hash column instead
    const hasPasswordHash = result.rows.some(col => col.column_name === 'password_hash');
    const hasPassword = result.rows.some(col => col.column_name === 'password');
    
    console.log('\n🔐 Password column status:');
    console.log(`- Has 'password' column: ${hasPassword ? '✅' : '❌'}`);
    console.log(`- Has 'password_hash' column: ${hasPasswordHash ? '✅' : '❌'}`);
    
    if (hasPasswordHash) {
      console.log('\n💡 Found password_hash column - will use this for password updates');
    } else if (!hasPassword && !hasPasswordHash) {
      console.log('\n⚠️  No password column found - this table might not store passwords');
      console.log('🔍 Checking users table...');
      
      const usersResult = await pool.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_name = 'users' 
        AND column_name LIKE '%password%'
        ORDER BY ordinal_position
      `);
      
      if (usersResult.rows.length > 0) {
        console.log('📋 Password columns in users table:');
        usersResult.rows.forEach(col => {
          console.log(`- ${col.column_name}: ${col.data_type}`);
        });
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkContractorSchema();