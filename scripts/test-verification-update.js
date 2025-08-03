const { Pool } = require('pg');

async function testVerificationUpdate() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  const docClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔍 Testing verification status update logic...');

    // Get a test user
    const userResult = await userClient.query(`
      SELECT auth_user_id, profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      LIMIT 1;
    `);

    if (userResult.rows.length === 0) {
      console.log('❌ No users found');
      return;
    }

    const user = userResult.rows[0];
    console.log('👤 Test user:', user);

    // Check documents for this user
    const docResult = await docClient.query(`
      SELECT user_id, category_id, status, approval_status, created_at 
      FROM documents 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `, [user.auth_user_id]);

    console.log('📄 User documents:', docResult.rows);

    // Get document categories to match by name
    const categoryResult = await docClient.query(`
      SELECT id, name FROM document_categories 
      WHERE name IN ('national_id_front', 'national_id_back', 'proof_of_address');
    `);
    
    console.log('📋 Available categories:', categoryResult.rows);

    // Check required categories
    const requiredCategoryIds = categoryResult.rows.map(cat => cat.id);
    const uploadedCategoryIds = docResult.rows
      .filter(doc => doc.status === 'completed' || doc.approval_status === 'approved')
      .map(doc => doc.category_id);

    const allDocumentsUploaded = requiredCategoryIds.every(categoryId => 
      uploadedCategoryIds.includes(categoryId)
    );

    console.log('📋 Document completion check:', {
      requiredCategoryIds,
      uploadedCategoryIds,
      allDocumentsUploaded
    });

    console.log('📋 Profile completion check:', {
      profileCompleted: user.profile_completed,
      profileCompletionPercentage: user.profile_completion_percentage
    });

    // Determine if verification status should be pending
    const shouldBePending = (user.profile_completed || user.profile_completion_percentage >= 100) && allDocumentsUploaded;
    
    console.log('🎯 Verification logic result:', {
      shouldBePending,
      currentStatus: user.verification_status
    });

    if (shouldBePending && user.verification_status !== 'pending') {
      console.log('🔄 Updating verification status to pending...');
      
      await userClient.query(`
        UPDATE user_profiles 
        SET verification_status = 'pending', updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $1
      `, [user.auth_user_id]);
      
      console.log('✅ Verification status updated to pending');
    } else if (!shouldBePending && user.verification_status === 'pending') {
      console.log('🔄 Resetting verification status to not_verified...');
      
      await userClient.query(`
        UPDATE user_profiles 
        SET verification_status = 'not_verified', updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $1
      `, [user.auth_user_id]);
      
      console.log('✅ Verification status reset to not_verified');
    } else {
      console.log('ℹ️ Verification status is already correct');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
    await docClient.end();
  }
}

testVerificationUpdate();