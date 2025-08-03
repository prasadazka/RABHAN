const { Pool } = require('pg');

async function fixCorrectUser() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  const docClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔧 Fixing the CORRECT logged-in user...');
    
    const correctUserId = '883f0f5c-3616-479b-8aef-5ae26057ce4a';
    console.log('👤 Target user ID:', correctUserId);

    // Step 1: Check current user profile
    const userResult = await userClient.query(`
      SELECT auth_user_id, profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1;
    `, [correctUserId]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('📊 Current user profile:', user);

    // Step 2: Check documents for this user
    const docResult = await docClient.query(`
      SELECT category_id, status, approval_status, created_at 
      FROM documents 
      WHERE user_id = $1 
      ORDER BY created_at DESC;
    `, [correctUserId]);

    console.log('📄 User documents:', docResult.rows);

    // Step 3: Get required categories
    const categoryResult = await docClient.query(`
      SELECT id, name FROM document_categories 
      WHERE name IN ('national_id_front', 'national_id_back', 'proof_of_address');
    `);

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

    // Step 4: Determine if should be pending
    const profileComplete = user.profile_completed || user.profile_completion_percentage >= 100;
    const shouldBePending = profileComplete && allDocumentsUploaded;

    console.log('🎯 Verification logic:', {
      profileComplete,
      allDocumentsUploaded,
      shouldBePending,
      currentStatus: user.verification_status
    });

    // Step 5: Update verification status if needed
    if (shouldBePending && user.verification_status !== 'pending') {
      console.log('🔄 Updating verification status to pending...');
      
      await userClient.query(`
        UPDATE user_profiles 
        SET verification_status = 'pending', updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $1
      `, [correctUserId]);
      
      console.log('✅ Verification status updated to pending');
    } else if (!shouldBePending && user.verification_status === 'pending') {
      console.log('🔄 Requirements not met, keeping as not_verified...');
    } else {
      console.log('ℹ️ Verification status is already correct');
    }

    // Step 6: Show final result
    const finalResult = await userClient.query(`
      SELECT profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1;
    `, [correctUserId]);

    console.log('📊 FINAL RESULT:', finalResult.rows[0]);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
    await docClient.end();
  }
}

fixCorrectUser();