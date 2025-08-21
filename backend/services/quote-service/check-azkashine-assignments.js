const pg = require('pg');

const pool = new pg.Pool({
  host: 'localhost',
  port: 5432,
  database: 'quote_service_db',
  user: 'postgres',
  password: '12345'
});

async function checkAzkashineAssignments() {
  try {
    console.log('Checking assignments for Azkashine contractor...\n');
    
    const azkashineContractorId = 'ad44ad87-6f3a-414e-bfe6-efe3d172212e'; // From auth database
    
    console.log('🔍 Looking for contractor ID:', azkashineContractorId);
    console.log('📧 Email: prasadrao@azkashine.com\n');
    
    // Check all assignments
    console.log('📋 All contractor assignments:');
    const allAssignments = await pool.query(`
      SELECT cqa.id, cqa.request_id, cqa.contractor_id, cqa.status, cqa.assigned_at, cqa.viewed_at,
             qr.system_size_kwp, qr.location_address, qr.service_area, qr.created_at as request_created
      FROM contractor_quote_assignments cqa
      JOIN quote_requests qr ON cqa.request_id = qr.id
      ORDER BY cqa.assigned_at DESC
    `);
    
    allAssignments.rows.forEach((assignment, index) => {
      console.log((index + 1) + '. Assignment ID: ' + assignment.id);
      console.log('   Request ID: ' + assignment.request_id);
      console.log('   Contractor ID: ' + assignment.contractor_id);
      console.log('   System Size: ' + assignment.system_size_kwp + ' kWp');
      console.log('   Location: ' + assignment.location_address);
      console.log('   Service Area: ' + assignment.service_area);
      console.log('   Status: ' + assignment.status);
      console.log('   Assigned: ' + assignment.assigned_at);
      console.log('   Viewed: ' + (assignment.viewed_at || 'Not viewed'));
      console.log('   Request Created: ' + assignment.request_created);
      console.log('');
    });
    
    // Check specific assignment for Azkashine contractor
    console.log('🎯 Checking specific assignments for Azkashine contractor:');
    const azkashineAssignments = await pool.query(`
      SELECT cqa.*, qr.system_size_kwp, qr.location_address, qr.service_area, qr.created_at as request_created
      FROM contractor_quote_assignments cqa
      JOIN quote_requests qr ON cqa.request_id = qr.id
      WHERE cqa.contractor_id = $1
      ORDER BY cqa.assigned_at DESC
    `, [azkashineContractorId]);
    
    if (azkashineAssignments.rows.length > 0) {
      console.log('✅ Found ' + azkashineAssignments.rows.length + ' assignments for Azkashine contractor:');
      azkashineAssignments.rows.forEach((assignment, index) => {
        console.log('');
        console.log((index + 1) + '. Assignment ID: ' + assignment.id);
        console.log('   Request ID: ' + assignment.request_id);
        console.log('   System Size: ' + assignment.system_size_kwp + ' kWp');
        console.log('   Location: ' + assignment.location_address);
        console.log('   Service Area: ' + assignment.service_area);
        console.log('   Status: ' + assignment.status);
        console.log('   Assigned: ' + assignment.assigned_at);
        console.log('   Viewed: ' + (assignment.viewed_at || 'Not viewed'));
        console.log('   Responded: ' + (assignment.responded_at || 'Not responded'));
        console.log('   Request Created: ' + assignment.request_created);
      });
    } else {
      console.log('❌ No assignments found for Azkashine contractor');
      console.log('');
      console.log('🔍 Let me check if the contractor ID appears in any selected_contractors arrays:');
      
      const requestsWithContractor = await pool.query(`
        SELECT id, selected_contractors, system_size_kwp, location_address, service_area, created_at
        FROM quote_requests
        WHERE $1 = ANY(selected_contractors)
      `, [azkashineContractorId]);
      
      if (requestsWithContractor.rows.length > 0) {
        console.log('✅ Found contractor in selected_contractors arrays:');
        requestsWithContractor.rows.forEach((request, index) => {
          console.log((index + 1) + '. Request ID: ' + request.id);
          console.log('   Selected Contractors: ' + JSON.stringify(request.selected_contractors));
          console.log('   System Size: ' + request.system_size_kwp + ' kWp');
          console.log('   Location: ' + request.location_address);
          console.log('   Created: ' + request.created_at);
          console.log('');
        });
      } else {
        console.log('❌ Contractor ID not found in any selected_contractors arrays either');
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

checkAzkashineAssignments();