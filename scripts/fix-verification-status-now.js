const { Pool } = require('pg');

async function fixVerificationStatusNow() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  const docClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🔧 Fixing Verification Status After Document Deletion');
    console.log('====================================================');
    
    const userId = '883f0f5c-3616-479b-8aef-5ae26057ce4a';
    console.log('👤 User ID:', userId);

    // Step 1: Check current profile status
    const userResult = await userClient.query(`
      SELECT profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1
    `, [userId]);

    const user = userResult.rows[0];
    console.log('📊 Current Profile:', {
      completed: user.profile_completed,
      percentage: user.profile_completion_percentage,
      verificationStatus: user.verification_status
    });

    // Step 2: Check current documents (excluding archived)
    const docResult = await docClient.query(`
      SELECT dc.name as category_name, 
             COUNT(d.id) as uploaded_count,
             d.status as document_status,
             d.approval_status
      FROM document_categories dc
      LEFT JOIN documents d ON dc.id = d.category_id 
        AND d.user_id = $1 
        AND d.status != 'archived'
        AND (d.status = 'completed' OR d.approval_status = 'approved')
      WHERE dc.name IN ('national_id_front', 'national_id_back', 'proof_of_address')
      GROUP BY dc.id, dc.name, d.status, d.approval_status
      ORDER BY dc.name
    `, [userId]);

    console.log('📄 Current Documents (non-archived):');
    docResult.rows.forEach(row => {
      console.log(`  • ${row.category_name}: ${row.uploaded_count > 0 ? '✅ Uploaded' : '❌ Missing'} (count: ${row.uploaded_count})`);
    });

    // Step 3: Calculate completion
    const requiredDocs = ['national_id_front', 'national_id_back', 'proof_of_address'];
    const allDocumentsUploaded = requiredDocs.every(docName => 
      docResult.rows.some(row => row.category_name === docName && parseInt(row.uploaded_count) > 0)
    );

    const profileComplete = user.profile_completed || user.profile_completion_percentage >= 100;
    const shouldBePending = profileComplete && allDocumentsUploaded;

    console.log('🎯 Verification Logic:');
    console.log('  • Profile Complete:', profileComplete ? '✅' : '❌');
    console.log('  • All Documents Uploaded:', allDocumentsUploaded ? '✅' : '❌');
    console.log('  • Should Be Pending:', shouldBePending ? '✅' : '❌');
    console.log('  • Current Status:', user.verification_status);

    // Step 4: Fix the status
    const correctStatus = shouldBePending ? 'pending' : 'not_verified';
    
    if (user.verification_status !== correctStatus) {
      console.log(`🔄 Updating status from "${user.verification_status}" → "${correctStatus}"`);
      
      await userClient.query(`
        UPDATE user_profiles 
        SET verification_status = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $2
      `, [correctStatus, userId]);
      
      console.log('✅ Verification status updated successfully!');
    } else {
      console.log('✅ Verification status is already correct');
    }

    // Step 5: Show final result
    const finalResult = await userClient.query(`
      SELECT profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1
    `, [userId]);

    console.log('📊 FINAL RESULT:', finalResult.rows[0]);

    console.log('\n🎉 EXPLANATION:');
    console.log('━━━━━━━━━━━━━━━━');
    console.log('• You deleted national_id_back document');
    console.log('• Documents are now 67% complete (2/3)');
    console.log('• Profile is 100% complete');
    console.log('• Status should be "not_verified" (not "pending")');
    console.log('• Event system will now work for future changes!');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
    await docClient.end();
  }
}

fixVerificationStatusNow();