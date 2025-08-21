const { Client } = require('pg');

async function checkDatabase() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '12345',
    database: 'quote_service_db'
  });

  try {
    await client.connect();
    console.log('Connected to quote_service_db');

    // Check if tables exist
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);

    console.log('\nExisting tables:');
    if (result.rows.length === 0) {
      console.log('No tables found');
    } else {
      result.rows.forEach(row => {
        console.log(`- ${row.table_name}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.end();
  }
}

checkDatabase();