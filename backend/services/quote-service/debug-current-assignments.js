const { Pool } = require('pg');

async function debugAssignments() {
  try {
    console.log('🔍 Debugging contractor assignments...');
    
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'quote_service_db',
      user: 'postgres',
      password: '12345',
    });
    
    const contractorId = '21fd59c3-f5ed-403c-b1b4-946fc000fd39';
    console.log(`\nChecking assignments for contractor: ${contractorId}`);
    
    // Check contractor_quote_assignments table
    const assignmentResult = await pool.query(`
      SELECT * FROM contractor_quote_assignments 
      WHERE contractor_id = $1
      ORDER BY assigned_at DESC
    `, [contractorId]);
    
    console.log(`\n📋 Found ${assignmentResult.rows.length} assignment records:`);
    assignmentResult.rows.forEach((assignment, index) => {
      console.log(`\n  ${index + 1}. Request ID: ${assignment.request_id}`);
      console.log(`     Status: ${assignment.status}`);
      console.log(`     Assigned: ${assignment.assigned_at}`);
    });
    
    // Check what the assigned-requests query returns
    const assignedQuery = `
      SELECT qr.*, cqa.status as assignment_status, cqa.assigned_at
      FROM quote_requests qr
      INNER JOIN contractor_quote_assignments cqa ON qr.id = cqa.request_id
      WHERE cqa.contractor_id = $1
      ORDER BY cqa.assigned_at DESC
    `;
    
    const assignedResult = await pool.query(assignedQuery, [contractorId]);
    console.log(`\n📋 Assigned requests query returns ${assignedResult.rows.length} records:`);
    assignedResult.rows.forEach((request, index) => {
      console.log(`\n  ${index + 1}. ${request.id} - ${request.location_address}`);
      console.log(`     System: ${request.system_size_kwp} kWp`);
      console.log(`     Status: ${request.assignment_status}`);
    });
    
    await pool.end();
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

debugAssignments();