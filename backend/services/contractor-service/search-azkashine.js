const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432, 
  database: 'rabhan_contractors',
  user: 'postgres',
  password: '12345'
});

(async () => {
  try {
    const result = await pool.query('SELECT id, company_name, email, phone FROM contractors WHERE company_name ILIKE $1 OR email ILIKE $2 LIMIT 5', ['%azka%', '%prasadrao%']);
    console.log('Contractors matching Azkashine/prasadrao:');
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.company_name}`);
      console.log(`   Email: ${row.email}`);
      console.log(`   Phone: ${row.phone}`);
      console.log(`   ID: ${row.id}`);
      console.log('');
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
})();