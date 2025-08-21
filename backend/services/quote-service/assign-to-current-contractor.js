const { Pool } = require('pg');

async function assignToCurrentContractor() {
  try {
    console.log('🔧 Assigning quote requests to current contractor ad44ad87-6f3a-414e-bfe6-efe3d172212e...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345',
    });
    
    const currentContractorId = 'ad44ad87-6f3a-414e-bfe6-efe3d172212e'; // The one frontend is using
    
    // Get some available quote requests
    const availableRequests = await pool.query(`
      SELECT id, location_address
      FROM quote_requests
      WHERE status = 'pending'
      AND (selected_contractors IS NULL OR COALESCE(array_length(selected_contractors, 1), 0) < max_contractors)
      LIMIT 2
    `);
    
    console.log(`\n📋 Found ${availableRequests.rows.length} available requests:`);
    
    for (const request of availableRequests.rows) {
      console.log(`\n🔄 Assigning request ${request.id} (${request.location_address})`);
      
      // Add contractor to selected_contractors array
      await pool.query(`
        UPDATE quote_requests 
        SET selected_contractors = array_append(COALESCE(selected_contractors, '{}'), $1), 
            updated_at = NOW()
        WHERE id = $2
      `, [currentContractorId, request.id]);
      
      // Create assignment record
      await pool.query(`
        INSERT INTO contractor_quote_assignments (
          request_id, contractor_id, status, assigned_at
        ) VALUES ($1, $2, 'assigned', NOW())
        ON CONFLICT (request_id, contractor_id) DO NOTHING
      `, [request.id, currentContractorId]);
      
      console.log(`   ✅ Assigned successfully`);
    }
    
    console.log(`\n🎉 Assigned ${availableRequests.rows.length} requests to current contractor`);
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

assignToCurrentContractor();