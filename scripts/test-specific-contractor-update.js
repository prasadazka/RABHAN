const { Pool } = require('pg');
const axios = require('axios');

// Database connection
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'rabhan_contractors',
  password: '12345',
  port: 5432,
});

async function testSpecificContractorUpdate() {
  console.log('🔍 Testing update on existing contractor record...\n');

  try {
    // Step 1: Get a specific contractor to test with
    console.log('1. Getting first contractor record...');
    const contractor = await pool.query(`
      SELECT id, user_id, business_name, email, description, updated_at
      FROM contractors 
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1
    `);

    if (contractor.rows.length === 0) {
      console.log('❌ No contractor records found');
      return;
    }

    const testContractor = contractor.rows[0];
    console.log('✅ Test contractor selected:');
    console.log(`   ID: ${testContractor.id}`);
    console.log(`   User ID: ${testContractor.user_id}`);
    console.log(`   Business Name: ${testContractor.business_name}`);
    console.log(`   Email: ${testContractor.email}`);
    console.log(`   Current Description: ${testContractor.description || 'NULL'}`);
    console.log(`   Last Updated: ${testContractor.updated_at}\n`);

    // Step 2: Test direct database update on this contractor
    console.log('2. Testing direct database update...');
    const originalDescription = testContractor.description;
    const newDescription = `Updated at ${new Date().toISOString()} - Direct DB Update`;
    
    const updateResult = await pool.query(`
      UPDATE contractors 
      SET description = $1,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING id, business_name, description, updated_at
    `, [newDescription, testContractor.id]);

    if (updateResult.rows.length > 0) {
      console.log('✅ Direct database update successful:');
      console.log(`   New Description: ${updateResult.rows[0].description}`);
      console.log(`   Updated At: ${updateResult.rows[0].updated_at}`);
    } else {
      console.log('❌ Direct database update failed');
    }

    // Step 3: Verify the update persisted
    console.log('\n3. Verifying update persistence...');
    const verifyResult = await pool.query(`
      SELECT description, updated_at 
      FROM contractors 
      WHERE id = $1
    `, [testContractor.id]);

    if (verifyResult.rows.length > 0) {
      console.log('✅ Update verification:');
      console.log(`   Current Description: ${verifyResult.rows[0].description}`);
      console.log(`   Updated At: ${verifyResult.rows[0].updated_at}`);
      
      if (verifyResult.rows[0].description === newDescription) {
        console.log('✅ Update persisted successfully in database');
      } else {
        console.log('❌ Update did not persist properly');
      }
    }

    // Step 4: Test the service updateContractorProfile method simulation
    console.log('\n4. Simulating service update method...');
    
    // Simulate the exact update logic from contractor.service.ts
    const updateData = {
      business_name: 'Updated Business Name via Service Simulation',
      description: `Service update test at ${new Date().toISOString()}`
    };

    // Build update query like the service does
    const updateFields = [];
    const values = [];
    let paramCount = 1;

    const allowedFields = [
      'business_name', 'business_name_ar', 'business_type', 'commercial_registration',
      'vat_number', 'email', 'phone', 'whatsapp', 'website', 'address_line1',
      'address_line2', 'city', 'region', 'postal_code', 'country',
      'established_year', 'employee_count', 'description', 'description_ar',
      'service_categories', 'service_areas', 'years_experience'
    ];

    for (const [key, value] of Object.entries(updateData)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updateFields.push(`${key} = $${paramCount}`);
        values.push(value);
        paramCount++;
      }
    }

    updateFields.push(`updated_at = CURRENT_TIMESTAMP`);
    updateFields.push(`updated_by = $${paramCount}`);
    values.push(testContractor.user_id);
    paramCount++;

    values.push(testContractor.id);

    const serviceQuery = `
      UPDATE contractors 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramCount} AND deleted_at IS NULL
      RETURNING *
    `;

    console.log('📝 Generated query:');
    console.log(serviceQuery);
    console.log('📝 Values:', values);

    const serviceUpdateResult = await pool.query(serviceQuery, values);

    if (serviceUpdateResult.rows.length > 0) {
      console.log('\n✅ Service simulation update successful:');
      console.log(`   Business Name: ${serviceUpdateResult.rows[0].business_name}`);
      console.log(`   Description: ${serviceUpdateResult.rows[0].description}`);
      console.log(`   Updated At: ${serviceUpdateResult.rows[0].updated_at}`);
      console.log(`   Updated By: ${serviceUpdateResult.rows[0].updated_by}`);
    } else {
      console.log('\n❌ Service simulation update failed - no rows returned');
    }

    // Step 5: Final verification
    console.log('\n5. Final verification...');
    const finalCheck = await pool.query(`
      SELECT business_name, description, updated_at, updated_by
      FROM contractors 
      WHERE id = $1
    `, [testContractor.id]);

    if (finalCheck.rows.length > 0) {
      console.log('✅ Final state:');
      console.log(`   Business Name: ${finalCheck.rows[0].business_name}`);
      console.log(`   Description: ${finalCheck.rows[0].description}`);
      console.log(`   Updated At: ${finalCheck.rows[0].updated_at}`);
      console.log(`   Updated By: ${finalCheck.rows[0].updated_by}`);
    }

  } catch (error) {
    console.error('❌ Test failed with error:', error.message);
    console.error('Stack trace:', error.stack);
  } finally {
    await pool.end();
  }
}

// Run the test
testSpecificContractorUpdate()
  .then(() => {
    console.log('\n🎉 Specific contractor update test completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Test failed:', error);
    process.exit(1);
  });