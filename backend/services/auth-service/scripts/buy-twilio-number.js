#!/usr/bin/env node

/**
 * RABHAN Twilio Phone Number Purchase Script
 * Automatically finds and purchases an SMS-enabled phone number
 */

const twilio = require('twilio');
const fs = require('fs');
const path = require('path');

// Your Twilio credentials
const ACCOUNT_SID = 'AC4b6a759d850df3e57a03e1ab6db39875';
const AUTH_TOKEN = 'd99d125acbc7bae83c0a38f6771b7cff';

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function findAndBuyNumber() {
  console.log('🔍 Finding SMS-enabled phone numbers...\n');

  try {
    // Search for SMS-enabled numbers in US (most reliable for international SMS)
    console.log('Searching for US numbers with SMS capability...');
    const availableNumbers = await client.availablePhoneNumbers('US')
      .local
      .list({ 
        limit: 20,
        smsEnabled: true,
        voiceEnabled: true
      });

    const smsNumbers = availableNumbers.filter(number => number.capabilities.sms);
    
    if (smsNumbers.length === 0) {
      console.log('❌ No SMS-enabled numbers found. Trying toll-free numbers...');
      
      // Try toll-free numbers
      const tollFreeNumbers = await client.availablePhoneNumbers('US')
        .tollFree
        .list({ 
          limit: 10,
          smsEnabled: true
        });
      
      if (tollFreeNumbers.length > 0) {
        console.log('✅ Found toll-free SMS numbers:');
        tollFreeNumbers.slice(0, 3).forEach((number, index) => {
          console.log(`   ${index + 1}. ${number.phoneNumber} (Toll-Free, SMS ✅)`);
        });
        
        return await purchaseNumber(tollFreeNumbers[0].phoneNumber);
      } else {
        console.log('❌ No toll-free SMS numbers available');
        return;
      }
    }

    console.log(`✅ Found ${smsNumbers.length} SMS-enabled numbers:`);
    smsNumbers.slice(0, 5).forEach((number, index) => {
      console.log(`   ${index + 1}. ${number.phoneNumber} (SMS ✅, Voice ${number.capabilities.voice ? '✅' : '❌'})`);
    });

    // Purchase the first available SMS number
    const selectedNumber = smsNumbers[0];
    console.log(`\n🛒 Purchasing: ${selectedNumber.phoneNumber}`);
    
    return await purchaseNumber(selectedNumber.phoneNumber);

  } catch (error) {
    console.error('❌ Error finding numbers:', error);
    
    if (error.code === 20003) {
      console.log('\n💡 Make sure your Twilio credentials are correct');
    } else if (error.code === 21422) {
      console.log('\n💡 Trial account limitations - you may need to verify your identity');
      console.log('   Visit: https://console.twilio.com/project/verify-phone-numbers');
    }
  }
}

async function purchaseNumber(phoneNumber) {
  try {
    console.log(`💳 Purchasing ${phoneNumber}...`);
    
    const purchasedNumber = await client.incomingPhoneNumbers.create({
      phoneNumber: phoneNumber,
      friendlyName: 'RABHAN SMS OTP Service'
    });
    
    console.log('✅ Phone number purchased successfully!');
    console.log(`   📱 Number: ${purchasedNumber.phoneNumber}`);
    console.log(`   📊 SID: ${purchasedNumber.sid}`);
    console.log(`   💰 Monthly cost: $1.00 USD`);
    console.log(`   📞 Voice: ${purchasedNumber.capabilities.voice ? 'Enabled' : 'Disabled'}`);
    console.log(`   📱 SMS: ${purchasedNumber.capabilities.sms ? 'Enabled' : 'Disabled'}`);
    
    // Update .env file
    updateEnvFile(purchasedNumber.phoneNumber);
    
    console.log('\n🎉 Setup complete!');
    console.log('📝 Next steps:');
    console.log('   1. Restart your auth service');
    console.log('   2. Test SMS with: npm run test:sms');
    console.log('   3. Use a verified phone number for testing (trial account)');
    
    return purchasedNumber;
    
  } catch (error) {
    console.error('❌ Error purchasing number:', error);
    
    if (error.code === 21452) {
      console.log('\n💡 Trial account limitation:');
      console.log('   - You can only send SMS to verified phone numbers');
      console.log('   - Add your test numbers at: https://console.twilio.com/project/phone-numbers/verified');
      console.log('   - Or upgrade your account for full SMS capability');
    } else if (error.code === 20003) {
      console.log('\n💡 Insufficient account balance or permissions');
    }
    
    throw error;
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
    console.log(`   ✅ Updated .env with: ${phoneNumber}`);
  } catch (error) {
    console.log(`   ⚠️  Could not update .env: ${error.message}`);
    console.log(`   💡 Please manually update TWILIO_PHONE_NUMBER=${phoneNumber}`);
  }
}

// Create test script
function createTestScript(phoneNumber) {
  const testScript = `#!/usr/bin/env node

const twilio = require('twilio');

const client = twilio('${ACCOUNT_SID}', '${AUTH_TOKEN}');

async function testSMS() {
  const testPhoneNumber = process.argv[2];
  
  if (!testPhoneNumber) {
    console.log('Usage: node test-sms.js +966XXXXXXXXX');
    console.log('Example: node test-sms.js +966501234567');
    return;
  }
  
  try {
    console.log(\`📱 Sending test SMS to \${testPhoneNumber}...\`);
    
    const message = await client.messages.create({
      body: 'Your RABHAN verification code is: 123456. This is a test message. 🚀',
      from: '${phoneNumber}',
      to: testPhoneNumber
    });
    
    console.log(\`✅ SMS sent! SID: \${message.sid}\`);
    console.log(\`📊 Status: \${message.status}\`);
    
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
`;

  fs.writeFileSync(path.join(__dirname, 'test-sms.js'), testScript);
  console.log('   ✅ Created test-sms.js script');
}

// Run the purchase process
if (require.main === module) {
  findAndBuyNumber()
    .then((number) => {
      if (number) {
        createTestScript(number.phoneNumber);
      }
    })
    .catch(console.error);
}

module.exports = { findAndBuyNumber };