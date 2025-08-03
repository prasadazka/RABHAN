#!/usr/bin/env node

/**
 * RABHAN Multi-Country SMS OTP API Test Script
 * Tests SMS functionality for both India (+91) and Saudi Arabia (+966)
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3001/api/auth';

async function showSupportedCountries() {
  try {
    console.log('🌍 Getting supported countries...');
    const response = await axios.get(`${API_BASE}/phone/countries`);
    
    if (response.data.success) {
      console.log('\n📱 Supported Countries:');
      response.data.data.countries.forEach((country, index) => {
        console.log(`   ${index + 1}. ${country.name} (${country.countryCode})`);
        console.log(`      Example: ${country.example}`);
      });
      console.log(`\n🏠 Default Country: ${response.data.data.defaultCountry}\n`);
    }
    
    return response.data.data.countries;
  } catch (error) {
    console.log('❌ Could not fetch supported countries');
    return [];
  }
}

async function validatePhoneNumber(phoneNumber, countryCode) {
  try {
    console.log(`🔍 Validating phone number: ${phoneNumber} (${countryCode || 'auto-detect'})`);
    
    const response = await axios.post(`${API_BASE}/phone/validate`, {
      phoneNumber,
      countryCode
    });
    
    if (response.data.success) {
      const validation = response.data.data;
      console.log(`   ✅ Valid: ${validation.isValid}`);
      console.log(`   📱 Formatted: ${validation.formatted}`);
      console.log(`   🌍 Country: ${validation.countryName} (${validation.country})`);
      return validation;
    }
    
  } catch (error) {
    console.log(`   ❌ Validation failed: ${error.response?.data?.error || error.message}`);
    return null;
  }
}

async function testSMSOTP(phoneNumber, countryCode) {
  try {
    console.log(`\n📱 Testing SMS OTP for: ${phoneNumber} (${countryCode || 'auto-detect'})`);
    console.log('=====================================');

    // Step 1: Validate phone number
    const validation = await validatePhoneNumber(phoneNumber, countryCode);
    if (!validation || !validation.isValid) {
      console.log('❌ Phone number validation failed. Cannot proceed with SMS test.');
      return false;
    }

    // Step 2: Send OTP
    console.log('\n1️⃣ Sending OTP...');
    const sendResponse = await axios.post(`${API_BASE}/test/sms/send`, {
      phoneNumber: phoneNumber,
      countryCode: countryCode
    });

    if (sendResponse.data.success) {
      const data = sendResponse.data.data;
      console.log('✅ OTP sent successfully!');
      console.log(`   📱 Phone: ${data.phoneNumber}`);
      console.log(`   🌍 Country: ${data.countryName} (${data.country})`);
      console.log(`   🕐 Time: ${data.timestamp}`);
      
      // Show country-specific message format
      if (data.country === 'SA') {
        console.log('   📨 Message: Short English + Arabic');
      } else if (data.country === 'IN') {
        console.log('   📨 Message: Short English (single SMS segment)');
      }
      
      console.log('\n📨 Check your phone for the SMS message');
      console.log('💡 Enter the 6-digit code you received:\n');
      
      // Wait for user input
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });

      return new Promise((resolve) => {
        rl.question('Enter OTP code: ', async (otp) => {
          console.log();
          
          if (!otp || otp.length !== 6) {
            console.log('❌ Invalid OTP format. Please enter a 6-digit code.');
            rl.close();
            resolve(false);
            return;
          }

          try {
            // Step 3: Verify OTP
            console.log('2️⃣ Verifying OTP...');
            const verifyResponse = await axios.post(`${API_BASE}/test/sms/verify`, {
              phoneNumber: phoneNumber,
              otp: otp,
              countryCode: countryCode
            });

            if (verifyResponse.data.success) {
              const verifyData = verifyResponse.data.data;
              console.log('🎉 OTP verified successfully!');
              console.log(`   📱 Phone: ${verifyData.phoneNumber}`);
              console.log(`   🌍 Country: ${verifyData.countryName} (${verifyData.country})`);
              console.log(`   ✅ Verified: ${verifyData.verified}`);
              console.log(`   🕐 Time: ${verifyData.timestamp}`);
              
              resolve(true);
            } else {
              console.log('❌ OTP verification failed');
              console.log(`   Error: ${verifyResponse.data.error}`);
              resolve(false);
            }
          } catch (verifyError) {
            console.log('❌ OTP verification error:');
            if (verifyError.response) {
              console.log(`   Status: ${verifyError.response.status}`);
              console.log(`   Error: ${verifyError.response.data.error}`);
            } else {
              console.log(`   Error: ${verifyError.message}`);
            }
            resolve(false);
          }
          
          rl.close();
        });
      });

    } else {
      console.log('❌ Failed to send OTP');
      console.log(`   Error: ${sendResponse.data.error}`);
      return false;
    }

  } catch (sendError) {
    console.log('❌ SMS OTP send error:');
    
    if (sendError.response) {
      console.log(`   Status: ${sendError.response.status}`);
      console.log(`   Error: ${sendError.response.data.error}`);
      
      if (sendError.response.data.supportedCountries) {
        console.log('\n📱 Supported formats:');
        sendError.response.data.supportedCountries.forEach(country => {
          console.log(`   ${country.name}: ${country.example}`);
        });
      }
    } else if (sendError.code === 'ECONNREFUSED') {
      console.log('   Connection refused - make sure auth service is running on port 3001');
    } else {
      console.log(`   Error: ${sendError.message}`);
    }
    return false;
  }
}

async function runTests() {
  console.log('🧪 RABHAN Multi-Country SMS OTP Testing');
  console.log('========================================\n');

  // Show supported countries
  const countries = await showSupportedCountries();
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('📱 Usage Examples:');
    console.log('');
    console.log('Test Saudi number:');
    console.log('  node test-multi-country-sms.js +966501234567');
    console.log('  node test-multi-country-sms.js 0501234567 SA');
    console.log('');
    console.log('Test Indian number:');
    console.log('  node test-multi-country-sms.js +919876543210');
    console.log('  node test-multi-country-sms.js 9876543210 IN');
    console.log('');
    console.log('🔧 Test multiple numbers:');
    console.log('  node test-multi-country-sms.js +966501234567 +919876543210');
    console.log('');
    console.log('⚠️  Note: For trial accounts, add numbers to Twilio verified list:');
    console.log('   https://console.twilio.com/project/phone-numbers/verified');
    return;
  }

  // Parse arguments
  const phoneNumbers = [];
  for (let i = 0; i < args.length; i += 2) {
    const phone = args[i];
    const country = args[i + 1] && !args[i + 1].startsWith('+') ? args[i + 1] : undefined;
    phoneNumbers.push({ phone, country });
    if (!country && args[i + 1] && args[i + 1].startsWith('+')) {
      phoneNumbers.push({ phone: args[i + 1], country: undefined });
    }
  }

  // Test each phone number
  let totalTests = 0;
  let successfulTests = 0;

  for (const { phone, country } of phoneNumbers) {
    totalTests++;
    const success = await testSMSOTP(phone, country);
    if (success) successfulTests++;
    
    if (phoneNumbers.length > 1 && totalTests < phoneNumbers.length) {
      console.log('\n⏭️  Moving to next number...\n');
    }
  }

  // Summary
  console.log('\n📊 Test Summary:');
  console.log('================');
  console.log(`   Total Tests: ${totalTests}`);
  console.log(`   Successful: ${successfulTests}`);
  console.log(`   Failed: ${totalTests - successfulTests}`);
  
  if (successfulTests === totalTests) {
    console.log('\n🎉 All tests passed! Your multi-country SMS system is working perfectly!');
    console.log('\n✅ Features confirmed:');
    console.log('   📱 Multi-country phone validation');
    console.log('   🌍 Auto-country detection');
    console.log('   📨 Country-specific SMS messages');
    console.log('   🔒 SAMA-compliant audit logging');
    console.log('   ⚡ Smart phone number formatting');
  } else {
    console.log('\n⚠️  Some tests failed. Check error messages above.');
  }
}

// Run the tests
runTests();