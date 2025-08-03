const axios = require('axios');

async function testEventSystemLive() {
  console.log('🧪 Testing Live Event-Driven Verification System');
  console.log('================================================');
  
  const testUserId = '883f0f5c-3616-479b-8aef-5ae26057ce4a';
  console.log('👤 Test User ID:', testUserId);

  // You'll need a valid auth token for this user
  const authToken = 'YOUR_AUTH_TOKEN_HERE'; // Replace with actual token

  try {
    // Step 1: Get current profile status
    console.log('\n📊 STEP 1: Getting current profile status...');
    
    const profileResponse = await axios.get(`http://localhost:3002/api/profile`, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (profileResponse.data.success) {
      const profile = profileResponse.data.profile;
      console.log('✅ Profile Status:', {
        completed: profile.profileCompleted,
        percentage: profile.profileCompletionPercentage,
        verificationStatus: profile.verificationStatus
      });
    } else {
      console.log('❌ Failed to get profile:', profileResponse.data.error);
    }

    // Step 2: Test profile update to trigger event
    console.log('\n🔄 STEP 2: Testing profile update to trigger event...');
    
    const updateData = {
      streetAddress: `Test Street ${Date.now()}`, // Small update to trigger event
    };

    const updateResponse = await axios.put(`http://localhost:3002/api/profile`, updateData, {
      headers: {
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (updateResponse.data.success) {
      console.log('✅ Profile updated successfully');
      console.log('🔥 Event should have been emitted: profile:completed');
      
      // Wait a moment for event processing
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Check verification status again
      const updatedProfileResponse = await axios.get(`http://localhost:3002/api/profile`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (updatedProfileResponse.data.success) {
        const updatedProfile = updatedProfileResponse.data.profile;
        console.log('📋 Updated Profile Status:', {
          completed: updatedProfile.profileCompleted,
          percentage: updatedProfile.profileCompletionPercentage,
          verificationStatus: updatedProfile.verificationStatus
        });
      }
    } else {
      console.log('❌ Failed to update profile:', updateResponse.data.error);
    }

    // Step 3: Get documents status
    console.log('\n📄 STEP 3: Checking documents status...');
    
    try {
      const documentsResponse = await axios.get(`http://localhost:3003/api/documents`, {
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (documentsResponse.data.success) {
        const documents = documentsResponse.data.documents;
        console.log('📄 Documents Status:', {
          totalDocuments: documents.length,
          documents: documents.map(doc => ({
            category: doc.category_id,
            status: doc.document_status,
            approval: doc.approval_status
          }))
        });
      }
    } catch (docError) {
      console.log('⚠️ Could not fetch documents (may need different endpoint)');
    }

    console.log('\n🎯 EXPECTED BEHAVIOR:');
    console.log('1. Profile update → emits profile:completed event');
    console.log('2. Verification Manager listens to event');  
    console.log('3. Checks both profile (100%) AND documents (0%)');
    console.log('4. Since documents are missing, status should be "not_verified"');
    console.log('5. When documents are uploaded → status should change to "pending"');

  } catch (error) {
    console.error('❌ Error testing event system:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    console.log('\n💡 TO TEST MANUALLY:');
    console.log('1. Go to http://localhost:3004 (frontend)');
    console.log('2. Login with the test user');
    console.log('3. Update profile → should see event logs in user service');
    console.log('4. Upload documents → should see event logs in document service');
    console.log('5. Watch verification status change automatically');
  }
}

testEventSystemLive();