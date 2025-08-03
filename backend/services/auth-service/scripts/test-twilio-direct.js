#!/usr/bin/env node

/**
 * Direct Twilio SMS Test Script
 * Tests Twilio SMS sending with detailed response logging
 */

require('dotenv').config();
const { Twilio } = require('twilio');

async function testTwilioDirectly() {
  console.log('🧪 Direct Twilio SMS Test');
  console.log('=========================\n');

  // Check environment variables
  console.log('📋 Configuration:');
  console.log(`   Account SID: ${process.env.TWILIO_ACCOUNT_SID}`);
  console.log(`   Auth Token: ${process.env.TWILIO_AUTH_TOKEN ? '[REDACTED]' : 'MISSING'}`);
  console.log(`   Phone Number: ${process.env.TWILIO_PHONE_NUMBER}\n`);

  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
    console.error('❌ Missing Twilio configuration in .env file');
    return;
  }

  try {
    // Initialize Twilio client
    const client = new Twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    console.log('✅ Twilio client initialized\n');

    // Test phone number
    const testPhone = '+919182614577';
    const testMessage = 'Test OTP: 123456. This is a test message from RABHAN Solar BNPL platform.';

    console.log('📱 Sending test SMS...');
    console.log(`   To: ${testPhone}`);
    console.log(`   From: ${process.env.TWILIO_PHONE_NUMBER}`);
    console.log(`   Message: ${testMessage}\n`);

    // Send SMS
    const message = await client.messages.create({
      body: testMessage,
      to: testPhone,
      from: process.env.TWILIO_PHONE_NUMBER
    });

    console.log('🎉 SMS sent successfully!');
    console.log('📋 Twilio Response:');
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    console.log(`   Direction: ${message.direction}`);
    console.log(`   Date Created: ${message.dateCreated}`);
    console.log(`   Date Updated: ${message.dateUpdated}`);
    console.log(`   From: ${message.from}`);
    console.log(`   To: ${message.to}`);
    console.log(`   Price: ${message.price} ${message.priceUnit}`);
    console.log(`   Error Code: ${message.errorCode || 'None'}`);
    console.log(`   Error Message: ${message.errorMessage || 'None'}\n`);

    // Check account info
    console.log('💰 Account Information:');
    const account = await client.api.accounts(process.env.TWILIO_ACCOUNT_SID).fetch();
    console.log(`   Account Status: ${account.status}`);
    console.log(`   Account Type: ${account.type}\n`);

    // Check if it's a trial account
    if (account.type === 'Trial') {
      console.log('⚠️  TRIAL ACCOUNT DETECTED');
      console.log('   Trial accounts can only send SMS to verified phone numbers.');
      console.log('   Please verify +919182614577 in your Twilio Console:');
      console.log('   https://console.twilio.com/project/phone-numbers/verified\n');

      // List verified phone numbers
      try {
        console.log('📋 Checking verified phone numbers...');
        const validationRequests = await client.validationRequests.list();
        if (validationRequests.length > 0) {
          console.log('   Verified numbers:');
          validationRequests.forEach((req, index) => {
            console.log(`   ${index + 1}. ${req.phoneNumber} (${req.validationCode})`);
          });
        } else {
          console.log('   No verified numbers found.');
        }
      } catch (error) {
        console.log('   Could not fetch verified numbers:', error.message);
      }
    }

    console.log('\n✅ Test completed successfully!');
    console.log('📱 Check your phone for the SMS message.');

  } catch (error) {
    console.error('\n❌ Twilio SMS Error:');
    console.error(`   Message: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    console.error(`   Status: ${error.status}`);
    console.error(`   More Info: ${error.moreInfo}`);
    
    if (error.code === 21614) {
      console.error('\n🚨 Error 21614: This is a trial account restriction.');
      console.error('   The number +919182614577 must be verified in your Twilio console.');
      console.error('   Add it here: https://console.twilio.com/project/phone-numbers/verified');
    }
    
    console.error('\n📋 Full error details:', error);
  }
}

// Run the test
testTwilioDirectly();