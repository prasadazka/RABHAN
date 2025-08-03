/**
 * Test the user service API directly to see what verification status it returns
 */

const axios = require('axios');

async function testUserServiceAPI() {
  console.log('🧪 Testing User Service API for Verification Status');
  console.log('==================================================');

  const userId = '883f0f5c-3616-479b-8aef-5ae26057ce4a';
  
  // Use the test token from the Documents page
  const testToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIxZjQ3NTcyOS1jMmUwLTRiM2QtYTY3OC1lNGE0ZWE0ZDZjYzAiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJ0eXBlIjoiVVNFUiIsImlhdCI6MTc1Mzk4NTM1NCwiZXhwIjoxNzU0MDcxNzU0fQ.wyCd8yfMxBAKjeemyzHzkvrSTctI94LX9wDWrj7f2eA';

  try {
    console.log('📡 Making API call to user service...');
    console.log('🔗 URL: http://localhost:3002/api/users/profiles/me');
    
    const response = await axios.get('http://localhost:3002/api/users/profiles/me', {
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    console.log('✅ API Response received');
    console.log('📊 Status Code:', response.status);
    console.log('📋 Response Data:', JSON.stringify(response.data, null, 2));

    if (response.data.success && response.data.profile) {
      const profile = response.data.profile;
      console.log('\n🎯 KEY VERIFICATION DATA:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('• User ID:', profile.userId);
      console.log('• Profile Completed:', profile.profileCompleted);
      console.log('• Profile Percentage:', profile.profileCompletionPercentage);
      console.log('• Verification Status:', profile.verificationStatus);
      console.log('• Updated At:', profile.updatedAt);

      console.log('\n🔍 VERIFICATION STATUS ANALYSIS:');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (profile.verificationStatus === 'not_verified') {
        console.log('✅ Status is CORRECT: "not_verified"');
        console.log('   → Profile: 100% + Documents: 67% = not_verified ✓');
      } else if (profile.verificationStatus === 'pending') {
        console.log('❌ Status is WRONG: "pending"');
        console.log('   → Should be "not_verified" because documents incomplete');
      } else {
        console.log('⚠️ Unexpected status:', profile.verificationStatus);
      }

    } else {
      console.log('❌ API call failed or returned no profile data');
      console.log('Error:', response.data.error);
    }

  } catch (error) {
    console.error('❌ API Error:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data
    });

    console.log('\n💡 TROUBLESHOOTING:');
    console.log('━━━━━━━━━━━━━━━━━');
    console.log('1. Check if user service is running on port 3002');
    console.log('2. Check if the JWT token is valid');
    console.log('3. Check if the user exists in the database');
    console.log('4. Try refreshing the page to clear frontend cache');
  }
}

testUserServiceAPI();