const { Pool } = require('pg');

async function createTestScenario() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  const docClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔧 Creating test scenario: Profile 100% + All documents uploaded...');

    // Get the test user
    const userResult = await userClient.query(`
      SELECT * FROM user_profiles 
      WHERE auth_user_id = 'd0f3debe-b956-4e51-881c-08c94411328f';
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ Test user not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 Current user profile completion:', {
      profileCompleted: user.profile_completed,
      profileCompletionPercentage: user.profile_completion_percentage
    });

    // Step 1: Update profile to be 100% complete
    console.log('🔄 Step 1: Setting profile to 100% complete...');
    await userClient.query(`
      UPDATE user_profiles 
      SET profile_completed = true, 
          profile_completion_percentage = 100,
          updated_at = CURRENT_TIMESTAMP
      WHERE auth_user_id = $1
    `, [user.auth_user_id]);
    console.log('✅ Profile marked as 100% complete');

    // Step 2: Check if documents exist, if not create them
    console.log('🔄 Step 2: Checking documents...');
    
    const docResult = await docClient.query(`
      SELECT category_id, status FROM documents 
      WHERE user_id = $1;
    `, [user.auth_user_id]);

    console.log('📄 Existing documents:', docResult.rows);

    // Get required category IDs
    const categoryResult = await docClient.query(`
      SELECT id, name FROM document_categories 
      WHERE name IN ('national_id_front', 'national_id_back', 'proof_of_address');
    `);

    const requiredCategories = categoryResult.rows;
    console.log('📋 Required categories:', requiredCategories);

    // Create missing documents
    for (const category of requiredCategories) {
      const existingDoc = docResult.rows.find(doc => doc.category_id === category.id);
      
      if (!existingDoc) {
        console.log(`📄 Creating document for ${category.name}...`);
        
        await docClient.query(`
          INSERT INTO documents (
            id, user_id, auth_user_id, category_id, document_type, original_filename, 
            file_size_bytes, mime_type, file_extension, file_hash, status, 
            approval_status, created_at, updated_at
          ) VALUES (
            gen_random_uuid(), $1, $1, $2, $3, $4, 
            1024000, 'image/jpeg', '.jpg', 'test_hash_' || substr(md5(random()::text), 1, 10), 'completed', 
            'approved', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
          )
        `, [
          user.auth_user_id, 
          category.id, 
          category.name.toUpperCase(),
          `${category.name}.jpg`
        ]);
        
        console.log(`✅ Created ${category.name} document`);
      } else if (existingDoc.status !== 'completed') {
        console.log(`🔄 Updating ${category.name} document status to completed...`);
        
        await docClient.query(`
          UPDATE documents 
          SET status = 'completed', approval_status = 'approved', updated_at = CURRENT_TIMESTAMP 
          WHERE category_id = $1 AND user_id = $2
        `, [category.id, user.auth_user_id]);
        
        console.log(`✅ Updated ${category.name} document status`);
      }
    }

    console.log('🎯 Test scenario complete! User should now have:');
    console.log('  ✅ Profile: 100% complete');
    console.log('  ✅ Documents: All 3 required documents uploaded');
    console.log('  ➡️ Expected verification status: pending');

    // Check final state
    const finalUser = await userClient.query(`
      SELECT profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1;
    `, [user.auth_user_id]);

    const finalDocs = await docClient.query(`
      SELECT dc.name, d.status, d.approval_status 
      FROM documents d 
      JOIN document_categories dc ON d.category_id = dc.id 
      WHERE d.user_id = $1;
    `, [user.auth_user_id]);

    console.log('\n📊 Final state:');
    console.log('👤 Profile:', finalUser.rows[0]);
    console.log('📄 Documents:', finalDocs.rows);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
    await docClient.end();
  }
}

createTestScenario();