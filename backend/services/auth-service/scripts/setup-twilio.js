#!/usr/bin/env node

/**
 * RABHAN Twilio Setup Script
 * Helps configure Twilio phone number for SMS OTP verification
 */

const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

// Your Twilio credentials (from environment variables)
const ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID || 'your_account_sid_here';
const AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN || 'your_auth_token_here';

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function setupTwilio() {
  console.log('🚀 RABHAN Twilio Setup for SMS OTP');
  console.log('=====================================\n');

  try {
    // Test account connection
    console.log('✅ Testing Twilio account connection...');
    const account = await client.api.accounts(ACCOUNT_SID).fetch();
    console.log(`   Account: ${account.friendlyName}`);
    console.log(`   Status: ${account.status}`);
    console.log(`   Type: ${account.type}\n`);

    // Check account balance
    console.log('💰 Checking account balance...');
    const balance = await client.balance.fetch();
    console.log(`   Balance: ${balance.balance} ${balance.currency}\n`);

    // List available phone numbers for Saudi Arabia
    console.log('📱 Searching for available phone numbers...');
    
    // For Saudi numbers (if available)
    try {
      const saudiNumbers = await client.availablePhoneNumbers('SA')
        .mobile
        .list({ limit: 5 });
      
      if (saudiNumbers.length > 0) {
        console.log('   🇸🇦 Available Saudi numbers:');
        saudiNumbers.forEach((number, index) => {
          console.log(`   ${index + 1}. ${number.phoneNumber} (${number.capabilities.sms ? 'SMS ✅' : 'SMS ❌'})`);
        });
        console.log();
      }
    } catch (error) {
      console.log('   ⚠️  No Saudi numbers available or region not supported');
    }

    // For US numbers (most common for testing)
    console.log('   🇺🇸 Searching for available US numbers...');
    try {
      const usNumbers = await client.availablePhoneNumbers('US')
        .local
        .list({ limit: 5, smsEnabled: true });
      
      if (usNumbers.length > 0) {
        usNumbers.forEach((number, index) => {
          console.log(`   ${index + 1}. ${number.phoneNumber} (${number.capabilities.sms ? 'SMS ✅' : 'SMS ❌'})`);
        });
      } else {
        console.log('   ⚠️  No available numbers found');
      }
    } catch (error) {
      console.log('   ⚠️  Could not fetch available numbers:', error.message);
    }
    console.log();

    // List your current phone numbers
    console.log('📞 Your current Twilio phone numbers:');
    const existingNumbers = await client.incomingPhoneNumbers.list();
    
    if (existingNumbers.length === 0) {
      console.log('   ❌ No phone numbers found in your account');
      console.log('   💡 You need to purchase a phone number to send SMS');
      console.log();
      
      // Provide instructions for purchasing
      console.log('🛒 How to get a phone number:');
      console.log('   1. Go to Twilio Console: https://console.twilio.com/');
      console.log('   2. Navigate to Phone Numbers > Manage > Buy a number');
      console.log('   3. Select a number with SMS capability');
      console.log('   4. Purchase the number');
      console.log('   5. Update your .env file with the purchased number');
      console.log();
      
      // Show example purchase (commented out for safety)
      console.log('💻 Or purchase programmatically (uncomment below):');
      console.log('   // const purchasedNumber = await client.incomingPhoneNumbers.create({');
      console.log('   //   phoneNumber: "+1234567890", // Replace with available number');
      console.log('   //   smsUrl: "https://your-webhook-url.com/sms"');
      console.log('   // });');
      
    } else {
      console.log('   ✅ Found existing numbers:');
      existingNumbers.forEach((number, index) => {
        console.log(`   ${index + 1}. ${number.phoneNumber} (${number.capabilities.sms ? 'SMS ✅' : 'SMS ❌'})`);
        
        // Update .env if this is the first number
        if (index === 0) {
          updateEnvFile(number.phoneNumber);
        }
      });
    }
    
    console.log();
    console.log('🔧 Test SMS sending capability...');
    
    // If you have a number, test it
    if (existingNumbers.length > 0) {
      const testNumber = existingNumbers[0].phoneNumber;
      console.log(`   Using number: ${testNumber}`);
      console.log('   💡 To test SMS, call: testSMS("+966XXXXXXXXX") with a Saudi number');
    }
    
    console.log();
    console.log('✅ Twilio setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Make sure you have a phone number with SMS capability');
    console.log('   2. Update TWILIO_PHONE_NUMBER in your .env file');
    console.log('   3. Test SMS sending with a Saudi number (+966XXXXXXXXX)');
    console.log('   4. Restart your auth service');

  } catch (error) {
    console.error('❌ Error setting up Twilio:', error);
    
    if (error.code === 20003) {
      console.log('\n💡 Authentication failed. Please check your credentials:');
      console.log('   - Account SID: Set TWILIO_ACCOUNT_SID in your environment');
      console.log('   - Auth Token: Set TWILIO_AUTH_TOKEN in your environment');
      console.log('   - Make sure these are correct in your Twilio console');
    }
  }
}

function updateEnvFile(phoneNumber) {
  const envPath = path.join(__dirname, '../.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update phone number
    envContent = envContent.replace(
      /TWILIO_PHONE_NUMBER=.*/,
      `TWILIO_PHONE_NUMBER=${phoneNumber}`
    );
    
    fs.writeFileSync(envPath, envContent);
    console.log(`   ✅ Updated .env with phone number: ${phoneNumber}`);
  } catch (error) {
    console.log(`   ⚠️  Could not update .env file: ${error.message}`);
  }
}

// Test SMS function
async function testSMS(toNumber) {
  try {
    console.log(`📱 Sending test SMS to ${toNumber}...`);
    
    const message = await client.messages.create({
      body: 'Test SMS from RABHAN! Your Twilio integration is working perfectly. 🚀',
      from: process.env.TWILIO_PHONE_NUMBER || '+15005550006',
      to: toNumber
    });
    
    console.log(`✅ SMS sent successfully! Message SID: ${message.sid}`);
    console.log(`   Status: ${message.status}`);
    
  } catch (error) {
    console.error('❌ SMS test failed:', error);
    
    if (error.code === 21211) {
      console.log('💡 Invalid phone number format. Use: +966XXXXXXXXX for Saudi numbers');
    } else if (error.code === 21614) {
      console.log('💡 Phone number not verified. Add it to your Twilio verified numbers for testing');
    }
  }
}

// Run setup
if (require.main === module) {
  setupTwilio();
}

module.exports = { testSMS };