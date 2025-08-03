const { Pool } = require('pg');

async function testVerificationEvents() {
  const userClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_user'
  });

  const docClient = new Pool({
    connectionString: 'postgresql://postgres:12345@localhost:5432/rabhan_document'
  });

  try {
    console.log('🧪 Testing Event-Driven Verification System');
    console.log('==========================================');
    
    const testUserId = '883f0f5c-3616-479b-8aef-5ae26057ce4a';
    console.log('👤 Test User ID:', testUserId);

    // Step 1: Check current status
    console.log('\n📊 STEP 1: Current Status');
    const userResult = await userClient.query(`
      SELECT auth_user_id, profile_completed, profile_completion_percentage, verification_status 
      FROM user_profiles 
      WHERE auth_user_id = $1
    `, [testUserId]);

    if (userResult.rows.length === 0) {
      console.log('❌ User not found');
      return;
    }

    const user = userResult.rows[0];
    console.log('Profile Status:', {
      completed: user.profile_completed,
      percentage: user.profile_completion_percentage,
      verificationStatus: user.verification_status
    });

    // Step 2: Check documents
    console.log('\n📄 STEP 2: Document Status');
    const docResult = await docClient.query(`
      SELECT dc.name as category_name, 
             COUNT(d.id) as uploaded_count,
             MAX(d.status) as latest_status
      FROM document_categories dc
      LEFT JOIN documents d ON dc.id = d.category_id 
        AND d.user_id = $1 
        AND (d.status = 'completed' OR d.approval_status = 'approved')
      WHERE dc.name IN ('national_id_front', 'national_id_back', 'proof_of_address')
      GROUP BY dc.id, dc.name
      ORDER BY dc.name
    `, [testUserId]);

    console.log('Document Status:');
    docResult.rows.forEach(row => {
      console.log(`  • ${row.category_name}: ${row.uploaded_count > 0 ? '✅ Uploaded' : '❌ Missing'} (count: ${row.uploaded_count})`);
    });

    const requiredDocs = ['national_id_front', 'national_id_back', 'proof_of_address'];
    const allDocumentsUploaded = requiredDocs.every(docName => 
      docResult.rows.some(row => row.category_name === docName && parseInt(row.uploaded_count) > 0)
    );

    // Step 3: Determine expected verification status
    console.log('\n🎯 STEP 3: Expected Verification Status');
    const profileComplete = user.profile_completed || user.profile_completion_percentage >= 100;
    const shouldBePending = profileComplete && allDocumentsUploaded;
    
    console.log('Logic Check:', {
      profileComplete,
      allDocumentsUploaded,
      shouldBePending,
      currentStatus: user.verification_status
    });

    // Step 4: Simulate what the new event system should do
    console.log('\n🔄 STEP 4: What Event System Should Do');
    if (shouldBePending && user.verification_status !== 'pending') {
      console.log('✅ Event system SHOULD update status to PENDING');
      console.log('   → Profile: 100% ✅');
      console.log('   → Documents: All uploaded ✅');
      console.log('   → Current status: not_verified → Should change to pending');
    } else if (shouldBePending && user.verification_status === 'pending') {
      console.log('✅ Status is ALREADY CORRECT (pending)');
    } else {
      console.log('❌ Requirements NOT MET for pending status:');
      if (!profileComplete) {
        console.log('   → Profile completion missing');
      }
      if (!allDocumentsUploaded) {
        console.log('   → Documents not all uploaded');
      }
    }

    // Step 5: Test manual trigger (if we wanted to test the verification manager)
    console.log('\n🔧 STEP 5: Manual Test Summary');
    console.log('To test the event system:');
    console.log('1. Update profile → should emit profile:completed event');
    console.log('2. Upload document → should emit documents:completed event');
    console.log('3. Verification manager should automatically update status');
    
    if (shouldBePending) {
      console.log('\n🎯 SIMULATION: Setting status to pending manually for comparison');
      await userClient.query(`
        UPDATE user_profiles 
        SET verification_status = 'pending', updated_at = CURRENT_TIMESTAMP 
        WHERE auth_user_id = $1
      `, [testUserId]);
      
      console.log('✅ Status manually set to pending (simulating event system result)');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await userClient.end();
    await docClient.end();
  }
}

testVerificationEvents();