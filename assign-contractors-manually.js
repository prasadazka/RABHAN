const { Pool } = require('pg');

async function assignContractorsToQuote() {
  const quotePool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'quote_service_db',
    user: 'postgres',
    password: '12345'
  });

  const authPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'rabhan_auth',
    user: 'postgres',
    password: '12345'
  });

  try {
    const quoteId = 'fd0a9edc-7ba5-444c-9164-f5782c742879';
    
    console.log('=== Getting Available Contractors ===');
    const contractorsResult = await authPool.query(`
      SELECT id, email, first_name, last_name, company_name, phone 
      FROM contractors 
      LIMIT 5
    `);
    console.log(`Found ${contractorsResult.rows.length} contractors:`);
    contractorsResult.rows.forEach(c => {
      console.log(`- ${c.company_name} (${c.first_name} ${c.last_name}) - ${c.email}`);
    });

    if (contractorsResult.rows.length === 0) {
      console.log('No contractors found!');
      return;
    }

    console.log('\n=== Assigning First 3 Contractors to Quote ===');
    const contractorsToAssign = contractorsResult.rows.slice(0, 3);
    
    // Remove existing assignments
    await quotePool.query('DELETE FROM contractor_quote_assignments WHERE request_id = $1', [quoteId]);
    
    // Create new assignments
    const assignments = [];
    for (const contractor of contractorsToAssign) {
      const assignmentResult = await quotePool.query(`
        INSERT INTO contractor_quote_assignments (
          id, request_id, contractor_id, status, assigned_at, created_at, updated_at
        ) VALUES (
          gen_random_uuid(), $1, $2, 'assigned', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        ) RETURNING *
      `, [quoteId, contractor.id]);
      
      assignments.push(assignmentResult.rows[0]);
      console.log(`✅ Assigned ${contractor.company_name} to quote ${quoteId}`);
    }

    console.log('\n=== Updating Quote Status ===');
    await quotePool.query(
      'UPDATE quote_requests SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['in_progress', quoteId]
    );
    console.log('✅ Quote status updated to "in_progress"');

    console.log('\n=== Assignment Summary ===');
    console.log(`Quote ID: ${quoteId}`);
    console.log(`Assigned Contractors: ${assignments.length}`);
    assignments.forEach((assignment, index) => {
      const contractor = contractorsToAssign[index];
      console.log(`${index + 1}. ${contractor.company_name} - Assignment ID: ${assignment.id}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await quotePool.end();
    await authPool.end();
  }
}

assignContractorsToQuote();