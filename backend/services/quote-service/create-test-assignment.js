const { database } = require('./dist/config/database.config.js');

async function createTestAssignment() {
  try {
    console.log('Creating test contractor assignment for the existing quote request...');
    
    // Use the known contractor IDs from your selected contractors
    const requestId = 'ac9ae8cb-599a-4368-8784-1a16de5aeeb1';
    const contractorIds = [
      'f3d5cab5-628f-42da-8c30-2a4ef6b9a111',  // Solar Solutions KSA 5
      '87f2620a-8631-42d7-9272-7bbff3fd9441',  // Smart Solar Solutions 8
      '1da73364-4530-4e15-8903-6ebf174d2cde'   // Solar Solutions KSA
    ];
    
    console.log('Quote Request ID:', requestId);
    console.log('Contractor IDs:', contractorIds);
    
    // Insert assignments for these contractors
    for (const contractorId of contractorIds) {
      await database.query(`
        INSERT INTO contractor_quote_assignments (
          request_id, contractor_id, status, assigned_at, created_at, updated_at
        ) VALUES ($1, $2, 'assigned', NOW(), NOW(), NOW())
        ON CONFLICT (request_id, contractor_id) DO NOTHING
      `, [requestId, contractorId]);
      
      console.log('✅ Assignment created for contractor:', contractorId);
    }
    
    console.log('\\n🔑 Test Contractor Login Information:');
    console.log('You can use any of these contractor IDs to test:');
    console.log('1. Contractor ID: f3d5cab5-628f-42da-8c30-2a4ef6b9a111 (Solar Solutions KSA 5)');
    console.log('2. Contractor ID: 87f2620a-8631-42d7-9272-7bbff3fd9441 (Smart Solar Solutions 8)');
    console.log('3. Contractor ID: 1da73364-4530-4e15-8903-6ebf174d2cde (Solar Solutions KSA)');
    console.log('\\nFor testing purposes, you can:');
    console.log('1. Log into the contractor dashboard with any contractor account');
    console.log('2. Or use API calls directly with these contractor IDs');
    console.log('3. The quote request should now appear in their dashboard');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    process.exit(0);
  }
}

createTestAssignment();