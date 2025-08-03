require('dotenv').config();

console.log('Testing encryption service...');
console.log('ENCRYPTION_MASTER_KEY:', process.env.ENCRYPTION_MASTER_KEY);
console.log('Key length as string:', process.env.ENCRYPTION_MASTER_KEY?.length);

if (process.env.ENCRYPTION_MASTER_KEY) {
  const buffer = Buffer.from(process.env.ENCRYPTION_MASTER_KEY, 'hex');
  console.log('Buffer length:', buffer.length);
  console.log('Expected: 32 bytes');
  
  if (buffer.length === 32) {
    console.log('✅ Encryption key is correct length');
  } else {
    console.log('❌ Encryption key is wrong length');
  }
}

// Test loading the config
try {
  const { config } = require('./src/config/environment.config');
  console.log('✅ Config loaded successfully');
  console.log('Encryption config:', config.encryption);
  
  const masterKeyBuffer = Buffer.from(config.encryption.masterKey, 'hex');
  console.log('Master key buffer length:', masterKeyBuffer.length);
  console.log('Expected key length:', config.encryption.keyLength);
  
} catch (error) {
  console.log('❌ Config loading failed:', error.message);
}