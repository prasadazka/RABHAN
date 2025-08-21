const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function checkQuoteAssignments() {
  try {
    console.log('Checking quote requests and assignments...\n');
    
    // Get recent quote requests
    console.log('📋 Recent Quote Requests:');
    const requests = await pool.query(`
      SELECT id, user_id, system_size_kwp, location_address, service_area, status, created_at
      FROM quote_requests 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    requests.rows.forEach((req, index) => {
      console.log(`\n${index + 1}. Quote Request ID: ${req.id}`);
      console.log(`   User ID: ${req.user_id}`);
      console.log(`   System Size: ${req.system_size_kwp} kWp`);
      console.log(`   Location: ${req.location_address}`);
      console.log(`   Service Area: ${req.service_area}`);
      console.log(`   Status: ${req.status}`);
      console.log(`   Created: ${req.created_at}`);
    });
    
    if (requests.rows.length === 0) {
      console.log('❌ No quote requests found');
      return;
    }
    
    // Get contractor assignments for each request
    console.log('\n\n🏢 Contractor Assignments:');
    for (const request of requests.rows) {
      const assignments = await pool.query(`
        SELECT assignment_id, contractor_id, contractor_email, assignment_status, assigned_at, viewed_at, responded_at
        FROM contractor_assignments 
        WHERE request_id = $1
        ORDER BY assigned_at DESC
      `, [request.id]);
      
      console.log(`\n📋 Request ${request.id} assignments:`);
      if (assignments.rows.length > 0) {
        assignments.rows.forEach((assignment, index) => {
          console.log(`   ${index + 1}. Contractor: ${assignment.contractor_email}`);
          console.log(`      Assignment ID: ${assignment.assignment_id}`);
          console.log(`      Contractor ID: ${assignment.contractor_id}`);
          console.log(`      Status: ${assignment.assignment_status}`);
          console.log(`      Assigned: ${assignment.assigned_at}`);
          console.log(`      Viewed: ${assignment.viewed_at || 'Not viewed'}`);
          console.log(`      Responded: ${assignment.responded_at || 'Not responded'}`);
          console.log('');
        });
      } else {
        console.log('   ❌ No contractor assignments found for this request');
      }
    }
    
    // Check specifically for Azkashine contractor
    console.log('\n🔍 Checking specifically for Azkashine contractor assignments:');
    const azkashineAssignments = await pool.query(`
      SELECT ca.*, qr.location_address, qr.system_size_kwp, qr.created_at as request_created
      FROM contractor_assignments ca
      JOIN quote_requests qr ON ca.request_id = qr.id
      WHERE ca.contractor_email ILIKE '%azkashine%' OR ca.contractor_email ILIKE '%prasadrao%'
      ORDER BY ca.assigned_at DESC
    `);
    
    if (azkashineAssignments.rows.length > 0) {
      console.log('Found ' + azkashineAssignments.rows.length + ' assignments for Azkashine:');
      azkashineAssignments.rows.forEach((assignment, index) => {
        console.log('\n' + (index + 1) + '. Assignment ID: ' + assignment.assignment_id);
        console.log('   Email: ' + assignment.contractor_email);
        console.log('   Request ID: ' + assignment.request_id);
        console.log('   System Size: ' + assignment.system_size_kwp + ' kWp');
        console.log('   Location: ' + assignment.location_address);
        console.log('   Status: ' + assignment.assignment_status);
        console.log('   Assigned: ' + assignment.assigned_at);
        console.log('   Request Created: ' + assignment.request_created);
      });
    } else {
      console.log('❌ No assignments found for Azkashine contractor');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkQuoteAssignments();