const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function checkAcceptedQuotes() {
  try {
    console.log('Checking for accepted quote assignments...\n');
    
    // Check recent assignments and their status
    const assignments = await pool.query(`
      SELECT cqa.id as assignment_id, cqa.request_id, cqa.contractor_id, cqa.status, 
             cqa.assigned_at, cqa.viewed_at, cqa.responded_at, cqa.response_notes,
             qr.system_size_kwp, qr.location_address, qr.service_area, qr.status as request_status,
             qr.created_at as request_created
      FROM contractor_quote_assignments cqa
      JOIN quote_requests qr ON cqa.request_id = qr.id
      ORDER BY cqa.updated_at DESC, cqa.assigned_at DESC
    `);
    
    console.log('📋 All Quote Assignments:');
    assignments.rows.forEach((assignment, index) => {
      console.log(`\n${index + 1}. Assignment ID: ${assignment.assignment_id}`);
      console.log(`   Request ID: ${assignment.request_id}`);
      console.log(`   Contractor ID: ${assignment.contractor_id}`);
      console.log(`   System Size: ${assignment.system_size_kwp} kWp`);
      console.log(`   Location: ${assignment.location_address}`);
      console.log(`   Service Area: ${assignment.service_area}`);
      console.log(`   Assignment Status: ${assignment.status}`);
      console.log(`   Request Status: ${assignment.request_status}`);
      console.log(`   Assigned: ${assignment.assigned_at}`);
      console.log(`   Viewed: ${assignment.viewed_at || 'Not viewed'}`);
      console.log(`   Responded: ${assignment.responded_at || 'Not responded'}`);
      console.log(`   Response Notes: ${assignment.response_notes || 'None'}`);
      console.log(`   Request Created: ${assignment.request_created}`);
    });
    
    // Check for any accepted assignments specifically
    const acceptedAssignments = assignments.rows.filter(a => a.status === 'accepted');
    
    if (acceptedAssignments.length > 0) {
      console.log('\n\n🎉 ACCEPTED ASSIGNMENTS:');
      acceptedAssignments.forEach((assignment, index) => {
        console.log(`\n${index + 1}. ✅ ACCEPTED`);
        console.log(`   Assignment ID: ${assignment.assignment_id}`);
        console.log(`   Request ID: ${assignment.request_id}`);
        console.log(`   Contractor ID: ${assignment.contractor_id}`);
        console.log(`   System Size: ${assignment.system_size_kwp} kWp`);
        console.log(`   Location: ${assignment.location_address}`);
        console.log(`   Responded At: ${assignment.responded_at}`);
        console.log(`   Response Notes: ${assignment.response_notes || 'None'}`);
      });
    } else {
      console.log('\n\n❌ No accepted assignments found yet');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAcceptedQuotes();