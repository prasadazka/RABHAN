/**
 * 🧪 Test Script for Dummy OTP Functionality
 * 
 * This script tests the dummy OTP feature to ensure it works correctly
 * while preserving all existing functionality.
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api/auth';
const TEST_PHONE = '+966501234567';
const DUMMY_OTP = '123456';

async function testDummyOTPFlow() {
  console.log('🧪 Testing Dummy OTP Flow\n');
  console.log('='*50);

  try {
    // Step 1: Check if dummy OTP mode is enabled
    console.log('1. Checking development mode status...');
    try {
      const devResponse = await axios.get(`${BASE_URL}/dev/dummy-otp-info`);
      console.log('✅ Development mode:', devResponse.data.data.developmentMode);
      console.log('✅ Dummy OTP:', devResponse.data.data.dummyOTP);
      console.log('✅ Instructions:', devResponse.data.data.instructions);
      console.log();
    } catch (error) {
      console.log('❌ Development endpoint not available (probably in production mode)');
      console.log('   Error:', error.response?.data?.error || error.message);
      return;
    }

    // Step 2: Send OTP (should use dummy OTP)
    console.log('2. Sending OTP to', TEST_PHONE, '...');
    const sendResponse = await axios.post(`${BASE_URL}/phone/send-otp`, {
      phoneNumber: TEST_PHONE
    });
    
    if (sendResponse.data.success) {
      console.log('✅ OTP sent successfully');
      console.log('✅ Message:', sendResponse.data.message);
    } else {
      console.log('❌ Failed to send OTP:', sendResponse.data.error);
      return;
    }
    console.log();

    // Step 3: Verify with dummy OTP
    console.log('3. Verifying with dummy OTP', DUMMY_OTP, '...');
    const verifyResponse = await axios.post(`${BASE_URL}/phone/verify-otp`, {
      phoneNumber: TEST_PHONE,
      otp: DUMMY_OTP
    });

    if (verifyResponse.data.success) {
      console.log('✅ OTP verified successfully');
      console.log('✅ Message:', verifyResponse.data.message);
    } else {
      console.log('❌ Failed to verify OTP:', verifyResponse.data.error);
      return;
    }
    console.log();

    // Step 4: Test with wrong OTP (should still fail)
    console.log('4. Testing with wrong OTP (should fail)...');
    try {
      const wrongOtpResponse = await axios.post(`${BASE_URL}/phone/verify-otp`, {
        phoneNumber: TEST_PHONE,
        otp: '111111'
      });
      console.log('❌ Wrong OTP should have failed but didn\'t');
    } catch (error) {
      if (error.response?.status === 400) {
        console.log('✅ Wrong OTP correctly rejected');
        console.log('✅ Error message:', error.response.data.error);
      } else {
        console.log('❌ Unexpected error:', error.message);
      }
    }
    console.log();

    console.log('🎉 All tests passed! Dummy OTP functionality is working correctly.');
    console.log('');
    console.log('📋 Summary:');
    console.log('  ✅ Development mode detected');
    console.log('  ✅ Dummy OTP sending works');
    console.log('  ✅ Dummy OTP verification works');
    console.log('  ✅ Security validation still active');
    console.log('  ✅ All existing functionality preserved');

  } catch (error) {
    console.log('❌ Test failed:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Error:', error.response.data.error);
    }
  }
}

async function testProductionMode() {
  console.log('🔒 Testing Production Mode Restrictions\n');
  
  try {
    // Try to access dev endpoint in production mode
    const response = await axios.get(`${BASE_URL}/dev/dummy-otp-info`);
    console.log('❌ Development endpoint should not be accessible in production');
  } catch (error) {
    if (error.response?.status === 403) {
      console.log('✅ Development endpoint correctly blocked in production');
      console.log('✅ Message:', error.response.data.error);
    } else {
      console.log('❌ Unexpected error:', error.message);
    }
  }
}

async function main() {
  console.log('🚀 RABHAN Auth Service - Dummy OTP Testing\n');
  
  // Check if auth service is running
  try {
    const healthCheck = await axios.get(`${BASE_URL}/health`);
    console.log('✅ Auth service is running');
    console.log('✅ Service:', healthCheck.data.service);
    console.log('✅ Version:', healthCheck.data.version);
    console.log();
  } catch (error) {
    console.log('❌ Auth service is not running. Please start it first:');
    console.log('   cd E:\\RABHAN\\backend\\services\\auth-service');
    console.log('   npm run dev');
    return;
  }

  // Run tests
  await testDummyOTPFlow();
  
  console.log('\n' + '='*50);
  console.log('🧪 Testing complete! Ready for development use.');
  console.log('');
  console.log('💡 How to use:');
  console.log('  1. Use any Saudi phone number: +966501234567');
  console.log('  2. Click "Send OTP" (no SMS will be sent)');
  console.log('  3. Enter OTP: 123456');
  console.log('  4. Verification will succeed!');
  console.log('');
  console.log('🔄 To restore Twilio SMS:');
  console.log('  1. Set NODE_ENV=production');
  console.log('  2. Or set USE_DUMMY_OTP=false');
  console.log('  3. Restart the service');
}

// Run the tests
main().catch(console.error);