const { Pool } = require('pg');
require('dotenv').config();

async function checkRealQuotes() {
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  try {
    const result = await pool.query(`
      SELECT id, system_size_kwp, location_address, service_area, status, created_at, property_details
      FROM quote_requests 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    console.log('Real quote requests in database:');
    console.log('Total:', result.rows.length);
    
    if (result.rows.length === 0) {
      console.log('No real quote requests found in database!');
    } else {
      result.rows.forEach((row, index) => {
        console.log(`${index + 1}. ID: ${row.id}`);
        console.log(`   System Size: ${row.system_size_kwp} kWp`);
        console.log(`   Location: ${row.location_address || 'N/A'}`);
        console.log(`   Service Area: ${row.service_area || 'N/A'}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Created: ${row.created_at}`);
        if (row.property_details) {
          console.log(`   Property: ${JSON.stringify(row.property_details)}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Database Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkRealQuotes();