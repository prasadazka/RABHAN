const { Pool } = require('pg');

async function checkDatabase() {
  try {
    console.log('🔍 Checking database status...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345',
    });
    
    // Check all quote requests
    const allRequests = await pool.query(`
      SELECT id, user_id, system_size_kwp, location_address, service_area, 
             status, selected_contractors, max_contractors, created_at
      FROM quote_requests
      ORDER BY created_at DESC
    `);
    
    console.log(`\n📋 Total quote requests: ${allRequests.rows.length}`);
    allRequests.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.id} - ${row.system_size_kwp}kWp in ${row.service_area} (${row.status})`);
      console.log(`     Selected contractors: ${JSON.stringify(row.selected_contractors)}`);
      console.log(`     Max contractors: ${row.max_contractors}`);
    });
    
    // Check contractor assignments
    const assignments = await pool.query(`
      SELECT cqa.*, qr.system_size_kwp, qr.service_area
      FROM contractor_quote_assignments cqa
      JOIN quote_requests qr ON cqa.request_id = qr.id
      ORDER BY cqa.assigned_at DESC
    `);
    
    console.log(`\n👥 Total assignments: ${assignments.rows.length}`);
    assignments.rows.forEach((row, i) => {
      console.log(`  ${i + 1}. ${row.contractor_id} -> ${row.request_id} (${row.status})`);
      console.log(`     ${row.system_size_kwp}kWp in ${row.service_area}`);
    });
    
    // Check available requests with the same criteria as assign script
    const availableRequests = await pool.query(`
      SELECT id, location_address, selected_contractors, max_contractors
      FROM quote_requests
      WHERE status = 'pending'
      AND (selected_contractors IS NULL OR array_length(selected_contractors, 1) < max_contractors)
    `);
    
    console.log(`\n✨ Available requests (matching script criteria): ${availableRequests.rows.length}`);
    availableRequests.rows.forEach((row, i) => {
      const contractors = row.selected_contractors;
      const count = contractors ? contractors.length : 0;
      console.log(`  ${i + 1}. ${row.id} - ${row.location_address}`);
      console.log(`     Contractors: ${count}/${row.max_contractors} - ${JSON.stringify(contractors)}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkDatabase();