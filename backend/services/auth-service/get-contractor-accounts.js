const pg = require('pg');

// Use direct database connection since the built config might not be available
const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'rabhan_auth',
  user: 'postgres',
  password: '12345'
});

async function getContractorAccounts() {
  try {
    console.log('Fetching contractor accounts from auth service...');
    
    // First check if there's a contractors table
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'contractors'
      );
    `);
    
    if (tableCheck.rows[0].exists) {
      console.log('✅ Found contractors table');
      
      // Get contractors with their auth details
      const result = await pool.query(`
        SELECT id, email, first_name, last_name, phone, created_at, status
        FROM contractors 
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      console.log('\n🏢 Available Contractor Accounts:');
      result.rows.forEach((contractor, index) => {
        console.log(`\n${index + 1}. ${contractor.first_name} ${contractor.last_name}`);
        console.log(`   Email: ${contractor.email}`);
        console.log(`   Phone: ${contractor.phone}`);
        console.log(`   ID: ${contractor.id}`);
        console.log(`   Status: ${contractor.status}`);
        console.log(`   Created: ${contractor.created_at}`);
      });
      
      if (result.rows.length > 0) {
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('📧 Use any of the emails above');
        console.log('🔒 Default password: "12345" (or check your setup)');
        console.log('\n💡 Try these first:');
        result.rows.slice(0, 3).forEach((contractor, index) => {
          console.log(`${index + 1}. Email: ${contractor.email} | Password: 12345`);
        });
      }
    } else {
      console.log('❌ No contractors table found, checking users table...');
      
      // Check users table for contractor role
      const userResult = await pool.query(`
        SELECT id, email, first_name, last_name, role, created_at
        FROM users 
        WHERE role = 'contractor'
        ORDER BY created_at DESC
        LIMIT 10
      `);
      
      console.log('\n👥 Contractor Users:');
      userResult.rows.forEach((user, index) => {
        console.log(`\n${index + 1}. ${user.first_name} ${user.last_name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   ID: ${user.id}`);
        console.log(`   Role: ${user.role}`);
      });
      
      if (userResult.rows.length > 0) {
        console.log('\n🔑 LOGIN CREDENTIALS:');
        console.log('📧 Use any of the emails above');
        console.log('🔒 Default password: "12345"');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Tip: Make sure the auth service database is running and accessible');
  } finally {
    await pool.end();
    process.exit(0);
  }
}

getContractorAccounts();