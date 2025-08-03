const axios = require('axios');

async function testUserAPI() {
  try {
    console.log('🔍 Testing User API directly...');
    
    const userId = 'd0f3debe-b956-4e51-881c-08c94411328f';
    const userServiceUrl = 'http://127.0.0.1:3002';
    
    console.log(`📡 Calling: GET ${userServiceUrl}/api/users/profiles/${userId}`);
    
    const response = await axios.get(`${userServiceUrl}/api/users/profiles/${userId}`, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 5000
    });

    console.log('📊 API Response Status:', response.status);
    console.log('📊 API Response Headers:', response.headers);
    console.log('📊 API Response Data:', JSON.stringify(response.data, null, 2));
    
    if (response.data.success && response.data.data) {
      const profile = response.data.data;
      console.log('\n🔍 Profile Analysis:');
      console.log('  • Profile Completed:', profile.profileCompleted);
      console.log('  • Profile Completion %:', profile.profileCompletionPercentage);
      console.log('  • Verification Status:', profile.verificationStatus);
      console.log('  • First Name:', profile.firstName);
      console.log('  • Last Name:', profile.lastName);
    }

  } catch (error) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
  }
}

testUserAPI();