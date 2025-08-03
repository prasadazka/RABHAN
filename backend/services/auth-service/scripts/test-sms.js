#!/usr/bin/env node

const twilio = require('twilio');

const client = twilio('AC4ead84b09fb89f1d4c8d3d3b8ec9ee85', '4d2c7f3e6eca9e5f805a0dac3c8034cb');

async function testSMS() {
  const testPhoneNumber = process.argv[2];
  
  if (!testPhoneNumber) {
    console.log('Usage: node test-sms.js +966XXXXXXXXX');
    console.log('Example: node test-sms.js +966501234567');
    return;
  }
  
  try {
    console.log(`📱 Sending test SMS to ${testPhoneNumber}...`);
    
    const message = await client.messages.create({
      body: 'Your RABHAN verification code is: 123456. This is a test message. 🚀',
      from: '+12703987826',
      to: testPhoneNumber
    });
    
    console.log(`✅ SMS sent! SID: ${message.sid}`);
    console.log(`📊 Status: ${message.status}`);
    
  } catch (error) {
    console.error('❌ SMS failed:', error.message);
    
    if (error.code === 21211) {
      console.log('💡 Invalid phone number format');
    } else if (error.code === 21614) {
      console.log('💡 Phone number not verified (trial account limitation)');
      console.log('   Add to verified numbers: https://console.twilio.com/project/phone-numbers/verified');
    }
  }
}

testSMS();
