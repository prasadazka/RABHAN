#!/usr/bin/env node

/**
 * RABHAN Twilio Verified Number Management
 * Add phone numbers to Twilio verified list for trial account testing
 */

const twilio = require('twilio');

// Your Twilio credentials
const ACCOUNT_SID = 'AC4b6a759d850df3e57a03e1ab6db39875';
const AUTH_TOKEN = 'd99d125acbc7bae83c0a38f6771b7cff';

const client = twilio(ACCOUNT_SID, AUTH_TOKEN);

async function addVerifiedNumber() {
  const phoneNumber = process.argv[2];
  
  if (!phoneNumber) {
    console.log('❌ Please provide a phone number to verify');
    console.log('Usage: node add-verified-number.js +966XXXXXXXXX');
    console.log('Example: node add-verified-number.js +966501234567');
    return;
  }

  try {
    console.log(`📱 Adding ${phoneNumber} to verified numbers...`);
    
    // Start verification process
    const verification = await client.validationRequests.create({
      phoneNumber: phoneNumber,
      friendlyName: `RABHAN Test Number - ${phoneNumber}`
    });
    
    console.log('✅ Verification request created!');
    console.log(`   📱 Number: ${verification.phoneNumber}`);
    console.log(`   📞 You should receive a call shortly`);
    console.log(`   🔢 Validation Code: ${verification.validationCode}`);
    console.log('\n📞 Answer the call and enter the validation code when prompted');
    console.log('   The call will ask you to enter the validation code on your phone keypad');
    
    console.log('\n🔍 Checking verification status...');
    
    // Check status
    const status = await client.validationRequests(verification.sid).fetch();
    console.log(`   Status: ${status.status}`);
    
    if (status.status === 'success') {
      console.log('🎉 Phone number verified successfully!');
      console.log('   You can now use this number for SMS testing');
    } else {
      console.log('⏳ Verification in progress');
      console.log('   Complete the phone verification process, then run your SMS tests');
    }
    
  } catch (error) {
    console.error('❌ Error adding verified number:', error);
    
    if (error.code === 21211) {
      console.log('\n💡 Invalid phone number format');
      console.log('   Use international format: +966XXXXXXXXX');
    } else if (error.code === 21452) {
      console.log('\n💡 Trial account limitation');
      console.log('   You may need to upgrade your Twilio account for full verification features');
    } else {
      console.log('\n💡 Alternative: Add numbers manually in Twilio Console');
      console.log('   Visit: https://console.twilio.com/project/phone-numbers/verified');
      console.log('   Click "Add a new number" and follow the verification process');
    }
  }
}

async function listVerifiedNumbers() {
  try {
    console.log('📋 Current verified numbers:');
    
    const validationRequests = await client.validationRequests.list();
    
    if (validationRequests.length === 0) {
      console.log('   No verified numbers found');
    } else {
      validationRequests.forEach((req, index) => {
        console.log(`   ${index + 1}. ${req.phoneNumber} (${req.status})`);
      });
    }
    
  } catch (error) {
    console.log('❌ Could not list verified numbers:', error.message);
  }
}

// Check command line arguments
const command = process.argv[2];

if (command === 'list') {
  listVerifiedNumbers();
} else if (command && command.startsWith('+')) {
  addVerifiedNumber();
} else {
  console.log('📱 RABHAN Verified Number Management');
  console.log('=====================================');
  console.log('');
  console.log('Add a verified number:');
  console.log('  node add-verified-number.js +966XXXXXXXXX');
  console.log('');
  console.log('List verified numbers:');
  console.log('  node add-verified-number.js list');
  console.log('');
  console.log('💡 For trial accounts, you need verified numbers to send SMS');
}